use swc_core::common::{Span, util::take::Take};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{
    call_ident, ident, ident_expr, let_decl, num_lit,
    return_stmt, undefined_expr, var_decl_pat,
};

const ARG_PREFIX: &str = "_arg";

pub struct ParamDefaultValue;

impl ParamDefaultValue {
    fn is_default_param(pat: &Pat) -> bool {
        matches!(pat, Pat::Ident(id) if id.id.optional)
            || matches!(pat, Pat::Assign(_))
    }

    fn has_prop_with_value(o: &ObjectPat) -> bool {
        o.props.iter().any(|p| match p {
            ObjectPatProp::KeyValue(kv) => match kv.value.as_ref() {
                Pat::Assign(_) => true,
                Pat::Object(n) => Self::has_prop_with_value(n),
                Pat::Array(a) => Self::has_array_item_with_value(a),
                _ => false,
            },
            ObjectPatProp::Assign(a) => a.value.is_some(),
            _ => false,
        })
    }

    fn has_array_item_with_value(a: &ArrayPat) -> bool {
        a.elems.iter().flatten().any(|e| matches!(e, Pat::Assign(_)))
    }

    fn parse_pattern(
        &self,
        pat: Pat,
        index: i64,
        span: Span,
    ) -> (Option<Pat>, Vec<Stmt>) {
        let mut stmts: Vec<Stmt> = Vec::new();
        let mut default_value: Option<Expr> = None;
        let mut id: Option<Pat> = None;
        let mut new_pat: Option<Pat> = None;

        match pat {
            Pat::Ident(mut binding) if binding.id.optional => {
                binding.id.optional = false;
                id = Some(Pat::Ident(binding));
                default_value = Some(undefined_expr(span));
            }
            Pat::Assign(assign) => {
                id = Some(*assign.left);
                default_value = Some(*assign.right);
            }
            Pat::Object(obj) if Self::has_prop_with_value(&obj) => {
                let arg = ident(span, &format!("{ARG_PREFIX}{index}"));
                stmts.push(var_decl_pat(span, Pat::Object(obj), Some(Expr::Ident(arg.clone()))));
                new_pat = Some(Pat::Ident(BindingIdent {
                    id: arg,
                    type_ann: None,
                }));
            }
            Pat::Array(arr) if Self::has_array_item_with_value(&arr) => {
                let arg = ident(span, &format!("{ARG_PREFIX}{index}"));
                stmts.push(var_decl_pat(span, Pat::Array(arr), Some(arg.clone().into())));
                new_pat = Some(Pat::Ident(BindingIdent {
                    id: arg,
                    type_ann: None,
                }));
            }
            other => {
                new_pat = Some(other);
            }
        }

        if let (Some(default_val), Some(id_pat)) = (default_value, id) {
            stmts.push(var_decl_pat(
                span,
                id_pat,
                Some(call_ident(
                    span,
                    "def",
                    vec![
                        ident_expr(span, "arguments"),
                        num_lit(span, index as f64),
                        default_val,
                    ],
                )),
            ));
            new_pat = None;
        }

        (new_pat, stmts)
    }

    fn array_pattern_from_params(params: &[Pat], span: Span) -> Pat {
        Pat::Array(ArrayPat {
            span,
            elems: params
                .iter()
                .map(|p| {
                    Some(if let Pat::Ident(mut id) = p.clone() {
                        if id.id.optional {
                            id.id.optional = false;
                            Pat::Assign(AssignPat {
                                span,
                                left: Box::new(Pat::Ident(id)),
                                right: Box::new(undefined_expr(span)),
                            })
                        } else {
                            p.clone()
                        }
                    } else {
                        p.clone()
                    })
                })
                .collect(),
            optional: false,
            type_ann: None,
        })
    }
}

impl VisitMut for ParamDefaultValue {
    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        if arrow.params.iter().any(|p| Self::is_default_param(p)) {
            let span = arrow.span;
            let args_id = ident(span, "args");
            let mut body_stmts = vec![let_decl(
                span,
                "args",
                None,
            )];

            body_stmts[0] = Stmt::Decl(Decl::Var(Box::new(VarDecl {
                span,
                ctxt: Default::default(),
                kind: VarDeclKind::Let,
                declare: false,
                decls: vec![VarDeclarator {
                    span,
                    name: Self::array_pattern_from_params(&arrow.params, span),
                    init: Some(Box::new(args_id.clone().into())),
                    definite: false,
                }],
            })));

            match *arrow.body.take() {
                ArrowFunctionBody::FunctionBody(b) => body_stmts.extend(b.stmts),
                ArrowFunctionBody::Expr(e) => body_stmts.push(return_stmt(span, Some(*e))),
                #[cfg(swc_ast_unknown)]
                _ => {}
            }

            arrow.params = vec![Pat::Rest(RestPat {
                span,
                dot3_token: span,
                arg: Box::new(Pat::Ident(BindingIdent {
                    id: args_id,
                    type_ann: None,
                })),
                type_ann: None,
            })];
            arrow.body = Box::new(ArrowFunctionBody::FunctionBody(FunctionBody {
                span,
                stmts: body_stmts,
            }));
            arrow.is_async = false;
            arrow.is_generator = false;
        }

        arrow.visit_mut_children_with(self);
    }

    fn visit_mut_function(&mut self, func: &mut Function) {
        if func.params.iter().any(|p| Self::is_default_param(&p.pat)) {
            let has_this_args = matches!(
                func.params.first().map(|p| &p.pat),
                Some(Pat::Ident(id)) if id.id.sym == "this"
            );

            let mut stmts_to_add: Vec<Stmt> = Vec::new();

            func.params = func
                .params
                .take()
                .into_iter()
                .enumerate()
                .filter_map(|(index, mut param)| {
                    let (new_pat, new_stmts) = self.parse_pattern(
                        param.pat.take(),
                        (index as i64) - if has_this_args { 1 } else { 0 },
                        param.span,
                    );
                    stmts_to_add.extend(new_stmts);
                    param.pat = new_pat?;
                    Some(param)
                })
                .collect();

            if let Some(body) = func.body.as_mut() {
                body.stmts.splice(0..0, stmts_to_add);
            }
        }

        func.visit_mut_children_with(self);
    }
}

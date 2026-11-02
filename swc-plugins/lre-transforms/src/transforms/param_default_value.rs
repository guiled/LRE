use swc_core::common::{Span, util::take::Take};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Visit, VisitMut, VisitMutWith, VisitWith};

use crate::utils::{
    call_ident, func_bind, func_expr, ident, ident_expr, num_lit, param, return_stmt,
    this_expr, undefined_expr, var_decl_pat,
};

const ARG_PREFIX: &str = "_arg";

struct ArrowUsesThis(bool);

impl Visit for ArrowUsesThis {
    fn visit_this_expr(&mut self, _: &ThisExpr) {
        self.0 = true;
    }
}

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

    fn is_undefined_expr(expr: &Expr) -> bool {
        matches!(expr, Expr::Ident(id) if id.sym == *"undefined")
            || matches!(expr, Expr::Unary(u) if u.op == op!("void"))
    }

    fn def_call(span: Span, index: i64, default_val: Expr) -> Expr {
        if Self::is_undefined_expr(&default_val) {
            call_ident(
                span,
                "def",
                vec![ident_expr(span, "arguments"), num_lit(span, index as f64)],
            )
        } else {
            call_ident(
                span,
                "def",
                vec![
                    ident_expr(span, "arguments"),
                    num_lit(span, index as f64),
                    default_val,
                ],
            )
        }
    }

    fn arrow_to_function(&self, arrow: ArrowExpr) -> Expr {
        let span = arrow.span;
        let mut uses_this = ArrowUsesThis(false);
        arrow.body.visit_with(&mut uses_this);
        let has_this = uses_this.0;
        let has_this_args = matches!(
            arrow.params.first(),
            Some(Pat::Ident(id)) if id.id.sym == "this"
        );

        let mut stmts_to_add: Vec<Stmt> = Vec::new();
        let params = arrow
            .params
            .into_iter()
            .enumerate()
            .filter_map(|(index, pat)| {
                let (new_pat, new_stmts) = self.parse_pattern(
                    pat,
                    (index as i64) - if has_this_args { 1 } else { 0 },
                    span,
                );
                stmts_to_add.extend(new_stmts);
                new_pat.map(|pat| param(span, pat))
            })
            .collect();

        let mut body_stmts = match *arrow.body {
            ArrowFunctionBody::FunctionBody(body) => body.stmts,
            ArrowFunctionBody::Expr(expr) => vec![return_stmt(span, Some(*expr))],
            #[cfg(swc_ast_unknown)]
            _ => vec![],
        };
        body_stmts.splice(0..0, stmts_to_add);

        let func = func_expr(span, params, body_stmts);

        if has_this {
            func_bind(span, func, this_expr(span))
        } else {
            func
        }
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
                Some(Self::def_call(span, index, default_val)),
            ));
            new_pat = None;
        }

        (new_pat, stmts)
    }
}

impl VisitMut for ParamDefaultValue {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Expr::Arrow(arrow) = expr {
            if arrow.params.iter().any(|p| Self::is_default_param(p)) {
                *expr = self.arrow_to_function(arrow.take());
            }
        }

        expr.visit_mut_children_with(self);
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

use swc_core::common::Span;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{call_ident, ident_expr, is_member_path, num_lit};

pub struct SimplifyParamDefault;

impl SimplifyParamDefault {
    fn is_undefined_expr(expr: &Expr) -> bool {
        matches!(expr, Expr::Ident(id) if id.sym == *"undefined")
            || matches!(expr, Expr::Unary(u) if u.op == op!("void"))
    }

    fn is_def_call(call: &CallExpr) -> bool {
        matches!(
            &call.callee,
            Callee::Expr(callee) if matches!(callee.as_ref(), Expr::Ident(id) if id.sym == *"def")
        )
    }

    fn is_afr_arguments(expr: &Expr) -> bool {
        let Expr::Call(call) = expr else {
            return false;
        };

        let Callee::Expr(callee) = &call.callee else {
            return false;
        };

        match callee.as_ref() {
            Expr::Ident(id) if id.sym == *"Afr" => {
                call.args.len() == 1
                    && matches!(call.args[0].expr.as_ref(), Expr::Ident(id) if id.sym == *"arguments")
            }
            other if is_member_path(other, "Array.from.call") => {
                call.args.len() == 2
                    && matches!(call.args[0].expr.as_ref(), Expr::Ident(id) if id.sym == *"arguments")
                    && matches!(call.args[1].expr.as_ref(), Expr::Ident(id) if id.sym == *"arguments")
            }
            _ => false,
        }
    }

    fn args_index(expr: &Expr, args_name: &str) -> Option<f64> {
        let Expr::Member(member) = expr else {
            return None;
        };

        if !matches!(member.obj.as_ref(), Expr::Ident(id) if id.sym == *args_name) {
            return None;
        }

        match &member.prop {
            MemberProp::Computed(ComputedPropName { expr, .. }) => {
                if let Expr::Lit(Lit::Num(n)) = expr.as_ref() {
                    Some(n.value)
                } else {
                    None
                }
            }
            _ => None,
        }
    }

    fn binding_ident(pat: &Pat) -> Option<Ident> {
        match pat {
            Pat::Ident(binding) => Some(binding.id.clone()),
            _ => None,
        }
    }

    fn is_ident_expr(expr: &Expr, name: &str) -> bool {
        matches!(expr, Expr::Ident(id) if id.sym == *name)
    }

    fn is_missing_arg_test(expr: &Expr, tmp_name: &str) -> bool {
        match expr {
            Expr::Bin(bin) if matches!(bin.op, op!("===") | op!("==")) => {
                if (Self::is_ident_expr(bin.left.as_ref(), tmp_name)
                    && Self::is_undefined_expr(bin.right.as_ref()))
                    || (Self::is_ident_expr(bin.right.as_ref(), tmp_name)
                        && Self::is_undefined_expr(bin.left.as_ref()))
                {
                    return true;
                }

                if let Expr::Unary(unary) = bin.left.as_ref() {
                    if unary.op == op!("typeof") {
                        return Self::is_ident_expr(unary.arg.as_ref(), tmp_name)
                            && matches!(
                                bin.right.as_ref(),
                                Expr::Lit(Lit::Str(s)) if s.value == *"undefined"
                            );
                    }
                }

                false
            }
            Expr::Call(call) => Self::is_tpo_undefined_check(call, tmp_name),
            _ => false,
        }
    }

    fn is_tpo_undefined_check(call: &CallExpr, tmp_name: &str) -> bool {
        let Callee::Expr(callee) = &call.callee else {
            return false;
        };

        if !matches!(callee.as_ref(), Expr::Ident(id) if id.sym == *"tpo") || call.args.len() != 2 {
            return false;
        }

        Self::is_ident_expr(call.args[0].expr.as_ref(), tmp_name)
            && matches!(call.args[1].expr.as_ref(), Expr::Lit(Lit::Num(n)) if n.value == 1.0)
    }

    fn def_call(span: Span, index: f64, default_val: Option<Expr>) -> Expr {
        let mut args = vec![ident_expr(span, "arguments"), num_lit(span, index)];

        if let Some(default_val) = default_val {
            if !Self::is_undefined_expr(&default_val) {
                args.push(default_val);
            }
        }

        call_ident(span, "def", args)
    }

    fn try_rewrite_afr_var_decl(decls: &mut Vec<VarDeclarator>) -> bool {
        if decls.len() < 2 {
            return false;
        }

        let first = &decls[0];
        let Some(init) = first.init.as_ref() else {
            return false;
        };

        if !Self::is_afr_arguments(init) {
            return false;
        }

        let Some(args_name) = Self::binding_ident(&first.name).map(|id| id.sym.to_string()) else {
            return false;
        };

        let span = first.span;
        let mut bindings: Vec<(Ident, f64, Option<Expr>)> = Vec::new();
        let mut temps: Vec<(String, Ident, f64)> = Vec::new();

        for decl in decls.iter().skip(1) {
            let Some(name) = Self::binding_ident(&decl.name) else {
                return false;
            };
            let Some(init) = decl.init.as_ref() else {
                return false;
            };

            if let Some(index) = Self::args_index(init, &args_name) {
                temps.push((name.sym.to_string(), name, index));
                continue;
            }

            let Expr::Cond(cond) = init.as_ref() else {
                return false;
            };

            let tmp_pos = temps
                .iter()
                .position(|(tmp_name, _, _)| Self::is_ident_expr(cond.alt.as_ref(), tmp_name));
            let Some(tmp_pos) = tmp_pos else {
                return false;
            };

            let (tmp_name, _, index) = temps.remove(tmp_pos);

            if !Self::is_missing_arg_test(cond.test.as_ref(), &tmp_name) {
                return false;
            }

            bindings.push((name, index, Some(*cond.cons.clone())));
        }

        bindings.extend(
            temps
                .into_iter()
                .map(|(_, name, index)| (name, index, None)),
        );

        if bindings.is_empty() {
            return false;
        }

        *decls = bindings
            .into_iter()
            .map(|(name, index, default_val)| VarDeclarator {
                span,
                name: Pat::Ident(BindingIdent {
                    id: name,
                    type_ann: None,
                }),
                init: Some(Box::new(Self::def_call(span, index, default_val))),
                definite: false,
            })
            .collect();

        true
    }
}

impl VisitMut for SimplifyParamDefault {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        call.visit_mut_children_with(self);

        if !Self::is_def_call(call) || call.args.len() != 3 {
            return;
        }

        if !Self::is_undefined_expr(call.args[2].expr.as_ref()) {
            return;
        }

        call.args.pop();
    }

    fn visit_mut_var_declarators(&mut self, decls: &mut Vec<VarDeclarator>) {
        decls.visit_mut_children_with(self);
        Self::try_rewrite_afr_var_decl(decls);
    }
}

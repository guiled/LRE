use swc_core::common::util::take::Take;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{call_ident, num_lit, typeof_expr};

const TYPES: [&str; 7] = ["", "undefined", "string", "object", "function", "number", "boolean"];

fn type_coeff(op: BinaryOp) -> Option<f64> {
    match op {
        op!("===") | op!("==") => Some(1.0),
        op!("!==") | op!("!=") | op!(">") | op!("<") => Some(-1.0),
        _ => None,
    }
}

fn is_type_of_helper(name: &str) -> bool {
    name == "_type_of" || name.starts_with("_type_of")
        && name
            .strip_prefix("_type_of")
            .is_some_and(|suffix| suffix.chars().all(|c| c.is_ascii_digit()))
}

fn is_undefined_string(expr: &Expr) -> bool {
    matches!(expr, Expr::Lit(Lit::Str(s)) if s.value == *"undefined")
}

fn is_tpo_undefined_check(expr: &Expr) -> bool {
    if let Expr::Call(call) = expr {
        if let Callee::Expr(callee) = &call.callee {
            if let Expr::Ident(id) = callee.as_ref() {
                if id.sym == *"tpo" && call.args.len() == 2 {
                    if let Expr::Lit(Lit::Num(n)) = call.args[1].expr.as_ref() {
                        return n.value == 1.0;
                    }
                }
            }
        }
    }

    false
}

fn is_typeof_undefined_bin(expr: &Expr) -> bool {
    if let Expr::Bin(bin) = expr {
        if matches!(bin.op, op!("===") | op!("==")) {
            if matches!(bin.left.as_ref(), Expr::Unary(u) if u.op == op!("typeof")) {
                if let Expr::Lit(Lit::Str(s)) = bin.right.as_ref() {
                    return s.value == *"undefined";
                }
            }
        }
    }

    false
}

fn simplify_typeof_ternary(expr: &mut Expr) {
    if let Expr::Cond(cond) = expr {
        if is_undefined_string(&cond.cons) {
            if matches!(cond.alt.as_ref(), Expr::Unary(u) if u.op == op!("typeof")) {
                if is_tpo_undefined_check(&cond.test) || is_typeof_undefined_bin(&cond.test) {
                    *expr = *cond.alt.take();
                }
            }
        }
    }
}

pub struct NoTypeof;

impl VisitMut for NoTypeof {
    fn visit_mut_stmt(&mut self, stmt: &mut Stmt) {
        if let Stmt::Decl(Decl::Fn(fn_decl)) = stmt {
            if is_type_of_helper(&fn_decl.ident.sym) {
                *stmt = Stmt::Empty(EmptyStmt { span: fn_decl.function.span });
                return;
            }
        }

        stmt.visit_mut_children_with(self);
    }

    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);

        if let Expr::Call(call) = expr {
            if let Callee::Expr(callee) = &call.callee {
                if let Expr::Ident(id) = callee.as_ref() {
                    if is_type_of_helper(&id.sym) && call.args.len() == 1 {
                        let arg = call.args[0].expr.clone();
                        *expr = typeof_expr(call.span, arg);
                    }
                }
            }
        }

        simplify_typeof_ternary(expr);

        if let Expr::Bin(bin) = expr {
            let typeof_op = matches!(bin.left.as_ref(), Expr::Unary(u) if u.op == op!("typeof"));
            if typeof_op {
                if let Some(coeff) = type_coeff(bin.op) {
                    if let Expr::Lit(Lit::Str(s)) = bin.right.as_ref() {
                        let span = bin.span;
                        let mut type_name = s.value.as_wtf8().to_string_lossy().into_owned();
                        let mut coeff = coeff;

                        if type_name == "u" {
                            type_name = "undefined".to_string();
                            bin.op = if bin.op == op!("<") {
                                op!("!==")
                            } else {
                                op!("===")
                            };
                            coeff = type_coeff(bin.op).unwrap_or(coeff);
                        }

                        let type_index = TYPES
                            .iter()
                            .position(|t| *t == type_name)
                            .unwrap_or(0) as f64;

                        let arg = match &mut *bin.left {
                            Expr::Unary(u) => u.arg.take(),
                            _ => return,
                        };
                        *expr = call_ident(
                            span,
                            "tpo",
                            vec![*arg, num_lit(s.span, type_index * coeff)],
                        );
                    }
                }
            }
        }
    }
}

use swc_core::common::util::take::Take;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{
    assign_stmt, call_ident, expr_or_spread, ident_box, ident_expr, member_expr_from_expr,
    undefined_box, var_decl,
};

pub struct NoThrow;

impl VisitMut for NoThrow {
    fn visit_mut_throw_stmt(&mut self, stmt: &mut ThrowStmt) {
        let span = stmt.span;
        let arg = stmt.arg.take();
        *stmt = ThrowStmt {
            span,
            arg: Box::new(call_ident(span, "throwError", vec![*arg])),
        };
    }

    fn visit_mut_catch_clause(&mut self, catch: &mut CatchClause) {
        catch.visit_mut_children_with(self);

        if let Some(param) = &catch.param {
            if let Pat::Ident(binding) = param {
                let span = binding.id.span;
                let param_expr = ident_expr(span, &binding.id.sym);
                let init = Expr::Bin(BinExpr {
                    span,
                    op: op!("||"),
                    left: ident_box(span, "lastException"),
                    right: Box::new(call_ident(
                        span,
                        "newError",
                        vec![Expr::Cond(CondExpr {
                            span,
                            test: Box::new(param_expr.clone()),
                            cons: Box::new(member_expr_from_expr(
                                span,
                                param_expr.clone(),
                                "message",
                            )),
                            alt: undefined_box(span),
                        })],
                    )),
                });

                catch.body.stmts.insert(0, var_decl(span, "_err", Some(init)));
                catch.body.stmts.insert(
                    1,
                    assign_stmt(
                        span,
                        param_expr.clone(),
                        crate::utils::call_expr(
                            span,
                            member_expr_from_expr(span, ident_expr(span, "_err"), "thrownBy"),
                            vec![expr_or_spread(param_expr)],
                        ),
                    ),
                );
            }
        }
    }
}

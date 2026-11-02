use swc_core::common::util::take::Take;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{call_expr, expr_or_spread, member_expr_from_expr};

pub struct ReplaceInOperator;

impl VisitMut for ReplaceInOperator {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);

        if let Expr::Bin(bin) = expr {
            if bin.op == op!("in") {
                let span = bin.span;
                let left = bin.left.take();
                let right = bin.right.take();
                *expr = call_expr(
                    span,
                    member_expr_from_expr(span, *right, "hasOwnProperty"),
                    vec![expr_or_spread(*left)],
                );
            }
        }
    }
}

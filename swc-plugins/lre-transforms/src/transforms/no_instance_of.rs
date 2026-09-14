use swc_core::common::util::take::Take;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::call_ident;

pub struct NoInstanceOf;

impl VisitMut for NoInstanceOf {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);

        if let Expr::Bin(bin) = expr {
            if bin.op == op!("instanceof") {
                let span = bin.span;
                let left = bin.left.take();
                let right = bin.right.take();
                *expr = call_ident(
                    span,
                    "iOf",
                    vec![*left, *right],
                );
            }
        }
    }
}

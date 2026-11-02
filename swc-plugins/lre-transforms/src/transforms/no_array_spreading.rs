use swc_core::common::util::take::Take;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{array_expr, call_expr, expr_or_spread, member_expr_from_expr};

pub struct NoArraySpreading;

impl VisitMut for NoArraySpreading {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);

        if let Expr::Array(arr) = expr {
            let first_spread = arr.elems.iter().position(|e| e.as_ref().and_then(|e| e.spread).is_some());

            if let Some(first_spread_pos) = first_spread {
                let span = arr.span;
                let mut elements = arr.elems.take();
                let prefix: Vec<Option<ExprOrSpread>> =
                    elements.drain(..first_spread_pos).collect();
                let mut second_part: Vec<Option<ExprOrSpread>> = elements;

                let mut concat_args: Vec<ExprOrSpread> = vec![second_part
                    .remove(0)
                    .unwrap()];

                loop {
                    let next_spread = second_part
                        .iter()
                        .position(|e| e.as_ref().and_then(|e| e.spread).is_some());

                    match next_spread {
                        Some(pos) => {
                            if pos > 0 {
                                concat_args.push(expr_or_spread(array_expr(
                                    span,
                                    second_part.drain(..pos).collect(),
                                )));
                            }
                            concat_args.push(second_part.remove(0).unwrap());
                        }
                        None => {
                            if !second_part.is_empty() {
                                concat_args.push(expr_or_spread(array_expr(
                                    span,
                                    second_part,
                                )));
                            }
                            break;
                        }
                    }
                }

                let prefix_array = array_expr(span, prefix);
                *expr = call_expr(
                    span,
                    member_expr_from_expr(span, prefix_array, "concat"),
                    concat_args,
                );
            }
        }
    }
}

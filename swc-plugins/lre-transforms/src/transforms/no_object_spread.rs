use swc_core::common::util::take::Take;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{expr_or_spread, object_assign_call, object_expr};

pub struct NoObjectSpread;

impl VisitMut for NoObjectSpread {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);

        if let Expr::Object(obj) = expr {
            if !obj.props.iter().any(|p| matches!(p, PropOrSpread::Spread(_))) {
                return;
            }

            let span = obj.span;
            let props = obj.props.take();
            let mut assign_args: Vec<ExprOrSpread> = vec![expr_or_spread(object_expr(span, vec![]))];
            let mut tmp_props: Vec<PropOrSpread> = Vec::new();

            for prop in props {
                if let PropOrSpread::Spread(spread) = prop {
                    if !tmp_props.is_empty() {
                        assign_args.push(expr_or_spread(object_expr(span, tmp_props.clone())));
                        tmp_props.clear();
                    }
                    assign_args.push(expr_or_spread(*spread.expr));
                } else {
                    tmp_props.push(prop);
                }
            }

            if !tmp_props.is_empty() {
                assign_args.push(expr_or_spread(object_expr(span, tmp_props)));
            }

            *expr = object_assign_call(span, assign_args);
        }
    }
}

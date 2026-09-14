use swc_core::common::util::take::Take;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{array_expr, call_expr, expr_or_spread, fn_apply, member_expr_from_expr, spread_to_concat};

pub struct NoSpreadArgument;

impl VisitMut for NoSpreadArgument {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        call.visit_mut_children_with(self);

        if !call.args.iter().any(|a| a.spread.is_some()) {
            return;
        }

        if matches!(call.callee, Callee::Super(_) | Callee::Import(_)) {
            return;
        }

        let span = call.span;
        let callee = match &call.callee {
            Callee::Expr(e) => e.clone(),
            _ => return,
        };
        let args = call.args.take();

        if let Expr::Member(m) = callee.as_ref() {
            if let MemberProp::Ident(ident) = &m.prop {
                if (ident.sym == *"call" || ident.sym == *"apply") && !args.is_empty() {
                    let this_arg = *args[0].expr.clone();
                    let fn_expr = *m.obj.clone();
                    let remaining = args[1..].to_vec();
                    let call_arg = build_apply_args(span, remaining);

                    let new_call = fn_apply(span, fn_expr, Some(this_arg), vec![call_arg]);
                    *call = match new_call {
                        Expr::Call(c) => c,
                        _ => return,
                    };
                    return;
                }
            }
        }

        let call_arg = build_apply_args(span, args);

        let this_arg = if let Expr::Member(m) = callee.as_ref() {
            Some(*m.obj.clone())
        } else {
            None
        };

        let new_call = fn_apply(span, *callee, this_arg, vec![call_arg]);
        *call = match new_call {
            Expr::Call(c) => c,
            _ => return,
        };
    }
}

fn build_apply_args(span: swc_core::common::Span, args: Vec<ExprOrSpread>) -> ExprOrSpread {
    if args.len() == 1 {
        args[0].clone()
    } else {
        let (array_init, concat_args) = spread_to_concat(span, &args);
        let obj = array_expr(span, array_init.into_iter().map(Some).collect());
        expr_or_spread(call_expr(
            span,
            member_expr_from_expr(span, obj, "concat"),
            concat_args,
        ))
    }
}

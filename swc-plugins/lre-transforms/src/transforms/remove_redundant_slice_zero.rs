use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::is_member_path;

pub struct RemoveRedundantSliceZero;

impl VisitMut for RemoveRedundantSliceZero {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);

        let Expr::Call(slice_call) = expr else {
            return;
        };

        if !is_slice_zero(slice_call) {
            return;
        }

        let Callee::Expr(callee) = &slice_call.callee else {
            return;
        };

        let Expr::Member(member) = callee.as_ref() else {
            return;
        };

        if is_afr_arguments(member.obj.as_ref()) {
            *expr = *member.obj.clone();
        }
    }
}

fn is_slice_zero(call: &CallExpr) -> bool {
    let Callee::Expr(callee) = &call.callee else {
        return false;
    };

    let Expr::Member(member) = callee.as_ref() else {
        return false;
    };

    if !matches!(member.prop, MemberProp::Ident(ref id) if id.sym == *"slice") {
        return false;
    }

    match call.args.as_slice() {
        [ExprOrSpread { expr, spread: None, .. }] => {
            matches!(expr.as_ref(), Expr::Lit(Lit::Num(n)) if n.value == 0.0)
        }
        _ => false,
    }
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
            call.args.len() == 1 && is_arguments_ident(call.args[0].expr.as_ref())
        }
        other if is_member_path(other, "Array.from.call") => {
            call.args.len() == 2
                && is_arguments_ident(call.args[0].expr.as_ref())
                && is_arguments_ident(call.args[1].expr.as_ref())
        }
        _ => false,
    }
}

fn is_arguments_ident(expr: &Expr) -> bool {
    matches!(expr, Expr::Ident(id) if id.sym == *"arguments")
}

use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::member_expr_from_expr;

pub struct FixArrayFromArguments;

impl VisitMut for FixArrayFromArguments {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        call.visit_mut_children_with(self);

        if let Callee::Expr(callee) = &call.callee {
            if is_array_from(callee.as_ref()) {
                let span = call.span;
                let args = call.args.clone();
                call.callee = Callee::Expr(Box::new(member_expr_from_expr(
                    span,
                    *callee.clone(),
                    "call",
                )));
                call.args = args;
            }
        }
    }
}

fn is_array_from(expr: &Expr) -> bool {
    matches!(
        expr,
        Expr::Member(m)
            if matches!(m.obj.as_ref(), Expr::Ident(id) if id.sym == "Array")
            && matches!(m.prop, MemberProp::Ident(ref p) if p.sym == "from")
    )
}

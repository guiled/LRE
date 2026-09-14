use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{call_ident, is_member_path};

pub struct CodeAliases;

impl VisitMut for CodeAliases {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);

        if let Expr::Call(call) = expr {
            let span = call.span;
            let args = call.args.clone();

            let aliases = [
                ("Object.prototype.hasOwnProperty.call", "OhO"),
                ("Object.keys", "Obk"),
                ("Object.values", "Obv"),
                ("Object.assign", "Oba"),
                ("Array.from.call", "Afr"),
                ("Array.isArray", "Ais"),
            ];

            if let Callee::Expr(callee) = &call.callee {
                for (original, alias) in aliases {
                    if is_member_path(callee.as_ref(), original) {
                        *expr = call_ident(span, alias, args.into_iter().map(|a| *a.expr).collect());
                        return;
                    }
                }
            }
        }
    }
}

use swc_core::common::Spanned;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{str_lit, typeof_expr, undefined_expr};

pub struct NoVoid0;

impl VisitMut for NoVoid0 {
    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Expr::Unary(unary) = expr {
            if unary.op == op!("void") {
                *expr = undefined_expr(unary.span);
                return;
            }
        }

        expr.visit_mut_children_with(self);
    }

    fn visit_mut_bin_expr(&mut self, bin: &mut BinExpr) {
        bin.visit_mut_children_with(self);

        let (obj, void_side) = if matches!(bin.right.as_ref(), Expr::Unary(u) if u.op == op!("void")) {
            (bin.left.as_ref(), bin.right.as_ref())
        } else if matches!(bin.left.as_ref(), Expr::Unary(u) if u.op == op!("void")) {
            (bin.right.as_ref(), bin.left.as_ref())
        } else {
            return;
        };

        let span = bin.span;
        let void_span = void_side.span();
        let obj_expr = obj.clone();
        bin.op = op!("===");
        bin.left = Box::new(typeof_expr(span, Box::new(obj_expr)));
        bin.right = Box::new(str_lit(void_span, "undefined"));
    }

    fn visit_mut_assign_expr(&mut self, assign: &mut AssignExpr) {
        if matches!(assign.right.as_ref(), Expr::Unary(u) if u.op == op!("void")) {
            assign.right = Box::new(undefined_expr(assign.span));
        }
        assign.visit_mut_children_with(self);
    }

    fn visit_mut_var_declarator(&mut self, decl: &mut VarDeclarator) {
        if let Some(init) = &decl.init {
            if matches!(init.as_ref(), Expr::Unary(u) if u.op == op!("void")) {
                decl.init = Some(Box::new(undefined_expr(init.as_ref().span())));
            }
        }
        decl.visit_mut_children_with(self);
    }
}

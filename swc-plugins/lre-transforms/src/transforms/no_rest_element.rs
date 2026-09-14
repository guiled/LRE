use swc_core::common::{Span, Spanned, util::take::Take};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{
    array_from_arguments, call_expr, expr_or_spread, func_bind, func_expr,
    member_expr_from_expr, num_lit, param, return_stmt, this_box, var_decl_pat,
};

pub struct NoRestElement {
    has_this: bool,
}

impl NoRestElement {
    pub fn new() -> Self {
        Self { has_this: false }
    }

    fn rest_var_decl(&self, span: Span, pat: Pat, slice_from: f64) -> Stmt {
        let init = if slice_from == 0.0 {
            array_from_arguments(span)
        } else {
            call_expr(
                span,
                member_expr_from_expr(span, array_from_arguments(span), "slice"),
                vec![expr_or_spread(num_lit(span, slice_from))],
            )
        };

        var_decl_pat(span, pat, Some(init))
    }
}

impl VisitMut for NoRestElement {
    fn visit_mut_this_expr(&mut self, _: &mut ThisExpr) {
        self.has_this = true;
    }

    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Expr::Arrow(arrow) = expr {
            if !arrow.params.is_empty() {
                if let Pat::Rest(_) = arrow.params.last().unwrap() {
                    let span = arrow.span;
                    let saved_has_this = self.has_this;
                    self.has_this = false;
                    arrow.body.visit_mut_with(self);
                    let has_this = self.has_this;
                    self.has_this = saved_has_this;

                    let rest_pat = arrow.params.pop().unwrap();
                    let rest = match rest_pat {
                        Pat::Rest(r) => *r.arg,
                        _ => unreachable!(),
                    };

                    let body_span = match arrow.body.as_ref() {
                        ArrowFunctionBody::FunctionBody(b) => b.span,
                        ArrowFunctionBody::Expr(e) => e.span(),
                        #[cfg(swc_ast_unknown)]
                        _ => span,
                    };

                    let mut stmts = match *arrow.body.take() {
                        ArrowFunctionBody::FunctionBody(b) => b.stmts,
                        ArrowFunctionBody::Expr(e) => vec![return_stmt(body_span, Some(*e))],
                        #[cfg(swc_ast_unknown)]
                        _ => vec![],
                    };

                    stmts.insert(
                        0,
                        self.rest_var_decl(rest.span(), rest, arrow.params.len() as f64),
                    );

                    let params: Vec<Param> = arrow
                        .params
                        .drain(..)
                        .map(|p| param(span, p))
                        .collect();

                    let func = func_expr(span, params, stmts);

                    *expr = if has_this {
                        func_bind(span, func, *this_box(span))
                    } else {
                        func
                    };
                    return;
                }
            }
        }

        expr.visit_mut_children_with(self);
    }

    fn visit_mut_function(&mut self, func: &mut Function) {
        let saved_has_this = self.has_this;
        self.has_this = false;

        if let Some(body) = func.body.as_mut() {
            if !func.params.is_empty() {
                let has_this_args = matches!(
                    func.params.first().map(|p| &p.pat),
                    Some(Pat::Ident(id)) if id.id.sym == "this"
                );

                if let Pat::Rest(rest) = &func.params.last().unwrap().pat {
                    let span = func.params.last().unwrap().span;
                    let rest_pat = rest.arg.clone();
                    func.params.pop();
                    let slice_from =
                        func.params.len() as f64 - if has_this_args { 1.0 } else { 0.0 };
                    body.stmts.insert(
                        0,
                        self.rest_var_decl(span, *rest_pat, slice_from),
                    );
                }
            }
        }

        func.visit_mut_children_with(self);
        self.has_this = saved_has_this;
    }
}

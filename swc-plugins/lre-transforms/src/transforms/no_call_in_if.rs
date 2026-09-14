use swc_core::common::util::take::Take;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{const_decl, ident_expr};

pub struct NoCallInIf {
    has_call: bool,
}

impl NoCallInIf {
    pub fn new() -> Self {
        Self { has_call: false }
    }
}

impl VisitMut for NoCallInIf {
    fn visit_mut_stmt(&mut self, stmt: &mut Stmt) {
        if let Stmt::If(if_stmt) = stmt {
            self.has_call = false;
            if_stmt.test.visit_mut_with(&mut CallDetector {
                has_call: &mut self.has_call,
            });

            if self.has_call {
                let span = if_stmt.span;
                let test = if_stmt.test.take();
                let cons = if_stmt.cons.take();
                let alt = if_stmt.alt.take();

                *stmt = Stmt::Block(BlockStmt {
                    span,
                    stmts: vec![
                        const_decl(span, "_c", Some(*test)),
                        Stmt::If(IfStmt {
                            span,
                            test: Box::new(ident_expr(span, "_c")),
                            cons,
                            alt,
                        }),
                    ],
                    ctxt: Default::default(),
                });
            }
        }

        stmt.visit_mut_children_with(self);
    }
}

struct CallDetector<'a> {
    has_call: &'a mut bool,
}

impl VisitMut for CallDetector<'_> {
    fn visit_mut_call_expr(&mut self, _: &mut CallExpr) {
        *self.has_call = true;
    }
}

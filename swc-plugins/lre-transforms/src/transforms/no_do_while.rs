use swc_core::common::util::take::Take;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{bool_lit, ident_expr, ident_pat, paren_expr};

pub struct NoDoWhile;

impl VisitMut for NoDoWhile {
    fn visit_mut_stmt(&mut self, stmt: &mut Stmt) {
        if let Stmt::DoWhile(do_while) = stmt {
            let span = do_while.span;
            let test = do_while.test.take();
            let body = do_while.body.take();

            *stmt = Stmt::For(ForStmt {
                span,
                init: Some(VarDeclOrExpr::VarDecl(Box::new(VarDecl {
                    span,
                    ctxt: Default::default(),
                    kind: VarDeclKind::Let,
                    declare: false,
                    decls: vec![VarDeclarator {
                        span,
                        name: ident_pat(span, "__doWhileFlag"),
                        init: Some(Box::new(bool_lit(span, true))),
                        definite: false,
                    }],
                }))),
                test: Some(Box::new(Expr::Bin(BinExpr {
                    span,
                    op: op!("||"),
                    left: Box::new(ident_expr(span, "__doWhileFlag")),
                    right: Box::new(paren_expr(
                        span,
                        paren_expr(span, *test),
                    )),
                }))),
                update: Some(Box::new(Expr::Assign(AssignExpr {
                    span,
                    op: op!("="),
                    left: crate::utils::assign_target(ident_expr(
                        span,
                        "__doWhileFlag",
                    )),
                    right: Box::new(bool_lit(span, false)),
                }))),
                body,
            });
        }

        stmt.visit_mut_children_with(self);
    }
}


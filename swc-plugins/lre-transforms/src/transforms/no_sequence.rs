use swc_core::common::Spanned;
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{call_ident, expr_stmt, return_stmt};

pub struct NoSequence;

impl VisitMut for NoSequence {
    fn visit_mut_module_items(&mut self, items: &mut Vec<ModuleItem>) {
        for item in items.iter_mut() {
            self.visit_mut_module_item(item);
        }
    }

    fn visit_mut_stmts(&mut self, stmts: &mut Vec<Stmt>) {
        let mut new_stmts: Vec<Stmt> = Vec::new();

        for stmt in stmts.drain(..) {
            if let Stmt::Expr(expr_stmt) = &stmt {
                if let Expr::Seq(seq) = expr_stmt.expr.as_ref() {
                    for expr in &seq.exprs {
                        new_stmts.push(crate::utils::expr_stmt(
                            expr.as_ref().span(),
                            *expr.clone(),
                        ));
                    }
                    continue;
                }
            }
            new_stmts.push(stmt);
        }

        for stmt in new_stmts.iter_mut() {
            stmt.visit_mut_with(self);
        }

        *stmts = new_stmts;
    }

    fn visit_mut_if_stmt(&mut self, stmt: &mut IfStmt) {
        if let Expr::Seq(seq) = stmt.test.as_ref() {
            stmt.test = Box::new(transform_to_la(seq.clone()));
        }

        if let Stmt::Expr(conseq) = stmt.cons.as_ref() {
            if let Expr::Seq(seq) = conseq.expr.as_ref() {
                stmt.cons = Box::new(Stmt::Expr(ExprStmt {
                    span: conseq.span,
                    expr: Box::new(transform_to_la(seq.clone())),
                }));
            }
        }

        if let Some(alt_stmt) = stmt.alt.as_ref() {
            if let Stmt::Expr(alternate) = alt_stmt.as_ref() {
                if let Expr::Seq(seq) = alternate.expr.as_ref() {
                    stmt.alt = Some(Box::new(Stmt::Expr(ExprStmt {
                        span: alternate.span,
                        expr: Box::new(transform_to_la(seq.clone())),
                    })));
                }
            }
        }

        stmt.visit_mut_children_with(self);
    }

    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Expr::Paren(paren) = expr {
            if let Expr::Seq(seq) = &mut *paren.expr {
                for nested in &mut seq.exprs {
                    nested.visit_mut_with(self);
                }
                *expr = transform_to_la(seq.clone());
                return;
            }
        }

        expr.visit_mut_children_with(self);
    }

    fn visit_mut_stmt(&mut self, stmt: &mut Stmt) {
        if let Stmt::Return(ret) = stmt {
            if let Some(arg) = ret.arg.as_ref() {
                if let Expr::Seq(seq) = arg.as_ref() {
                    let span = seq.span;
                    let mut exprs = seq.exprs.clone();
                    let last = exprs.pop().unwrap();
                    let mut stmts: Vec<Stmt> = exprs
                        .into_iter()
                        .map(|e| expr_stmt(e.as_ref().span(), *e.clone()))
                        .collect();
                    stmts.push(return_stmt(span, Some(*last)));
                    *stmt = Stmt::Block(BlockStmt {
                        span,
                        stmts,
                        ctxt: Default::default(),
                    });
                }
            }
        }

        stmt.visit_mut_children_with(self);
    }

    fn visit_mut_for_stmt(&mut self, stmt: &mut ForStmt) {
        transform_seq_expr_body(&mut stmt.body);
        stmt.visit_mut_children_with(self);
    }

    fn visit_mut_for_in_stmt(&mut self, stmt: &mut ForInStmt) {
        transform_seq_expr_body(&mut stmt.body);
        stmt.visit_mut_children_with(self);
    }

    fn visit_mut_for_of_stmt(&mut self, stmt: &mut ForOfStmt) {
        transform_seq_expr_body(&mut stmt.body);
        stmt.visit_mut_children_with(self);
    }
}

fn transform_seq_expr_body(body: &mut Box<Stmt>) {
    if let Stmt::Expr(body_expr) = body.as_ref() {
        if let Expr::Seq(seq) = body_expr.expr.as_ref() {
            *body = Box::new(seq_expr_to_block_stmt(seq.clone()));
        }
    }
}

fn seq_expr_to_block_stmt(seq: SeqExpr) -> Stmt {
    let span = seq.span;
    let mut exprs = seq.exprs;
    let last = exprs.pop().unwrap();
    let mut stmts: Vec<Stmt> = exprs
        .into_iter()
        .map(|e| expr_stmt(e.as_ref().span(), *e))
        .collect();
    stmts.push(expr_stmt(last.as_ref().span(), *last));
    Stmt::Block(BlockStmt {
        span,
        stmts,
        ctxt: Default::default(),
    })
}

fn transform_to_la(seq: SeqExpr) -> Expr {
    let span = seq.span;
    call_ident(
        span,
        "la",
        seq.exprs.into_iter().map(|e| *e).collect(),
    )
}

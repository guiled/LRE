use swc_core::common::{Span, util::take::Take};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{array_expr, expr_or_spread, expr_stmt, ident_expr};

pub struct MixinToAssign {
    mixin_classes: Option<Vec<ExprOrSpread>>,
    constructor_found: bool,
    super_found: bool,
}

impl MixinToAssign {
    pub fn new() -> Self {
        Self {
            mixin_classes: None,
            constructor_found: false,
            super_found: false,
        }
    }

    fn get_super_args(&self, span: Span, args: Vec<ExprOrSpread>) -> Vec<ExprOrSpread> {
        let mut result = vec![expr_or_spread(array_expr(
            span,
            self.mixin_classes
                .as_ref()
                .unwrap()
                .iter()
                .cloned()
                .map(Some)
                .collect(),
        ))];
        result.extend(args);
        result
    }

    fn create_super_call(&self, span: Span) -> Stmt {
        expr_stmt(
            span,
            Expr::Call(CallExpr {
                span,
                ctxt: Default::default(),
                callee: Callee::Super(Super { span }),
                args: self.get_super_args(span, vec![]),
                type_args: None,
            }),
        )
    }

    fn is_mixin_call(expr: &Expr) -> Option<&CallExpr> {
        if let Expr::Call(call) = expr {
            if let Callee::Expr(callee) = &call.callee {
                if let Expr::Ident(id) = callee.as_ref() {
                    if id.sym == "Mixin" {
                        return Some(call);
                    }
                }
            }
        }
        None
    }

    fn get_mixin_call(expr: &Expr) -> Option<&CallExpr> {
        if let Some(call) = Self::is_mixin_call(expr) {
            return Some(call);
        }
        match expr {
            Expr::Paren(p) => Self::get_mixin_call(p.expr.as_ref()),
            Expr::TsAs(ts) => Self::get_mixin_call(ts.expr.as_ref()),
            _ => None,
        }
    }

    fn is_super_call_expr(expr: &Expr) -> bool {
        matches!(
            expr,
            Expr::Call(c) if matches!(c.callee, Callee::Super(_))
        )
    }

    /// Mixin factories must be invoked before `mx` can instantiate them.
    fn normalize_mixin_arg(expr: Expr) -> Expr {
        let (span, callee) = match expr {
            Expr::TsInstantiation(inst) => (inst.span, inst.expr),
            Expr::Ident(id) => (id.span, Box::new(Expr::Ident(id))),
            other => return other,
        };

        Expr::Call(CallExpr {
            span,
            ctxt: Default::default(),
            callee: Callee::Expr(callee),
            args: vec![],
            type_args: None,
        })
    }

    fn normalize_mixin_args(args: Vec<ExprOrSpread>) -> Vec<ExprOrSpread> {
        args.into_iter()
            .map(|arg| ExprOrSpread {
                spread: arg.spread,
                expr: Box::new(Self::normalize_mixin_arg(*arg.expr)),
            })
            .collect()
    }
}

impl VisitMut for MixinToAssign {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        if self.mixin_classes.is_some() && matches!(call.callee, Callee::Super(_)) {
            self.super_found = true;
            call.args = self.get_super_args(call.span, call.args.take());
        }
        call.visit_mut_children_with(self);
    }

    fn visit_mut_class(&mut self, class: &mut Class) {
        if let Some(super_class) = class.super_class.take() {
            if let Some(mixin) = Self::get_mixin_call(super_class.as_ref()) {
                let prev_mixin = self.mixin_classes.take();
                let prev_ctor = self.constructor_found;
                self.constructor_found = false;
                self.mixin_classes = Some(Self::normalize_mixin_args(mixin.args.clone()));

                class.super_class = Some(Box::new(ident_expr(class.span, "mx")));

                class.visit_mut_children_with(self);

                if !self.constructor_found {
                    class.body.push(ClassMember::Constructor(Constructor {
                        span: class.span,
                        key: PropName::Ident(IdentName::new("constructor".into(), class.span)),
                        params: vec![],
                        body: Some(FunctionBody {
                            span: class.span,
                            stmts: vec![self.create_super_call(class.span)],
                        }),
                        accessibility: None,
                        is_optional: false,
                        ctxt: Default::default(),
                    }));
                }

                self.mixin_classes = prev_mixin;
                self.constructor_found = prev_ctor;
                return;
            }
            class.super_class = Some(super_class);
        }

        class.visit_mut_children_with(self);
    }

    fn visit_mut_constructor(&mut self, ctor: &mut Constructor) {
        if self.mixin_classes.is_none() {
            ctor.visit_mut_children_with(self);
            return;
        }

        self.constructor_found = true;
        let saved_super = self.super_found;
        self.super_found = false;

        ctor.visit_mut_children_with(self);

        if let Some(body) = &mut ctor.body {
            if !self.super_found {
                body.stmts.insert(0, self.create_super_call(ctor.span));
            }
        }

        self.super_found = saved_super;
    }

    fn visit_mut_arrow_expr(&mut self, arrow: &mut ArrowExpr) {
        if Self::is_mixable(arrow) {
            if let ArrowFunctionBody::Expr(body) = &mut *arrow.body {
                if let Expr::Class(class_expr) = body.as_mut() {
                    Self::transform_mixable(&mut class_expr.class);
                }
            }
        }
        arrow.visit_mut_children_with(self);
    }
}

impl MixinToAssign {
    fn is_mixable(arrow: &ArrowExpr) -> bool {
        match arrow.params.first() {
            Some(Pat::Ident(id)) => id.id.sym == "superclass",
            Some(Pat::Assign(a)) => {
                matches!(a.left.as_ref(), Pat::Ident(id) if id.id.sym == "superclass")
            }
            _ => false,
        }
    }

    fn transform_mixable(class: &mut Class) {
        if let Some(super_class) = class.super_class.as_ref() {
            if let Expr::Ident(id) = super_class.as_ref() {
            if &*id.sym == "superclass" {
                class.super_class = None;
                if let Some(ctor) = class
                    .body
                    .iter_mut()
                    .find_map(|m| {
                        if let ClassMember::Constructor(c) = m {
                            Some(c)
                        } else {
                            None
                        }
                    })
                {
                    if let Some(body) = &mut ctor.body {
                        body.stmts.retain(|s| {
                            !matches!(s, Stmt::Expr(es) if Self::is_super_call_expr(es.expr.as_ref()))
                        });
                    }
                }
            }
            }
        }
    }
}

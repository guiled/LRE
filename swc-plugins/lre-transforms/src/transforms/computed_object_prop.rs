use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{
    assign_stmt, computed_member, iife, let_decl, return_stmt,
};

pub struct ComputedObjectProp {
    has_this: bool,
}

impl ComputedObjectProp {
    pub fn new() -> Self {
        Self { has_this: false }
    }
}

impl VisitMut for ComputedObjectProp {
    fn visit_mut_this_expr(&mut self, _: &mut ThisExpr) {
        self.has_this = true;
    }

    fn visit_mut_function(&mut self, func: &mut Function) {
        let saved = self.has_this;
        func.visit_mut_children_with(self);
        self.has_this = saved;
    }

    fn visit_mut_class(&mut self, class: &mut Class) {
        let saved = self.has_this;
        class.visit_mut_children_with(self);
        self.has_this = saved;
    }

    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        expr.visit_mut_children_with(self);

        if let Expr::Object(obj) = expr {
            let computed: Vec<(ComputedPropName, Box<Expr>)> = obj
                .props
                .iter()
                .filter_map(|p| {
                    if let PropOrSpread::Prop(prop) = p {
                        if let Prop::KeyValue(kv) = prop.as_ref() {
                            if let PropName::Computed(key) = &kv.key {
                                return Some((key.clone(), kv.value.clone()));
                            }
                        }
                    }
                    None
                })
                .collect();

            if computed.is_empty() {
                return;
            }

            let span = obj.span;
            let static_props: Vec<PropOrSpread> = obj
                .props
                .iter()
                .filter(|p| {
                    !matches!(
                        p,
                        PropOrSpread::Prop(prop)
                            if matches!(prop.as_ref(), Prop::KeyValue(kv) if matches!(kv.key, PropName::Computed(_)))
                    )
                })
                .cloned()
                .collect();

            let mut stmts = vec![let_decl(
                span,
                "o",
                Some(Expr::Object(ObjectLit {
                    span,
                    props: static_props,
                })),
            )];

            for (key, value) in computed {
                stmts.push(assign_stmt(
                    span,
                    computed_member(span, crate::utils::ident_box(span, "o"), key.expr),
                    *value,
                ));
            }

            stmts.push(return_stmt(span, Some(crate::utils::ident_expr(span, "o"))));

            *expr = iife(span, stmts, self.has_this);
        }
    }
}

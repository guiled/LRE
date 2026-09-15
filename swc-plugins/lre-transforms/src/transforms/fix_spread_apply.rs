use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{
    array_expr, call_expr, expr_or_spread, fn_apply, member_expr_from_expr, paren_expr,
    this_expr,
};

pub struct FixSpreadApply {
    in_apply_second_arg: bool,
}

impl FixSpreadApply {
    pub fn new() -> Self {
        Self {
            in_apply_second_arg: false,
        }
    }
}

impl Default for FixSpreadApply {
    fn default() -> Self {
        Self::new()
    }
}

impl VisitMut for FixSpreadApply {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        if is_member_apply_call(call) {
            if let Callee::Expr(callee) = &mut call.callee {
                callee.visit_mut_with(self);
            }
            for (index, arg) in call.args.iter_mut().enumerate() {
                let previous = self.in_apply_second_arg;
                self.in_apply_second_arg = index == 1;
                arg.visit_mut_with(self);
                self.in_apply_second_arg = previous;
            }
        } else {
            call.visit_mut_children_with(self);
        }

        if try_fix_double_apply(call, self.in_apply_second_arg) {
            return;
        }

        try_fix_wrong_this_apply(call);
    }
}

fn try_fix_double_apply(call: &mut CallExpr, nested_in_apply: bool) -> bool {
    let (var_id, assignment_rhs, concat_call) = match parse_double_apply(call) {
        Some(parsed) => parsed,
        None => return false,
    };

    let span = call.span;
    let rest_arg = match get_rest_arg_from_concat(&concat_call) {
        Some(arg) => arg,
        None => return false,
    };

    let concat_inner = get_concat_inner_arg(&concat_call);
    let inner = get_inner_from_assignment(assignment_rhs.as_ref(), concat_inner.as_ref());

    let replacement = match inner {
        InnerKind::ArrayCopy => build_concat_call(span, None, rest_arg),
        InnerKind::WithInner(inner_expr) if nested_in_apply => {
            build_concat_call(span, Some(inner_expr), rest_arg)
        }
        InnerKind::WithInner(inner_expr)
            if matches!(inner_expr, Expr::This(_)) && !nested_in_apply =>
        {
            Expr::Call(build_assign_apply(
                span,
                var_id.clone(),
                assignment_rhs,
                this_expr(span),
                vec![expr_or_spread(rest_arg)],
            ))
        }
        InnerKind::WithInner(inner_expr) if !nested_in_apply => {
            let concat = build_concat_call(span, Some(inner_expr), rest_arg);
            Expr::Call(build_assign_apply(
                span,
                var_id.clone(),
                assignment_rhs,
                Expr::Ident(var_id.clone()),
                vec![expr_or_spread(concat)],
            ))
        }
        InnerKind::WithInner(inner_expr) => build_concat_call(span, Some(inner_expr), rest_arg),
    };

    *call = match replacement {
        Expr::Call(fixed) => fixed,
        _ => return false,
    };

    true
}

fn try_fix_wrong_this_apply(call: &mut CallExpr) -> bool {
    if parse_double_apply(call).is_some() {
        return false;
    }

    let member = match callee_member(call) {
        Some(member) => member,
        None => return false,
    };

    if !is_apply_prop(&member.prop) {
        return false;
    }

    let (var_id, assignment_rhs) = match extract_assign_from_expr(member.obj.as_ref()) {
        Some(parsed) => parsed,
        None => return false,
    };

    if call.args.len() != 2 {
        return false;
    }

    if !ident_matches(call.args[0].expr.as_ref(), &var_id) {
        return false;
    }

    let concat_call = match call.args[1].expr.as_ref() {
        Expr::Call(call_expr) => call_expr,
        _ => return false,
    };

    if !is_empty_array_concat_callee(&concat_call.callee) || concat_call.args.len() != 2 {
        return false;
    }

    if !is_this_array(concat_call.args[0].expr.as_ref()) {
        return false;
    }

    let span = call.span;
    let rest_arg = *concat_call.args[1].expr.clone();
    *call = build_assign_apply(
        span,
        var_id,
        assignment_rhs,
        this_expr(span),
        vec![expr_or_spread(rest_arg)],
    );

    true
}

enum InnerKind {
    ArrayCopy,
    WithInner(Expr),
}

fn parse_double_apply(call: &CallExpr) -> Option<(Ident, Box<Expr>, CallExpr)> {
    let outer_member = callee_member(call)?;

    if !is_apply_prop(&outer_member.prop) {
        return None;
    }

    let inner_member = match outer_member.obj.as_ref() {
        Expr::Member(member) => member,
        _ => return None,
    };

    if !is_apply_prop(&inner_member.prop) {
        return None;
    }

    let (var_id, assignment_rhs) = extract_assign_from_expr(inner_member.obj.as_ref())?;

    if call.args.len() != 2 {
        return None;
    }

    if !ident_matches(call.args[0].expr.as_ref(), &var_id) {
        return None;
    }

    let concat_call = match call.args[1].expr.as_ref() {
        Expr::Call(call_expr) => call_expr.clone(),
        _ => return None,
    };

    if !is_empty_array_concat_callee(&concat_call.callee) {
        return None;
    }

    Some((var_id, assignment_rhs, concat_call))
}

fn get_inner_from_assignment(assignment_rhs: &Expr, concat_inner: Option<&Expr>) -> InnerKind {
    if is_empty_array_concat_expr(assignment_rhs) {
        return InnerKind::ArrayCopy;
    }

    if let Some(inner) = single_element_array_concat_inner(assignment_rhs) {
        return InnerKind::WithInner(inner);
    }

    if let Some(inner) = concat_inner {
        return InnerKind::WithInner(inner.clone());
    }

    InnerKind::ArrayCopy
}

fn get_concat_inner_arg(concat_call: &CallExpr) -> Option<Expr> {
    let first = concat_call.args.first()?;

    match first.expr.as_ref() {
        Expr::Array(array) => {
            if array.elems.len() == 1 {
                if let Some(Some(element)) = array.elems.first() {
                    return Some(*element.expr.clone());
                }
            }
            Some(first.expr.as_ref().clone())
        }
        other => Some(other.clone()),
    }
}

fn get_rest_arg_from_concat(concat_call: &CallExpr) -> Option<Expr> {
    concat_call
        .args
        .last()
        .map(|arg| *arg.expr.clone())
}

fn build_concat_call(span: swc_core::common::Span, inner: Option<Expr>, rest: Expr) -> Expr {
    let empty_array = array_expr(span, vec![]);
    let mut args = Vec::new();

    if let Some(inner_expr) = inner {
        args.push(expr_or_spread(array_expr(
            span,
            vec![Some(expr_or_spread(inner_expr))],
        )));
    }

    args.push(expr_or_spread(rest));

    call_expr(
        span,
        member_expr_from_expr(span, empty_array, "concat"),
        args,
    )
}

fn build_assign_apply(
    span: swc_core::common::Span,
    var_id: Ident,
    assignment_rhs: Box<Expr>,
    this_arg: Expr,
    args: Vec<ExprOrSpread>,
) -> CallExpr {
    let assign = Expr::Assign(AssignExpr {
        span,
        op: op!("="),
        left: AssignTarget::Simple(SimpleAssignTarget::Ident(BindingIdent {
            id: var_id,
            type_ann: None,
        })),
        right: assignment_rhs,
    });

    match fn_apply(span, paren_expr(span, assign), Some(this_arg), args) {
        Expr::Call(call) => call,
        _ => CallExpr {
            span,
            ctxt: Default::default(),
            callee: Callee::Expr(Box::new(null_expr(span))),
            args: vec![],
            type_args: None,
        },
    }
}

fn null_expr(span: swc_core::common::Span) -> Expr {
    Expr::Lit(Lit::Null(Null { span }))
}

fn extract_assign_from_expr(expr: &Expr) -> Option<(Ident, Box<Expr>)> {
    let unwrapped = match expr {
        Expr::Paren(paren) => paren.expr.as_ref(),
        other => other,
    };

    match unwrapped {
        Expr::Assign(assign) => {
            if let AssignTarget::Simple(SimpleAssignTarget::Ident(binding)) = &assign.left {
                Some((binding.id.clone(), assign.right.clone()))
            } else {
                None
            }
        }
        _ => None,
    }
}

fn callee_member(call: &CallExpr) -> Option<&MemberExpr> {
    match &call.callee {
        Callee::Expr(callee) => match callee.as_ref() {
            Expr::Member(member) => Some(member),
            _ => None,
        },
        _ => None,
    }
}

fn is_member_apply_call(call: &CallExpr) -> bool {
    match callee_member(call) {
        Some(member) => is_apply_prop(&member.prop),
        None => false,
    }
}

fn is_apply_prop(prop: &MemberProp) -> bool {
    matches!(prop, MemberProp::Ident(ident) if ident.sym == *"apply")
}

fn ident_matches(expr: &Expr, var_id: &Ident) -> bool {
    matches!(
        expr,
        Expr::Ident(ident) if ident.sym == var_id.sym && ident.ctxt == var_id.ctxt
    )
}

fn is_empty_array_concat_callee(callee: &Callee) -> bool {
    match callee {
        Callee::Expr(expr) => is_empty_array_concat_expr(expr.as_ref()),
        _ => false,
    }
}

fn is_empty_array_concat_expr(expr: &Expr) -> bool {
    match expr {
        Expr::Member(member) if is_concat_prop(&member.prop) => {
            matches!(member.obj.as_ref(), Expr::Array(array) if array.elems.is_empty())
        }
        _ => false,
    }
}

fn single_element_array_concat_inner(expr: &Expr) -> Option<Expr> {
    match expr {
        Expr::Member(member) if is_concat_prop(&member.prop) => match member.obj.as_ref() {
            Expr::Array(array) => {
                if array.elems.len() == 1 {
                    if let Some(Some(element)) = array.elems.first() {
                        return Some(*element.expr.clone());
                    }
                }
                None
            }
            _ => None,
        },
        _ => None,
    }
}

fn is_concat_prop(prop: &MemberProp) -> bool {
    matches!(prop, MemberProp::Ident(ident) if ident.sym == *"concat")
}

fn is_this_array(expr: &Expr) -> bool {
    match expr {
        Expr::Array(array) => {
            array.elems.len() == 1
                && matches!(
                    array.elems.first(),
                    Some(Some(ExprOrSpread {
                        expr,
                        spread: None,
                        ..
                    })) if matches!(expr.as_ref(), Expr::This(_))
                )
        }
        _ => false,
    }
}

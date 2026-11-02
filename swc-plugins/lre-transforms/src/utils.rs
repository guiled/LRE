use swc_core::common::{Span, Spanned};
use swc_core::ecma::ast::*;

pub fn ident(span: Span, name: &str) -> Ident {
    Ident::new_no_ctxt(name.into(), span)
}

pub fn ident_expr(span: Span, name: &str) -> Expr {
    Expr::Ident(ident(span, name))
}

pub fn ident_box(span: Span, name: &str) -> Box<Expr> {
    Box::new(ident_expr(span, name))
}

pub fn undefined_expr(span: Span) -> Expr {
    ident_expr(span, "undefined")
}

pub fn undefined_box(span: Span) -> Box<Expr> {
    Box::new(undefined_expr(span))
}

pub fn null_expr(span: Span) -> Expr {
    Expr::Lit(Lit::Null(Null { span }))
}

pub fn bool_lit(span: Span, value: bool) -> Expr {
    Expr::Lit(Lit::Bool(Bool { span, value }))
}

pub fn num_lit(span: Span, value: f64) -> Expr {
    Expr::Lit(Lit::Num(Number {
        span,
        value,
        raw: None,
    }))
}

pub fn str_lit(span: Span, value: &str) -> Expr {
    Expr::Lit(Lit::Str(Str {
        span,
        value: value.into(),
        raw: None,
    }))
}

pub fn this_expr(span: Span) -> Expr {
    Expr::This(ThisExpr { span })
}

pub fn this_box(span: Span) -> Box<Expr> {
    Box::new(this_expr(span))
}

pub fn unary_not(span: Span, argument: Box<Expr>) -> Expr {
    Expr::Unary(UnaryExpr {
        span,
        op: op!("!"),
        arg: argument,
    })
}

pub fn typeof_expr(span: Span, argument: Box<Expr>) -> Expr {
    Expr::Unary(UnaryExpr {
        span,
        op: op!("typeof"),
        arg: argument,
    })
}

pub fn paren_expr(span: Span, expr: Expr) -> Expr {
    Expr::Paren(ParenExpr {
        span,
        expr: Box::new(expr),
    })
}

pub fn member_prop(span: Span, name: &str) -> MemberProp {
    MemberProp::Ident(IdentName::new(name.into(), span))
}

pub fn member_expr(span: Span, object: Box<Expr>, prop: &str) -> Expr {
    Expr::Member(MemberExpr {
        span,
        obj: object,
        prop: member_prop(span, prop),
    })
}

pub fn member_expr_from_expr(span: Span, object: Expr, prop: &str) -> Expr {
    member_expr(span, Box::new(object), prop)
}

pub fn computed_member(span: Span, object: Box<Expr>, key: Box<Expr>) -> Expr {
    Expr::Member(MemberExpr {
        span,
        obj: object,
        prop: MemberProp::Computed(ComputedPropName { span, expr: key }),
    })
}

pub fn expr_or_spread(expr: Expr) -> ExprOrSpread {
    ExprOrSpread {
        spread: None,
        expr: Box::new(expr),
    }
}

pub fn call_expr(span: Span, callee: Expr, args: Vec<ExprOrSpread>) -> Expr {
    Expr::Call(CallExpr {
        span,
        ctxt: Default::default(),
        callee: Callee::Expr(Box::new(callee)),
        args,
        type_args: None,
    })
}

pub fn call_ident(span: Span, name: &str, args: Vec<Expr>) -> Expr {
    call_expr(
        span,
        ident_expr(span, name),
        args.into_iter().map(expr_or_spread).collect(),
    )
}

pub fn call_with_this(span: Span, callee: Expr, this_arg: Expr, args: Vec<ExprOrSpread>) -> Expr {
  let mut call_args = vec![expr_or_spread(this_arg)];
  call_args.extend(args);
  call_expr(
      span,
      member_expr_from_expr(span, callee, "call"),
      call_args,
  )
}

pub fn fn_apply(span: Span, callee: Expr, this_arg: Option<Expr>, args: Vec<ExprOrSpread>) -> Expr {
    let this = this_arg.unwrap_or_else(|| null_expr(span));
    let mut call_args = vec![expr_or_spread(this)];
    call_args.extend(args);
    call_expr(
        span,
        member_expr_from_expr(span, callee, "apply"),
        call_args,
    )
}

pub fn function_body(span: Span, stmts: Vec<Stmt>) -> FunctionBody {
    FunctionBody { span, stmts }
}

pub fn param(span: Span, pat: Pat) -> Param {
    Param {
        span,
        decorators: vec![],
        pat,
    }
}

pub fn ident_pat(span: Span, name: &str) -> Pat {
    Pat::Ident(BindingIdent {
        id: ident(span, name),
        type_ann: None,
    })
}

pub fn func_expr(span: Span, params: Vec<Param>, stmts: Vec<Stmt>) -> Expr {
    Expr::Fn(FnExpr {
        ident: None,
        function: Box::new(Function {
            this_param: None,
            params,
            decorators: vec![],
            span,
            ctxt: Default::default(),
            body: Some(function_body(span, stmts)),
            is_generator: false,
            is_async: false,
            type_params: None,
            return_type: None,
        }),
    })
}

pub fn func_bind(span: Span, func: Expr, bind_arg: Expr) -> Expr {
    call_expr(
        span,
        member_expr_from_expr(span, paren_expr(span, func), "bind"),
        vec![expr_or_spread(bind_arg)],
    )
}

pub fn iife(span: Span, stmts: Vec<Stmt>, call_this: bool) -> Expr {
    let f = func_expr(span, vec![], stmts);
    if call_this {
        call_expr(
            span,
            member_expr_from_expr(span, paren_expr(span, f), "call"),
            vec![expr_or_spread(this_expr(span))],
        )
    } else {
        call_expr(span, paren_expr(span, f), vec![])
    }
}

pub fn var_decl(span: Span, name: &str, init: Option<Expr>) -> Stmt {
    Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span,
        ctxt: Default::default(),
        kind: VarDeclKind::Var,
        declare: false,
        decls: vec![VarDeclarator {
            span,
            name: Pat::Ident(BindingIdent {
                id: ident(span, name),
                type_ann: None,
            }),
            init: init.map(Box::new),
            definite: false,
        }],
    })))
}

pub fn let_decl(span: Span, name: &str, init: Option<Expr>) -> Stmt {
    Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span,
        ctxt: Default::default(),
        kind: VarDeclKind::Let,
        declare: false,
        decls: vec![VarDeclarator {
            span,
            name: Pat::Ident(BindingIdent {
                id: ident(span, name),
                type_ann: None,
            }),
            init: init.map(Box::new),
            definite: false,
        }],
    })))
}

pub fn const_decl(span: Span, name: &str, init: Option<Expr>) -> Stmt {
    Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span,
        ctxt: Default::default(),
        kind: VarDeclKind::Const,
        declare: false,
        decls: vec![VarDeclarator {
            span,
            name: Pat::Ident(BindingIdent {
                id: ident(span, name),
                type_ann: None,
            }),
            init: init.map(Box::new),
            definite: false,
        }],
    })))
}

pub fn var_decl_pat(span: Span, pat: Pat, init: Option<Expr>) -> Stmt {
    Stmt::Decl(Decl::Var(Box::new(VarDecl {
        span,
        ctxt: Default::default(),
        kind: VarDeclKind::Var,
        declare: false,
        decls: vec![VarDeclarator {
            span,
            name: pat,
            init: init.map(Box::new),
            definite: false,
        }],
    })))
}

pub fn return_stmt(span: Span, argument: Option<Expr>) -> Stmt {
    Stmt::Return(ReturnStmt {
        span,
        arg: argument.map(Box::new),
    })
}

pub fn expr_stmt(span: Span, expr: Expr) -> Stmt {
    Stmt::Expr(ExprStmt {
        span,
        expr: Box::new(expr),
    })
}

pub fn assign_stmt(span: Span, left: Expr, right: Expr) -> Stmt {
    expr_stmt(
        span,
        Expr::Assign(AssignExpr {
            span,
            op: op!("="),
            left: assign_target(left),
            right: Box::new(right),
        }),
    )
}

pub fn assign_target(left: Expr) -> AssignTarget {
    match left {
        Expr::Ident(i) => AssignTarget::Simple(SimpleAssignTarget::Ident(BindingIdent {
            id: i,
            type_ann: None,
        })),
        Expr::Member(m) => AssignTarget::Simple(SimpleAssignTarget::Member(m)),
        other => AssignTarget::Simple(SimpleAssignTarget::Paren(ParenExpr {
            span: other.span(),
            expr: Box::new(other),
        })),
    }
}

pub fn object_assign(span: Span) -> Expr {
    member_expr_from_expr(span, ident_expr(span, "Object"), "assign")
}

pub fn object_assign_call(span: Span, args: Vec<ExprOrSpread>) -> Expr {
    call_expr(span, object_assign(span), args)
}

pub fn array_expr(span: Span, elements: Vec<Option<ExprOrSpread>>) -> Expr {
    Expr::Array(ArrayLit {
        span,
        elems: elements,
    })
}

pub fn array_from_arguments(span: Span) -> Expr {
    call_expr(
        span,
        member_expr_from_expr(span, ident_expr(span, "Array"), "from"),
        vec![expr_or_spread(ident_expr(span, "arguments"))],
    )
}

pub fn object_expr(span: Span, props: Vec<PropOrSpread>) -> Expr {
    Expr::Object(ObjectLit { span, props })
}

pub fn is_member_path(callee: &Expr, path: &str) -> bool {
    let parts: Vec<&str> = path.split('.').collect();
    let mut current = callee;

    for (i, part) in parts.iter().enumerate().rev() {
        match current {
            Expr::Ident(id) => return i == 0 && id.sym == *part,
            Expr::Member(m) => {
                if let MemberProp::Ident(prop) = &m.prop {
                    if prop.sym != *part {
                        return false;
                    }
                    current = m.obj.as_ref();
                } else {
                    return false;
                }
            }
            _ => return false,
        }
    }

    false
}

pub fn spread_to_concat(span: Span, args: &[ExprOrSpread]) -> (Vec<ExprOrSpread>, Vec<ExprOrSpread>) {
    let mut array_init: Vec<ExprOrSpread> = Vec::new();
    let mut concat_args: Vec<ExprOrSpread> = Vec::new();
    let mut unspread: Vec<ExprOrSpread> = Vec::new();

    for arg in args {
        if arg.spread.is_some() {
            if !unspread.is_empty() {
                if array_init.is_empty() {
                    array_init.extend(unspread.drain(..));
                } else {
                    concat_args.push(expr_or_spread(array_expr(
                        span,
                        unspread.drain(..).map(Some).collect(),
                    )));
                }
            }
            let mut expr = *arg.expr.clone();
            if let Expr::Ident(id) = &expr {
                if id.sym == "arguments" {
                    expr = array_from_arguments(span);
                }
            }
            concat_args.push(expr_or_spread(expr));
        } else {
            unspread.push(arg.clone());
        }
    }

    if !unspread.is_empty() {
        concat_args.push(expr_or_spread(array_expr(
            span,
            unspread.into_iter().map(Some).collect(),
        )));
    }

    (array_init, concat_args)
}

use swc_core::common::{Span, Spanned, SyntaxContext, DUMMY_SP};
use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{VisitMut, VisitMutWith};

use crate::utils::{
    array_expr, bool_lit, call_expr, call_with_this, const_decl, expr_or_spread, fn_apply,
    func_expr, iife, ident, ident_expr, let_decl, member_expr, object_assign_call, return_stmt,
    str_lit, this_box, this_expr, undefined_expr, unary_not,
};

const PARENT_NAME: &str = "__super";
const DECL_NAME: &str = "__decl";
const DECL_DONE_NAME: &str = "__declDone";
const LR_ARGS_NAME: &str = "__lrArgs";
const CTOR_NAME: &str = "ctor";
const FN_NAME: &str = "fn";
const TMP_UNNAMED_CLASS: &str = "__tmpLreUnnamedClass";

pub struct ClassToFunction {
    pub current_super_class: Option<Box<Expr>>,
    fn_depth: usize,
}

struct MemberDeconstruction {
    declarator: Option<VarDeclarator>,
    assignment: MemberAssignment,
}

enum MemberAssignment {
    None,
    KeyValue(KeyValueProp),
    Stmt(Stmt),
}

struct ConstructorParts {
    stmts: Vec<Stmt>,
    args: Vec<Param>,
    props_from_args: Vec<MemberDeconstruction>,
}

impl ClassToFunction {
    pub fn new() -> Self {
        Self {
            current_super_class: None,
            fn_depth: 0,
        }
    }

    fn can_flatten_decl(&self, has_super: bool) -> bool {
        !has_super && self.fn_depth == 0
    }

    fn expr_or_spread(expr: Expr) -> ExprOrSpread {
        ExprOrSpread {
            spread: None,
            expr: Box::new(expr),
        }
    }

    fn super_ident(span: Span) -> Ident {
        Ident::new(
            PARENT_NAME.into(),
            span,
            SyntaxContext::from_u32(1),
        )
    }

    fn let_super_decl(span: Span) -> Stmt {
        Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span,
            ctxt: Default::default(),
            kind: VarDeclKind::Let,
            declare: false,
            decls: vec![VarDeclarator {
                span,
                name: Pat::Ident(BindingIdent {
                    id: Self::super_ident(span),
                    type_ann: None,
                }),
                init: None,
                definite: false,
            }],
        })))
    }

    fn expr_to_assign_target(span: Span, left: Expr) -> AssignTarget {
        match left {
            Expr::Ident(i) => AssignTarget::from(i),
            Expr::Member(m) => AssignTarget::from(m),
            other => AssignTarget::Simple(SimpleAssignTarget::Paren(ParenExpr {
                span,
                expr: Box::new(other),
            })),
        }
    }

    fn assign_expr_stmt(span: Span, left: Expr, right: Expr) -> Stmt {
        Stmt::Expr(ExprStmt {
            span,
            expr: Box::new(Expr::Assign(AssignExpr {
                span,
                op: op!("="),
                left: Self::expr_to_assign_target(span, left),
                right: Box::new(right),
            })),
        })
    }

    fn assign_ident_stmt(span: Span, left: Ident, right: Expr) -> Stmt {
        Self::assign_expr_stmt(span, left.into(), right)
    }

    fn function_body(span: Span, stmts: Vec<Stmt>) -> FunctionBody {
        FunctionBody { span, stmts }
    }

    fn wrap_function(span: Span, params: Vec<Param>, stmts: Vec<Stmt>) -> Function {
        Function {
            this_param: None,
            params,
            decorators: vec![],
            span,
            ctxt: Default::default(),
            body: Some(Self::function_body(span, stmts)),
            is_generator: false,
            is_async: false,
            type_params: None,
            return_type: None,
        }
    }


    fn member_expr_prop(span: Span, object: Box<Expr>, key: PropName) -> Expr {
        Expr::Member(MemberExpr {
            span,
            obj: object,
            prop: Self::prop_name_to_member_prop(key),
        })
    }

    fn prop_name_to_member_prop(name: PropName) -> MemberProp {
        name.into()
    }

    fn prop_name_to_expr(name: &PropName) -> Expr {
        match name {
            PropName::Ident(i) => Expr::Ident(i.clone().into()),
            PropName::Str(s) => Expr::Lit(Lit::Str(s.clone())),
            PropName::Num(n) => Expr::Lit(Lit::Num(n.clone())),
            PropName::BigInt(b) => Expr::Lit(Lit::BigInt(b.clone())),
            PropName::Computed(c) => *c.expr.clone(),
            #[cfg(swc_ast_unknown)]
            _ => panic!("unknown PropName"),
        }
    }

    fn method_key(name: &PropName, span: Span) -> PropName {
        match name {
            PropName::Ident(_) | PropName::Computed(_) => name.clone(),
            other => PropName::Computed(ComputedPropName {
                span,
                expr: Box::new(Self::prop_name_to_expr(other)),
            }),
        }
    }

    fn get_private_name_identifier(name: &PropName) -> Ident {
        match name {
            PropName::Ident(i) => ident(i.span, &format!("__{}", i.sym)),
            PropName::Str(s) => ident(
                s.span,
                &format!("__{}", s.value.as_str().unwrap_or("str")),
            ),
            PropName::Num(n) => ident(n.span, &format!("__{}", n.value)),
            PropName::BigInt(b) => ident(b.span, &format!("__{}", b.value)),
            PropName::Computed(c) => ident(c.span, "__computed"),
            #[cfg(swc_ast_unknown)]
            _ => panic!("unknown PropName"),
        }
    }

    fn get_private_name_from_private(name: &PrivateName) -> Ident {
        ident(name.span, &format!("__{}", name.name))
    }

    fn ts_param_pat(param: &TsParamPropParam) -> Pat {
        match param {
            TsParamPropParam::Ident(b) => Pat::Ident(b.clone()),
            TsParamPropParam::Assign(a) => *a.left.clone(),
            #[cfg(swc_ast_unknown)]
            _ => panic!("unknown TsParamPropParam"),
        }
    }

    fn ts_param_value(param: &TsParamPropParam) -> Expr {
        match param {
            TsParamPropParam::Ident(b) => Expr::Ident(b.id.clone()),
            TsParamPropParam::Assign(a) => match &*a.left {
                Pat::Ident(b) => Expr::Ident(b.id.clone()),
                _ => undefined_expr(a.span),
            },
            #[cfg(swc_ast_unknown)]
            _ => panic!("unknown TsParamPropParam"),
        }
    }

    fn pat_to_prop_name(pat: &Pat) -> PropName {
        match pat {
            Pat::Ident(b) => PropName::Ident(b.id.clone().into()),
            _ => PropName::Ident(IdentName::new("invalid".into(), DUMMY_SP)),
        }
    }

    fn is_instance_method(member: &ClassMember) -> bool {
        match member {
            ClassMember::Method(m) => {
                !m.is_static && !m.is_abstract && m.function.body.is_some()
            }
            ClassMember::PrivateMethod(m) => {
                !m.is_static && !m.is_abstract && m.function.body.is_some()
            }
            _ => false,
        }
    }

    fn is_instance_prop(member: &ClassMember) -> bool {
        match member {
            ClassMember::ClassProp(p) => !p.is_static && !p.is_abstract,
            ClassMember::PrivateProp(_) => true,
            _ => false,
        }
    }

    fn deconstruct_ctor_args(params: &[ParamOrTsParamProp]) -> Vec<MemberDeconstruction> {
        params
            .iter()
            .filter_map(|p| {
                let ts = match p {
                    ParamOrTsParamProp::TsParamProp(ts) => ts,
                    ParamOrTsParamProp::Param(_) => return None,
                    #[cfg(swc_ast_unknown)]
                    _ => panic!("unknown ParamOrTsParamProp"),
                };

                let pat = Self::ts_param_pat(&ts.param);
                let value = Self::ts_param_value(&ts.param);

                if ts.accessibility == Some(Accessibility::Private) {
                    let id = Self::get_private_name_identifier(&Self::pat_to_prop_name(&pat));
                    return Some(MemberDeconstruction {
                        declarator: Some(VarDeclarator {
                            span: ts.span,
                            name: Pat::Ident(BindingIdent {
                                id: id.clone(),
                                type_ann: None,
                            }),
                            init: None,
                            definite: false,
                        }),
                        assignment: MemberAssignment::Stmt(Self::assign_ident_stmt(
                            ts.span,
                            id.clone(),
                            value,
                        )),
                    });
                }

                Some(MemberDeconstruction {
                    declarator: None,
                    assignment: MemberAssignment::KeyValue(KeyValueProp {
                        key: Self::pat_to_prop_name(&pat),
                        value: Box::new(value),
                    }),
                })
            })
            .collect()
    }

    fn apply_decorators(
        span: Span,
        method_key: &PropName,
        function: &Function,
        mut method_function: Expr,
        key_index: usize,
    ) -> (Expr, Option<MemberDeconstruction>) {
        if function.decorators.is_empty() {
            return (method_function, None);
        }

        let context_name = match method_key {
            PropName::Ident(i) => str_lit(span, &i.sym.to_string()),
            PropName::Computed(c) => *c.expr.clone(),
            _ => str_lit(span, "computed"),
        };

        let context_call =
            call_expr(span, ident_expr(span, "ct"), vec![Self::expr_or_spread(context_name)]);

        for decorator in function.decorators.iter().rev() {
            method_function = call_with_this(
                span,
                *decorator.expr.clone(),
                this_expr(span),
                vec![
                    Self::expr_or_spread(method_function),
                    Self::expr_or_spread(context_call.clone()),
                ],
            );
        }

        let decorated_suffix = match method_key {
            PropName::Ident(i) => i.sym.to_string(),
            _ => format!("Computed{key_index}"),
        };
        let decorated_id = ident(span, &format!("__decorated{decorated_suffix}"));

        let extra = MemberDeconstruction {
            declarator: Some(VarDeclarator {
                span,
                name: Pat::Ident(BindingIdent {
                    id: decorated_id.clone(),
                    type_ann: None,
                }),
                init: None,
                definite: false,
            }),
            assignment: MemberAssignment::Stmt(Self::assign_ident_stmt(
                span,
                decorated_id.clone(),
                method_function,
            )),
        };

        let wrapper = func_expr(
            span,
            vec![],
            vec![return_stmt(
                span,
                Some(fn_apply(
                    span,
                    Expr::Ident(decorated_id.clone()),
                    Some(this_expr(span)),
                    vec![expr_or_spread(ident_expr(span, "arguments"))],
                )),
            )],
        );

        (wrapper, Some(extra))
    }

    fn deconstruct_method(
        method: &ClassMethod,
        key_index: usize,
    ) -> Vec<MemberDeconstruction> {
        Self::deconstruct_method_common(
            method.span,
            &method.key,
            method.accessibility,
            &method.function,
            key_index,
            false,
            None,
        )
    }

    fn deconstruct_private_method(
        method: &PrivateMethod,
        key_index: usize,
    ) -> Vec<MemberDeconstruction> {
        let private_key = PropName::Ident(IdentName::new(method.key.name.clone(), method.key.span));
        Self::deconstruct_method_common(
            method.span,
            &private_key,
            Some(Accessibility::Private),
            &method.function,
            key_index,
            true,
            Some(&method.key),
        )
    }

    fn deconstruct_method_common(
        span: Span,
        key: &PropName,
        accessibility: Option<Accessibility>,
        function: &Function,
        key_index: usize,
        is_private_method: bool,
        private_name: Option<&PrivateName>,
    ) -> Vec<MemberDeconstruction> {
        let is_private = is_private_method || accessibility == Some(Accessibility::Private);
        let method_key = Self::method_key(key, span);

        let base_function = func_expr(
            span,
            function.params.clone(),
            function
                .body
                .as_ref()
                .map(|b| b.stmts.clone())
                .unwrap_or_default(),
        );

        let (method_function, decorated_extra) =
            Self::apply_decorators(span, key, function, base_function, key_index);

        let mut result = vec![];

        if let Some(extra) = decorated_extra {
            result.push(extra);
        }

        if is_private {
            let private_id = if let Some(name) = private_name {
                Self::get_private_name_from_private(name)
            } else {
                Self::get_private_name_identifier(key)
            };

            result.push(MemberDeconstruction {
                declarator: Some(VarDeclarator {
                    span,
                    name: Pat::Ident(BindingIdent {
                        id: private_id.clone(),
                        type_ann: None,
                    }),
                    init: None,
                    definite: false,
                }),
                assignment: MemberAssignment::Stmt(Self::assign_ident_stmt(
                    span,
                    private_id.clone(),
                    method_function,
                )),
            });
        } else {
            result.push(MemberDeconstruction {
                declarator: None,
                assignment: MemberAssignment::KeyValue(KeyValueProp {
                    key: method_key,
                    value: Box::new(method_function),
                }),
            });
        }

        result
    }

    fn deconstruct_prop(prop: &ClassProp) -> MemberDeconstruction {
        let prop_value = prop
            .value
            .as_ref()
            .map(|v| *v.clone())
            .unwrap_or_else(|| undefined_expr(prop.span));

        MemberDeconstruction {
            declarator: None,
            assignment: MemberAssignment::Stmt(Self::assign_expr_stmt(
                prop.span,
                Self::member_expr_prop(
                    prop.span,
                    this_box(prop.span),
                    Self::method_key(&prop.key, prop.span),
                ),
                prop_value,
            )),
        }
    }

    fn deconstruct_private_prop(prop: &PrivateProp) -> MemberDeconstruction {
        let id = Self::get_private_name_from_private(&prop.key);
        let mut result = MemberDeconstruction {
            declarator: Some(VarDeclarator {
                span: prop.span,
                name: Pat::Ident(BindingIdent {
                    id: id.clone(),
                    type_ann: None,
                }),
                init: None,
                definite: false,
            }),
            assignment: MemberAssignment::None,
        };

        if let Some(value) = &prop.value {
            result.assignment = MemberAssignment::Stmt(Self::assign_ident_stmt(
                prop.span,
                id,
                *value.clone(),
            ));
        }

        result
    }

    fn get_methods(class: &Class) -> Vec<MemberDeconstruction> {
        let mut index = 0;
        class
            .body
            .iter()
            .filter(|m| Self::is_instance_method(m))
            .flat_map(|m| {
                let decon = match m {
                    ClassMember::Method(method) => Self::deconstruct_method(method, index),
                    ClassMember::PrivateMethod(method) => {
                        Self::deconstruct_private_method(method, index)
                    }
                    _ => vec![],
                };
                index += 1;
                decon
            })
            .collect()
    }

    fn get_props(class: &Class) -> Vec<MemberDeconstruction> {
        class
            .body
            .iter()
            .filter(|m| Self::is_instance_prop(m))
            .map(|m| match m {
                ClassMember::ClassProp(p) => Self::deconstruct_prop(p),
                ClassMember::PrivateProp(p) => Self::deconstruct_private_prop(p),
                _ => unreachable!(),
            })
            .collect()
    }

    fn replace_super_by_decl_call(
        &self,
        span: Span,
        super_class: Expr,
        params: Vec<ExprOrSpread>,
    ) -> Expr {
        let obj_param = Param {
            span,
            decorators: vec![],
            pat: Pat::Ident(BindingIdent {
                id: ident(span, "obj"),
                type_ann: None,
            }),
        };

        let parent_call = call_with_this(
            span,
            super_class,
            ident_expr(span, "obj"),
            vec![Self::expr_or_spread(array_expr(
                span,
                params.into_iter().map(Some).collect(),
            ))],
        );

        let decl_fn = func_expr(
            span,
            vec![obj_param],
            vec![return_stmt(
                span,
                Some(object_assign_call(
                    span,
                    vec![
                        Self::expr_or_spread(Expr::Object(ObjectLit {
                            span,
                            props: vec![],
                        })),
                        Self::expr_or_spread(parent_call),
                    ],
                )),
            )],
        );

        call_with_this(
            span,
            ident_expr(span, DECL_NAME),
            this_expr(span),
            vec![Self::expr_or_spread(decl_fn)],
        )
    }

    fn get_ctor_parts(&self, class: &Class, span: Span) -> ConstructorParts {
        if let Some(ctor) = class.body.iter().find_map(|m| {
            if let ClassMember::Constructor(c) = m {
                Some(c)
            } else {
                None
            }
        }) {
            if let Some(body) = &ctor.body {
                let args = ctor
                    .params
                    .iter()
                    .filter_map(|p| match p {
                        ParamOrTsParamProp::Param(param) => Some(param.clone()),
                        ParamOrTsParamProp::TsParamProp(ts) => Some(Param {
                            span: ts.span,
                            decorators: vec![],
                            pat: Self::ts_param_pat(&ts.param),
                        }),
                        #[cfg(swc_ast_unknown)]
                        _ => panic!("unknown ParamOrTsParamProp"),
                    })
                    .collect();

                return ConstructorParts {
                    args,
                    stmts: body.stmts.clone(),
                    props_from_args: Self::deconstruct_ctor_args(&ctor.params),
                };
            }
        }

        let mut stmts = vec![];
        if let Some(super_class) = &class.super_class {
            stmts.push(Stmt::Expr(ExprStmt {
                span,
                expr: Box::new(self.replace_super_by_decl_call(
                    span,
                    *super_class.clone(),
                    vec![Self::expr_or_spread(ident_expr(span, LR_ARGS_NAME))],
                )),
            }));
        }

        ConstructorParts {
            args: vec![],
            stmts,
            props_from_args: vec![],
        }
    }

    fn get_statics(&self, class: &Class, fn_id: Ident) -> Vec<Stmt> {
        class
            .body
            .iter()
            .filter_map(|member| match member {
                ClassMember::StaticBlock(b) => Some(Stmt::Expr(ExprStmt {
                    span: b.span,
                    expr: Box::new(iife(b.span, b.body.stmts.clone(), false)),
                })),
                ClassMember::Method(m) if m.is_static => {
                    let key = Self::method_key(&m.key, m.span);
                    Some(Self::assign_expr_stmt(
                        m.span,
                        Self::member_expr_prop(
                            m.span,
                            Box::new(Expr::Ident(fn_id.clone())),
                            key,
                        ),
                        func_expr(
                            m.span,
                            m.function.params.clone(),
                            m.function
                                .body
                                .as_ref()
                                .map(|body| body.stmts.clone())
                                .unwrap_or_default(),
                        ),
                    ))
                }
                ClassMember::ClassProp(p) if p.is_static => {
                    let key = Self::method_key(&p.key, p.span);
                    Some(Self::assign_expr_stmt(
                        p.span,
                        Self::member_expr_prop(
                            p.span,
                            Box::new(Expr::Ident(fn_id.clone())),
                            key,
                        ),
                        p.value
                            .as_ref()
                            .map(|v| *v.clone())
                            .unwrap_or_else(|| undefined_expr(p.span)),
                    ))
                }
                _ => None,
            })
            .collect()
    }

    fn decl_done_if(span: Span, stmts: Vec<Stmt>) -> Stmt {
        Stmt::If(IfStmt {
            span,
            test: Box::new(unary_not(span, Box::new(ident_expr(span, DECL_DONE_NAME)))),
            cons: Box::new(Stmt::Block(BlockStmt {
                span,
                ctxt: Default::default(),
                stmts,
            })),
            alt: None,
        })
    }

    fn collect_declarators(parts: &[MemberDeconstruction]) -> Vec<VarDeclarator> {
        parts
            .iter()
            .filter_map(|p| p.declarator.clone())
            .collect()
    }

    fn collect_key_value_props(parts: &[MemberDeconstruction]) -> Vec<KeyValueProp> {
        parts
            .iter()
            .filter_map(|p| {
                if let MemberAssignment::KeyValue(kv) = &p.assignment {
                    Some(kv.clone())
                } else {
                    None
                }
            })
            .collect()
    }

    fn collect_assign_stmts(parts: &[MemberDeconstruction]) -> Vec<Stmt> {
        parts
            .iter()
            .filter_map(|p| {
                if let MemberAssignment::Stmt(stmt) = &p.assignment {
                    Some(stmt.clone())
                } else {
                    None
                }
            })
            .collect()
    }

    fn expr_to_fn_expr(span: Span, expr: Expr) -> FnExpr {
        match expr {
            Expr::Fn(f) => f,
            other => FnExpr {
                ident: None,
                function: Box::new(Self::wrap_function(
                    span,
                    vec![],
                    vec![return_stmt(span, Some(other))],
                )),
            },
        }
    }

    fn class_to_function(&mut self, class: &Class, span: Span) -> Expr {
        let ctor_parts = self.get_ctor_parts(class, span);
        let method_decls = Self::get_methods(class);
        let prop_decls = Self::get_props(class);

        let mut stmts: Vec<Stmt> = vec![];

        let parent_id = class.super_class.as_ref().map(|super_class| {
            let parent = Self::super_ident(super_class.span());
            stmts.push(Self::let_super_decl(super_class.span()));
            parent
        });

        stmts.push(let_decl(span, DECL_DONE_NAME, None));

        let has_super = parent_id.is_some();
        let flatten_decl = self.can_flatten_decl(has_super);

        if flatten_decl {
            stmts.push(let_decl(span, "prot", None));
        }

        let declarators: Vec<VarDeclarator> = Self::collect_declarators(&method_decls)
            .into_iter()
            .chain(Self::collect_declarators(&prop_decls))
            .chain(Self::collect_declarators(&ctor_parts.props_from_args))
            .collect();

        if !declarators.is_empty() {
            stmts.push(Stmt::Decl(Decl::Var(Box::new(VarDecl {
                span,
                ctxt: Default::default(),
                kind: VarDeclKind::Let,
                declare: false,
                decls: declarators,
            }))));
        }

        let init_parent_id = ident(span, "initParent");
        let prot_id = ident(span, "prot");

        let proto_members: Vec<KeyValueProp> = Self::collect_key_value_props(&method_decls)
            .into_iter()
            .chain(Self::collect_key_value_props(&prop_decls))
            .chain(Self::collect_key_value_props(&ctor_parts.props_from_args))
            .collect();

        let prot_this_assign = vec![Self::expr_or_spread(this_expr(span)), Self::expr_or_spread(Expr::Ident(prot_id.clone()))];
        let final_this_assign = parent_id.as_ref().map(|parent| {
            vec![Self::expr_or_spread(this_expr(span)), Self::expr_or_spread(Expr::Ident(parent.clone())), Self::expr_or_spread(Expr::Ident(prot_id.clone()))]
        });

        let assign_stmts: Vec<Stmt> = Self::collect_assign_stmts(&prop_decls)
            .into_iter()
            .chain(Self::collect_assign_stmts(&method_decls))
            .chain(Self::collect_assign_stmts(&ctor_parts.props_from_args))
            .collect();

        let prot_object = Expr::Object(ObjectLit {
            span,
            props: proto_members
                .into_iter()
                .map(|kv| PropOrSpread::Prop(Box::new(Prop::KeyValue(kv))))
                .collect(),
        });

        let prot_init_stmt = if flatten_decl {
            Self::assign_ident_stmt(span, prot_id.clone(), prot_object)
        } else {
            let_decl(span, "prot", Some(prot_object))
        };

        let once_stmts: Vec<Stmt> = std::iter::once(prot_init_stmt)
            .chain(assign_stmts)
            .collect();

        let mut per_instance_stmts: Vec<Stmt> = vec![Stmt::Expr(ExprStmt {
            span,
            expr: Box::new(object_assign_call(span, prot_this_assign)),
        })];
        if parent_id.is_some() {
            per_instance_stmts.insert(
                0,
                Self::assign_ident_stmt(
                    span,
                    Self::super_ident(span),
                    call_with_this(
                        span,
                        init_parent_id.clone().into(),
                        this_expr(span),
                        vec![Self::expr_or_spread(this_expr(span))],
                    ),
                ),
            );
            if let Some(args) = final_this_assign {
                per_instance_stmts.push(Stmt::Expr(ExprStmt {
                    span,
                    expr: Box::new(object_assign_call(span, args)),
                }));
            }
        }

        let mut decl_stmts = vec![Self::decl_done_if(span, once_stmts)];
        decl_stmts.extend(per_instance_stmts);
        decl_stmts.push(Self::assign_ident_stmt(
            span,
            ident(span, DECL_DONE_NAME),
            bool_lit(span, true),
        ));

        let mut decl_params = vec![];

        if let Some(_parent) = &parent_id {
            decl_params.push(Param {
                span,
                decorators: vec![],
                pat: Pat::Ident(BindingIdent {
                    id: init_parent_id,
                    type_ann: None,
                }),
            });
        }

        let lr_args_id = ident(span, LR_ARGS_NAME);

        let mut ctor_stmts = Vec::new();

        if flatten_decl {
            ctor_stmts.extend(decl_stmts);
        } else {
            ctor_stmts.push(const_decl(
                span,
                DECL_NAME,
                Some(func_expr(span, decl_params, decl_stmts)),
            ));
            if !has_super {
                ctor_stmts.push(Stmt::Expr(ExprStmt {
                    span,
                    expr: Box::new(call_with_this(
                        span,
                        ident_expr(span, DECL_NAME),
                        this_expr(span),
                        vec![],
                    )),
                }));
            }
        }

        ctor_stmts.extend(ctor_parts.stmts);
        ctor_stmts.push(return_stmt(span, Some(this_expr(span))));

        let mut ctor_fn = func_expr(span, ctor_parts.args, ctor_stmts);
        ctor_fn.visit_mut_with(self);
        stmts.push(const_decl(span, CTOR_NAME, Some(ctor_fn)));

        stmts.push(return_stmt(
            span,
            Some(fn_apply(
                span,
                ident_expr(span, CTOR_NAME),
                Some(this_expr(span)),
                vec![Self::expr_or_spread(ident_expr(span, "__lrArgs"))],
            )),
        ));

        let outer_fn = func_expr(
            span,
            vec![Param {
                span,
                decorators: vec![],
                pat: Pat::Ident(BindingIdent {
                    id: lr_args_id,
                    type_ann: None,
                }),
            }],
            stmts,
        );

        let fn_id = ident(span, FN_NAME);
        let static_members = self.get_statics(class, fn_id.clone());

        if static_members.is_empty() {
            return outer_fn;
        }

        let mut iife_stmts = vec![const_decl(span, "fn", Some(outer_fn))];
        iife_stmts.extend(static_members);
        iife_stmts.push(return_stmt(span, Some(ident_expr(span, "fn"))));

        iife(span, iife_stmts, false)
    }

    fn create_new_bind_apply(&self, span: Span, class_to_new: Expr, args: Option<Expr>) -> Expr {
        let mut array_elems = vec![Some(Self::expr_or_spread(class_to_new.clone()))];
        if let Some(args) = args {
            array_elems.push(Some(Self::expr_or_spread(args)));
        }

        let bind_apply = call_expr(
            span,
            member_expr(
                span,
                Box::new(member_expr(
                    span,
                    Box::new(class_to_new.clone()),
                    "bind",
                )),
                "apply",
            ),
            vec![
                Self::expr_or_spread(class_to_new.clone()),
                Self::expr_or_spread(array_expr(span, array_elems)),
            ],
        );

        Expr::New(NewExpr {
            span,
            ctxt: Default::default(),
            callee: Box::new(Expr::Paren(ParenExpr {
                span,
                expr: Box::new(bind_apply),
            })),
            args: None,
            type_args: None,
        })
    }

    fn super_prop_to_member_prop(prop: SuperProp) -> MemberProp {
        match prop {
            SuperProp::Ident(i) => MemberProp::Ident(i),
            SuperProp::Computed(c) => MemberProp::Computed(c),
            #[cfg(swc_ast_unknown)]
            _ => panic!("unknown SuperProp"),
        }
    }
}

impl Default for ClassToFunction {
    fn default() -> Self {
        Self::new()
    }
}

impl VisitMut for ClassToFunction {
    fn visit_mut_fn_expr(&mut self, n: &mut FnExpr) {
        self.fn_depth += 1;
        n.visit_mut_children_with(self);
        self.fn_depth -= 1;
    }

    fn visit_mut_function(&mut self, n: &mut Function) {
        self.fn_depth += 1;
        n.visit_mut_children_with(self);
        self.fn_depth -= 1;
    }

    fn visit_mut_arrow_expr(&mut self, n: &mut ArrowExpr) {
        self.fn_depth += 1;
        n.visit_mut_children_with(self);
        self.fn_depth -= 1;
    }

    fn visit_mut_decl(&mut self, decl: &mut Decl) {
        if let Decl::Class(class_decl) = decl {
            let saved = self.current_super_class.take();
            self.current_super_class = class_decl.class.super_class.clone();
            class_decl.visit_mut_with(self);

            let span = class_decl.class.span;
            let name = class_decl.ident.clone();
            let declare = class_decl.declare;
            let init = self.class_to_function(&class_decl.class, span);

            *decl = Decl::Var(Box::new(VarDecl {
                span,
                ctxt: Default::default(),
                kind: VarDeclKind::Const,
                declare,
                decls: vec![VarDeclarator {
                    span,
                    name: Pat::Ident(BindingIdent {
                        id: name,
                        type_ann: None,
                    }),
                    init: Some(Box::new(init)),
                    definite: false,
                }],
            }));

            self.current_super_class = saved;
            decl.visit_mut_with(self);
            return;
        }

        decl.visit_mut_children_with(self);
    }

    fn visit_mut_class_decl(&mut self, n: &mut ClassDecl) {
        n.visit_mut_children_with(self);
    }

    fn visit_mut_class_expr(&mut self, n: &mut ClassExpr) {
        n.visit_mut_children_with(self);
    }

    fn visit_mut_export_default_decl(&mut self, n: &mut ExportDefaultDecl) {
        if let DefaultDecl::Class(class_expr) = &mut n.decl {
            let saved = self.current_super_class.take();
            self.current_super_class = class_expr.class.super_class.clone();
            class_expr.visit_mut_with(self);

            let class = class_expr.class.clone();
            let span = class.span;
            let result = self.class_to_function(&class, span);

            self.current_super_class = saved;

            if matches!(result, Expr::Call(_)) {
                let name = class_expr
                    .ident
                    .clone()
                    .unwrap_or_else(|| ident(n.span, TMP_UNNAMED_CLASS));
                n.decl = DefaultDecl::Fn(FnExpr {
                    ident: Some(name.clone()),
                    function: Box::new(Self::wrap_function(
                        n.span,
                        vec![],
                        vec![return_stmt(
                            n.span,
                            Some(Expr::Assign(AssignExpr {
                                span: n.span,
                                op: op!("="),
                                left: AssignTarget::from(name),
                                right: Box::new(result),
                            })),
                        )],
                    )),
                });
            } else {
                n.decl = DefaultDecl::Fn(Self::expr_to_fn_expr(n.span, result));
            }

            n.visit_mut_with(self);
            return;
        }

        n.visit_mut_children_with(self);
    }

    fn visit_mut_module_decl(&mut self, n: &mut ModuleDecl) {
        if let ModuleDecl::ExportDefaultDecl(export) = n {
            if let DefaultDecl::Class(class_expr) = &export.decl {
                let saved = self.current_super_class.take();
                self.current_super_class = class_expr.class.super_class.clone();
                let mut class_expr = class_expr.clone();
                class_expr.visit_mut_with(self);

                let class = class_expr.class.clone();
                let span = class.span;
                let result = self.class_to_function(&class, span);
                self.current_super_class = saved;

                if matches!(result, Expr::Call(_)) {
                    let name = class_expr
                        .ident
                        .clone()
                        .unwrap_or_else(|| ident(export.span, TMP_UNNAMED_CLASS));
                    *n = ModuleDecl::ExportDefaultExpr(ExportDefaultExpr {
                        span: export.span,
                        expr: Box::new(Expr::Assign(AssignExpr {
                            span: export.span,
                            op: op!("="),
                            left: AssignTarget::from(name),
                            right: Box::new(result),
                        })),
                    });
                } else {
                    *n = ModuleDecl::ExportDefaultDecl(ExportDefaultDecl {
                        span: export.span,
                        decl: DefaultDecl::Fn(Self::expr_to_fn_expr(export.span, result)),
                    });
                }

                n.visit_mut_with(self);
                return;
            }
        }

        n.visit_mut_children_with(self);
    }

    fn visit_mut_default_decl(&mut self, n: &mut DefaultDecl) {
        if let DefaultDecl::Class(class_expr) = n {
            let saved = self.current_super_class.take();
            self.current_super_class = class_expr.class.super_class.clone();
            class_expr.visit_mut_with(self);

            let class = class_expr.class.clone();
            let span = class.span;
            let result = self.class_to_function(&class, span);

            self.current_super_class = saved;
            let mut fn_expr = Self::expr_to_fn_expr(span, result);
            fn_expr.visit_mut_with(self);

            *n = DefaultDecl::Fn(fn_expr);
            return;
        }

        n.visit_mut_children_with(self);
    }

    fn visit_mut_expr(&mut self, expr: &mut Expr) {
        if let Expr::Class(class_expr) = expr {
            let saved = self.current_super_class.take();
            self.current_super_class = class_expr.class.super_class.clone();

            let class = class_expr.class.clone();
            let span = class.span;
            let result = self.class_to_function(&class, span);

            *expr = result;
            self.current_super_class = saved;
            expr.visit_mut_with(self);
            return;
        }

        // Private method calls must be rewritten before visiting children:
        // otherwise `this.#foo` becomes `__foo` and we lose the call context.
        if let Expr::Call(call) = expr {
            if let Callee::Expr(callee) = &call.callee {
                if let Expr::Member(member) = &**callee {
                    if let MemberProp::PrivateName(_) = &member.prop {
                        let mut args = vec![Self::expr_or_spread(this_expr(call.span))];
                        args.extend(call.args.clone());
                        *expr = Expr::Call(CallExpr {
                            span: call.span,
                            ctxt: call.ctxt,
                            callee: Callee::Expr(Box::new(member_expr(
                                call.span,
                                callee.clone(),
                                "call",
                            ))),
                            args,
                            type_args: call.type_args.clone(),
                        });
                        expr.visit_mut_children_with(self);
                        return;
                    }
                }
            }
        }

        expr.visit_mut_children_with(self);

        if let Expr::SuperProp(super_prop) = expr {
            let prop = Self::super_prop_to_member_prop(super_prop.prop.clone());
            *expr = Expr::Member(MemberExpr {
                span: super_prop.span,
                obj: Box::new(Expr::Ident(Self::super_ident(super_prop.span))),
                prop,
            });
            return;
        }

        if let Expr::Member(member) = expr {
            if let MemberProp::PrivateName(private) = &member.prop {
                *expr = Self::get_private_name_from_private(private).into();
            }
        }

        if let Expr::Call(call) = expr {
            if let Callee::Super(_) = &call.callee {
                if let Some(super_class) = self.current_super_class.as_ref() {
                    *expr = self.replace_super_by_decl_call(
                        call.span,
                        *super_class.clone(),
                        call.args.clone(),
                    );
                }
                return;
            }

        }

        if let Expr::New(new_expr) = expr {
            if new_expr
                .args
                .as_ref()
                .is_some_and(|args| args.iter().any(|a| a.spread.is_some()))
            {
                let callee = *new_expr.callee.clone();
                let args = new_expr.args.take().map(|args| {
                    array_expr(new_expr.span, args.into_iter().map(Some).collect())
                });
                *expr = self.create_new_bind_apply(new_expr.span, callee, args);
            }
        }
    }

    fn visit_mut_assign_expr(&mut self, assign: &mut AssignExpr) {
        if let AssignTarget::Simple(SimpleAssignTarget::Member(member)) = &assign.left {
            if let MemberProp::PrivateName(private) = &member.prop {
                assign.left = AssignTarget::Simple(SimpleAssignTarget::Ident(BindingIdent {
                    id: Self::get_private_name_from_private(private),
                    type_ann: None,
                }));
            }
        }

        assign.visit_mut_children_with(self);
    }

    fn visit_mut_super_prop_expr(&mut self, _n: &mut SuperPropExpr) {}

    fn visit_mut_ts_type(&mut self, _n: &mut TsType) {}
}

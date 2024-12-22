import {
  Argument,
  ArrowFunctionExpression,
  AssignmentExpression,
  CallExpression,
  Class,
  ClassDeclaration,
  ClassExpression,
  ClassMember,
  ClassMethod,
  ClassProperty,
  Constructor,
  Declaration,
  DefaultDecl,
  ExportDefaultDeclaration,
  ExportDefaultExpression,
  ExprOrSpread,
  Expression,
  ExpressionStatement,
  Fn,
  FunctionExpression,
  Identifier,
  MemberExpression,
  ModuleDeclaration,
  NewExpression,
  Param,
  PrivateMethod,
  PrivateName,
  PrivateProperty,
  Program,
  Span,
  Statement,
  SuperPropExpression,
  TsType,
  VariableDeclaration,
} from "@swc/core";
import onevariable from "./node/declaration/onevariable";
import assignment from "./node/expression/assignment";
import call from "./node/expression/call";
import iife from "./node/expression/iife";
import member from "./node/expression/member";
import thisexpression from "./node/expression/thisexpression";
import identifier from "./node/identifier";
import returnstmt from "./node/statement/returnstmt";
import undefinedidentifier from "./node/undefinedidentifier";
import { ExpressionWithSpan } from "./types";
import { newexpression } from "./node/expression/newexpression";
import { arrayexpression } from "./node/expression/arrayexpression";
import numericliteral from "./node/literal/numericliteral";
import { objectassign } from "./node/expression/objectassign";
import expression from "./node/expression";
import stringliteral from "./node/literal/stringliteral";
import { objectexpression } from "./node/expression/objectexpression";
import { arrayfromarguments } from "./node/expression/arrayfromarguments";
import { spannewctxt } from "./utils/spannewctxt";
import { spreadToConcat } from "./utils/spreadToConcat";
import { Visitor } from "@swc/core/Visitor.js";

type PublicMethodToFunctionStatement = ExpressionStatement & {
  expression: AssignmentExpression & {
    operator: "=";
    left: MemberExpression;
    right: FunctionExpression | CallExpression;
  };
};

type PrivateMethodToFunctionStatement = VariableDeclaration & {
  declarations: (Declaration & {
    init: FunctionExpression | CallExpression;
  })[];
};

type MethodToFunctionStatement =
  | VariableDeclaration
  | (ExpressionStatement & {
      expression: AssignmentExpression & {
        operator: "=";
      };
    });

type PublicPropertyToVariable = ExpressionStatement & {
  expression: AssignmentExpression & {
    operator: "=";
    left: MemberExpression;
  };
};

type PrivatePropertyToVariable = VariableDeclaration & {
  kind: "let";
};

type PropertyToVariable = PublicPropertyToVariable | PrivatePropertyToVariable;

type ClassConstructorStates = {
  exists: boolean;
  hasSuperCtor: boolean;
  hasReturn: boolean;
  superUsed: boolean;
};

const CONSTRUCTOR_ARG_NAME = "__lrargs__";
const PARENT = "Parent";
const PARENT_IN_CTOR = "_super";

class ClassToFunction extends Visitor {
  #privateMethods: Array<Identifier["value"]> = [];
  #privateProps: Array<PrivateProperty> = [];
  #inPrivateCallExpression = false;
  currentSuperClass?: ExpressionWithSpan;
  inConstructor: boolean = false;
  superIdentifierInCtor: Identifier | undefined;
  isInClass = false;
  #ctorStates: ClassConstructorStates = {
    exists: false,
    hasSuperCtor: false,
    hasReturn: false,
    superUsed: false,
  };

  #createConstructorReturnStatement(
    span: Span,
    originalReturnArgument: Expression | undefined,
    superIdentifier: Identifier | undefined,
  ): Statement | undefined {
    const returnElements: ExprOrSpread[] = [];

    if (originalReturnArgument) {
      returnElements.push({
        expression: originalReturnArgument,
      });
    }

    if (superIdentifier) {
      returnElements.push({
        expression: superIdentifier,
      });
    }

    if (returnElements.length === 0) {
      return;
    }

    return super.visitStatement(
      returnstmt({
        span,
        argument:
          returnElements.length === 1
            ? returnElements[0].expression
            : arrayexpression({
                span,
                elements: returnElements,
              }),
      }),
    );
  }

  #initCtorStates(): ClassConstructorStates {
    const res = this.#ctorStates;
    this.#ctorStates = {
      exists: false,
      hasReturn: false,
      hasSuperCtor: false,
      superUsed: false,
    };
    return res;
  }

  #methodToFunction(
    n: ClassMethod | PrivateMethod,
  ): Array<MethodToFunctionStatement> {
    if (n.key.type === "Computed") {
      throw new Error("Computed method key are not supported yet");
    }

    const result: Array<MethodToFunctionStatement> = [];
    const span = n.span;

    let assignmentRight: CallExpression | FunctionExpression = {
      type: "FunctionExpression",
      params: n.function.params,
      decorators: [],
      span: n.function.span,
      body: n.function.body,
      generator: false,
      async: false,
    };

    if (n.function.decorators?.length) {
      const contextCreationCall = call({
        span,
        callee: identifier({
          span,
          value: "ct",
        }),
        args: [
          {
            expression: stringliteral({
              span,
              value:
                n.key.type === "PrivateName"
                  ? n.key.id.value
                  : (n.key.value as string),
            }),
          },
        ],
      });

      n.function.decorators.reverse().forEach((decorator) => {
        assignmentRight = call({
          callee: decorator.expression,
          args: [
            {
              expression: assignmentRight,
            },
            {
              expression: contextCreationCall,
            },
          ],
        }) as CallExpression;
      });
    }

    if (n.key.type === "PrivateName") {
      result.push(
        onevariable({
          span: { ...n.span, ctxt: n.span.ctxt + 1 },
          id: this.#transformPrivateIdentifier(n.key.id),
          kind: "const",
          init: assignmentRight,
        }),
      );
    } else {
      result.push({
        type: "ExpressionStatement",
        span: n.span,
        expression: {
          type: "AssignmentExpression",
          span: n.span,
          operator: "=",
          left: member({
            span,
            object: thisexpression({ span: n.span }),
            property: n.key as Identifier,
          }),
          right: assignmentRight,
        },
      });
    }

    return result;
  }

  #ConstructorToFunction(n: Constructor): Statement[] {
    const args: Argument[] = [
      {
        expression: {
          type: "Identifier",
          span: spannewctxt(n.span, 1),
          value: CONSTRUCTOR_ARG_NAME,
          optional: false,
        },
      },
    ];

    const propertyDeclarations: Statement[] = [];
    const params: Param[] = n.params.map<Param>((p) => {
      if (p.type === "Parameter") return p;
      let propName: PrivateName | Identifier;

      if (p.accessibility === "public") {
        propName = {
          type: "Identifier",
          span: p.span,
          optional: false,
          value:
            p.param.type === "Identifier"
              ? p.param.value
              : p.param.left.type === "Identifier"
                ? p.param.left.value
                : "_todo",
        } as Identifier;
      } else {
        propName = {
          type: "PrivateName",
          span: p.span,
          id: {
            type: "Identifier",
            span: p.span,
            optional: false,
            value:
              p.param.type === "Identifier"
                ? p.param.value
                : p.param.left.type === "Identifier"
                  ? p.param.left.value
                  : "_todo",
          },
        } as PrivateName;
        this.#privateProps.push({
          type: "PrivateProperty",
          accessibility: p.accessibility,
          typeAnnotation: p.param.typeAnnotation,
          span: p.span,
          key: propName,
          isStatic: false,
          isOverride: false,
          readonly: false,
          isOptional: false,
          definite: false,
        });
      }

      propertyDeclarations.push({
        type: "ExpressionStatement",
        span: p.span,
        expression: assignment({
          span: p.span,
          operator: "=",
          left: member({
            span: p.span,
            object: thisexpression({ span: p.span }),
            property: propName,
          }),
          right:
            p.param.type === "Identifier"
              ? p.param
              : p.param.left.type === "Identifier"
                ? p.param.left
                : ({
                    /* todo */
                  } as Identifier),
        }),
      });
      return {
        type: "Parameter",
        span: p.span,
        pat: p.param,
      };
    });

    const stmts = [...propertyDeclarations, ...(n.body?.stmts || [])];

    const returnIdentifier = identifier({
      span: n.span,
      value: "ctorReturn",
    });

    const ctorAsFunction: CallExpression = {
      type: "CallExpression",
      span: n.span,
      callee: {
        type: "MemberExpression",
        span: n.span,
        object: {
          type: "ParenthesisExpression",
          span: n.span,
          expression: {
            type: "FunctionExpression",
            params: params,
            decorators: [],
            span: n.body?.span || n.span,
            body: {
              type: "BlockStatement",
              span: n.body?.span || n.span,
              stmts,
            },
            generator: false,
            async: false,
          },
        },
        property: {
          type: "Identifier",
          span: n.span,
          value: "apply",
          optional: false,
        },
      },
      arguments: [
        {
          expression: thisexpression({ span: n.span }),
        },
        ...args,
      ],
    };

    const result: Statement[] = [];

    if (
      (this.#ctorStates.exists &&
        !this.#ctorStates.hasReturn &&
        !this.#ctorStates.hasSuperCtor) ||
      !this.#ctorStates.superUsed
    ) {
      result.push({
        type: "ExpressionStatement",
        span: ctorAsFunction.span,
        expression: ctorAsFunction,
      });
    } else {
      result.push(
        onevariable({
          span: n.span,
          id: this.#ctorStates.hasReturn
            ? returnIdentifier
            : this.#transformPrivateIdentifier({
                type: "Identifier",
                span: n.span,
                value: PARENT,
                optional: false,
              }),
          init: ctorAsFunction,
        }),
      );

      if (this.#ctorStates.hasReturn && this.#ctorStates.superUsed) {
        result.push(
          onevariable({
            span: n.span,
            id: this.#transformPrivateIdentifier({
              type: "Identifier",
              span: n.span,
              value: PARENT,
              optional: false,
            }),
            init: this.#ctorStates.hasReturn
              ? member({
                  span: n.span,
                  object: returnIdentifier,
                  property: {
                    type: "Computed",
                    span: n.span,
                    expression: numericliteral({
                      span: n.span,
                      value: this.#ctorStates.hasReturn ? 1 : 0,
                    }),
                  },
                })
              : returnIdentifier,
          }),
        );
      }

      if (this.#ctorStates.hasReturn) {
        result.push(
          returnstmt({
            span: n.span,
            argument: member({
              span: n.span,
              object: returnIdentifier,
              property: {
                type: "Computed",
                span: n.span,
                expression: numericliteral({
                  span: n.span,
                  value: 0,
                }),
              },
            }),
          }),
        );
      }
    }

    return result;
  }

  #propertyToVariable(n: ClassProperty | PrivateProperty): PropertyToVariable {
    if (n.type === "ClassProperty") {
      return {
        type: "ExpressionStatement",
        span: n.span,
        expression: {
          type: "AssignmentExpression",
          span: n.span,
          operator: "=",
          left: {
            type: "MemberExpression",
            span: n.span,
            object: thisexpression({ span: n.span }),
            property: n.key as MemberExpression["property"],
          },
          right: n.value ?? undefinedidentifier({ span: n.span }),
        },
      };
    } else {
      return {
        type: "VariableDeclaration",
        span: n.span,
        kind: "let",
        declare: false,
        declarations: [
          {
            type: "VariableDeclarator",
            span: n.span,
            id: this.#transformPrivateIdentifier(n.key.id),
            init: n.value,
            definite: n.definite,
          },
        ],
      };
    }
  }

  #transformClassBodyToFunction(
    classStmt: ClassDeclaration | ClassExpression,
  ): FunctionExpression | CallExpression {
    const { body, span, identifier: _identifier } = classStmt;
    const methods: Array<MethodToFunctionStatement> = [];
    const staticMethods: Array<MethodToFunctionStatement> = [];
    const properties: Array<PropertyToVariable> = [];
    const staticProperties: Array<PropertyToVariable> = [];
    let constructorFunctionStatement: Statement[] | undefined = [];
    let staticStmts: Statement[] = [];
    const ctor: Constructor | undefined = body.find(
      (n: ClassMember) => n.type === "Constructor" && n.body,
    ) as Constructor;

    if (ctor) {
      const savePrivateProps = this.#privateProps;
      this.#privateProps = [];
      constructorFunctionStatement = this.#ConstructorToFunction(ctor);
      body.unshift(...this.#privateProps);
      this.#privateProps = savePrivateProps;
    }

    body.forEach((n: ClassMember) => {
      if (n.type === "Constructor" && n.body) {
        // nothing
      } else if (
        (n.type === "ClassMethod" || n.type === "PrivateMethod") &&
        !n.isAbstract &&
        !!n.function.body
      ) {
        if (n.isStatic) {
          staticMethods.push(...this.#methodToFunction(n));
        } else {
          methods.push(...this.#methodToFunction(n));
        }
      } else if (n.type === "PrivateProperty" || n.type === "ClassProperty") {
        if (n.isStatic) {
          staticProperties.push(this.#propertyToVariable(n));
        } else {
          properties.push(this.#propertyToVariable(n));
        }
      } else if (n.type === "StaticBlock") {
        // todo?
        staticStmts = n.body.stmts;
      }
    });

    const stmts: Statement[] = [
      ...properties,
      ...methods,
      ...constructorFunctionStatement,
    ];

    const classFunction: FunctionExpression = {
      type: "FunctionExpression",
      params: [
        {
          type: "Parameter",
          span,
          decorators: [],
          pat: {
            type: "Identifier",
            span: spannewctxt(span),
            value: CONSTRUCTOR_ARG_NAME,
            optional: false,
          },
        },
      ],
      span,
      body: {
        type: "BlockStatement",
        span,
        stmts,
      },
      generator: false,
      async: false,
    };

    const _: any[] = [];

    if (_.concat(staticMethods, staticProperties, staticStmts).length > 0) {
      const tmpClassFunctionId = identifier({
        span: classFunction.span,
        value: "__lreClass" + classFunction.identifier?.value,
      });
      const publicStatic: Array<
        PublicMethodToFunctionStatement | PublicPropertyToVariable
      > = [
        ...(staticMethods.filter(
          (m: MethodToFunctionStatement) => m.type === "ExpressionStatement",
        ) as Array<PublicMethodToFunctionStatement>),
        ...(staticProperties.filter(
          (m: PropertyToVariable) => m.type === "ExpressionStatement",
        ) as Array<PublicPropertyToVariable>),
      ];
      const privateStatic: Array<
        PrivateMethodToFunctionStatement | PrivatePropertyToVariable
      > = [
        ...(staticMethods.filter(
          (m: MethodToFunctionStatement) => m.type === "VariableDeclaration",
        ) as Array<PrivateMethodToFunctionStatement>),
        ...(staticProperties.filter(
          (m: PropertyToVariable) => m.type === "VariableDeclaration",
        ) as Array<PrivatePropertyToVariable>),
      ];
      return iife({
        span: classFunction.span,
        stmts: [
          ...privateStatic,
          onevariable({
            span: classFunction.span,
            id: tmpClassFunctionId,
            init: classFunction,
          }),
          ...publicStatic.map(
            (e: PublicMethodToFunctionStatement | PublicPropertyToVariable) => {
              return {
                ...e,
                expression: {
                  ...e.expression,
                  left: {
                    ...e.expression.left,
                    object: tmpClassFunctionId,
                  },
                },
              };
            },
          ),
          ...staticStmts,
          returnstmt({
            span: classFunction.span,
            argument: tmpClassFunctionId,
          }),
        ],
      }) as CallExpression;
    }

    return classFunction;
  }

  #transformPrivateIdentifier(i: Identifier, prefix: string = ""): Identifier {
    return {
      ...i,
      span: spannewctxt(i.span),
      value: "__" + prefix + i.value,
    };
  }

  #changePrivateMember(n: MemberExpression): MemberExpression | Expression {
    if (
      n.object.type === "ThisExpression" &&
      n.property.type === "PrivateName"
    ) {
      if (
        this.#privateMethods.includes(n.property.id.value) &&
        !this.#inPrivateCallExpression
      ) {
        return this.visitExpression(
          call({
            span: n.span,
            callee: member({
              span: n.span,
              object: this.#transformPrivateIdentifier(n.property.id),
              property: identifier({
                span: n.span,
                value: "bind",
              }),
            }),
            args: [
              {
                spread: undefined,
                expression: thisexpression({ span: n.span }),
              },
            ],
          }),
        );
      } else {
        return this.visitExpression(
          this.#transformPrivateIdentifier(n.property.id),
        );
      }
    }

    return this.visitMemberExpression(n);
  }

  #createInstantiateParentAndAssign(
    stmts: Statement[],
    {
      span,
      id,
      newexpr,
    }: {
      span: Span;
      id: Identifier;
      newexpr: NewExpression;
    },
  ): void {
    stmts.push(
      onevariable({
        span,
        id,
        init: newexpr,
      }),
    );
    stmts.push(
      onevariable({
        span,
        id: identifier({
          span,
          value: "prev",
        }),
        init: objectassign(span, [
          { expression: objectexpression({}, span) },
          { expression: thisexpression({ span }) },
        ]),
      }),
    );
    stmts.push({
      type: "ExpressionStatement",
      span,
      expression: objectassign(span, [
        expression(thisexpression({ span })),
        expression(id),
      ]),
    });
    stmts.push({
      type: "ExpressionStatement",
      span,
      expression: objectassign(span, [
        { expression: thisexpression({ span }) },
        {
          expression: identifier({
            span,
            value: "prev",
          }),
        },
      ]),
    });
  }

  visitSuperPropExpression(n: SuperPropExpression): Expression {
    this.#ctorStates.superUsed = true;
    const result: MemberExpression = member({
      span: n.span,
      object: this.inConstructor
        ? identifier({
            span: n.span,
            value: PARENT_IN_CTOR,
          })
        : member({
            span: n.obj.span,
            object: thisexpression({ span: n.span }),
            property: {
              type: "PrivateName",
              span: n.span,
              id: identifier({
                span: n.span,
                value: PARENT,
              }),
            },
          }),
      property: n.property,
    }) as MemberExpression;
    return super.visitMemberExpression(result);
  }

  visitCallExpression(n: CallExpression): Expression {
    const oldInPrivateCallExpression = this.#inPrivateCallExpression;
    this.#inPrivateCallExpression = false;

    if (
      n.callee.type === "MemberExpression" &&
      n.callee.object.type === "ThisExpression" &&
      n.callee.property.type === "PrivateName"
    ) {
      this.#inPrivateCallExpression = true;
      n.arguments.unshift({
        spread: undefined,
        expression: thisexpression({ span: n.callee.object.span }),
      });
      n.callee.object = member({
        ...n.callee,
      });
      n.callee.property = identifier({
        span: n.callee.span,
        value: "call",
      });
    }

    const result = super.visitCallExpression(n);
    this.#inPrivateCallExpression = oldInPrivateCallExpression;
    return result;
  }

  visitStatements(stmts: Statement[]): Statement[] {
    const newStmts: Statement[] = [];

    stmts.forEach((stmt: Statement) => {
      if (stmt.type === "ClassDeclaration") {
        const prevCtorState = this.#initCtorStates();
        stmt = this.visitStatement(stmt) as ClassDeclaration;
        const res: VariableDeclaration = {
          type: "VariableDeclaration",
          span: stmt.span,
          kind: "const",
          declare: false,
          declarations: [
            {
              type: "VariableDeclarator",
              span: stmt.span,
              id: stmt.identifier,
              init: this.#transformClassBodyToFunction(stmt),
              definite: false,
            },
          ],
        };
        this.#ctorStates = prevCtorState;
        newStmts.push(res);
      } else if (this.inConstructor) {
        if (
          stmt.type === "ExpressionStatement" &&
          stmt.expression.type === "CallExpression" &&
          this.currentSuperClass &&
          stmt.expression.callee.type === "Super"
        ) {
          this.#ctorStates.hasSuperCtor = true;
          this.superIdentifierInCtor = identifier({
            span: stmt.span,
            value: PARENT_IN_CTOR,
          });
          let newexpr: NewExpression;

          if (stmt.expression.arguments.some((a) => !!a.spread)) {
            const { arrayInit, concatArgs } = spreadToConcat(
              stmt.span,
              stmt.expression.arguments,
            );
            newexpr = this.#createNewBindApplyArgs({
              span: stmt.span,
              classToNew: this.currentSuperClass,
              args: call({
                callee: member({
                  object: arrayexpression({
                    span: stmt.span,
                    elements: arrayInit,
                  }),
                  property: identifier({
                    span: stmt.span,
                    value: "concat",
                  }),
                }),
                args: concatArgs,
              }),
            });
          } else {
            newexpr = newexpression({
              callee: this.currentSuperClass,
              arguments: stmt.expression.arguments,
            });
          }

          this.#createInstantiateParentAndAssign(newStmts, {
            span: stmt.span,
            id: this.superIdentifierInCtor,
            newexpr,
          });
        } else if (
          stmt.type === "VariableDeclaration" &&
          stmt.declarations.some(
            (declaration) =>
              declaration.id.type === "Identifier" &&
              declaration.id.value === PARENT_IN_CTOR,
          )
        ) {
          this.superIdentifierInCtor = stmt.declarations.find(
            (declaration) =>
              declaration.id.type === "Identifier" &&
              declaration.id.value === PARENT_IN_CTOR,
          )!.id as Identifier;
          this.#ctorStates.hasSuperCtor = true;
          newStmts.push(stmt);
        } else {
          newStmts.push(stmt);
        }
      } else {
        newStmts.push(stmt);
      }
    });
    return super.visitStatements(newStmts);
  }

  visitExpression(n: Expression): Expression {
    let prevCtorState: ClassConstructorStates;
    let result: Expression;

    switch (n.type) {
      case "ClassExpression":
        prevCtorState = this.#initCtorStates();
        n = this.visitClassExpression(n);
        result = super.visitExpression(this.#transformClassBodyToFunction(n));
        this.#ctorStates = prevCtorState;
        return result;
      case "MemberExpression":
        return super.visitExpression(this.#changePrivateMember(n));
      default:
        return super.visitExpression(n);
    }
  }

  visitExportDefaultDeclaration(
    n: ExportDefaultDeclaration,
  ): ModuleDeclaration {
    return super.visitExportDefaultDeclaration(n);
  }

  visitDefaultDeclaration(n: DefaultDecl): DefaultDecl {
    if (n.type === "ClassExpression") {
      const prevCtorState = this.#initCtorStates();
      n = super.visitClassExpression(n);
      const res = this.#transformClassBodyToFunction(n);
      this.#ctorStates = prevCtorState;
      return super.visitExpression(res) as FunctionExpression;
    }

    return super.visitDefaultDeclaration(n);
  }

  visitModuleDeclaration(n: ModuleDeclaration): ModuleDeclaration {
    if (
      n.type === "ExportDefaultDeclaration" &&
      n.decl.type === "ClassExpression"
    ) {
      const prevCtorState = this.#initCtorStates();
      let result: ModuleDeclaration;
      n.decl = this.visitClassExpression(n.decl);
      const res = this.#transformClassBodyToFunction(n.decl);

      if (res.type === "CallExpression") {
        const decl: ExportDefaultExpression = {
          type: "ExportDefaultExpression",
          span: n.span,
          expression: assignment({
            span: n.span,
            left:
              n.decl.identifier ??
              identifier({ span: n.span, value: "__tmpLreUnnamedClass" }),
            right: res,
            operator: "=",
          }),
        };
        result = super.visitModuleDeclaration(decl);
      } else {
        result = super.visitModuleDeclaration({
          ...n,
          decl: res,
        });
      }

      this.#ctorStates = prevCtorState;
      return result;
    }

    return super.visitModuleDeclaration(n);
  }

  visitFunction<T extends Fn>(n: T): T {
    const prevCtorState = this.#initCtorStates();
    const res = super.visitFunction(n);
    prevCtorState.superUsed =
      prevCtorState.superUsed || this.#ctorStates.superUsed;
    this.#ctorStates = prevCtorState;
    return res;
  }

  visitArrowFunctionExpression(e: ArrowFunctionExpression): Expression {
    const prevCtorState = this.#initCtorStates();
    const res = super.visitArrowFunctionExpression(e);
    this.#ctorStates = prevCtorState;
    return res;
  }

  visitStatement(stmt: Statement): Statement {
    if (this.inConstructor) {
      if (stmt.type === "ReturnStatement") {
        this.#ctorStates.hasReturn = true;

        if (this.#ctorStates.hasSuperCtor) {
          return this.#createConstructorReturnStatement(
            stmt.span,
            stmt.argument,
            this.superIdentifierInCtor,
          )!;
        }

        return this.visitReturnStatement(stmt);
      }
    }

    return super.visitStatement(stmt);
  }

  visitConstructor(n: Constructor): ClassMember {
    this.inConstructor = true;
    const prevIsSuperConstructorFound = this.superIdentifierInCtor;
    this.superIdentifierInCtor = undefined;
    this.#ctorStates.exists = true;
    const res: Constructor = super.visitConstructor(n) as Constructor;

    if (this.#ctorStates.hasSuperCtor) {
      if (!this.#ctorStates.hasReturn && this.superIdentifierInCtor) {
        res.body?.stmts.push(
          this.#createConstructorReturnStatement(
            res.body.span,
            undefined,
            this.superIdentifierInCtor,
          )!,
        );
      }
    }

    this.inConstructor = false;
    this.superIdentifierInCtor = prevIsSuperConstructorFound;
    return res;
  }

  visitClassBody(members: ClassMember[]): ClassMember[] {
    this.#privateMethods = [];
    const prevInConstructor = this.inConstructor;
    this.inConstructor = false;
    this.isInClass = true;

    members.forEach((m) => {
      if (m.type === "PrivateMethod" && !!m.function.body) {
        this.#privateMethods.push(m.key.id.value);
      }
    });

    members = super.visitClassBody(members);
    this.isInClass = false;
    this.inConstructor = prevInConstructor;
    return members;
  }

  visitClass<T extends Class>(n: T): T {
    const prevSuperClass = this.currentSuperClass;
    this.currentSuperClass = undefined;

    if (n.superClass) {
      this.currentSuperClass = n.superClass as ExpressionWithSpan;

      if (!n.body.some((m) => m.type === "Constructor")) {
        n.body.push(
          this.#createEmptyConstructorWithSuper(this.currentSuperClass, n.span),
        );
      }
    }

    const res = super.visitClass(n);
    this.currentSuperClass = prevSuperClass;
    return res;
  }

  #createEmptyConstructorWithSuper(
    superClass: ExpressionWithSpan,
    wholeSpan: Span,
  ): ClassMember {
    const stmts: Statement[] = [];
    const span: Span = {
      start: wholeSpan.start + 1,
      end: wholeSpan.start + 2,
      ctxt: wholeSpan.ctxt,
    };

    const id = identifier({
      span,
      value: PARENT_IN_CTOR,
    });

    this.#createInstantiateParentAndAssign(stmts, {
      span,
      id,
      newexpr: this.#createNewBindApplyArgs({
        span,
        classToNew: superClass,
        args: arrayfromarguments(span),
      }),
    });

    stmts.push(this.#createConstructorReturnStatement(span, undefined, id)!);
    return {
      type: "Constructor",
      params: [],
      span,
      key: identifier({
        span,
        value: "constructor",
      }),
      body: {
        type: "BlockStatement",
        span,
        stmts: stmts,
      },
      isOptional: false,
    };
  }

  #createNewBindApplyArgs({
    span,
    classToNew,
    args,
  }: {
    span: Span;
    classToNew: ExpressionWithSpan;
    args?: Expression;
  }): NewExpression {
    return newexpression({
      callee: {
        type: "ParenthesisExpression",
        span,
        expression: call({
          callee: member({
            object: member({
              object: classToNew,
              property: identifier({
                span,
                value: "bind",
              }),
            }),
            property: identifier({
              span,
              value: "apply",
            }),
          }),
          args: [
            {
              expression: classToNew,
            },
            {
              expression: arrayexpression({
                span,
                elements: [
                  { expression: classToNew },
                  ...[args ? { expression: args } : undefined],
                ],
              }),
            },
          ],
        }),
      },
    });
  }

  visitDeclaration(decl: Declaration): Declaration {
    if (decl.type === "ClassDeclaration") {
      const prevCtorState = this.#initCtorStates();
      decl = this.visitClassDeclaration(decl) as ClassDeclaration;
      const result = super.visitDeclaration(
        onevariable({
          span: decl.span,
          id: decl.identifier,
          init: this.#transformClassBodyToFunction(decl),
          declare: decl.declare,
          kind: "const",
        }),
      );
      this.#ctorStates = prevCtorState;
      return result;
    }

    return super.visitDeclaration(decl);
  }

  visitNewExpression(n: NewExpression): Expression {
    if (n.arguments?.some((a) => !!a.spread)) {
      return this.#createNewBindApplyArgs({
        span: n.span,
        classToNew: n.callee as ExpressionWithSpan,
        args: arrayexpression({
          span: n.span,
          elements: n.arguments,
        }),
      });
    }

    return super.visitNewExpression(n);
  }

  visitProgram(n: Program): Program {
    this.#initCtorStates();
    return super.visitProgram(n);
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function classToFunction() {
  return (program: Program) => new ClassToFunction().visitProgram(program);
}

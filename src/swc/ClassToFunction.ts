import {
  Argument,
  CallExpression,
  ClassDeclaration,
  ClassExpression,
  ClassMember,
  ClassMethod,
  ClassProperty,
  ComputedPropName,
  Declaration,
  DefaultDecl,
  ExportDefaultExpression,
  Expression,
  FunctionExpression,
  Identifier,
  KeyValueProperty,
  ModuleDeclaration,
  NewExpression,
  Param,
  PrivateMethod,
  PrivateName,
  PrivateProperty,
  Program,
  PropertyName,
  Span,
  Statement,
  StaticBlock,
  SuperPropExpression,
  TsParameterProperty,
  TsType,
  VariableDeclarator,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import assignment from "./node/expression/assignment";
import identifier from "./node/identifier";
import onevariable from "./node/declaration/onevariable";
import { arrayexpression } from "./node/expression/arrayexpression";
import member from "./node/expression/member";
import { newexpression } from "./node/expression/newexpression";
import { ExpressionWithSpan } from "./types";
import { call } from "./node/expression/call";
import func from "./node/expression/func";
import thisexpression from "./node/expression/thisexpression";
import { assignmentStatement } from "./node/statement/assignment";
import undefinedidentifier from "./node/undefinedidentifier";
import booleanliteral from "./node/literal/booleanliteral";
import { unary } from "./node/expression/unary";
import returnstmt from "./node/statement/returnstmt";
import { fnApply } from "./node/expression/fnApply";
import { objectassign } from "./node/expression/objectassign";
import { objectexpression } from "./node/expression/objectexpression";
import iife from "./node/expression/iife";
import stringliteral from "./node/literal/stringliteral";

type ConstructorParts = {
  stmts: Statement[];
  args: Param[];
  propsFromArgs: MemberDeconstruction[];
};

type MemberDeconstruction = {
  declarator?: VariableDeclarator;
  assignment?: Statement | KeyValueProperty;
};

const PARENT_NAME = "__super";
const DECL_NAME = "__decl";
const DECL_DONE_NAME = "__declDone";

class ClassToFunction extends Visitor {
  currentSuperClass: Expression | undefined;

  #classToFunction(
    n: ClassDeclaration | ClassExpression,
  ): FunctionExpression | CallExpression {
    const ctorParts = this.#getCtorParts(n);
    const methodDecls = this.#getMethods(n);
    const propDecls = this.#getProps(n);

    const stmts: Statement[] = [];

    // parent private prop
    let parentId: Identifier | undefined;

    if (n.superClass) {
      parentId = identifier({
        span: {
          ...(n.superClass as ExpressionWithSpan).span,
          ctxt: 1,
        },
        value: PARENT_NAME,
      });
      stmts.push(
        onevariable({
          id: parentId,
        }),
      );
    }

    // declDone private prop
    const declDoneId = identifier({
      span: n.span,
      value: DECL_DONE_NAME,
    });
    stmts.push(onevariable({ id: declDoneId }));

    // private props and method declarations
    const declarators: Array<VariableDeclarator> = [
      ...methodDecls.map((m) => m.declarator).filter((d) => !!d),
      ...propDecls.map((p) => p.declarator).filter((d) => !!d),
      ...ctorParts.propsFromArgs.map((p) => p.declarator).filter((d) => !!d),
    ];

    if (declarators.length > 0) {
      stmts.push({
        type: "VariableDeclaration",
        span: n.span,
        kind: "let",
        declare: false,
        declarations: declarators,
      });
    }

    // decl function declaration
    const initParentId = identifier({ span: n.span, value: "initParent" });
    const declDoneIfStatement: Statement = {
      type: "IfStatement",
      span: n.span,
      test: unary({
        operator: "!",
        argument: declDoneId,
        span: n.span,
      }),
      consequent: {
        type: "BlockStatement",
        span: n.span,
        stmts: [],
      },
    };
    const protId = identifier({
      span: n.span,
      value: "prot",
    });

    const onlyKeyValueProperty = (
      m: MemberDeconstruction,
    ): m is { assignment: KeyValueProperty } =>
      m.assignment?.type === "KeyValueProperty";

    const onlyAssignStatement = (
      m: MemberDeconstruction,
    ): m is { assignment: Statement } =>
      !!m.assignment && m.assignment.type === "ExpressionStatement";

    const protoMembers: KeyValueProperty[] = [
      ...methodDecls.filter(onlyKeyValueProperty).map((m) => m.assignment),
      ...propDecls.filter(onlyKeyValueProperty).map((m) => m.assignment),
      ...ctorParts.propsFromArgs
        .filter(onlyKeyValueProperty)
        .map((m) => m.assignment),
    ];

    const protThisAssign: Argument[] = [
      { expression: thisexpression({ span: n.span }) },
      { expression: protId },
    ];

    const finalThisAssign: Argument[] | undefined = parentId
      ? [protThisAssign[0], { expression: parentId }, protThisAssign[1]]
      : undefined;

    const declStmts: Statement[] = [
      {
        ...declDoneIfStatement,
        consequent: {
          type: "BlockStatement",
          span: n.span,
          stmts: [
            onevariable({
              span: n.span,
              id: protId,
              init: {
                type: "ObjectExpression",
                span: n.span,
                properties: protoMembers,
              },
            }),
            {
              type: "ExpressionStatement",
              span: n.span,
              expression: objectassign(n.span, protThisAssign),
            },
          ],
        },
      },
      {
        ...declDoneIfStatement,
        consequent: {
          type: "BlockStatement",
          span: n.span,
          stmts: [
            ...((finalThisAssign
              ? [
                  {
                    type: "ExpressionStatement",
                    span: n.span,
                    expression: objectassign(n.span, finalThisAssign),
                  },
                ]
              : []) as Statement[]),
            ...propDecls.filter(onlyAssignStatement).map((m) => m.assignment),
            ...methodDecls.filter(onlyAssignStatement).map((m) => m.assignment),
            ...ctorParts.propsFromArgs
              .filter(onlyAssignStatement)
              .map((m) => m.assignment),
          ],
        },
      },
      assignmentStatement({
        span: n.span,
        left: declDoneId,
        right: booleanliteral({ span: n.span, value: true }),
        operator: "=",
      }),
    ];
    const declParams: Param[] = [];

    if (parentId) {
      declStmts.splice(
        1,
        0,
        assignmentStatement({
          span: n.span,
          left: parentId,
          right: call({
            callee: initParentId,
            args: [{ expression: thisexpression({ span: n.span }) }],
          }),
          operator: "=",
        }),
      );
      declParams.push({
        type: "Parameter",
        span: n.span,
        pat: initParentId,
      });
    }

    const declId = identifier({
      span: n.span,
      value: DECL_NAME,
    });

    // ctor declaration and call
    const ctorId = identifier({
      span: n.span,
      value: "ctor",
    });
    const lrArgsId = identifier({ span: n.span, value: "__lrArgs" });

    const ctorStmts: Statement[] = [
      onevariable({
        span: n.span,
        id: declId,
        init: func({
          span: n.span,
          params: declParams,
          stmts: declStmts,
        }),
      }),
    ];

    // if no superClass, call decl first in ctor, else decl will be called by super call
    if (!n.superClass) {
      ctorStmts.push({
        type: "ExpressionStatement",
        span: n.span,
        expression: call(
          {
            callee: declId,
          },
          false,
          {
            expression: thisexpression({ span: n.span }),
          },
        ),
      });
    }

    ctorStmts.push(...ctorParts.stmts);
    ctorStmts.push(
      returnstmt({
        span: n.span,
        argument: thisexpression({ span: n.span }),
      }),
    );

    stmts.push(
      onevariable({
        span: n.span,
        id: ctorId,
        init: this.visitExpression(
          func({
            span: n.span,
            params: ctorParts.args,
            stmts: ctorStmts,
          }),
        ),
      }),
    );
    stmts.push(
      returnstmt({
        span: n.span,
        argument: fnApply({
          callee: ctorId,
          thisArg: thisexpression({ span: n.span }),
          args: [
            {
              expression: lrArgsId,
            },
          ],
        }),
      }),
    );

    const fn = func({
      span: n.span,
      params: [
        {
          type: "Parameter",
          span: n.span,
          pat: lrArgsId,
        },
      ],
      stmts,
    });

    const fnId = identifier({ span: n.span, value: "fn" });
    const staticMembers = this.#getStatics(n, fnId);

    if (staticMembers.length === 0) {
      return fn;
    }

    return iife({
      span: n.span,
      stmts: [
        onevariable({
          span: n.span,
          id: fnId,
          init: fn,
        }),
        ...staticMembers,
        returnstmt({
          span: n.span,
          argument: fnId,
        }),
      ],
    }) as CallExpression;
  }

  #getCtorParts(n: ClassDeclaration | ClassExpression): ConstructorParts {
    const ctor = n.body.find((m) => m.type === "Constructor");

    if (!ctor || !ctor.body) {
      const stmts: Statement[] = [];

      if (n.superClass) {
        stmts.push({
          type: "ExpressionStatement",
          span: n.span,
          expression: this.#replaceSuperByDeclCall(
            n.span,
            n.superClass as ExpressionWithSpan,
            [{ expression: identifier({ span: n.span, value: "__lrArgs" }) }],
          ),
        });
      }

      return {
        args: [],
        stmts: stmts,
        propsFromArgs: [],
      };
    }

    return {
      args: ctor?.params
        .map(
          (p): Param =>
            p.type === "Parameter"
              ? p
              : {
                  span: p.span,
                  type: "Parameter",
                  pat: p.param.type === "Identifier" ? p.param : p.param.left,
                },
        )
        .filter((p) => !!p),
      stmts: ctor.body.stmts,
      propsFromArgs: this.#deconstructCtorArgs(ctor.params),
    };
  }

  #replaceSuperByDeclCall(
    span: Span,
    superClass: ExpressionWithSpan,
    params: Argument[],
  ): CallExpression {
    return call(
      {
        span,
        callee: identifier({
          span,
          value: DECL_NAME,
        }),
        args: [
          {
            expression: func({
              binded: { expression: thisexpression({ span }) },
              params: [
                {
                  type: "Parameter",
                  pat: identifier({ span, value: "obj" }),
                  span,
                },
              ],
              span,
              stmts: [
                returnstmt({
                  span,
                  argument: objectassign(span, [
                    { expression: objectexpression({}, span) },
                    {
                      expression: call(
                        {
                          callee: superClass,
                          args: [
                            {
                              expression: arrayexpression({
                                span,
                                elements: params,
                              }),
                            },
                          ],
                        },
                        false,
                        { expression: identifier({ span, value: "obj" }) },
                      ),
                    },
                  ]),
                }),
              ],
            }),
          },
        ],
      },
      false,
      { expression: thisexpression({ span }) },
    ) as CallExpression;
  }

  #deconstructCtorArgs(
    params: (Param | TsParameterProperty)[],
  ): MemberDeconstruction[] {
    return params
      .filter((p) => p.type === "TsParameterProperty")
      .map((p) => {
        if (p.accessibility === "private") {
          const id = ClassToFunction.getPrivateNameIdentifier(
            p.param.type === "Identifier"
              ? p.param
              : (p.param.left as Identifier),
          );
          return {
            declarator: {
              type: "VariableDeclarator",
              span: p.span,
              id,
              definite: false,
            },
            assignment: assignmentStatement({
              span: p.span,
              left: id,
              right:
                p.param.type === "Identifier"
                  ? p.param
                  : (p.param.left as Identifier),
              operator: "=",
            }),
          };
        }

        return {
          assignment: {
            type: "KeyValueProperty",
            key:
              p.param.type === "Identifier"
                ? p.param
                : (p.param.left as Identifier),
            value:
              p.param.type === "Identifier"
                ? p.param
                : (p.param.left as Identifier),
          },
        };
      });
  }

  #getMethods(
    n: ClassDeclaration | ClassExpression,
  ): Array<MemberDeconstruction> {
    return n.body
      .filter(ClassToFunction.isInstanceMethod)
      .reduce(ClassToFunction.deconstructMethod, []);
  }

  static isInstanceMethod(
    member: ClassMember,
  ): member is ClassMethod | PrivateMethod {
    return (
      (member.type === "ClassMethod" || member.type === "PrivateMethod") &&
      !member.isStatic &&
      !member.isAbstract &&
      !!member.function.body
    );
  }

  static deconstructMethod(
    acc: MemberDeconstruction[],
    method: ClassMethod | PrivateMethod,
    key: number = 0,
  ): MemberDeconstruction[] {
    const span = method.span;

    let id: Identifier | ComputedPropName;
    const isPrivate =
      method.type === "PrivateMethod" || method.accessibility === "private";
    const isDecorated = !!method.function.decorators?.length;

    if (isPrivate) {
      id = ClassToFunction.getPrivateNameIdentifier(method.key);
    } else if (
      method.key.type === "Identifier" ||
      method.key.type === "Computed"
    ) {
      id = method.key;
    } else {
      id = {
        type: "Computed",
        span: method.key.span,
        expression: method.key,
      };
    }

    let methodFunction = func({
      /*binded:
        isPrivate && !isDecorated
          ? { expression: thisexpression({ span: method.span }) }
          : null,*/
      span,
      stmts: method.function.body?.stmts ?? [],
      params: method.function.params,
    });

    if (isDecorated) {
      const contextCreationCall = call({
        span,
        callee: identifier({
          span,
          value: "ct",
        }),
        args: [
          {
            expression:
              id.type === "Identifier"
                ? stringliteral({
                    span,
                    value: id.value,
                  })
                : id.expression,
          },
        ],
      });

      method.function.decorators!.reverse().forEach((decorator) => {
        methodFunction = call(
          {
            callee: decorator.expression,
            args: [
              {
                expression: methodFunction,
              },
              {
                expression: contextCreationCall,
              },
            ],
          },
          false,
          { expression: thisexpression({ span }) },
        ) as CallExpression;
      });

      const decoratedId = ClassToFunction.getPrivateNameIdentifier({
        type: "Identifier",
        span,
        value:
          "decorated" +
          (id.type === "Identifier" ? id.value : "Computed" + key),
      } as Identifier);

      acc.push({
        declarator: {
          type: "VariableDeclarator",
          span: method.span,
          id: decoratedId,
          definite: false,
        },
        assignment: assignmentStatement({
          span: method.span,
          left: decoratedId,
          right: methodFunction,
          operator: "=",
        }),
      });

      methodFunction = func({
        binded: isPrivate
          ? { expression: thisexpression({ span: method.span }) }
          : null,
        span,
        stmts: [
          returnstmt({
            span,
            argument: fnApply({
              callee: decoratedId,
              thisArg: thisexpression({ span }),
              args: [
                {
                  expression: identifier({ span, value: "arguments" }),
                },
              ],
            }),
          }),
        ],
      });
    }

    if (isPrivate) {
      acc.push({
        declarator: {
          type: "VariableDeclarator",
          span: method.span,
          id: id as Identifier,
          definite: false,
        },
        assignment: assignmentStatement({
          span: method.span,
          left: id as Identifier,
          right: methodFunction,
          operator: "=",
        }),
      });
    } else {
      acc.push({
        assignment: {
          type: "KeyValueProperty",
          key: id,
          value: methodFunction,
        },
      });
    }

    return acc;
  }

  #getProps(
    n: ClassDeclaration | ClassExpression,
  ): Array<MemberDeconstruction> {
    return n.body
      .filter(ClassToFunction.isInstanceProp)
      .map(ClassToFunction.deconstructProp);
  }

  static isInstanceProp(
    member: ClassMember,
  ): member is ClassProperty | PrivateProperty {
    return (
      ((member.type === "ClassProperty" && !member.isAbstract) ||
        member.type === "PrivateProperty") &&
      !member.isStatic
    );
  }

  static deconstructProp(
    prop: ClassProperty | PrivateProperty,
  ): MemberDeconstruction {
    let propValue: Expression | undefined = undefined;

    if (prop.value) {
      propValue = prop.value;
    }

    if (prop.type === "PrivateProperty") {
      const id = ClassToFunction.getPrivateNameIdentifier(prop.key);
      const result: MemberDeconstruction = {
        declarator: {
          type: "VariableDeclarator",
          span: prop.span,
          id,
          definite: false,
        },
      };

      if (propValue) {
        result.assignment = assignmentStatement({
          span: prop.span,
          left: id,
          right: propValue,
          operator: "=",
        });
      }

      return result;
    }

    let propKey: Identifier | ComputedPropName;

    if (prop.key.type === "Identifier" || prop.key.type === "Computed") {
      propKey = prop.key;
    } else {
      propKey = {
        type: "Computed",
        span: prop.key.span,
        expression: prop.key,
      };
    }

    return {
      assignment: assignmentStatement({
        span: prop.span,
        left: member({
          span: prop.span,
          object: thisexpression({ span: prop.span }),
          property: propKey,
        }),
        right: propValue ?? undefinedidentifier({ span: prop.span }),
        operator: "=",
      }),
    };

    return {
      assignment: {
        type: "KeyValueProperty",
        key: propKey,
        value: propValue ?? undefinedidentifier({ span: prop.span }),
      },
    };
  }

  static getPrivateNameIdentifier(
    name: PrivateName | PropertyName,
  ): Identifier {
    if (name.type === "PrivateName") {
      return identifier({
        span: name.span,
        value: `__${name.id.value}`,
      });
    }

    if (name.type === "Identifier" || name.type === "StringLiteral") {
      return identifier({
        span: name.span,
        value: `__${name.value}`,
      });
    }

    throw new Error("Unsupported private name type " + name.type);
  }

  #getStatics(
    n: ClassDeclaration | ClassExpression,
    fnId: Identifier,
  ): Statement[] {
    return n.body
      .filter(
        (member): member is ClassMethod | ClassProperty | StaticBlock =>
          ((member.type === "ClassMethod" || member.type === "ClassProperty") &&
            member.isStatic) ||
          member.type === "StaticBlock",
      )
      .map(
        (
          staticMember: ClassMethod | ClassProperty | StaticBlock,
        ): Statement => {
          if (staticMember.type === "StaticBlock") {
            console.log("static block");
            return {
              type: "ExpressionStatement",
              span: staticMember.span,
              expression: iife({
                span: staticMember.span,
                stmts: staticMember.body.stmts,
              }),
            };
          }

          return assignmentStatement({
            span: staticMember.span,
            left: member({
              span: staticMember.span,
              object: fnId,
              property:
                staticMember.key.type === "Identifier" ||
                staticMember.key.type === "Computed"
                  ? staticMember.key
                  : {
                      type: "Computed",
                      span: staticMember.key.span,
                      expression: staticMember.key,
                    },
            }),
            right:
              staticMember.type === "ClassMethod"
                ? func({
                    span: staticMember.span,
                    params: staticMember.function.params,
                    stmts: staticMember.function.body?.stmts ?? [],
                  })
                : (staticMember.value as Expression),
            operator: "=",
          });
        },
      );
  }

  visitExpression(n: Expression): Expression {
    let savedCurrentSuperClass;
    let result: Expression | undefined;

    switch (n.type) {
      case "ClassExpression":
        savedCurrentSuperClass = this.currentSuperClass;
        this.currentSuperClass = n.superClass;
        result = this.visitExpression(this.#classToFunction(n));
        this.currentSuperClass = savedCurrentSuperClass;
        return result;
      case "MemberExpression":
        if (n.property.type === "PrivateName") {
          return super.visitExpression(
            ClassToFunction.getPrivateNameIdentifier(n.property),
          );
        }

        break;
      case "CallExpression":
        if (
          n.callee.type === "MemberExpression" &&
          n.callee.property.type === "PrivateName"
        ) {
          return super.visitExpression({
            ...n,
            callee: {
              type: "MemberExpression",
              span: n.callee.span,
              object: n.callee,
              property: identifier({
                span: n.callee.property.span,
                value: "call",
              }),
            },
            arguments: [
              {
                expression: thisexpression({ span: n.span }),
              },
              ...n.arguments,
            ],
          });
        }

        break;
    }

    return super.visitExpression(n);
  }

  visitDeclaration(decl: Declaration): Declaration {
    if (decl.type === "ClassDeclaration") {
      const savedCurrentSuperClass = this.currentSuperClass;
      this.currentSuperClass = decl.superClass;
      decl = this.visitClassDeclaration(decl) as ClassDeclaration;
      const result = super.visitDeclaration(
        onevariable({
          span: decl.span,
          id: decl.identifier,
          init: this.#classToFunction(decl),
          declare: decl.declare,
          kind: "const",
        }),
      );
      this.currentSuperClass = savedCurrentSuperClass;
      return result;
    }

    return super.visitDeclaration(decl);
  }

  visitModuleDeclaration(n: ModuleDeclaration): ModuleDeclaration {
    if (
      n.type === "ExportDefaultDeclaration" &&
      n.decl.type === "ClassExpression"
    ) {
      const savedCurrentSuperClass = this.currentSuperClass;
      this.currentSuperClass = n.decl.superClass;
      let result: ModuleDeclaration;
      n.decl = this.visitClassExpression(n.decl);
      const res = this.#classToFunction(n.decl);

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

      this.currentSuperClass = savedCurrentSuperClass;
      return result;
    }

    return super.visitModuleDeclaration(n);
  }

  visitDefaultDeclaration(n: DefaultDecl): DefaultDecl {
    if (n.type === "ClassExpression") {
      const savedCurrentSuperClass = this.currentSuperClass;
      n = super.visitClassExpression(n);
      const res = this.#classToFunction(n);
      const result = super.visitExpression(res) as FunctionExpression;
      this.currentSuperClass = savedCurrentSuperClass;
      return result;
    }

    return super.visitDefaultDeclaration(n);
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

  visitCallExpression(n: CallExpression): Expression {
    if (n.callee.type === "Super") {
      return this.#replaceSuperByDeclCall(
        n.span,
        this.currentSuperClass as ExpressionWithSpan,
        n.arguments,
      );
    }

    return super.visitCallExpression(n);
  }

  visitSuperPropExpression(n: SuperPropExpression): Expression {
    return member({
      object: identifier({
        span: {
          ...n.span,
          ctxt: 1,
        },
        value: PARENT_NAME,
      }),
      property: n.property,
    });
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

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function classToFunction() {
  return (program: Program) => new ClassToFunction().visitProgram(program);
}

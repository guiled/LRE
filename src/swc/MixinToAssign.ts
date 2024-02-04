import {
  Argument,
  ArrowFunctionExpression,
  CallExpression,
  ClassDeclaration,
  ClassExpression,
  ClassMember,
  Constructor,
  Declaration,
  ExprOrSpread,
  Expression,
  ExpressionStatement,
  Program,
  Span,
  Statement,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import identifier from "./node/identifier";
import { objectassign } from "./node/expression/objectassign";
import { newexpression } from "./node/expression/newexpression";
import thisexpression from "./node/expression/thisexpression";
import call from "./node/expression/call";
import member from "./node/expression/member";
import { arrayexpression } from "./node/expression/arrayexpression";
import iife from "./node/expression/iife";
import { paramidentifier } from "./node/paramidentifier";
import func from "./node/expression/func";
import parenthesis from "./node/expression/parenthesis";
import memberchained from "./node/expression/memberchained";
import nullliteral from "./node/literal/nullliteral";
import onevariable from "./node/declaration/onevariable";
import returnstmt from "./node/statement/returnstmt";
import expression from "./node/expression";
import { objectexpression } from "./node/expression/objectexpression";

class MixinToAssign extends Visitor {
  #mixinClasses: Argument[] | undefined;
  #constructorFound: boolean = false;

  #makeMixinAssigns(span: Span, mixins: Argument[]): CallExpression {
    return {
      type: "CallExpression",
      callee: objectassign(span),
      span: span,
      arguments: [
        { expression: thisexpression({ span }) },
        ...mixins.map<Argument>((mixin: Argument) => ({
          expression: newexpression({
            callee: mixin.expression,
            arguments: [
              {
                spread: span,
                expression: call({
                  callee: member({
                    object: identifier({
                      span,
                      value: "Array",
                    }),
                    property: identifier({
                      span,
                      value: "from",
                    }),
                  }),
                  args: [
                    {
                      spread: undefined,
                      expression: identifier({
                        span,
                        value: "arguments",
                      }),
                    },
                  ],
                }),
              },
            ],
          }),
        })),
      ],
    };
  }

  visitConstructor(n: Constructor): ClassMember {
    if (!this.#mixinClasses || !n.body) {
      return super.visitConstructor(n);
    }
    this.#constructorFound = true;
    const span = n.span;
    const _a = identifier({ span, value: "_a" });
    const _mixins = identifier({ span, value: "_mixins" });
    const _m = identifier({ span, value: "_m" });
    const _idx = identifier({ span, value: "_idx" });
    let superFound = false;
    const parentMixin = identifier({
      span,
      value: "_parentMixin",
    });
    const parentMixins = identifier({
      span,
      value: "_parents",
    });
    n.body.stmts = n.body?.stmts.map<Statement>(
      (stmt: Statement): Statement => {
        if (this.#isSuperCall(stmt)) {
          superFound = true;
          const callExpression: CallExpression = (stmt as ExpressionStatement)
            .expression as CallExpression;
          return onevariable({
            span,
            id: parentMixins,
            init: iife({
              span,
              called: { expression: thisexpression({ span }) },
              params: [
                paramidentifier({ span, param: _mixins }),
                paramidentifier({ span, param: _a }),
              ],
              args: [
                expression(
                  arrayexpression({
                    span,
                    elements: this.#mixinClasses!.map<ExprOrSpread>((m) => m),
                  })
                ),
                ...callExpression.arguments,
              ],
              stmts: [
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
                onevariable({
                  span,
                  id: identifier({
                    span,
                    value: "resParent",
                  }),
                  init: call({
                    callee: member({
                      object: _mixins,
                      property: identifier({ span, value: "map" }),
                    }),
                    args: [
                      expression(
                        func({
                          span,
                          params: [
                            paramidentifier({ span, param: _m }),
                            paramidentifier({ span, param: _idx }),
                          ],
                          binded: { expression: thisexpression({ span }) },
                          stmts: [
                            onevariable({
                              span,
                              id: parentMixin,
                              init: {
                                type: "NewExpression",
                                span,
                                callee: parenthesis({
                                  span,
                                  expression: call({
                                    callee: memberchained({
                                      span,
                                      properties: ["_m", "bind", "apply"],
                                    }),
                                    args: [
                                      expression(_m),
                                      expression(
                                        arrayexpression({
                                          span,
                                          elements: [
                                            expression(
                                              nullliteral({
                                                span,
                                              })
                                            ),
                                            expression(
                                              member({
                                                object: _a,
                                                property: {
                                                  type: "Computed",
                                                  span,
                                                  expression: _idx,
                                                },
                                              })
                                            ),
                                          ],
                                        })
                                      ),
                                    ],
                                  }),
                                }),
                              },
                            }),
                            {
                              type: "ExpressionStatement",
                              span,
                              expression: call({
                                callee: objectassign(span),
                                args: [
                                  expression(thisexpression({ span })),
                                  expression(parentMixin),
                                ],
                              }),
                            },
                            returnstmt({
                              span,
                              argument: parentMixin,
                            }),
                          ],
                        })
                      ),
                    ],
                  }),
                }),
                {
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
                },
                returnstmt({
                  span,
                  argument: identifier({
                    span,
                    value: "resParent",
                  }),
                }),
              ],
            }),
          });
        }
        return stmt;
      }
    );
    if (!superFound) {
      n.body.stmts.unshift({
        type: "ExpressionStatement",
        expression: this.#makeMixinAssigns(span, this.#mixinClasses),
        span,
      });
    }
    return super.visitConstructor(n);
  }

  #isSuperCall(stmt: Statement): boolean {
    return (
      stmt.type === "ExpressionStatement" &&
      stmt.expression.type === "CallExpression" &&
      stmt.expression.callee.type === "Super"
    );
  }

  visitClassDeclaration(decl: ClassDeclaration): Declaration {
    const superClass = decl.superClass;
    const mixinCall = superClass && this.#getMixinCall(superClass);
    if (mixinCall) {
      const span = decl.span;
      const newClass: ClassDeclaration = {
        ...decl,
        superClass: undefined,
      };
      const prevMixinClasses = this.#mixinClasses;
      const prevConstructorFound = this.#constructorFound;
      this.#mixinClasses = mixinCall.arguments;
      this.#constructorFound = false;
      const res = super.visitClassDeclaration(newClass);
      if (!this.#constructorFound) {
        newClass.body.push({
          type: "Constructor",
          span,
          key: identifier({
            span,
            value: "constructor",
          }),
          params: [],
          isOptional: false,
          body: {
            type: "BlockStatement",
            span: span,
            stmts: [
              {
                type: "ExpressionStatement",
                expression: this.#makeMixinAssigns(span, this.#mixinClasses),
                span,
              },
            ],
          },
        });
      }
      this.#mixinClasses = prevMixinClasses;
      this.#constructorFound = prevConstructorFound;
      return res;
    }
    return super.visitClassDeclaration(decl);
  }

  #getMixinCall(e: Expression): CallExpression | undefined {
    if (this.#isMixinCall(e)) {
      return e as CallExpression;
    } else if (
      (e.type === "ParenthesisExpression" || e.type === "TsAsExpression") &&
      this.#isMixinCall(e.expression)
    ) {
      return e.expression as CallExpression;
    } else if (
      e.type === "ParenthesisExpression" &&
      e.expression.type === "TsAsExpression" &&
      this.#isMixinCall(e.expression.expression)
    ) {
      return e.expression.expression as CallExpression;
    }

    return undefined;
  }

  #isMixinCall(e: Expression): boolean {
    return (
      e.type === "CallExpression" &&
      e.callee.type === "Identifier" &&
      e.callee.value === "Mixin"
    );
  }

  visitArrowFunctionExpression(e: ArrowFunctionExpression): Expression {
    if (this.#isMixable(e) && e.body.type === "ClassExpression") {
      const res = this.visitExpression(e.body);
      this.#transformMixable(e.body);
      return res;
    }
    const res = super.visitArrowFunctionExpression(e);
    return res;
  }

  #isMixable(e: ArrowFunctionExpression): boolean {
    if (
      e.params[0]?.type === "Identifier" &&
      e.params[0].value === "superclass"
    ) {
      return true;
    }
    if (
      e.params[0]?.type === "AssignmentPattern" &&
      e.params[0].left.type === "Identifier" &&
      e.params[0].left.value === "superclass"
    ) {
      return true;
    }

    return false;
  }

  #transformMixable(c: ClassExpression): ClassExpression {
    if (
      c.superClass?.type === "Identifier" &&
      c.superClass.value === "superclass"
    ) {
      c.superClass = undefined;
      const ctor = c.body.find(
        (cm) => cm.type === "Constructor"
      ) as Constructor;
      if (ctor && ctor.body) {
        ctor.body.stmts = ctor.body.stmts.filter((s) => !this.#isSuperCall(s));
      }
    }
    return c;
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export function mixinToAssign() {
  return (program: Program) => new MixinToAssign().visitProgram(program);
}

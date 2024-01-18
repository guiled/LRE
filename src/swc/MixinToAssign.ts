import {
  Argument,
  CallExpression,
  ClassDeclaration,
  ClassMember,
  Constructor,
  Declaration,
  ExprOrSpread,
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
        if (
          stmt.type === "ExpressionStatement" &&
          stmt.expression.type === "CallExpression" &&
          stmt.expression.callee.type === "Super"
        ) {
          superFound = true;
          const callExpression: CallExpression = stmt.expression;
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

  visitClassDeclaration(decl: ClassDeclaration): Declaration {
    const superClass = decl.superClass;
    if (
      superClass &&
      superClass.type === "CallExpression" &&
      superClass.callee.type === "Identifier" &&
      superClass.callee.value === "Mixin"
    ) {
      const span = decl.span;
      const newClass: ClassDeclaration = {
        ...decl,
        superClass: undefined,
      };
      const prevMixinClasses = this.#mixinClasses;
      const prevConstructorFound = this.#constructorFound;
      this.#mixinClasses = superClass.arguments;
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

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export function mixinToAssign() {
  return (program: Program) => new MixinToAssign().visitProgram(program);
}

import {
  Argument,
  CallExpression,
  ClassDeclaration,
  ClassMember,
  Constructor,
  Declaration,
  ExprOrSpread,
  ObjectExpression,
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

class MixinToAssign extends Visitor {
  #mixinClasses: Argument[] | undefined;
  #constructorFound: boolean = false;

  #makeMixinAssigns(
    span: Span,
    mixins: Argument[],
    constructorArgs: ObjectExpression["properties"]
  ): CallExpression {
    return {
      type: "CallExpression",
      callee: objectassign(span),
      span: span,
      arguments: [
        { expression: thisexpression({ span }) },
        ...mixins.map<Argument>((mixin: Argument) => ({
          expression: newexpression(mixin.expression, [], span),
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
    n.body.stmts = n.body?.stmts.map<Statement>(
      (stmt: Statement): Statement => {
        if (
          stmt.type === "ExpressionStatement" &&
          stmt.expression.type === "CallExpression" &&
          stmt.expression.callee.type === "Super"
        ) {
          superFound = true;
          const callExpression: CallExpression = stmt.expression;
          return {
            span,
            type: "ExpressionStatement",
            expression: iife({
              span,
              called: { expression: thisexpression({ span }) },
              params: [
                paramidentifier({ span, param: _mixins }),
                paramidentifier({ span, param: _a }),
              ],
              args: [
                {
                  expression: arrayexpression({
                    span,
                    elements: this.#mixinClasses!.map<ExprOrSpread>((m) => m),
                  }),
                },
                ...callExpression.arguments,
              ],
              stmts: [
                {
                  type: "ExpressionStatement",
                  span,
                  expression: call({
                    span,
                    callee: member({
                      span,
                      object: _mixins,
                      property: identifier({ span, value: "forEach" }),
                    }),
                    args: [
                      {
                        expression: func({
                          span,
                          params: [
                            paramidentifier({ span, param: _m }),
                            paramidentifier({ span, param: _idx }),
                          ],
                          binded: { expression: thisexpression({ span }) },
                          stmts: [
                            {
                              type: "ExpressionStatement",
                              span,
                              expression: call({
                                span,
                                callee: objectassign(span),
                                args: [
                                  { expression: thisexpression({ span }) },
                                  {
                                    expression: {
                                      type: "NewExpression",
                                      span,
                                      callee: parenthesis({
                                        span,
                                        expression: call({
                                          span,
                                          callee: memberchained({
                                            span,
                                            properties: ["_m", "bind", "apply"],
                                          }),
                                          args: [
                                            { expression: _m },
                                            {
                                              expression: arrayexpression({
                                                span,
                                                elements: [
                                                  {
                                                    expression: nullliteral({
                                                      span,
                                                    }),
                                                  },
                                                  {
                                                    expression: member({
                                                      span,
                                                      object: _a,
                                                      property: {
                                                        type: "Computed",
                                                        span,
                                                        expression: _idx,
                                                      },
                                                    }),
                                                  },
                                                ],
                                              }),
                                            },
                                          ],
                                        }),
                                      }),
                                    },
                                  },
                                ],
                              }),
                            },
                          ],
                        }),
                      },
                    ],
                  }),
                },
              ],
            }),
          };
        }
        return stmt;
      }
    );
    if (!superFound) {
      n.body.stmts.unshift({
        type: "ExpressionStatement",
        expression: this.#makeMixinAssigns(span, this.#mixinClasses, []),
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
      const newClass = {
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
                expression: this.#makeMixinAssigns(
                  span,
                  this.#mixinClasses,
                  []
                ),
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

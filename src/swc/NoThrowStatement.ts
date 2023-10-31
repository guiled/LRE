import {
  CatchClause,
  ExpressionStatement,
  Identifier,
  NewExpression,
  Program,
  Span,
  Statement,
  ThrowStatement,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import call from "./node/expression/call";
import identifier from "./node/identifier";
import assignment from "./node/expression/assignment";
import { objectassign } from "./node/expression/objectassign";
import member from "./node/expression/member";
import binary from "./node/expression/binary";

class NoThrowStatement extends Visitor {
  #throwErrorStatement(span: Span): ExpressionStatement {
    return {
      type: "ExpressionStatement",
      span,
      expression: call({
        span,
        callee: identifier({
          span,
          value: "throwError",
        }),
      }),
    };
  }

  #lastExceptionIdentifier(span: Span): Identifier {
    return identifier({
      span,
      value: "lastException",
    });
  }

  visitThrowStatement(stmt: ThrowStatement): Statement {
    const span = stmt.span;
    const newExpr: NewExpression = stmt.argument as NewExpression;
    const _identifier = identifier({
      span,
      value: "_",
    });

    return {
      type: "ExpressionStatement",
      span,
      expression: {
        type: "CallExpression",
        span,
        callee: identifier({
          span,
          value: "throwError",
        }),
        arguments: [
          {
            expression: stmt.argument,
          },
        ],
      },
    };

    const result: Statement = {
      type: "TryStatement",
      span,
      block: {
        type: "BlockStatement",
        span,
        stmts: [this.#throwErrorStatement(span)],
      },
      handler: {
        type: "CatchClause",
        span,
        param: _identifier,
        body: {
          type: "BlockStatement",
          span,
          stmts: [
            {
              type: "ExpressionStatement",
              span,
              expression: assignment({
                span,
                left: this.#lastExceptionIdentifier(span),
                right: {
                  ...newExpr,
                  arguments: [
                    ...(newExpr.arguments || []),
                    {
                      expression: {
                        type: "ObjectExpression",
                        span,
                        properties: [
                          {
                            type: "KeyValueProperty",
                            key: identifier({
                              span,
                              value: "cause",
                            }),
                            value: _identifier,
                          },
                        ],
                      },
                    },
                  ],
                },
                operator: "=",
              }),
            },
            this.#throwErrorStatement(span),
          ],
        },
      },
    };
    return result;
  }

  visitCatchClause(handler: CatchClause | undefined): CatchClause | undefined {
    if (!handler) return handler;

    const stmts: Statement[] = handler.body.stmts;

    if (handler.param?.type === "Identifier") {
      stmts.unshift({
        type: "ExpressionStatement",
        span: handler.param.span,
        expression: assignment({
          span: handler.param.span,
          left: handler.param,
          right: binary({
            span: handler.param.span,
            operator: "||",
            left: call(
              {
                span: handler.param.span,
                callee: member(
                  {
                    span: handler.param.span,
                    object: this.#lastExceptionIdentifier(handler.span),
                    property: identifier({
                      span: handler.param.span,
                      value: "thrownBy",
                    }),
                  },
                  true
                ),
                args: [
                  {
                    expression: handler.param,
                  },
                ],
              },
              true
            ),
            right: handler.param,
          }),
          operator: "=",
        }),
      });
    }

    return super.visitCatchClause({
      ...handler,
      body: {
        type: "BlockStatement",
        span: handler.body.span,
        stmts,
      },
    });
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function noThrowStatement() {
  return (program: Program) => new NoThrowStatement().visitProgram(program);
}

import {
  CatchClause,
  Identifier,
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
import member from "./node/expression/member";
import binary from "./node/expression/binary";
import parenthesis from "./node/expression/parenthesis";

class NoThrowStatement extends Visitor {

  #lastExceptionIdentifier(span: Span): Identifier {
    return identifier({
      span,
      value: "lastException",
    });
  }

  visitThrowStatement(stmt: ThrowStatement): Statement {
    const span = stmt.span;

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
          right: call({
            span: handler.param.span,
            callee: member({
              span: handler.param.span,
              object: parenthesis({
                span: handler.param.span,
                expression: binary({
                  left: this.#lastExceptionIdentifier(handler.span),
                  right: call({
                    callee: identifier({
                      span: handler.param.span,
                      value: "newError",
                    }),
                    args: [
                      {
                        expression: member({
                          object: handler.param,
                          property: identifier({
                            span: handler.param.span,
                            value: "message",
                          }),
                        }, true),
                      },
                    ],
                  }),
                  operator: "||",
                }),
              }),
              property: identifier({
                span: handler.param.span,
                value: "thrownBy",
              }),
            }),
            args: [
              {
                expression: handler.param,
              },
            ],
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

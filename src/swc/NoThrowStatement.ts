import {
  CatchClause,
  Identifier,
  Program,
  Span,
  Statement,
  ThrowStatement,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import { call } from "./node/expression/call";
import identifier from "./node/identifier";
import member from "./node/expression/member";
import parenthesis from "./node/expression/parenthesis";
import or from "./node/expression/binary/or";
import undefinedidentifier from "./node/undefinedidentifier";
import { assignmentStatement } from "./node/statement/assignment";

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
      stmts.unshift(
        assignmentStatement({
          span: handler.param.span,
          left: handler.param,
          right: call({
            span: handler.param.span,
            callee: member({
              span: handler.param.span,
              object: parenthesis({
                span: handler.param.span,
                expression: or({
                  left: this.#lastExceptionIdentifier(handler.span),
                  right: call({
                    callee: identifier({
                      span: handler.param.span,
                      value: "newError",
                    }),
                    args: [
                      {
                        expression: {
                          span: handler.param.span,
                          type: "ConditionalExpression",
                          test: handler.param,
                          consequent: member({
                            object: handler.param,
                            property: identifier({
                              span: handler.param.span,
                              value: "message",
                            }),
                          }),
                          alternate: undefinedidentifier({
                            span: handler.param.span,
                          }),
                        },
                      },
                    ],
                  }),
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
      );
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

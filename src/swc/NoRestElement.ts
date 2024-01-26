import {
  ArrowFunctionExpression,
  BlockStatement,
  Expression,
  Fn,
  FunctionExpression,
  Param,
  Program,
  RestElement,
  Span,
  ThisExpression,
  TsType,
  VariableDeclaration,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import call from "./node/expression/call";
import member from "./node/expression/member";
import identifier from "./node/identifier";
import numericliteral from "./node/literal/numericliteral";
import { ExpressionWithSpan } from "./types";
import returnstmt from "./node/statement/returnstmt";
import thisexpression from "./node/expression/thisexpression";

class NoRestElement extends Visitor {
  #hasThis: boolean = false;

  #getVariableDeclarationForRest(
    span: Span,
    pat: RestElement,
    nameArgsCount = 0
  ): VariableDeclaration {
    return {
      type: "VariableDeclaration",
      span,
      kind: "var",
      declare: false,
      declarations: [
        {
          type: "VariableDeclarator",
          span,
          id: pat.argument,
          init: call({
            callee: member({
              object: call({
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
              property: identifier({
                span,
                value: "slice",
              }),
            }),
            args: [
              {
                spread: undefined,
                expression: numericliteral({
                  span,
                  value: nameArgsCount,
                }),
              },
            ],
          }),
          definite: false,
        },
      ],
    };
  }

  visitThisExpression(n: ThisExpression): Expression {
    this.#hasThis = true;
    return super.visitThisExpression(n);
  }

  visitArrowFunctionExpression(e: ArrowFunctionExpression): Expression {
    if (e.params.length > 0) {
      const lastParam = e.params[e.params.length - 1];

      if (lastParam.type === "RestElement") {
        e.params.pop();
        const span = (e.body as ExpressionWithSpan).span;

        const newFcn: FunctionExpression = {
          type: "FunctionExpression",
          params: e.params.map((p) => ({
            type: "Parameter",
            pat: p,
            span,
          })),
          generator: false,
          async: false,
          span,
        };
        if (e.body.type !== "BlockStatement") {
          newFcn.body = {
            type: "BlockStatement",
            span,
            stmts: [
              returnstmt({
                span,
                argument: this.visitExpression(e.body),
              }),
            ],
          };
        } else {
          newFcn.body = this.visitBlockStatement(e.body);
        }

        newFcn.body.stmts.unshift(
          this.#getVariableDeclarationForRest(
            lastParam.span,
            lastParam,
            e.params.length
          )
        );

        if (this.#hasThis) {
          return this.visitExpression(
            call({
              callee: member({
                object: newFcn,
                property: identifier({
                  span,
                  value: "bind",
                }),
              }),
              args: [{ expression: thisexpression({ span }) }],
            })
          );
        }
        return this.visitFunctionExpression(newFcn);
      }
    }
    return super.visitArrowFunctionExpression(e);
  }

  visitFunction<T extends Fn>(n: T): T {
    const saveHasThis = this.#hasThis;
    this.#hasThis = false;
    if (typeof n.body !== "undefined" && n.body && n.params.length > 0) {
      const statementsToAdd: BlockStatement["stmts"] = [];
      const hasThisArgs =
        n.params[0].pat.type === "Identifier" &&
        n.params[0].pat.value === "this";
      const lastParam: Param = n.params[n.params.length - 1];

      if (lastParam.pat.type === "RestElement") {
        n.params.pop();
        const span = lastParam.span;
        statementsToAdd.push(
          this.#getVariableDeclarationForRest(
            span,
            lastParam.pat,
            n.params.length - (hasThisArgs ? 1 : 0)
          )
        );
      }

      n.body.stmts = [...statementsToAdd, ...n.body?.stmts];
    }
    const res = super.visitFunction(n);
    this.#hasThis = saveHasThis;
    return res;
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export function noRestElement() {
  return (program: Program) => new NoRestElement().visitProgram(program);
}

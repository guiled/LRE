import { BlockStatement, Fn, Param, Program, TsType } from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import call from "./node/expression/call";
import member from "./node/expression/member";
import identifier from "./node/identifier";
import numericliteral from "./node/literal/numericliteral";

class NoRestElement extends Visitor {
  visitFunction<T extends Fn>(n: T): T {
    if (typeof n.body !== "undefined" && n.body && n.params.length > 0) {
      const statementsToAdd: BlockStatement["stmts"] = [];
      const hasThisArgs =
        n.params[0].pat.type === "Identifier" &&
        n.params[0].pat.value === "this";
      const lastParam: Param = n.params[n.params.length - 1];

      if (lastParam.pat.type === "RestElement") {
        n.params.pop();
        statementsToAdd.push({
          type: "VariableDeclaration",
          span: lastParam.span,
          kind: "var",
          declare: false,
          declarations: [
            {
              type: "VariableDeclarator",
              span: lastParam.span,
              id: lastParam.pat.argument,
              init: call({
                span: lastParam.span,
                callee: member({
                  span: lastParam.span,
                  object: call({
                    span: lastParam.span,
                    callee: member({
                      span: lastParam.span,
                      object: identifier({
                        span: lastParam.span,
                        value: "Array",
                      }),
                      property: identifier({
                        span: lastParam.span,
                        value: "from",
                      }),
                    }),
                    args: [
                      {
                        spread: undefined,
                        expression: identifier({
                          span: lastParam.span,
                          value: "arguments",
                        }),
                      },
                    ],
                  }),
                  property: identifier({
                    span: lastParam.span,
                    value: "slice",
                  }),
                }),
                args: [
                  {
                    spread: undefined,
                    expression: numericliteral({
                      span: lastParam.span,
                      value: n.params.length - (hasThisArgs ? 1 : 0),
                    }),
                  },
                ],
              }),
              definite: false,
            },
          ],
        });
      }

      n.body.stmts = [...statementsToAdd, ...n.body?.stmts];
    }
    return super.visitFunction(n);
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export function noRestElement() {
  return (program: Program) => new NoRestElement().visitProgram(program);
}

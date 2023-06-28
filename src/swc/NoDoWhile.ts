import {
  BlockStatement,
  ForStatement,
  Program,
  Statement,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import onevariable from "./node/declaration/onevariable";
import identifier from "./node/identifier";
import booleanliteral from "./node/literal/booleanliteral";
import or from "./node/expression/binary/or";
import assignment from "./node/expression/assignment";
import parenthesis from "./node/expression/parenthesis";

class NoDoWhile extends Visitor {
  visitStatement(stmt: Statement): Statement {
    if (stmt.type === "DoWhileStatement") {
      const loopFlag = identifier({
        span: stmt.span,
        value: "__doWhileFlag",
      });
      const forLoop: ForStatement = {
        type: "ForStatement",
        span: stmt.span,
        init: onevariable({
          span: stmt.span,
          id: loopFlag,
          kind: "let",
          init: booleanliteral({
            span: stmt.span,
            value: true,
          }),
        }),
        test: or({
          span: stmt.span,
          left: loopFlag,
          right: parenthesis({
            span: stmt.span,
            expression: parenthesis({
              span: stmt.span,
              expression: stmt.test,
            }),
          }),
        }),
        update: assignment({
          span: stmt.span,
          operator: "=",
          left: loopFlag,
          right: booleanliteral({
            span: stmt.span,
            value: false,
          }),
        }),
        body: stmt.body,
      };
      return super.visitStatement(forLoop);
    }
    return super.visitStatement(stmt);
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export function noDoWhile() {
  return (program: Program) => new NoDoWhile().visitProgram(program);
}

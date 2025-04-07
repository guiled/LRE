import {
  CallExpression,
  Expression,
  Program,
  Statement,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import onevariable from "./node/declaration/onevariable";
import identifier from "./node/identifier";

class NoCallInIf extends Visitor {
  hasCall: boolean = false;

  visitStatement(stmt: Statement): Statement {
    if (stmt.type === "IfStatement") {
      this.hasCall = false;
      this.visitExpression(stmt.test);

      if (this.hasCall) {
        return super.visitStatement({
          type: "BlockStatement",
          span: stmt.span,
          stmts: [
            onevariable({
              id: identifier({
                span: stmt.span,
                value: "_c",
              }),
              kind: "const",
              init: stmt.test,
            }),
            {
              type: "IfStatement",
              span: stmt.span,
              test: identifier({
                span: stmt.span,
                value: "_c",
              }),
              consequent: stmt.consequent,
              alternate: stmt.alternate,
            },
          ],
        });
      }
    }

    return super.visitStatement(stmt);
  }

  visitCallExpression(n: CallExpression): Expression {
    this.hasCall = true;
    return super.visitCallExpression(n);
  }

  visitTsType(n: TsType): TsType {
    console.log("visitTsType");
    return n;
  }
}

// ts-unused-exports:disable-next-line
export function noCallInIf() {
  return (program: Program) => new NoCallInIf().visitProgram(program);
}

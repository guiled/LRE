import { BinaryExpression, Expression, Program, TsType } from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import { call } from "./node/expression/call";
import identifier from "./node/identifier";

class NoInstanceOf extends Visitor {
  visitBinaryExpression(n: BinaryExpression): Expression {
    if (n.operator === "instanceof") {
      return this.visitExpression(
        call({
          span: n.span,
          callee: identifier({
            span: n.span,
            value: "iOf",
          }),
          args: [
            {
              expression: n.left,
            },
            {
              expression: n.right,
            },
          ],
        }),
      );
    }

    return super.visitBinaryExpression(n);
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function noInstanceOf() {
  return (program: Program) => new NoInstanceOf().visitProgram(program);
}

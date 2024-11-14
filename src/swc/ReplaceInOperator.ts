import { Expression, Program, TsType } from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import call from "./node/expression/call";
import member from "./node/expression/member";
import identifier from "./node/identifier";

class ReplaceInOperator extends Visitor {
  visitExpression(n: Expression): Expression {
    if (n.type === "BinaryExpression" && n.operator === "in") {
      return super.visitExpression(
        call({
          span: n.span,
          callee: member({
            span: n.span,
            object: n.right,
            property: identifier({
              span: n.span,
              value: "hasOwnProperty",
            }),
          }),
          args: [{ expression: n.left }],
        }),
      );
    }

    return super.visitExpression(n);
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function replaceInOperator() {
  return (program: Program) => new ReplaceInOperator().visitProgram(program);
}

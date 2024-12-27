import {
  Expression,
  OptionalChainingExpression,
  Program,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import and from "./node/expression/binary/and";

// @todo This class is not yet 100% functional
class NoOptionalChaining extends Visitor {
  visitOptionalChainingExpression(n: OptionalChainingExpression): Expression {
    if (n.base.type === "MemberExpression") {
      return this.visitExpression({
        type: "ParenthesisExpression",
        span: n.span,
        expression: and({
          span: n.span,
          left: n.base.object,
          right: n.base,
        }),
      });
    } else if (n.base.type === "CallExpression") {
      return this.visitExpression({
        type: "ParenthesisExpression",
        span: n.span,
        expression: and({
          span: n.span,
          left: n.base.callee,
          right: n.base,
        }),
      });
    }

    return super.visitOptionalChainingExpression(n);
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

// ts-unused-exports:disable-next-line
export default function noOptionalChaining() {
  return (program: Program) => new NoOptionalChaining().visitProgram(program);
}

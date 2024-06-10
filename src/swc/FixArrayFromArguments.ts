import {
  CallExpression,
  Expression,
  MemberExpression,
  Program,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import member from "./node/expression/member";
import identifier from "./node/identifier";
import nullliteral from "./node/literal/nullliteral";

class FixArrayFromArguments extends Visitor {
  visitCallExpression(n: CallExpression): Expression {
    if (
      n.callee.type === "MemberExpression" &&
      this.#isArrayFromArgumentCall(n)
    ) {
      n = {
        ...n,
        callee: member({
          span: n.span,
          object: n.callee,
          property: identifier({ span: n.span, value: "call" }),
        }),
        arguments: [
          { expression: nullliteral({ span: n.span }) },
          ...n.arguments,
        ],
      };
    }
    return super.visitCallExpression(n);
  }

  #isArrayFromArgumentCall(n: CallExpression): boolean {
    return this.#isArrayFromMemberExpression(n.callee);
  }

  #isArrayFromMemberExpression(n: CallExpression["callee"]): boolean {
    return (
      n.type === "MemberExpression" &&
      this.#isIdentifier(n.object, "Array") &&
      this.#isIdentifier(n.property, "from")
    );
  }

  #isIdentifier(
    n: Expression | MemberExpression["property"],
    value: string
  ): boolean {
    return n.type === "Identifier" && n.value === value;
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function fixArrayFromArguments() {
  return (program: Program) =>
    new FixArrayFromArguments().visitProgram(program);
}

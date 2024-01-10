import {
  CallExpression,
  Expression,
  MemberExpression,
  Program,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import call from "./node/expression/call";
import member from "./node/expression/member";
import identifier from "./node/identifier";
import numericliteral from "./node/literal/numericliteral";

class FixArrayFromArguments extends Visitor {
  #isInSliceCall: boolean = false;

  #isIdentifier(
    n: Expression | MemberExpression["property"],
    value: string
  ): boolean {
    return n.type === "Identifier" && n.value === value;
  }

  #isArrayFromMemberExpression(n: CallExpression["callee"]): boolean {
    return (
      n.type === "MemberExpression" &&
      this.#isIdentifier(n.object, "Array") &&
      this.#isIdentifier(n.property, "from")
    );
  }

  #isArrayFromArgumentCall(n: CallExpression): boolean {
    return this.#isArrayFromMemberExpression(n.callee);
  }

  #isSliceCall(n: CallExpression): boolean {
    return (
      n.callee.type === "MemberExpression" &&
      this.#isIdentifier(n.callee.property, "slice") &&
      n.arguments[0].expression.type === "NumericLiteral" &&
      n.arguments[0].expression.value === 0
    );
  }

  visitCallExpression(n: CallExpression): Expression {
    if (
      !this.#isInSliceCall &&
      this.#isArrayFromArgumentCall(n) &&
      n.arguments.length === 1 &&
      this.#isIdentifier(n.arguments[0].expression, "arguments")
    ) {
      return call({
        callee: member({
          object: n,
          property: identifier({
            span: n.span,
            value: "slice",
          }),
        }),
        args: [
          {
            expression: numericliteral({ span: n.span, value: 0 }),
          },
        ],
      });
    }

    const prevIsInSliceCall = this.#isInSliceCall;
    this.#isInSliceCall = this.#isSliceCall(n);
    const res = super.visitCallExpression(n);
    this.#isInSliceCall = prevIsInSliceCall;

    return res;
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function fixArrayFromArguments() {
  return (program: Program) =>
    new FixArrayFromArguments().visitProgram(program);
}

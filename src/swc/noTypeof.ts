import {
  BinaryExpression,
  BinaryOperator,
  Expression,
  Program,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import identifier from "./node/identifier";
import { call } from "./node/expression/call";
import numericliteral from "./node/literal/numericliteral";

const types = [
  "",
  "undefined",
  "string",
  "object",
  "function",
  "number",
  "boolean",
];

const coefficient: Record<
  Extract<BinaryOperator, "===" | "==" | "!==" | "!=" | ">" | "<">,
  1 | -1
> = {
  "===": 1,
  "==": 1,
  "!==": -1,
  "!=": -1,
  ">": -1,
  "<": -1,
};

class NoTypeof extends Visitor {
  #isTypeofOperator(n: BinaryOperator): n is keyof typeof coefficient {
    return Object.keys(coefficient).includes(n);
  }

  visitBinaryExpression(n: BinaryExpression): Expression {
    if (
      n.left.type === "UnaryExpression" &&
      n.left.operator === "typeof" &&
      this.#isTypeofOperator(n.operator)
    ) {
      if (n.right.type !== "StringLiteral") {
        throw new Error("Expected string literal with typeof operator");
      }

      if (n.right.value === "u") {
        n.right.value = "undefined";

        if (n.operator === "<") {
          n.operator = "!==";
        } else {
          n.operator = "===";
        }
      }

      return this.visitExpression(
        call({
          span: n.span,
          callee: identifier({
            span: n.left.span,
            value: "tpo",
          }),
          args: [
            {
              expression: n.left.argument,
            },
            {
              expression: numericliteral({
                span: n.right.span,
                value: types.indexOf(n.right.value) * coefficient[n.operator],
              }),
            },
          ],
        }),
      );
    }

    return super.visitBinaryExpression(n);
  }

  visitTsType(n: TsType): TsType {
    return super.visitTsType(n);
  }
}

export function noTypeof() {
  return (program: Program) => new NoTypeof().visitProgram(program);
}

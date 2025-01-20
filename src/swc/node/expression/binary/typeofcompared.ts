import { BinaryExpression } from "@swc/core";
import { ExpressionWithSpan } from "../../../types";

type TypeOfComparedParams = {
  expr: ExpressionWithSpan;
  type: string;
};

export const typeofcompared = ({
  expr,
  type,
}: TypeOfComparedParams): BinaryExpression => {
  return {
    type: "BinaryExpression",
    span: expr.span,
    operator: "===",
    left: {
      type: "UnaryExpression",
      span: expr.span,
      operator: "typeof",
      argument: expr,
    },
    right: {
      type: "StringLiteral",
      span: expr.span,
      value: type,
      raw: `"${type}"`,
    },
  };
};

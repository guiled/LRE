import { BinaryExpression } from "@swc/core";

export default function binary({
  span,
  operator,
  left,
  right,
}: Omit<BinaryExpression, "type">): BinaryExpression {
  return {
    type: "BinaryExpression",
    span,
    operator,
    left,
    right,
  };
}

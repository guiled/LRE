import { UnaryExpression } from "@swc/core";

export default function unary(
  args: Omit<UnaryExpression, "type">,
): UnaryExpression {
  return {
    ...args,
    type: "UnaryExpression",
  };
}

import { UnaryExpression } from "@swc/core";

export function unary(args: Omit<UnaryExpression, "type">): UnaryExpression {
  return {
    ...args,
    type: "UnaryExpression",
  };
}

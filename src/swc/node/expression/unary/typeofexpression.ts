import { UnaryExpression } from "@swc/core";
import unary from ".";

export default function typeofexpression(
  args: Omit<UnaryExpression, "type" | "operator">,
): UnaryExpression {
  return unary({
    ...args,
    operator: "typeof",
  });
}

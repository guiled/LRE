import { BinaryExpression } from "@swc/core";
import binary from ".";

export default function and(
  args: Omit<BinaryExpression, "type" | "operator">,
): BinaryExpression {
  return binary({
    ...args,
    operator: "&&",
  });
}

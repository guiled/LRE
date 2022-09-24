import { ThisExpression } from "@swc/core";

export default function thisexpression({
  span,
}: Omit<ThisExpression, "type">): ThisExpression {
  return {
    type: "ThisExpression",
    span,
  };
}

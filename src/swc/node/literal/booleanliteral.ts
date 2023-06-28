import { BooleanLiteral, NumericLiteral, Span, StringLiteral } from "@swc/core";

export default function booleanliteral({
  span,
  value,
}: Omit<BooleanLiteral, "type">): BooleanLiteral {
  return {
    type: "BooleanLiteral",
    span,
    value,
  };
}

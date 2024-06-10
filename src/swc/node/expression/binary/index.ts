import { BinaryExpression, HasSpan, Span } from "@swc/core";

export default function binary({
  span,
  operator,
  left,
  right,
}: Omit<BinaryExpression, "type" | "span"> & {
  span?: Span;
}): BinaryExpression {
  return {
    type: "BinaryExpression",
    span: span || (left as HasSpan).span,
    operator,
    left,
    right,
  };
}

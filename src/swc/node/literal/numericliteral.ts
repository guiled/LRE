import { NumericLiteral } from "@swc/core";

export default function numericliteral({
  span,
  value,
  raw,
}: Omit<NumericLiteral, "type">): NumericLiteral {
  return {
    type: "NumericLiteral",
    span,
    value,
    raw: raw ?? "" + value,
  };
}

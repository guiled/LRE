import { BinaryExpression } from "@swc/core";
import binary from ".";

export default function or(args: {
  left: BinaryExpression["left"];
  right: BinaryExpression["right"];
  span?: BinaryExpression["span"];
}): BinaryExpression {
  return binary({
    ...args,
    operator: "||",
  });
}

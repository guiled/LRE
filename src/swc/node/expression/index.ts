import { Expression } from "@swc/core";

export default function (expression: Expression): { expression: Expression } {
  return { expression };
}

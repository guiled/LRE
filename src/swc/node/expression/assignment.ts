import {
  AssignmentExpression,
} from "@swc/core";

export default function assignment({
  span,
  left,
  right,
  operator = "=",
}: Omit<AssignmentExpression, "type">): AssignmentExpression {
  return {
      type: "AssignmentExpression",
      span,
      operator,
      left,
      right,
    };
}

import {
  AssignmentExpression,
  ExpressionStatement,
} from "@swc/core";

import assignmentExpression from '../expression/assignment';

export default function assignment({
  span,
  left,
  right,
  operator,
}: Omit<AssignmentExpression, "type">): ExpressionStatement {
  return {
    type: "ExpressionStatement",
    span,
    expression: assignmentExpression(arguments[0]),
  };
}

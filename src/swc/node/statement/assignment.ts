import { AssignmentExpression, ExpressionStatement } from "@swc/core";

import assignmentExpression from "../expression/assignment";

export function assignmentStatement({
  span,
}: Omit<AssignmentExpression, "type">): ExpressionStatement {
  return {
    type: "ExpressionStatement",
    span,
    expression: assignmentExpression(arguments[0]),
  };
}

import { Argument, Expression, NewExpression, Span } from "@swc/core";

export const newexpression = (
  superClass: Expression,
  args: Argument[] | undefined,
  span: Span
): NewExpression => {
  return {
    type: "NewExpression",
    span: span,
    callee: superClass,
    arguments: args,
  };
};

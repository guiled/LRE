import { HasSpan, NewExpression, Span } from "@swc/core";

type NewExpressionArgs = {
  callee: NewExpression["callee"],
  arguments?: NewExpression["arguments"],
  span?: Span,
};

export const newexpression = ({
  callee,
  arguments: args = [],
  span = (callee as HasSpan).span,
}: NewExpressionArgs): NewExpression => {
  return {
    type: "NewExpression",
    span,
    callee,
    arguments: args,
  };
};

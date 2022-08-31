import { Expression, ParenthesisExpression, Span } from "@swc/core";

type PARENTH_PARAM = {
  span: Span;
  expression: Expression;
};

export default ({ span, expression }: PARENTH_PARAM): ParenthesisExpression => {
  return {
    type: "ParenthesisExpression",
    span: span,
    expression,
  };
};

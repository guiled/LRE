import { ParenthesisExpression } from "@swc/core";

export default ({ span, expression }: Omit<ParenthesisExpression, "type">): ParenthesisExpression => {
  return {
    type: "ParenthesisExpression",
    span,
    expression,
  };
};

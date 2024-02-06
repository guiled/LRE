import { ArrayExpression, Span } from "@swc/core";

type ArrayExpressionProps = {
  span: Span;
  elements?: ArrayExpression["elements"];
};

const arrayexpression = ({
  span,
  elements = [],
}: ArrayExpressionProps): ArrayExpression => {
  return {
    type: "ArrayExpression",
    span,
    elements: elements?.filter(Boolean),
  };
};

export { arrayexpression };

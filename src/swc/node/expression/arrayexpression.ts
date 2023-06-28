import {
  ArrayExpression,
} from "@swc/core";

const arrayexpression = ({
  span,
  elements,
}: Omit<ArrayExpression, "type">): ArrayExpression => {
  return {
    type: "ArrayExpression",
    span,
    elements,
  };
};

export { arrayexpression };

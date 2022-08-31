import { ConditionalExpression } from "@swc/core";

type Conditional_Param = Omit<ConditionalExpression, "type">;

export default ({
  span,
  test,
  consequent,
  alternate,
}: Conditional_Param): ConditionalExpression => {
  return {
    type: "ConditionalExpression",
    span,
    test,
    consequent,
    alternate,
  };
};

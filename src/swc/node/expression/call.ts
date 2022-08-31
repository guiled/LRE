import { CallExpression, Span } from "@swc/core";

export type Call_Param = {
  span: Span;
  callee: CallExpression["callee"];
  args?: CallExpression["arguments"];
  typeArguments?: CallExpression["typeArguments"]
};

export default ({ span, callee, args = [], typeArguments }: Call_Param): CallExpression => {
  return {
    type: "CallExpression",
    span,
    callee,
    arguments: args,
    typeArguments,
  };
};

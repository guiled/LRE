import { CallExpression, OptionalChainingCall, OptionalChainingExpression, Span } from "@swc/core";

export type Call_Param = {
  span: Span;
  callee: CallExpression["callee"];
  args?: CallExpression["arguments"];
  typeArguments?: CallExpression["typeArguments"];
};

export default (
  { span, callee, args = [], typeArguments }: Call_Param,
  optional: boolean = false
): CallExpression | OptionalChainingExpression => {
  
  if (optional) {
    return {
      type: "OptionalChainingExpression",
      span,
      questionDotToken: span,
      base: {
        type: "CallExpression",
        span,
        callee: callee as OptionalChainingCall["callee"],
        arguments: args,
        typeArguments,
      },
    }
  }
  return {
    type: "CallExpression",
    span,
    callee,
    arguments: args,
    typeArguments,
  };
};

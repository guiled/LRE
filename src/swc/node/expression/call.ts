import {
  CallExpression,
  HasSpan,
  OptionalChainingCall,
  OptionalChainingExpression,
  Span,
} from "@swc/core";

export type Call_Param = {
  span?: Span;
  callee: CallExpression["callee"];
  args?: CallExpression["arguments"];
  typeArguments?: CallExpression["typeArguments"];
};

export const call = (
  { span, callee, args = [], typeArguments }: Call_Param,
  optional: boolean = false,
): CallExpression | OptionalChainingExpression => {
  if (optional) {
    return {
      type: "OptionalChainingExpression",
      span: span || (callee as HasSpan).span,
      questionDotToken: span || (callee as HasSpan).span,
      base: {
        type: "CallExpression",
        span: span || (callee as HasSpan).span,
        callee: callee as OptionalChainingCall["callee"],
        arguments: args,
        typeArguments,
      },
    };
  }

  return {
    type: "CallExpression",
    span: span || (callee as HasSpan).span,
    callee,
    arguments: args,
    typeArguments,
  };
};

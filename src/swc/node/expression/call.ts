import {
  CallExpression,
  Expression,
  HasSpan,
  OptionalChainingCall,
  OptionalChainingExpression,
  Span,
} from "@swc/core";
import member from "./member";
import identifier from "../identifier";

export type Call_Param = {
  callee: Expression;
  span?: Span;
  args?: CallExpression["arguments"];
  typeArguments?: CallExpression["typeArguments"];
};

export const call = (
  { span, callee, args = [], typeArguments }: Call_Param,
  optional: boolean = false,
  called?: CallExpression["arguments"][number],
): CallExpression | OptionalChainingExpression => {
  span ??= (callee as HasSpan).span;

  if (called) {
    return call(
      {
        span,
        callee: member({
          span,
          object: callee,
          property: identifier({ span, value: "call" }),
        }),
        args: [called, ...args],
      },
      optional,
    );
  }

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

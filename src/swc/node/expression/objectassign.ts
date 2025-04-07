import { Argument, Expression, Span } from "@swc/core";
import { call } from "./call";

export const objectassign = (
  span: Span,
  callParameters: Argument[] | false = false,
): Expression => {
  const obj: Expression = {
    type: "MemberExpression",
    span: span,
    object: {
      type: "Identifier",
      span: span,
      value: "Object",
      optional: false,
    },
    property: {
      type: "Identifier",
      span: span,
      value: "assign",
      optional: false,
    },
  };

  if (callParameters) {
    return call({
      span,
      callee: obj,
      args: callParameters,
    });
  }

  return obj;
};

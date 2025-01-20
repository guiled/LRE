import { CallExpression } from "@swc/core";
import { call } from "./call";
import { ExpressionWithSpan } from "../../types";
import member from "./member";

export const objectkeys = (arg: ExpressionWithSpan): CallExpression => {
  return call({
    span: arg.span,
    callee: member({
      span: arg.span,
      object: {
        type: "Identifier",
        span: arg.span,
        value: "Object",
        optional: false,
      },
      property: {
        type: "Identifier",
        span: arg.span,
        value: "keys",
        optional: false,
      },
    }),
    args: [
      {
        expression: arg,
      },
    ],
  }) as CallExpression;
};

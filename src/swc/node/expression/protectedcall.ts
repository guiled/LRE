import { BinaryExpression, Expression } from "@swc/core";
import and from "./binary/and";
import call, { Call_Param } from "./call";

export default function ({ span, callee }: Call_Param): BinaryExpression {
  let protector: Expression;

  if (callee.type === "MemberExpression") {
    protector = callee.object;
  } else if (callee.type === "Identifier") {
    protector = callee;
  } else {
    throw new Error("Protected call : unhandled callee type " + callee.type);
  }

  return and({
    span: span ?? callee.span,
    left: protector,
    right: call(arguments[0]),
  });
}

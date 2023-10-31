import { MemberExpression, OptionalChainingExpression, Span } from "@swc/core";

type Member_Type = {
  span: Span;
  object: MemberExpression["object"];
  property: MemberExpression["property"];
};

export default function member(
  { span, object, property }: Member_Type,
  optional: boolean = false
): MemberExpression | OptionalChainingExpression {
  const expression: MemberExpression = {
    type: "MemberExpression",
    span,
    object,
    property,
  };
  if (optional) {
    return {
      type: "OptionalChainingExpression",
      questionDotToken: span,
      span,
      base: expression,
    };
  }
  return expression;
}

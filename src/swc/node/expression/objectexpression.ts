import { Expression, Property, Span } from "@swc/core";
import identifier from "../identifier";
import { ExpressionWithSpan } from "../../types";

export function objectexpression(
  properties: { [key: string]: ExpressionWithSpan },
  span?: Span,
): Expression {
  const props: Property[] = [];

  for (const k in properties) {
    span ??= properties[k].span;
    props.push({
      type: "KeyValueProperty",
      key: identifier({
        span: properties[k].span,
        value: k,
      }),
      value: properties[k],
    });
  }

  if (!span) {
    throw Error("objectexpression needs span or properties");
  }

  return {
    type: "ObjectExpression",
    properties: props,
    span,
  };
}

import { Expression, Span } from "@swc/core";



export const objectassign = (span: Span): Expression => {
    return {
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
  };
  
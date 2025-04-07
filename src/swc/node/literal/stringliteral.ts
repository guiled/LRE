import { Span, StringLiteral } from "@swc/core";

type String_Param = {
  span: Span;
  value: string;
  raw?: string;
};

// ts-unused-exports:disable-next-line
export default ({ span, value, raw }: String_Param): StringLiteral => {
  return {
    type: "StringLiteral",
    span,
    value,
    raw: raw ?? "'" + value + "'",
  };
};

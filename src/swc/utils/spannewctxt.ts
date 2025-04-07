import { Span } from "@swc/core";

// ts-unused-exports:disable-next-line
export const spannewctxt = (span: Span, val: number = 1): Span => {
  return {
    ...span,
    ctxt: Math.max(span.ctxt + val, 0),
  };
};

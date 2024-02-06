import { Span } from "@swc/core";


export const spannewctxt = (span: Span, val: number = 1): Span => {
  return {
    ...span,
    ctxt: Math.max(span.ctxt + val, 0),
  }
}
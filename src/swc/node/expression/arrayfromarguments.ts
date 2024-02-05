import { Span } from "@swc/core";
import identifier from "../identifier";
import call from "./call";
import member from "./member";

export const arrayfromarguments = (span: Span) =>
  call({
    callee: member({
      object: identifier({
        span,
        value: "Array",
      }),
      property: identifier({
        span,
        value: "from",
      }),
    }),
    args: [
      {
        spread: undefined,
        expression: identifier({
          span,
          value: "arguments",
        }),
      },
    ],
  });

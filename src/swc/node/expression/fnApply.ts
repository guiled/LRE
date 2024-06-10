import { Argument, CallExpression, Expression } from "@swc/core";
import call from "./call";
import member from "./member";
import { ExpressionWithSpan } from "../../types";
import identifier from "../identifier";
import nullliteral from "../literal/nullliteral";

type fnApplyArgs = {
  callee: ExpressionWithSpan;
  thisArg?: Expression;
  args: Argument[];
};

export const fnApply = ({
  callee,
  thisArg,
  args,
}: fnApplyArgs): CallExpression => {
  const callArgs = [...args];
  if (thisArg) {
    callArgs.unshift({
      expression: thisArg,
    });
  } else {
    callArgs.unshift({
      expression: nullliteral({
        span: callee.span,
      }),
    });
  }

  return call({
    callee: member({
      object: callee,
      property: identifier({
        span: callee.span,
        value: "apply",
      }),
    }),
    args: callArgs,
  }) as CallExpression;
};

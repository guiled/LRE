import {
  Argument,
  CallExpression,
  FunctionExpression,
  Span,
  Statement,
} from "@swc/core";
import call from "./call";
import func from "./func";
import parenthesis from "./parenthesis";
import member from "./member";
import identifier_ from "../identifier";
import thisexpression from "./thisexpression";

type IIFE_PARAM = {
  span: Span;
  stmts: Statement[];
  identifier?: FunctionExpression["identifier"];
  params?: FunctionExpression["params"];
  args?: CallExpression["arguments"];
  called?: Argument | null;
  applied?: Argument | null;
};

export default ({
  span,
  stmts,
  identifier,
  params = [],
  args = [],
  called = null,
  applied = null,
}: IIFE_PARAM) => {
  let callee: CallExpression["callee"];
  const fcn = parenthesis({
    span,
    expression: func({
      span,
      stmts,
      identifier,
      params,
    }),
  });
  let firstArg: Argument[] = [];
  if (applied) {
    callee = member({
      span,
      object: fcn,
      property: identifier_({
        span,
        value: "apply",
      }),
    });
    firstArg = [{ expression: thisexpression({ span }) }];
  } else if (called) {
    callee = member({
      span,
      object: fcn,
      property: identifier_({
        span,
        value: "call",
      }),
    });
    firstArg = [{ expression: thisexpression({ span }) }];
  } else {
    callee = fcn;
  }
  return call({
    span,
    callee,
    args: [...firstArg, ...args],
  });
};

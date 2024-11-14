import {
  Argument,
  ArrowFunctionExpression,
  CallExpression,
  FunctionExpression,
  OptionalChainingExpression,
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
  params?: FunctionExpression["params"] | ArrowFunctionExpression["params"];
  args?: CallExpression["arguments"];
  called?: Argument | boolean | null;
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
}: IIFE_PARAM): CallExpression | OptionalChainingExpression => {
  let callee: CallExpression["callee"];
  const parameters: FunctionExpression["params"] = params.map((p) => {
    if (p.type == "Parameter") {
      return p;
    }

    return {
      type: "Parameter",
      span,
      pat: p,
    };
  });

  const fcn = parenthesis({
    span,
    expression: func({
      span,
      stmts,
      identifier,
      params: parameters,
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

    if (called === true) {
      firstArg = [{ expression: thisexpression({ span }) }];
    } else {
      firstArg = [called];
    }
  } else {
    callee = fcn;
  }

  return call({
    span,
    callee,
    args: [...firstArg, ...args],
  });
};

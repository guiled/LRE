import { FunctionExpression, Span, Statement } from "@swc/core";
import call from "./call";
import func from "./func";
import parenthesis from "./parenthesis";

type IIFE_PARAM = {
    span: Span
    stmts: Statement[],
    identifier?: FunctionExpression["identifier"]
}

export default ({span, stmts, identifier} : IIFE_PARAM) => {
  return call({
    span,
    callee: parenthesis({
      span,
      expression: func({
        span,
        stmts,
        identifier,
      })
    })
  });
};
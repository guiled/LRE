import { Span, Statement } from "@swc/core";
import call from "./call";
import func from "./func";
import parenthesis from "./parenthesis";

type IIFE_PARAM = {
    span: Span
    stmts: Statement[]
}

export default ({span, stmts} : IIFE_PARAM) => {
  return call({
    span,
    callee: parenthesis({
      span,
      expression: func({
        span,
        stmts
      })
    })
  });
};
import {
  Argument,
  Expression,
  Program,
  Statement,
  ThrowStatement,
  TsType,
} from "@swc/core";
import Visitor from "@swc/core/Visitor";
import call from "./node/expression/call";
import member from "./node/expression/member";
import identifier from "./node/identifier";

class NoThrowStatement extends Visitor {
  visitThrowStatement(stmt: ThrowStatement): Statement {
    const args: Argument[] = (stmt.argument.type === 'NewExpression') ? stmt.argument.arguments! : [{
      expression: stmt.argument
    }];
    return {
      type: "ExpressionStatement",
      span: stmt.span,
      expression: call({
        span: stmt.span,
        callee: member({
          span: stmt.span,
          object: identifier({
            span: stmt.span,
            value: "console",
          }),
          property: identifier({
            span: stmt.span,
            value: "error",
          }),
        }),
        args: args,
      }),
    };
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function noThrowStatement() {
  return (program: Program) => new NoThrowStatement().visitProgram(program);
}

import {
  Argument,
  ArrayExpression,
  CallExpression,
  Expression,
  Program,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import { arrayexpression } from "./node/expression/arrayexpression";
import { fnApply } from "./node/expression/fnApply";
import { ExpressionWithSpan } from "./types";
import call from "./node/expression/call";
import member from "./node/expression/member";
import identifier from "./node/identifier";
import { spreadToConcat } from "./utils/spreadToConcat";

class NoSpreadArgument extends Visitor {
  visitCallExpression(n: CallExpression): Expression {
    if (
      n.arguments.some((arg) => !!arg.spread) &&
      n.callee.type !== "Super" &&
      n.callee.type !== "Import"
    ) {
      let callArg: Argument;
      if (n.arguments.length === 1) {
        callArg = {
          expression: n.arguments[0].expression,
        };
      } else {
        const { concatArgs, arrayInit } = spreadToConcat(n.span, n.arguments);

        let obj: ArrayExpression = arrayexpression({
          span: n.span,
          elements: arrayInit,
        });
        callArg = {
          expression: call({
            callee: member({
              object: obj,
              property: identifier({
                span: n.span,
                value: "concat",
              }),
            }),
            args: concatArgs,
          }),
        };
      }

      const callExpression = fnApply({
        callee: n.callee as ExpressionWithSpan,
        args: [callArg],
        thisArg:
          n.callee.type === "MemberExpression" ? n.callee.object : undefined,
      });
      return this.visitExpression(callExpression);
    }
    return super.visitCallExpression(n);
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export function noSpreadArgument() {
  return (program: Program) => new NoSpreadArgument().visitProgram(program);
}

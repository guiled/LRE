import {
  Argument,
  CallExpression,
  Expression,
  Program,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import { arrayexpression } from "./node/expression/arrayexpression";
import { fnApply } from "./node/expression/fnApply";
import { ExpressionWithSpan } from "./types";
import call from "./node/expression/call";
import member from "./node/expression/member";
import identifier from "./node/identifier";

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
        let obj: Expression = arrayexpression({
          span: n.span,
          elements: [],
        });
  
        let unspreadArgs: Argument[] = [];
        const concatArgs: Argument[] = [];
  
        n.arguments.forEach((arg) => {
          if (!arg.spread) {
            unspreadArgs.push(arg);
          } else {
            if (unspreadArgs.length > 0) {
              if (obj.elements.length === 0) {
                obj.elements.push(...unspreadArgs);
              } else {
                concatArgs.push({
                  expression: arrayexpression({
                    span: n.span,
                    elements: unspreadArgs,
                  })
                });
              }
              unspreadArgs = [];
            }
            concatArgs.push({
              expression: arg.expression
            });
          }
        });
  
        if (unspreadArgs.length > 0) {
          concatArgs.push({
            expression: arrayexpression({
              span: n.span,
              elements: unspreadArgs,
            })
          });
        }
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
        args: [
          callArg
        ],
        thisArg: (n.callee.type === "MemberExpression" ? n.callee.object : undefined)
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

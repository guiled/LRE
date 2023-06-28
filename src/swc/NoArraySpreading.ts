import {
  Argument,
  ArrayExpression,
  Expression,
  ExprOrSpread,
  Program,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import call from "./node/expression/call";
import member from "./node/expression/member";
import identifier from "./node/identifier";

class NoArraySpreading extends Visitor {
  #isSpread(e: ExprOrSpread | undefined): boolean {
    return !!e?.spread;
  }

  visitArrayExpression(e: ArrayExpression): Expression {
    const firstSpreadPosition = e.elements.findIndex(this.#isSpread);
    if (firstSpreadPosition > -1) {
      const firstArrayPart = e.elements.slice(0, firstSpreadPosition);
      let secondArrayPart: ArrayExpression["elements"] =
        e.elements.slice(firstSpreadPosition);
      const concatArgs: Argument[] = [
        {
          spread: void 0,
          expression: secondArrayPart.shift()!.expression,
        },
      ];
      let nextSpreadPosition: number = secondArrayPart.findIndex(
        this.#isSpread
      );
      while (nextSpreadPosition > -1) {
        concatArgs.push({
          spread: void 0,
          expression: {
            span: e.span,
            type: "ArrayExpression",
            elements: secondArrayPart.slice(0, nextSpreadPosition),
          },
        });
        secondArrayPart = secondArrayPart.slice(nextSpreadPosition);
        concatArgs.push({
          spread: void 0,
          expression: secondArrayPart.shift()!.expression,
        });
        nextSpreadPosition = secondArrayPart.findIndex(this.#isSpread);
      }
      if (secondArrayPart.length > 0) {
        concatArgs.push({
          spread: void 0,
          expression: {
            span: e.span,
            type: "ArrayExpression",
            elements: secondArrayPart,
          },
        });
      }

      const res = call({
        span: e.span,
        callee: member({
          span: e.span,
          object: {
            span: e.span,
            type: "ArrayExpression",
            elements: e.elements.slice(0, firstSpreadPosition),
          },
          property: identifier({ span: e.span, value: "concat" }),
        }),
        args: concatArgs,
      });
      return super.visitExpression(res);
    }
    return super.visitArrayExpression(e);
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function noArraySpreading() {
  return (program: Program) => new NoArraySpreading().visitProgram(program);
}

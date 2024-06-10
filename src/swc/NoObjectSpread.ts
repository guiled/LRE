import {
  Argument,
  Expression,
  ObjectExpression,
  Program,
  Property,
  Span,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import call from "./node/expression/call";
import { objectassign } from "./node/expression/objectassign";

class NoObjectSpreading extends Visitor {
  #pushToArgs(args: Argument[], props: Property[], span: Span) {
    if (props.length > 0) {
      args.push({
        expression: {
          span,
          type: "ObjectExpression",
          properties: props,
        },
      });
    }
  }

  visitObjectExpression(n: ObjectExpression): Expression {
    if (n.properties.some((p) => p.type === "SpreadElement")) {
      const assignArgs: Argument[] = [
        {
          expression: {
            span: n.span,
            type: "ObjectExpression",
            properties: [],
          },
        },
      ];
      let tmpObjectProps: Property[] = [];
      n.properties.forEach((p) => {
        if (p.type === "SpreadElement") {
          this.#pushToArgs(assignArgs, tmpObjectProps, n.span);
          tmpObjectProps = [];
          assignArgs.push({
            expression: p.arguments,
          });
        } else {
          tmpObjectProps.push(p);
        }
      });
      this.#pushToArgs(assignArgs, tmpObjectProps, n.span);
      return super.visitExpression(
        call({
          span: n.span,
          callee: objectassign(n.span),
          args: assignArgs,
        })
      );
    }
    return super.visitObjectExpression(n);
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function noObjectSpreading() {
  return (program: Program) => new NoObjectSpreading().visitProgram(program);
}

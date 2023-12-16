import {
  Class,
  ComputedPropName,
  Expression,
  Fn,
  KeyValueProperty,
  Program,
  ThisExpression,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import onevariable from "./node/declaration/onevariable";
import iife from "./node/expression/iife";
import member from "./node/expression/member";
import identifier from "./node/identifier";
import assignment from "./node/statement/assignment";
import returnstmt from "./node/statement/returnstmt";

class ComputedObjectProps extends Visitor {
  protected hasThisExpression: boolean = false;

  visitThisExpression(n: ThisExpression): Expression {
    this.hasThisExpression = true;
    return super.visitThisExpression(n);
  }

  visitFunction<T extends Fn>(n: T): T {
    const saveHasThisExpression = this.hasThisExpression;
    const result = super.visitFunction(n);
    this.hasThisExpression = saveHasThisExpression;
    return result;
  }

  visitClass<T extends Class>(n: T): T {
    const saveHasThisExpression = this.hasThisExpression;
    const result = super.visitClass(n);
    this.hasThisExpression = saveHasThisExpression;
    return result;
  }

  visitExpression(n: Expression): Expression {
    let expr = n;
    if (n.type === "ObjectExpression") {
      const computedProps: KeyValueProperty[] = n.properties.filter(
        (p) => p.type === "KeyValueProperty" && p.key.type === "Computed"
      ) as KeyValueProperty[];
      if (computedProps.length > 0) {
        const tmpObj = identifier({ span: n.span, value: "o" });
        const stmts = [
          onevariable({
            span: n.span,
            id: tmpObj,
            init: {
              ...n,
              properties: n.properties.filter(
                (p) =>
                  !(p.type === "KeyValueProperty" && p.key.type === "Computed")
              ),
            },
          }),
          ...computedProps.map((p: KeyValueProperty) => {
            const key = this.visitComputedPropertyKey(
              p.key as ComputedPropName
            );
            const val = this.visitExpression(p.value);
            return assignment({
              span: key.span,
              left: member({
                span: key.span,
                object: tmpObj,
                property: key,
              }),
              right: val,
              operator: "=",
            });
          }),
          returnstmt({
            span: n.span,
            argument: tmpObj,
          }),
        ];
        expr = super.visitExpression(
          iife({
            span: n.span,
            stmts,
            called: this.hasThisExpression,
          })
        );
      }
    }
    const result = super.visitExpression(expr);
    return result;
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function computedObjectProps() {
  return (program: Program) => new ComputedObjectProps().visitProgram(program);
}

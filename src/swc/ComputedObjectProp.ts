import { ComputedPropName, Expression, KeyValueProperty, ObjectExpression, Program, Property, TsType } from "@swc/core";
import Visitor from "@swc/core/Visitor";
import onevariable from "./node/declaration/onevariable";
import iife from "./node/expression/iife";
import member from "./node/expression/member";
import identifier from "./node/identifier";
import assignment from "./node/statement/assignment";
import returnstmt from "./node/statement/returnstmt";

class ComputedObjectProps extends Visitor {

  #hasComputedProperty(o: ObjectExpression): boolean {

  }

  visitExpression(n: Expression): Expression {
      if (n.type === "ObjectExpression") {
        const computedProps: KeyValueProperty[] = n.properties.filter(p => p.type === "KeyValueProperty" && p.key.type === "Computed") as KeyValueProperty[];
        if (computedProps.length > 0) {
          const tmpObj = identifier({span: n.span, value: "o"});
          return iife({
            span: n.span,
            stmts: [
              onevariable({
                span: n.span,
                id: tmpObj,
                init: {
                  ...n,
                  properties: n.properties.filter(p => !(p.type === "KeyValueProperty" && p.key.type === "Computed")),
                },
              }),
              ...computedProps.map((p: KeyValueProperty) => assignment({
                span: p.key.span,
                left: member({
                  span: p.key.span,
                  object: tmpObj,
                  property: p.key as ComputedPropName,
                }),
                right: p.value,
                operator: "=",
              })),
              returnstmt({
                span: n.span,
                argument: tmpObj,
              }),
            ]
          })
        }
      }
      return n;
  }

  visitTsType(n: TsType): TsType {
      return n;
  }
}

export default function computedObjectProps() {
  return (program: Program) => new ComputedObjectProps().visitProgram(program);
}

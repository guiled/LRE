import {
  ArrayPattern,
  AssignmentPatternProperty,
  BindingIdentifier,
  BlockStatement,
  Expression,
  Fn,
  Identifier,
  ObjectPattern,
  ObjectPatternProperty,
  Param,
  Pattern,
  Program,
  Statement,
  TsType,
} from "@swc/core";
import Visitor from "@swc/core/Visitor";
import member from "./node/expression/member";
import memberchained from "./node/expression/memberchained";
import identifier from "./node/identifier";
import numericliteral from "./node/literal/numericliteral";
import undefinedidentifier from "./node/undefinedidentifier";

const ARGS = "_arg";
export function hasPropWithValue(o: ObjectPattern): boolean {
  return !!o.properties.find((p: ObjectPatternProperty): boolean => {
    var obj: ObjectPatternProperty | Pattern = p;
    while (obj.type === "KeyValuePatternProperty") {
      if (obj.value.type === "AssignmentPattern") {
        return true;
      } else if (obj.value.type === "ObjectPattern") {
        let tmp = hasPropWithValue(obj.value);
        if (tmp) {
          return true;
        }
      } else if (obj.value.type === "ArrayPattern") {
        let tmp = hasArrayItemWithValue(obj.value);
        if (tmp) {
          return true;
        }
      } else {
        obj = obj.value;
      }
    }
    return obj.type === "AssignmentPatternProperty" && !!obj.value;
  });
}

export function hasArrayItemWithValue(a: ArrayPattern): boolean {
  return !!a.elements.find((e): boolean => {
    return !!e && e.type === "AssignmentPattern";
  });
}

class DefaultParameter extends Visitor {
  visitFunction<T extends Fn>(n: T): T {
    if (typeof n.body !== "undefined" && n.body) {
      const statementsToAdd: BlockStatement["stmts"] = [];
      n.params.forEach((p: Param, index: number) => {
        let defaultValue: Expression | undefined = undefined;
        let id: Pattern | undefined = undefined;
        if (p.pat.type === "Identifier" && p.pat.optional) {
          id = {
            ...p.pat,
            optional: false,
          };
          defaultValue = undefinedidentifier({ span: p.span });
        } else if (p.pat.type === "AssignmentPattern") {
          id = p.pat.left;
          defaultValue = p.pat.right;
        } else if (
          (p.pat.type === "ObjectPattern" && hasPropWithValue(p.pat)) ||
          (p.pat.type === "ArrayPattern" && hasArrayItemWithValue(p.pat))
        ) {
          console.log("here");
          const newArg = identifier({
            span: p.span,
            value: ARGS + index,
          });
          statementsToAdd.push({
            type: "VariableDeclaration",
            span: p.span,
            kind: "var",
            declare: false,
            declarations: [
              {
                type: "VariableDeclarator",
                span: p.span,
                id: p.pat,
                init: newArg,
                definite: false,
              },
            ],
          });
          p.pat = newArg;
        }

        if (defaultValue && id) {
          statementsToAdd.push({
            type: "VariableDeclaration",
            span: p.span,
            kind: "var",
            declare: false,
            declarations: [
              {
                type: "VariableDeclarator",
                span: p.span,
                id,
                init: {
                  type: "ConditionalExpression",
                  span: p.span,
                  test: {
                    type: "ParenthesisExpression",
                    span: p.span,
                    expression: {
                      type: "BinaryExpression",
                      span: p.span,
                      operator: "<",
                      left: memberchained({
                        span: p.span,
                        properties: ["arguments", "length"],
                      }),
                      right: numericliteral({
                        span: p.span,
                        value: index + 1,
                      }),
                    },
                  },
                  consequent: defaultValue,
                  alternate: member({
                    span: p.span,
                    object: identifier({
                      span: p.span,
                      value: "arguments",
                    }),
                    property: {
                      type: "Computed",
                      span: p.span,
                      expression: numericliteral({
                        span: p.span,
                        value: index,
                      }),
                    },
                  }),
                },
                definite: false,
              },
            ],
          });
          p.pat = id;
        }
      });
      n.body.stmts = [...statementsToAdd, ...n.body?.stmts];
    }
    return super.visitFunction(n);
  }

  visitTsType(n: TsType): TsType {
      return n;
  }
}

export default function defaultParameter() {
  return (program: Program) => new DefaultParameter().visitProgram(program);
}

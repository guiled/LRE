import {
  ArrayPattern,
  ArrowFunctionExpression,
  BlockStatement,
  Expression,
  Fn,
  HasSpan,
  ObjectPattern,
  ObjectPatternProperty,
  Param,
  Pattern,
  Program,
  Span,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import member from "./node/expression/member";
import memberchained from "./node/expression/memberchained";
import identifier from "./node/identifier";
import numericliteral from "./node/literal/numericliteral";
import undefinedidentifier from "./node/undefinedidentifier";
import returnstmt from "./node/statement/returnstmt";

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
  #parsePattern(
    pat: Pattern,
    index: number,
    span: Span
  ): [Pattern | null, BlockStatement["stmts"]] {
    const statementsToAdd: BlockStatement["stmts"] = [];
    let defaultValue: Expression | undefined = undefined;
    let id: Pattern | undefined = undefined;
    let newPat: Pattern | null = null;
    if (pat.type === "Identifier" && pat.optional) {
      id = {
        ...pat,
        optional: false,
      };
      defaultValue = undefinedidentifier({ span: span });
    } else if (pat.type === "AssignmentPattern") {
      id = pat.left;
      defaultValue = pat.right;
    } else if (
      (pat.type === "ObjectPattern" && hasPropWithValue(pat)) ||
      (pat.type === "ArrayPattern" && hasArrayItemWithValue(pat))
    ) {
      const newArg = identifier({
        span: span,
        value: ARGS + index,
      });
      statementsToAdd.push({
        type: "VariableDeclaration",
        span: span,
        kind: "var",
        declare: false,
        declarations: [
          {
            type: "VariableDeclarator",
            span: span,
            id: pat,
            init: newArg,
            definite: false,
          },
        ],
      });
      newPat = newArg;
    } else {
      newPat = pat;
    }

    if (defaultValue && id) {
      statementsToAdd.push({
        type: "VariableDeclaration",
        span: span,
        kind: "var",
        declare: false,
        declarations: [
          {
            type: "VariableDeclarator",
            span: span,
            id,
            init: {
              type: "ConditionalExpression",
              span: span,
              test: {
                type: "ParenthesisExpression",
                span: span,
                expression: {
                  type: "BinaryExpression",
                  span: span,
                  operator: "<",
                  left: memberchained({
                    span: span,
                    properties: ["arguments", "length"],
                  }),
                  right: numericliteral({
                    span: span,
                    value: index + 1,
                  }),
                },
              },
              consequent: defaultValue,
              alternate: member({
                span: span,
                object: identifier({
                  span: span,
                  value: "arguments",
                }),
                property: {
                  type: "Computed",
                  span: span,
                  expression: numericliteral({
                    span: span,
                    value: index,
                  }),
                },
              }),
            },
            definite: false,
          },
        ],
      });
      newPat = null;
    }
    return [newPat, statementsToAdd];
  }

  visitArrowFunctionExpression(e: ArrowFunctionExpression): Expression {
    if (typeof e.body !== "undefined" && e.body) {
      const bodyStatements: BlockStatement["stmts"] = [];
      const newParams = e.params
        .map((p: Pattern, index: number) => {
          const [newPat, newStmts] = this.#parsePattern(p, index, e.span);
          bodyStatements.push.apply(bodyStatements, newStmts);
          return newPat;
        })
        .filter(Boolean) as Array<Pattern>;
      if (bodyStatements.length > 0) {
        if (e.body.type !== "BlockStatement") {
          bodyStatements.push(
            returnstmt({
              span: e.span,
              argument: e.body,
            })
          );
        } else {
          bodyStatements.push(...e.body.stmts);
        }
        return this.visitExpression({
          type: "FunctionExpression",
          span: e.span,
          body: {
            type: "BlockStatement",
            span: (e.body as HasSpan).span,
            stmts: bodyStatements,
          },
          params: newParams.filter(Boolean).map(
            (p: Pattern | null): Param => ({
              type: "Parameter",
              span: e.span,
              pat: p!,
            })
          ),
          generator: false,
          async: false,
        });
      }
    }
    return super.visitArrowFunctionExpression(e);
  }

  visitFunction<T extends Fn>(n: T): T {
    if (typeof n.body !== "undefined" && n.body) {
      const statementsToAdd: BlockStatement["stmts"] = [];
      n.params = n.params
        .map((p: Param, index: number) => {
          const [newPat, newStmts] = this.#parsePattern(p.pat, index, p.span);
          p.pat = newPat!;
          statementsToAdd.push.apply(statementsToAdd, newStmts);
          return p;
        })
        .filter((p) => !!p.pat);
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

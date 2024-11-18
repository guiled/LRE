import {
  ArrayPattern,
  ArrowFunctionExpression,
  BlockStatement,
  Expression,
  Fn,
  HasSpan,
  Identifier,
  ObjectPattern,
  ObjectPatternProperty,
  Param,
  Pattern,
  Program,
  Span,
  TsType,
  VariableDeclaration,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import identifier from "./node/identifier";
import numericliteral from "./node/literal/numericliteral";
import undefinedidentifier from "./node/undefinedidentifier";
import returnstmt from "./node/statement/returnstmt";
import onevariable from "./node/declaration/onevariable";
import call from "./node/expression/call";

const ARGS = "_arg";

function hasPropWithValue(o: ObjectPattern): boolean {
  return !!o.properties.find((p: ObjectPatternProperty): boolean => {
    let obj: ObjectPatternProperty | Pattern = p;

    while (obj.type === "KeyValuePatternProperty") {
      if (obj.value.type === "AssignmentPattern") {
        return true;
      } else if (obj.value.type === "ObjectPattern") {
        const tmp = hasPropWithValue(obj.value);

        if (tmp) {
          return true;
        }
      } else if (obj.value.type === "ArrayPattern") {
        const tmp = hasArrayItemWithValue(obj.value);

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

function hasArrayItemWithValue(a: ArrayPattern): boolean {
  return !!a.elements.find((e): boolean => {
    return !!e && e.type === "AssignmentPattern";
  });
}

class DefaultParameter extends Visitor {
  #isDefaultParameter(p: Pattern): boolean {
    return (
      (p.type === "Identifier" && p.optional) || p.type === "AssignmentPattern"
    );
  }

  #parsePattern(
    pat: Pattern,
    index: number,
    span: Span,
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
            init: call({
              span,
              callee: identifier({
                span,
                value: "def",
              }),
              args: [
                {
                  expression: identifier({
                    span: span,
                    value: "arguments",
                  }),
                },
                {
                  expression: numericliteral({
                    span: span,
                    value: index,
                  }),
                },
                {
                  expression: defaultValue,
                },
              ],
            }),
            definite: false,
          },
        ],
      });
      newPat = null;
    }

    return [newPat, statementsToAdd];
  }

  #createVariadicParam({ span, id }: { span: Span; id: Identifier }): Pattern {
    return {
      type: "RestElement",
      span,
      rest: span,
      argument: id,
    };
  }

  #createVariableDeclarationFromParams(
    params: Pattern[],
    span: Span,
    init: Expression,
  ): VariableDeclaration {
    return onevariable({
      span,
      kind: "const",
      init,
      id: {
        type: "ArrayPattern",
        span,
        elements: params.map((p) => {
          if (p.type === "Identifier" && p.optional) {
            return {
              type: "AssignmentPattern",
              span,
              left: {
                ...p,
                optional: false,
              },
              right: undefinedidentifier({
                span,
              }),
            };
          }

          return p;
        }),
        optional: false,
      },
    });
  }

  visitArrowFunctionExpression(e: ArrowFunctionExpression): Expression {
    if (
      typeof e.body !== "undefined" &&
      e.body &&
      e.params.some((p) => this.#isDefaultParameter(p))
    ) {
      const argIdentifier = identifier({
        span: e.span,
        value: "args",
      });
      const bodyStatements: BlockStatement["stmts"] = [
        this.#createVariableDeclarationFromParams(
          e.params,
          e.span,
          argIdentifier,
        ),
      ];

      if (e.body.type !== "BlockStatement") {
        bodyStatements.push(
          returnstmt({
            span: e.span,
            argument: e.body,
          }),
        );
      } else {
        bodyStatements.push(...e.body.stmts);
      }

      return this.visitExpression({
        type: "ArrowFunctionExpression",
        span: e.span,
        body: {
          type: "BlockStatement",
          span: (e.body as HasSpan).span,
          stmts: bodyStatements,
        },
        params: [
          this.#createVariadicParam({
            span: e.span,
            id: argIdentifier,
          }),
        ],
        generator: false,
        async: false,
      });
    }

    return super.visitArrowFunctionExpression(e);
  }

  visitFunction<T extends Fn>(n: T): T {
    if (
      typeof n.body !== "undefined" &&
      n.body &&
      n.params.some((p) => this.#isDefaultParameter(p.pat))
    ) {
      const statementsToAdd: BlockStatement["stmts"] = [];
      const hasThisArgs =
        n.params[0].pat.type === "Identifier" &&
        n.params[0].pat.value === "this";
      n.params = n.params
        .map((p: Param, index: number) => {
          const [newPat, newStmts] = this.#parsePattern(
            p.pat,
            index - (hasThisArgs ? 1 : 0),
            p.span,
          );
          p.pat = newPat!;
          statementsToAdd.push.apply(statementsToAdd, newStmts);
          return p;
        })
        .filter((p) => !!p.pat);
      n.body.stmts = [...statementsToAdd, ...(n.body?.stmts || [])];
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

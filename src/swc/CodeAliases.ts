import { CallExpression, Expression, Program, TsType } from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import { call } from "./node/expression/call";
import identifier from "./node/identifier";

const isMemberExpression = (
  n: CallExpression["callee"],
  sMember: string,
): boolean => {
  const members = sMember.split(".");
  let obj = n;

  return members.reverse().every((m) => {
    if (obj.type === "Identifier") {
      return obj.value === m;
    }

    if (obj.type !== "MemberExpression") {
      return false;
    }

    const result =
      obj.type === "MemberExpression" &&
      obj.property.type === "Identifier" &&
      obj.property.value === m;

    obj = obj.object;

    return result;
  });
};

class CodeAliases extends Visitor {
  visitExpression(n: Expression): Expression {
    if (n.type === "CallExpression") {
      const aliases: Array<[string, string]> = [
        ["Object.prototype.hasOwnProperty.call", "OhO"],
        ["Object.keys", "Obk"],
        ["Object.values", "Obv"],
        ["Object.assign", "Oba"],
        ["Array.from.call", "Afr"],
        ["Array.isArray", "Ais"],
      ];

      const foundAlias = aliases.find(([original]) =>
        isMemberExpression(n.callee, original),
      );

      if (foundAlias) {
        return this.visitExpression(
          call({
            span: n.span,
            callee: identifier({
              span: n.span,
              value: foundAlias[1],
            }),
            args: n.arguments,
          }),
        );
      }
    }

    return super.visitExpression(n);
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export function codeAliases() {
  return (program: Program) => new CodeAliases().visitProgram(program);
}

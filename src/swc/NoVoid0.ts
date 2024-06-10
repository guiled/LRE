import {
  AssignmentExpression,
  AssignmentPattern,
  AssignmentPatternProperty,
  BinaryExpression,
  BindingIdentifier,
  Expression,
  Identifier,
  ObjectPatternProperty,
  Pattern,
  Program,
  VariableDeclarator,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import undefinedidentifier from "./node/undefinedidentifier";
import typeofexpression from "./node/expression/unary/typeofexpression";
import { ExpressionWithSpan } from "./types";

class NoVoid0 extends Visitor {
  #changeVoid0ToUndefined<T extends Expression | undefined>(
    n: T
  ): T | Identifier | BindingIdentifier {
    var result: T | Identifier | BindingIdentifier = n;
    if (n && n.type === "UnaryExpression" && n.operator === "void") {
      result = undefinedidentifier({
        span: n.span,
      });
    }
    return result;
  }

  visitBinaryExpression(n: BinaryExpression): Expression {
    var obj: ExpressionWithSpan | undefined, val;
    if (n.right.type === "UnaryExpression" && n.right.operator === "void") {
      obj = n.left as ExpressionWithSpan;
      val = n.right;
    } else if (
      n.left.type === "UnaryExpression" &&
      n.left.operator === "void"
    ) {
      obj = n.right as ExpressionWithSpan;
      val = n.left;
    }
    if (obj && val) {
      Object.assign(n, {
        left: typeofexpression({
          span: obj.span,
          argument: obj,
        }),
        right: {
          type: "StringLiteral",
          span: val.span,
          value: "undefined",
          raw: '"undefined"',
        },
      });
    }
    return super.visitBinaryExpression(n);
  }

  visitAssignmentPattern(n: AssignmentPattern): Pattern {
    n.right = this.#changeVoid0ToUndefined(n.right);
    return super.visitAssignmentPattern(n);
  }

  visitAssignmentExpression(n: AssignmentExpression): Expression {
    n.right = this.#changeVoid0ToUndefined(n.right);
    return super.visitAssignmentExpression(n);
  }

  visitExpression(n: Expression): Expression {
    n = this.#changeVoid0ToUndefined(n);
    return super.visitExpression(n);
  }

  visitAssignmentPatternProperty(
    n: AssignmentPatternProperty
  ): ObjectPatternProperty {
    n.value = this.#changeVoid0ToUndefined(n.value);
    return super.visitAssignmentPatternProperty(n);
  }

  visitVariableDeclarator(n: VariableDeclarator): VariableDeclarator {
    n.init = this.#changeVoid0ToUndefined(n.init);
    return super.visitVariableDeclarator(n);
  }
}

export default function noVoid0() {
  return (program: Program) => new NoVoid0().visitProgram(program);
}

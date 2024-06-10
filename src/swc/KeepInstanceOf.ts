import {
  BinaryExpression,
  EmptyStatement,
  Expression,
  Program,
  Statement,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import undefinedidentifier from "./node/undefinedidentifier";

/**
 * This module set Symbol to undefined in order to be abe to use "instanceof"
 * Because swc change instanceof operator by a function call _instanceof that first need
 */
class KeepInstanceOf extends Visitor {
  instanceOfFound: boolean = false;

  visitProgram(n: Program): Program {
    this.instanceOfFound = false;
    super.visitProgram(n);
    const span = n.span;
    if (this.instanceOfFound) {
      n.body.unshift({
        type: "ExpressionStatement",
        span,
        expression: {
          type: "AssignmentExpression",
          span,
          operator: "=",
          left: {
            type: "Identifier",
            span,
            value: "Symbol",
            optional: false,
          },
          right: undefinedidentifier({ span }),
        },
      });
    }
    return n;
  }

  visitBinaryExpression(n: BinaryExpression): Expression {
    if (n.operator === "instanceof") {
      this.instanceOfFound = true;
    }
    return super.visitBinaryExpression(n);
  }

  visitStatement(stmt: Statement): Statement {
    if (
      stmt.type === "FunctionDeclaration" &&
      /instanceof\d*$/.test(stmt.identifier.value)
    ) {
      const newStmt: EmptyStatement = {
        type: "EmptyStatement",
        span: stmt.span,
      };
      return super.visitStatement(newStmt);
    }
    return super.visitStatement(stmt);
  }

  //   visitFunctionDeclaration(decl: FunctionDeclaration): Declaration {
  //     if (decl.identifier.value === "_instanceof") {
  //       return {
  //         type: "EmptyStatement",
  //         span: decl.span,
  //       };
  //     }
  //   }

  visitExpression(n: Expression): Expression {
    if (
      n.type === "CallExpression" &&
      n.callee.type === "Identifier" &&
      /instanceof\d*$/.test(n.callee.value)
    ) {
      const binaryExpression: BinaryExpression = {
        type: "BinaryExpression",
        span: n.span,
        operator: "instanceof",
        left: n.arguments[0].expression,
        right: n.arguments[1].expression,
      };
      return super.visitExpression(binaryExpression);
    }
    return super.visitExpression(n);
  }
}

export default function keepInstanceOf() {
  return (program: Program) => new KeepInstanceOf().visitProgram(program);
}

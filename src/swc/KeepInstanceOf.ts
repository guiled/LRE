import {
  BinaryExpression,
  Declaration,
  Expression,
  FunctionDeclaration,
  Program,
  Statement,
  UnaryExpression,
} from "@swc/core";
import Visitor from "@swc/core/Visitor";
import undefinedidentifier from "./node/undefinedidentifier";

/**
 * This module set Symbol to undefined in order to be able to use "instanceof"
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
    return n;
  }

  visitStatement(stmt: Statement): Statement {
    if (
      stmt.type === "FunctionDeclaration" &&
      stmt.identifier.value === "_instanceof"
    ) {
      Object.assign(stmt, {
        type: "EmptyStatement",
        span: stmt.span,
      });
      delete stmt.identifier;
      delete stmt.declare;
      delete stmt.params;
      delete stmt.body;
      delete stmt.generator;
      delete stmt.async;
      delete stmt.typeParameters;
      delete stmt.returnType;
      delete stmt.decorators;
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
      n.callee.value === "_instanceof"
    ) {
      const span = n.span;
      Object.assign(n, {
        type: "BinaryExpression",
        span,
        operator: "instanceof",
        left: n.arguments[0].expression,
        right: n.arguments[1].expression,
      });
      delete n.arguments;
      delete n.callee;
      delete n.typeArguments;
    }
    return super.visitExpression(n);
  }
}

export default function keepInstanceOf() {
  return (program: Program) => new KeepInstanceOf().visitProgram(program);
}

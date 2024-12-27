import {
  BlockStatement,
  Expression,
  ExprOrSpread,
  ForStatement,
  IfStatement,
  ParenthesisExpression,
  Program,
  ReturnStatement,
  SequenceExpression,
  Statement,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import { ExpressionWithSpan } from "./types";
import { call } from "./node/expression/call";
import identifier from "./node/identifier";

class NoSequence extends Visitor {
  visitStatements(stmts: Statement[]): Statement[] {
    const newStmts: Statement[] = [];

    stmts.forEach((stmt) => {
      if (
        stmt.type === "ExpressionStatement" &&
        stmt.expression.type === "SequenceExpression"
      ) {
        (stmt.expression.expressions as Array<ExpressionWithSpan>).forEach(
          (expr) => {
            newStmts.push({
              span: expr.span,
              type: "ExpressionStatement",
              expression: expr,
            });
          },
        );
      } else {
        newStmts.push(stmt);
      }
    });

    return super.visitStatements(newStmts);
  }

  visitIfStatement(stmt: IfStatement): Statement {
    if (stmt.test.type === "SequenceExpression") {
      stmt.test = this.#transformSequenceExpressionToArrayLastExpression(
        stmt.test,
      );
    }

    if (
      stmt.consequent.type === "ExpressionStatement" &&
      stmt.consequent.expression.type === "SequenceExpression"
    ) {
      stmt.consequent.expression =
        this.#transformSequenceExpressionToArrayLastExpression(
          stmt.consequent.expression,
        );
    }

    return super.visitIfStatement(stmt);
  }

  visitParenthesisExpression(n: ParenthesisExpression): Expression {
    if (
      n.type === "ParenthesisExpression" &&
      n.expression.type === "SequenceExpression"
    ) {
      return this.visitExpression(
        this.#transformSequenceExpressionToArrayLastExpression(n.expression),
      );
    }

    return super.visitParenthesisExpression(n);
  }

  // don't generate [].pop(), because Let's Role runs it twice
  // don't generate [xx, xx][1], because Let's Role runs "xx" it twice
  // so sequence expression is transformed into a function that return the last expression
  #transformSequenceExpressionToArrayLastExpression(
    seq: SequenceExpression,
  ): Expression {
    const span = seq.span;

    return call({
      span,
      callee: identifier({
        span,
        value: "la",
      }),
      args: seq.expressions.map((e) => {
        return { expression: e } as ExprOrSpread;
      }),
    });
  }

  visitReturnStatement(stmt: ReturnStatement): Statement {
    if (stmt.argument?.type === "SequenceExpression") {
      return this.visitBlockStatement(
        this.#transformSequenceExpressionToBlockStatement(stmt.argument, true),
      );
    }

    return super.visitReturnStatement(stmt);
  }

  visitForStatement(stmt: ForStatement): Statement {
    if (
      stmt.body.type === "ExpressionStatement" &&
      stmt.body.expression.type === "SequenceExpression"
    ) {
      stmt.body = this.#transformSequenceExpressionToBlockStatement(
        stmt.body.expression,
      );
    }

    return super.visitForStatement(stmt);
  }

  #transformSequenceExpressionToBlockStatement(
    seq: SequenceExpression,
    withReturn: boolean = false,
  ): BlockStatement {
    const lastExpression: ExpressionWithSpan =
      seq.expressions.pop() as ExpressionWithSpan;

    const lastStatement: Statement = withReturn
      ? {
          type: "ReturnStatement",
          span: lastExpression.span,
          argument: lastExpression,
        }
      : {
          type: "ExpressionStatement",
          span: lastExpression.span,
          expression: lastExpression,
        };

    const stmtFromSequence: Statement[] = (
      seq.expressions as Array<ExpressionWithSpan>
    ).map((expr) => ({
      span: expr.span,
      type: "ExpressionStatement",
      expression: expr,
    }));

    const newBlock: BlockStatement = {
      span: seq.span,
      type: "BlockStatement",
      stmts: [...stmtFromSequence, lastStatement],
    };
    return this.visitBlockStatement(newBlock);
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export function noSequence() {
  return (program: Program) => new NoSequence().visitProgram(program);
}

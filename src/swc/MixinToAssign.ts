import {
  Argument,
  ArrowFunctionExpression,
  CallExpression,
  Class,
  ClassExpression,
  ClassMember,
  Constructor,
  Expression,
  ExpressionStatement,
  Identifier,
  Program,
  Span,
  Statement,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import { arrayexpression } from "./node/expression/arrayexpression";
import identifier from "./node/identifier";

type SuperCallExpression = ExpressionStatement & {
  expression: CallExpression & {
    callee: { type: "Super" };
  };
};

type MixinCall = CallExpression & {
  callee: Identifier & { value: "Mixin" };
};

class MixinToAssign extends Visitor {
  #mixinClasses: Argument[] | undefined;
  #constructorFound: boolean = false;
  #superFound: boolean = false;

  visitCallExpression(n: CallExpression): Expression {
    if (
      this.#mixinClasses &&
      this.#isSuperCall({
        type: "ExpressionStatement",
        expression: n,
        span: n.span,
      })
    ) {
      this.#superFound = true;
      return super.visitCallExpression({
        ...n,
        arguments: this.#getSuperArgs(n.span, n.arguments),
      });
    }

    return super.visitCallExpression(n);
  }

  #getSuperArgs(span: Span, args: Argument[]): Array<Argument> {
    return [
      {
        expression: arrayexpression({
          span,
          elements: this.#mixinClasses,
        }),
      },
      ...args,
    ];
  }

  visitConstructor(n: Constructor): ClassMember {
    if (!this.#mixinClasses || !n.body) {
      return super.visitConstructor(n);
    }

    this.#constructorFound = true;
    const saveSuperFound = this.#superFound;
    this.#superFound = false;

    const res = super.visitConstructor(n);

    if (!this.#superFound) {
      n.body.stmts.unshift(this.#createSuperCall(n.span));
    }

    this.#superFound = saveSuperFound;

    return res;
  }

  #createSuperCall(span: Span): Statement {
    return {
      type: "ExpressionStatement",
      expression: {
        type: "CallExpression",
        callee: {
          type: "Super",
          span,
        },
        arguments: this.#getSuperArgs(span, []),
        span,
      },
      span,
    };
  }

  #isSuperCall(stmt: Statement): stmt is SuperCallExpression {
    return (
      stmt.type === "ExpressionStatement" &&
      stmt.expression.type === "CallExpression" &&
      stmt.expression.callee.type === "Super"
    );
  }

  visitClass<T extends Class>(n: T): T {
    const mixinCall = this.#getMixinCall(n.superClass);

    if (mixinCall) {
      const prevMixinClasses = this.#mixinClasses;
      const prevConstructorFound = this.#constructorFound;
      this.#constructorFound = false;
      this.#mixinClasses = mixinCall.arguments;
      n.superClass = identifier({
        span: n.span,
        value: "mx",
      });
      const res = super.visitClass(n);

      if (!this.#constructorFound) {
        res.body.push({
          type: "Constructor",
          span: n.span,
          key: identifier({
            span: n.span,
            value: "constructor",
          }),
          params: [],
          isOptional: false,
          body: {
            type: "BlockStatement",
            span: n.span,
            stmts: [this.#createSuperCall(n.span)],
          },
        });
      }

      this.#mixinClasses = prevMixinClasses;
      this.#constructorFound = prevConstructorFound;
      return res;
    }

    return super.visitClass(n);
  }

  #getMixinCall(e: Expression | undefined): MixinCall | undefined {
    if (!e) {
      return undefined;
    } else if (this.#isMixinCall(e)) {
      return e;
    } else if (
      (e.type === "ParenthesisExpression" || e.type === "TsAsExpression") &&
      this.#isMixinCall(e.expression)
    ) {
      return e.expression;
    } else if (
      e.type === "ParenthesisExpression" &&
      e.expression.type === "TsAsExpression" &&
      this.#isMixinCall(e.expression.expression)
    ) {
      return e.expression.expression;
    }

    return undefined;
  }

  #isMixinCall(e: Expression | undefined): e is MixinCall {
    return (
      !!e &&
      e.type === "CallExpression" &&
      e.callee.type === "Identifier" &&
      e.callee.value === "Mixin"
    );
  }

  visitArrowFunctionExpression(e: ArrowFunctionExpression): Expression {
    if (this.#isMixable(e) && e.body.type === "ClassExpression") {
      const res = this.visitExpression(e.body);
      this.#transformMixable(e.body);
      return res;
    }

    const res = super.visitArrowFunctionExpression(e);
    return res;
  }

  #isMixable(e: ArrowFunctionExpression): boolean {
    if (
      e.params[0]?.type === "Identifier" &&
      e.params[0].value === "superclass"
    ) {
      return true;
    }

    if (
      e.params[0]?.type === "AssignmentPattern" &&
      e.params[0].left.type === "Identifier" &&
      e.params[0].left.value === "superclass"
    ) {
      return true;
    }

    return false;
  }

  #transformMixable(c: ClassExpression): ClassExpression {
    if (
      c.superClass?.type === "Identifier" &&
      c.superClass.value === "superclass"
    ) {
      c.superClass = undefined;
      const ctor = c.body.find(
        (cm) => cm.type === "Constructor",
      ) as Constructor;

      if (ctor && ctor.body) {
        ctor.body.stmts = ctor.body.stmts.filter((s) => !this.#isSuperCall(s));
      }
    }

    return c;
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export function mixinToAssign() {
  return (program: Program) => new MixinToAssign().visitProgram(program);
}

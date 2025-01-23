import {
  Argument,
  ArrowFunctionExpression,
  CallExpression,
  ClassDeclaration,
  ClassExpression,
  ClassMember,
  Constructor,
  Declaration,
  ExprOrSpread,
  Expression,
  ExpressionStatement,
  Program,
  Span,
  Statement,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import identifier from "./node/identifier";
import { objectassign } from "./node/expression/objectassign";
import { newexpression } from "./node/expression/newexpression";
import thisexpression from "./node/expression/thisexpression";
import { call } from "./node/expression/call";
import { arrayexpression } from "./node/expression/arrayexpression";
import onevariable from "./node/declaration/onevariable";
import expression from "./node/expression";
import { arrayfromarguments } from "./node/expression/arrayfromarguments";

class MixinToAssign extends Visitor {
  #mixinClasses: Argument[] | undefined;
  #constructorFound: boolean = false;

  #makeMixinAssigns(span: Span, mixins: Argument[]): CallExpression {
    return {
      type: "CallExpression",
      callee: objectassign(span),
      span: span,
      arguments: [
        { expression: thisexpression({ span }) },
        ...mixins.map<Argument>((mixin: Argument) => ({
          expression: newexpression({
            callee: mixin.expression,
            arguments: [
              {
                spread: span,
                expression: arrayfromarguments(span),
              },
            ],
          }),
        })),
      ],
    };
  }

  visitConstructor(n: Constructor): ClassMember {
    if (!this.#mixinClasses || !n.body) {
      return super.visitConstructor(n);
    }

    this.#constructorFound = true;
    const span = n.span;
    let superFound = false;
    const parentMixins = identifier({
      span,
      value: "_super",
    });
    n.body.stmts = n.body?.stmts.map<Statement>(
      (stmt: Statement): Statement => {
        if (this.#isSuperCall(stmt)) {
          superFound = true;
          const callExpression: CallExpression = (stmt as ExpressionStatement)
            .expression as CallExpression;
          return onevariable({
            span,
            id: parentMixins,
            init: call(
              {
                span,
                callee: identifier({ span, value: "mx" }),
                args: [
                  expression(
                    arrayexpression({
                      span,
                      elements: this.#mixinClasses!.map<ExprOrSpread>((m) => m),
                    }),
                  ),
                  ...callExpression.arguments,
                ],
              },
              false,
              { expression: thisexpression({ span }) },
            ),
          });
        }

        return stmt;
      },
    );

    if (!superFound) {
      n.body.stmts.unshift({
        type: "ExpressionStatement",
        expression: this.#makeMixinAssigns(span, this.#mixinClasses),
        span,
      });
    }

    return super.visitConstructor(n);
  }

  #isSuperCall(stmt: Statement): boolean {
    return (
      stmt.type === "ExpressionStatement" &&
      stmt.expression.type === "CallExpression" &&
      stmt.expression.callee.type === "Super"
    );
  }

  visitClassDeclaration(decl: ClassDeclaration): Declaration {
    const superClass = decl.superClass;
    const mixinCall = superClass && this.#getMixinCall(superClass);

    if (mixinCall) {
      const span = decl.span;
      const newClass: ClassDeclaration = {
        ...decl,
        superClass: undefined,
      };
      const prevMixinClasses = this.#mixinClasses;
      const prevConstructorFound = this.#constructorFound;
      this.#mixinClasses = mixinCall.arguments;
      this.#constructorFound = false;
      const res = super.visitClassDeclaration(newClass);

      if (!this.#constructorFound) {
        newClass.body.push({
          type: "Constructor",
          span,
          key: identifier({
            span,
            value: "constructor",
          }),
          params: [],
          isOptional: false,
          body: {
            type: "BlockStatement",
            span: span,
            stmts: [
              {
                type: "ExpressionStatement",
                expression: this.#makeMixinAssigns(span, this.#mixinClasses),
                span,
              },
            ],
          },
        });
      }

      this.#mixinClasses = prevMixinClasses;
      this.#constructorFound = prevConstructorFound;
      return res;
    }

    return super.visitClassDeclaration(decl);
  }

  #getMixinCall(e: Expression): CallExpression | undefined {
    if (this.#isMixinCall(e)) {
      return e as CallExpression;
    } else if (
      (e.type === "ParenthesisExpression" || e.type === "TsAsExpression") &&
      this.#isMixinCall(e.expression)
    ) {
      return e.expression as CallExpression;
    } else if (
      e.type === "ParenthesisExpression" &&
      e.expression.type === "TsAsExpression" &&
      this.#isMixinCall(e.expression.expression)
    ) {
      return e.expression.expression as CallExpression;
    }

    return undefined;
  }

  #isMixinCall(e: Expression): boolean {
    return (
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

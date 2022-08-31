import {
  CallExpression,
  ConditionalExpression,
  Expression,
  MemberExpression,
  OptionalChainingCall,
  OptionalChainingExpression,
  Program,
  UnaryExpression,
  VariableDeclaration,
} from "@swc/core";
import Visitor from "@swc/core/Visitor";
import onevariable from "./node/declaration/onevariable";
import iife from "./node/expression/iife";
import identifier from "./node/identifier";
import returnstmt from "./node/statement/returnstmt";
import member from "./node/expression/member";
import conditional from "./node/expression/conditional";
import and from "./node/expression/binary/and";
import undefinedidentifier from "./node/undefinedidentifier";
import { hasArrayItemWithValue, hasPropWithValue } from "./ParamDefaultValue";

const TMP_VAR = "__tmp";

class NoVoid0 extends Visitor {
  #replaceNode(
    container: MemberExpression | CallExpression | OptionalChainingExpression,
    node: MemberExpression | CallExpression | OptionalChainingExpression,
    replace: Expression
  ): Expression {
    if (container === node) {
      return replace;
    }
    let result = { ...container };
    let obj = result;
    let prop: boolean | string = true;
    while (prop && !this.#isFinalChainingNode(obj)) {
      prop = this.#getChainingSubObjectPropertyName(obj);
      if (prop) {
        if (obj[prop] === node) {
          obj[prop] = replace;
          return result;
        }
        obj[prop] = { ...obj[prop] };
        obj = obj[prop];
      }
    }
    return container;
  }

  #isFinalChainingNode(n: Expression): boolean {
    const finalNodesTypes: Array<Expression["type"]> = [
      "Identifier",
      "ThisExpression",
    ];
    let prop = this.#getChainingSubObjectPropertyName(n);
    return !!prop && finalNodesTypes.includes(n[prop].type);
  }

  #onlyConstantMemberExpression(n: Expression) {
    let obj = n;
    while (!this.#isFinalChainingNode(obj)) {
      if (
        obj.type !== "MemberExpression" ||
        obj.property.type !== "Identifier"
      ) {
        return false;
      }
      const prop = this.#getChainingSubObjectPropertyName(obj);
      if (!prop) {
        return false;
      }
      obj = obj[prop];
    }
    if (obj.type === "MemberExpression" && obj.property.type !== "Identifier") {
      return false;
    }
    return true;
  }

  #getChainingSubObjectPropertyName(n: Expression): string | false {
    switch (n.type) {
      case "MemberExpression":
        return "object";
      case "CallExpression":
        return "callee";
      case "OptionalChainingExpression":
        return "base";
    }
    return false;
  }

  #transform(
    n: OptionalChainingExpression,
    container: MemberExpression | CallExpression | OptionalChainingExpression
  ): CallExpression | ConditionalExpression {
    let base, baseWithProperty, completeValue;
    if (n.base.type === "MemberExpression") {
      if (n.base.object.type === "Identifier") {
        base = n.base.object;
        baseWithProperty = n.base.object;
        completeValue = this.#replaceNode(container, n, n.base);
      } else if (n.base.object.type === "MemberExpression") {
        base = n.base.object;
        baseWithProperty = n.base.object;
        completeValue = this.#replaceNode(container, n, n.base);
      } else if (n.base.object.type === "OptionalChainingExpression") {
        base = n.base.object;
        baseWithProperty = n.base;
        completeValue = this.#replaceNode(container, n, n.base);
      } else {
        throw new Error(
          "noVoid0 : unhandled base object type " + base.object.type
        );
      }
    } else {
      // When n.base.type === "CallExpression"
      if (
        n.base.callee.type === "Identifier" ||
        n.base.callee.type === "ThisExpression"
      ) {
        base = n.base.callee;
        baseWithProperty = n.base.callee;
        completeValue = this.#replaceNode(container, n, n.base);
      } else if (n.base.callee.type === "MemberExpression") {
        base = n.base.callee;
        baseWithProperty = member({
          span: n.span,
          object: base,
          property: identifier({ span: n.base.span, value: "call" }),
        });
        completeValue = this.#replaceNode(container, n, n.base);
      } else {
        throw new Error(
          "noVoid0 : unhandled base callee type " + base.callee.type
        );
      }
    }

    if (
      base.type === "Identifier" ||
      base.type === "ThisExpression" ||
      this.#onlyConstantMemberExpression(base)
    ) {
      let test = base;
      if (base !== baseWithProperty) {
        test = and({
          span: n.questionDotToken,
          left: test,
          right: baseWithProperty,
        });
      }
      return conditional({
        span: n.questionDotToken,
        test,
        consequent: completeValue,
        alternate: undefinedidentifier({ span: n.questionDotToken }),
      });
    } else {
      return this.#getOptionalChainingIIFE({
        span: n.span,
        base,
        baseWithProperty,
        completeValue,
      });
    }
  }

  #getOptionalChainingIIFE({
    span,
    base,
    baseWithProperty,
    completeValue,
  }): CallExpression {
    let tmpIdentifier = identifier({ span, value: TMP_VAR });
    let test: Expression = tmpIdentifier;
    if (base !== baseWithProperty && baseWithProperty !== completeValue) {
      test = and({
        span,
        left: tmpIdentifier,
        right: this.#replaceNode(baseWithProperty, base, tmpIdentifier),
      });
    }
    return iife({
      span,
      stmts: [
        onevariable({
          span,
          kind: "let",
          id: tmpIdentifier,
          init: base,
        }),
        returnstmt({
          span,
          argument: conditional({
            span,
            test,
            consequent: this.#replaceNode(completeValue, base, tmpIdentifier),
            alternate: undefinedidentifier({ span }),
          }),
        }),
      ],
    });
  }

  #findOptionalChaining(
    n: MemberExpression | CallExpression | OptionalChainingCall
  ): OptionalChainingExpression | undefined {
    let obj: Expression = n;
    while (!this.#isFinalChainingNode(obj)) {
      if (obj.type === "OptionalChainingExpression") {
        return obj;
      }
      const prop = this.#getChainingSubObjectPropertyName(obj);
      if (!prop) {
        return undefined;
      }
      obj = obj[prop];
    }
  }

  visitUnaryExpression(n: UnaryExpression): Expression {
    if (n.operator === "void") {
      return {
        type: "Identifier",
        span: n.span,
        value: "undefined",
        optional: false,
      };
    }
    return super.visitUnaryExpression(n);
  }

  visitExpression(n: Expression): Expression {
    let obj: Expression = n;
    if (n.type === "OptionalChainingExpression") {
      obj = this.#transform(n, n);
    } else if (n.type === "MemberExpression" || n.type === "CallExpression") {
      let oc: OptionalChainingExpression | undefined =
        this.#findOptionalChaining(n);
      if (oc) {
        obj = this.#transform(oc, n);
      }
    }
    return super.visitExpression(obj);
  }

  visitVariableDeclaration(n: VariableDeclaration): VariableDeclaration {
      // remplacer const {a:c = 2} = toto par const c = toto?.a ?? 2;
      // remplacer const {a: {urlu=2}} = toto par const urlu = toto?.a?.urlu ?? 2
      // voir pour gérer const {a: {urlu:blop=2}=13} = toto
      const newDeclarations: VariableDeclaration["declarations"] = [];
      n.declarations.forEach(d => {
        if (d.id.type === 'ArrayPattern' && hasArrayItemWithValue(d.id)) {
          console.log(n);
        } else if (d.id.type === "ObjectPattern" && hasPropWithValue(d.id)) {
          console.log(n);
        }
      });
      console.log('visitVariableDeclaration');
      console.log(JSON.stringify(n, null, 2));
      return super.visitVariableDeclaration(n);
  }
}

export default function noVoid0() {
  return (program: Program) => new NoVoid0().visitProgram(program);
}

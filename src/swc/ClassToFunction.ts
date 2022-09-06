import {
  CallExpression,
  ClassDeclaration,
  ClassExpression,
  ClassMember,
  ClassMethod,
  ClassProperty,
  Constructor,
  Expression,
  ExpressionStatement,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  MemberExpression,
  Param,
  PrivateMethod,
  PrivateProperty,
  Program,
  Statement,
  VariableDeclaration,
} from "@swc/core";
import Visitor from "@swc/core/Visitor";
import onevariable from "./node/declaration/onevariable";
import member from "./node/expression/member";
import thisexpression from "./node/expression/thisexpression";
import identifier from "./node/identifier";
import undefinedidentifier from "./node/undefinedidentifier";
import { CONSTRUCTOR_ARG_NAME } from "./utils/paramToVariableDeclarator";

class ClassToFunction extends Visitor {
  #methodToFunction(
    n: ClassMethod | PrivateMethod
  ): ExpressionStatement | VariableDeclaration {
    const f: FunctionExpression = {
      type: "FunctionExpression",
      params: n.function.params,
      decorators: [],
      span: n.function.span,
      body: n.function.body,
      generator: false,
      async: false,
    };
    if (n.key.type === "PrivateName") {
      return onevariable({
        span: n.span,
        id: this.#transformPrivateIdentifier(n.key.id),
        kind: "const",
        init: f,
      });
    }
    return {
      type: "ExpressionStatement",
      span: n.span,
      expression: {
        type: "AssignmentExpression",
        span: n.span,
        operator: "=",
        left: {
          type: "MemberExpression",
          span: n.span,
          object: {
            type: "ThisExpression",
            span: n.span,
          },
          property: n.key,
        },
        right: {
          type: "FunctionExpression",
          params: n.function.params,
          decorators: [],
          span: n.function.span,
          body: n.function.body,
          generator: false,
          async: false,
        },
      },
    };
  }

  #ConstructorToFunction(n: Constructor): ExpressionStatement {
    return {
      type: "ExpressionStatement",
      span: n.span,
      expression: {
        type: "CallExpression",
        span: n.span,
        callee: {
          type: "MemberExpression",
          span: n.span,
          object: {
            type: "ParenthesisExpression",
            span: n.span,
            expression: {
              type: "FunctionExpression",
              params: n.params,
              decorators: [],
              span: n.body?.span || n.span,
              body: n.body,
              generator: false,
              async: false,
            },
          },
          property: {
            type: "Identifier",
            span: n.span,
            value: "apply",
            optional: false,
          },
        },
        arguments: [
          {
            expression: {
              type: "ThisExpression",
              span: n.span,
            },
          },
          {
            expression: {
              type: "Identifier",
              span: n.span,
              value: CONSTRUCTOR_ARG_NAME,
              optional: false,
            },
          },
        ],
      },
    };
  }
  #propertyToVariable(
    n: ClassProperty | PrivateProperty
  ): ExpressionStatement | VariableDeclaration {
    if (n.type === "ClassProperty") {
      return {
        type: "ExpressionStatement",
        span: n.span,
        expression: {
          type: "AssignmentExpression",
          span: n.span,
          operator: "=",
          left: {
            type: "MemberExpression",
            span: n.span,
            object: {
              type: "ThisExpression",
              span: n.span,
            },
            property: n.key,
          },
          right: n.value ?? undefinedidentifier({ span: n.span }),
        },
      };
    } else {
      return {
        type: "VariableDeclaration",
        span: n.span,
        kind: "let",
        declare: false,
        declarations: [
          {
            type: "VariableDeclarator",
            span: n.span,
            id: this.#transformPrivateIdentifier(n.key.id),
            init: n.value,
            definite: n.definite,
          },
        ],
      };
    }
  }

  #transformClassToFunction<T extends ClassExpression | ClassDeclaration>(
    n: T
  ): FunctionExpression {
    const res =
      n.type === "ClassExpression"
        ? this.visitClassExpression(n)
        : this.visitClassDeclaration(n);

    let methods: ExpressionStatement[] = [];
    let properties: (ExpressionStatement | VariableDeclaration)[] = [];
    let constructorFunctionStatement: ExpressionStatement | undefined;
    let constructorParams: Param[] = [];

    res.body.forEach((n: ClassMember) => {
      if (n.type === "Constructor" && n.body) {
        constructorFunctionStatement = this.#ConstructorToFunction(n);
        constructorParams = n.params;
      } else if (n.type === "ClassMethod" || n.type === "PrivateMethod") {
        methods.push(this.#methodToFunction(n));
      } else if (n.type === "PrivateProperty" || n.type === "ClassProperty") {
        properties.push(this.#propertyToVariable(n));
      } else if (n.type === "StaticBlock") {
        // todo?
      }
    });

    const stmts: Statement[] = [...properties, ...methods];
    if (constructorFunctionStatement) {
      stmts.push(constructorFunctionStatement);
    }

    return {
      type: "FunctionExpression",
      identifier: res.identifier,
      params: [
        {
          type: "Parameter",
          span: n.span,
          decorators: [],
          pat: {
            type: "Identifier",
            span: n.span,
            value: CONSTRUCTOR_ARG_NAME,
            optional: false,
          },
        },
      ],
      span: res.span,
      body: {
        type: "BlockStatement",
        span: res.span,
        stmts,
      },
      generator: false,
      async: false,
    };
  }

  #transformPrivateIdentifier(i: Identifier): Identifier {
    return {
      ...i,
      value: "__priv" + i.value,
    };
  }

  #changePrivateMember(n: MemberExpression): MemberExpression | Expression {
    if (
      n.object.type === "ThisExpression" &&
      n.property.type === "PrivateName"
    ) {
      return this.visitExpression(
        this.#transformPrivateIdentifier(n.property.id)
      );
    }
    return this.visitMemberExpression(n);
  }

  visitCallExpression(n: CallExpression): Expression {
      if (n.callee.type === "MemberExpression"
      && n.callee.object.type === "ThisExpression"
      && n.callee.property.type === "PrivateName") {
        n.arguments.unshift({
          spread: undefined,
          expression: thisexpression({span: n.callee.object.span}),
        });
        n.callee.object = member({
          ...n.callee,
        });
        n.callee.property = identifier({
          span: n.callee.span,
          value: "call"
        });
      }
      return super.visitCallExpression(n);
  }

  visitStatements(stmts: Statement[]): Statement[] {
    return super.visitStatements(
      stmts.map((stmt: Statement): Statement | FunctionDeclaration => {
        if (stmt.type === "ClassDeclaration") {
          return {
            type: "VariableDeclaration",
            span: stmt.span,
            kind: "const",
            declare: false,
            declarations: [
              {
                type: "VariableDeclarator",
                span: stmt.span,
                id: stmt.identifier,
                init: this.#transformClassToFunction(stmt),
                definite: false,
              },
            ],
          };
        }
        return stmt;
      })
    );
  }

  visitExpression(n: Expression): Expression {
    switch (n.type) {
      case "ClassExpression":
        return this.#transformClassToFunction(n);
      case "MemberExpression":
        return this.#changePrivateMember(n);
      default:
        return super.visitExpression(n);
    }
  }
}

export default function classToFunction() {
  return (program: Program) => new ClassToFunction().visitProgram(program);
}

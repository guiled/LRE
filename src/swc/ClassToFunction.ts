import {
  Argument,
  AssignmentExpression,
  CallExpression,
  Class,
  ClassDeclaration,
  ClassExpression,
  ClassMember,
  ClassMethod,
  ClassProperty,
  Constructor,
  Declaration,
  DefaultDecl,
  ExportDefaultDeclaration,
  ExportDefaultExpression,
  Expression,
  ExpressionStatement,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  MemberExpression,
  ModuleDeclaration,
  PrivateMethod,
  PrivateProperty,
  Program,
  Span,
  Statement,
  TsType,
  VariableDeclaration,
  VariableDeclarator,
} from "@swc/core";
import {Visitor} from "@swc/core/Visitor";
import onevariable from "./node/declaration/onevariable";
import assignment from "./node/expression/assignment";
import call from "./node/expression/call";
import iife from "./node/expression/iife";
import member from "./node/expression/member";
import thisexpression from "./node/expression/thisexpression";
import identifier from "./node/identifier";
import returnstmt from "./node/statement/returnstmt";
import undefinedidentifier from "./node/undefinedidentifier";
import { CONSTRUCTOR_ARG_NAME } from "./utils/paramToVariableDeclarator";

type PublicMethodToFunctionStatement = ExpressionStatement & {
  expression: AssignmentExpression & {
    operator: "=";
    left: MemberExpression;
    right: FunctionExpression;
  };
};

type PrivateMethodToFunctionStatement = VariableDeclaration & {
  declarations: (Declaration & {
    init: FunctionExpression;
  })[]
}

type MethodToFunctionStatement = PublicMethodToFunctionStatement | PrivateMethodToFunctionStatement;

type PublicPropertyToVariable = ExpressionStatement & {
  expression: AssignmentExpression & {
    operator: "=",
    left: MemberExpression,
  }
};

type PrivatePropertyToVariable = VariableDeclaration & {
  kind: "let",
}

type PropertyToVariable = PublicPropertyToVariable | PrivatePropertyToVariable;

class ClassToFunction extends Visitor {
  #privateMethods: Array<Identifier["value"]> = [];
  #inPrivateCallExpression = false;

  #methodToFunction(
    n: ClassMethod | PrivateMethod
  ): MethodToFunctionStatement {
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
      }) as PrivateMethodToFunctionStatement;
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
          object: thisexpression({span: n.span}),
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
    let args: Argument[] = n.params.length > 0 ? [{
      expression: {
        type: "Identifier",
        span: n.span,
        value: CONSTRUCTOR_ARG_NAME,
        optional: false,
      },
    }] : [];

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
            expression: thisexpression({span: n.span}),
          },
          ...args,
        ],
      },
    };
  }
  #propertyToVariable(
    n: ClassProperty | PrivateProperty
  ): PropertyToVariable {
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
            object: thisexpression({ span: n.span }),
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

  #transformClassBodyToFunction(
    body: Class["body"],
    span: Span,
    _identifier?: Identifier
  ): FunctionExpression | CallExpression {
    let methods: Array<MethodToFunctionStatement> = [];
    let staticMethods: Array<MethodToFunctionStatement> = [];
    let properties: Array<PropertyToVariable> = [];
    let staticProperties: Array<PropertyToVariable> = [];
    let constructorFunctionStatement: ExpressionStatement | undefined;
    let staticStmts: Statement[] = [];
    const publicStatic: Array<PublicMethodToFunctionStatement | PublicPropertyToVariable> = [];
    const privateStatic: Array<PrivateMethodToFunctionStatement | PrivatePropertyToVariable> = [];
    body.forEach((n: ClassMember) => {
      if (n.type === "Constructor" && n.body) {
        constructorFunctionStatement = this.#ConstructorToFunction(n);
      } else if ((n.type === "ClassMethod" || n.type === "PrivateMethod") && !n.isAbstract) {
        if (n.isStatic) {
          staticMethods.push(this.#methodToFunction(n));
        } else {
          methods.push(this.#methodToFunction(n));
        }
      } else if (n.type === "PrivateProperty" || n.type === "ClassProperty") {
        if (n.isStatic) {
          staticProperties.push(this.#propertyToVariable(n));
        } else {
          properties.push(this.#propertyToVariable(n));
        }
      } else if (n.type === "StaticBlock") {
        // todo?
        staticStmts = n.body.stmts;
      }
    });

    const stmts: Statement[] = [...properties, ...methods];
    if (constructorFunctionStatement) {
      stmts.push(constructorFunctionStatement);
    }
    let classFunction: FunctionExpression = {
      type: "FunctionExpression",
      identifier: _identifier,
      params: [
        {
          type: "Parameter",
          span,
          decorators: [],
          pat: {
            type: "Identifier",
            span,
            value: CONSTRUCTOR_ARG_NAME,
            optional: false,
          },
        },
      ],
      span,
      body: {
        type: "BlockStatement",
        span,
        stmts,
      },
      generator: false,
      async: false,
    };

    if (
      staticMethods.length + staticProperties.length + staticStmts.length >
      0
    ) {
      const tmpClassFunctionId = identifier({
        span: classFunction.span,
        value: "__lreClass" + classFunction.identifier?.value,
      });
      const publicStatic: Array<PublicMethodToFunctionStatement | PublicPropertyToVariable> = [
        ...(staticMethods.filter(
          (m: MethodToFunctionStatement) =>
            m.type === "ExpressionStatement"
        ) as Array<PublicMethodToFunctionStatement>),
        ...(staticProperties.filter(
          (m: PropertyToVariable) =>
            m.type === "ExpressionStatement"
        ) as Array<PublicPropertyToVariable>),
      ];
      const privateStatic: Array<PrivateMethodToFunctionStatement | PrivatePropertyToVariable> = [
        ...(staticMethods.filter(
          (m: MethodToFunctionStatement) =>
            m.type === "VariableDeclaration"
        ) as Array<PrivateMethodToFunctionStatement>),
        ...(staticProperties.filter(
          (m: PropertyToVariable) =>
            m.type === "VariableDeclaration"
        ) as Array<PrivatePropertyToVariable>),
      ];
      return iife({
        span: classFunction.span,
        stmts: [
          ...privateStatic,
          onevariable({
            span: classFunction.span,
            id: tmpClassFunctionId,
            init: classFunction,
          }),
          ...publicStatic.map((e: PublicMethodToFunctionStatement) => {
            return {
              ...e,
              expression: {
                ...e.expression,
                left: {
                  ...e.expression.left,
                  object: tmpClassFunctionId,
                }
              }
            };
          }),
          ...staticStmts,
          returnstmt({
            span: classFunction.span,
            argument: tmpClassFunctionId,
          }),
        ],
      });
    }

    return classFunction;
  }

  #transformClassToFunction<T extends ClassExpression | ClassDeclaration>(
    n: T
  ): VariableDeclaration | VariableDeclarator["init"] {
    const classDefinition =
      n.type === "ClassExpression"
        ? this.visitClassExpression(n)
        : (this.visitClassDeclaration(n) as ClassDeclaration);

    return this.#transformClassBodyToFunction(n, n.span, n.identifier);

    let finalResult: VariableDeclaration | VariableDeclarator["init"] =
      classFunction;
    if (classFunction.identifier) {
      finalResult = onevariable({
        span: n.span,
        id: n.identifier,
        init: classFunction,
      });
    }

    if (
      staticMethods.length + staticProperties.length + staticStmts.length >
      0
    ) {
      const stmts: Statement[] = [...staticStmts];
      let classId;

      if (
        finalResult.type === "FunctionExpression" &&
        !finalResult.identifier
      ) {
        classId = identifier({
          span: finalResult.span,
          value: "__unnamedClass",
        });
        // assign unnamed class to a tmp variable
        finalResult = onevariable({
          span: finalResult.span,
          id: classId,
          init: finalResult,
          kind: "const",
        });
      } else {
        classId = finalResult.identifier;
      }

      stmts.push(finalResult);
      finalResult = iife({
        span: n.span,
        stmts: [],
        identifier: n.identifier,
      });
    }

    return finalResult;
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
      if (this.#privateMethods.includes(n.property.id.value) && !this.#inPrivateCallExpression) {
        return this.visitExpression(
          call({
            span: n.span,
            callee: member({
              span: n.span,
              object: this.#transformPrivateIdentifier(n.property.id),
              property: identifier({
                span: n.span,
                value: "bind",
              }),
            }),
            args: [
              {
                spread: undefined,
                expression: thisexpression({ span: n.span }),
              },
            ],
          })
        );
      } else {
        return this.visitExpression(
          this.#transformPrivateIdentifier(n.property.id)
        );
      }
    }
    return this.visitMemberExpression(n);
  }

  visitClass<T extends Class>(n: T): T {
      return super.visitClass(n);
  }

  visitClassBody(members: ClassMember[]): ClassMember[] {
    this.#privateMethods = [];
    members.forEach((m) => {
      if (m.type === "PrivateMethod") {
        this.#privateMethods.push(m.key.id.value);
      }
    });
    members = super.visitClassBody(members);
    return super.visitClassBody(members);
  }

  visitCallExpression(n: CallExpression): Expression {
    const oldInPrivateCallExpression = this.#inPrivateCallExpression;
    this.#inPrivateCallExpression = false;
    if (
      n.callee.type === "MemberExpression" &&
      n.callee.object.type === "ThisExpression" &&
      n.callee.property.type === "PrivateName"
    ) {
      this.#inPrivateCallExpression = true;
      n.arguments.unshift({
        spread: undefined,
        expression: thisexpression({ span: n.callee.object.span }),
      });
      n.callee.object = member({
        ...n.callee,
      });
      n.callee.property = identifier({
        span: n.callee.span,
        value: "call",
      });
    }
    const result = super.visitCallExpression(n);
    this.#inPrivateCallExpression = oldInPrivateCallExpression;
    return result;
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

  #transformClassExpression(
    n: ClassExpression
  ): FunctionExpression | CallExpression {
    return this.#transformClassBodyToFunction(n.body, n.span, n.identifier);
  }

  #transformClassDeclaration(decl: ClassDeclaration): VariableDeclaration {
    return onevariable({
      span: decl.span,
      id: decl.identifier,
      init: this.#transformClassBodyToFunction(
        decl.body,
        decl.span,
        decl.identifier
      ),
      declare: decl.declare,
      kind: "const",
    });
  }

  visitExpression(n: Expression): Expression {
    switch (n.type) {
      case "ClassExpression":
        n = this.visitClassExpression(n);
        return super.visitExpression(this.#transformClassExpression(n));
      case "MemberExpression":
        return super.visitExpression(this.#changePrivateMember(n));
      default:
        return super.visitExpression(n);
    }
  }

  visitExportDefaultDeclaration(
    n: ExportDefaultDeclaration
  ): ModuleDeclaration {
    return super.visitExportDefaultDeclaration(n);
  }

  visitDefaultDeclaration(n: DefaultDecl): DefaultDecl {
    if (n.type === "ClassExpression") {
      n = super.visitClassExpression(n);
      const res = this.#transformClassExpression(n)
      if (res.type === "CallExpression") {
      }
      return super.visitExpression(this.#transformClassExpression(n)) as FunctionExpression;
    }
    return super.visitDefaultDeclaration(n);
  }

  visitModuleDeclaration(n: ModuleDeclaration): ModuleDeclaration {
      if (n.type === "ExportDefaultDeclaration" && n.decl.type === "ClassExpression") {
        n.decl = this.visitClassDeclaration(n.decl);
        const res = this.#transformClassExpression(n.decl);
        if (res.type === "CallExpression") {
          const decl: ExportDefaultExpression = {
            type: "ExportDefaultExpression",
            span: n.span,
            expression: assignment({
              span: n.span,
              left: n.decl.identifier ?? identifier({span: n.span, value: "__tmpLreUnnamedClass"}),
              right: res,
              operator: "=",
            })
          };
          return super.visitModuleDeclaration(decl);
        } else {
          return super.visitModuleDeclaration({
            ...n,
            decl: res,
          });
        }
      }
      return super.visitModuleDeclaration(n);
  }

  visitDeclaration(decl: Declaration): Declaration {
    if (decl.type === "ClassDeclaration") {
      decl = this.visitClassDeclaration(decl) as ClassDeclaration;
      return super.visitDeclaration(this.#transformClassDeclaration(decl));
    }
    return super.visitDeclaration(decl);
  }

  visitProgram(n: Program): Program {
    return super.visitProgram(n);
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function classToFunction() {
  return (program: Program) => new ClassToFunction().visitProgram(program);
}

import {
  Argument,
  CallExpression,
  Class,
  ClassExpression,
  ClassMember,
  Constructor,
  Expression,
  ExpressionStatement,
  PrivateProperty,
  Program,
  Span,
  SuperPropExpression,
  TsType,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor";
import member from "./node/expression/member";
import identifier from "./node/identifier";
import { ExpressionWithSpan } from "./types";
import { objectassign } from "./node/expression/objectassign";
import thisexpression from "./node/expression/thisexpression";
import { newexpression } from "./node/expression/newexpression";
import { CONSTRUCTOR_ARG_NAME } from "./utils/paramToVariableDeclarator";
import call from "./node/expression/call";
import { arrayexpression } from "./node/expression/arrayexpression";
import nullliteral from "./node/literal/nullliteral";

const getEmptyCallExpression = (
  span: Span,
  args: Argument[]
): CallExpression => {
  return {
    type: "CallExpression",
    span: span,
    callee: {
      type: "Identifier",
      optional: false,
      value: "",
      span,
    },
    arguments: args,
    typeArguments: undefined,
  };
};

const transformSuperCallToObjectAssign = (
  n: CallExpression,
  currentSuperClass: Expression,
  newAsApply: boolean = false
): CallExpression => {
  const span: Span = (n.callee as ExpressionWithSpan).span;
  n.callee = objectassign(span);
  n.arguments = [
    {
      expression: thisexpression({ span }),
    },
    {
      expression: {
        type: "AssignmentExpression",
        span,
        operator: "=",
        left: member({
          span,
          object: thisexpression({ span }),
          property: {
            type: "PrivateName",
            span,
            id: {
              type: "Identifier",
              span,
              value: PARENT,
              optional: false,
            },
          },
        }),
        right: newAsApply
          ? newexpression({
              callee: call({
                span,
                args: [
                  { expression: currentSuperClass },
                  {
                    expression: arrayexpression({
                      span,
                      elements: [
                        { expression: nullliteral({ span }) },
                        ...n.arguments,
                      ],
                    }),
                  },
                ],
                callee: member({
                  span,
                  object: member({
                    span,
                    object: currentSuperClass,
                    property: identifier({ span, value: "bind" }),
                  }),
                  property: identifier({ span, value: "apply" }),
                }),
              }),
            })
          : newexpression({
              callee: currentSuperClass,
              arguments: n.arguments,
            }),
      },
    },
  ];
  return n;
};

const PARENT = "__parent";

type ClassExtendExpression = Omit<ClassExpression, "superClass"> &
  Required<Pick<ClassExpression, "superClass">>;

class ClassExtend extends Visitor {
  currentSuperClass?: ExpressionWithSpan;
  inConstructor: Boolean = false;
  constructorFound: Boolean = false;
  isSuperConstructorFound = false;
  isInClass = false;

  #addParentProperty(n: ClassExtendExpression) {
    if (
      !n.body.find(
        (m: ClassMember): boolean =>
          m.type === "PrivateProperty" && m.key.id.value === PARENT
      )
    ) {
      const superClass: ExpressionWithSpan = n.superClass as ExpressionWithSpan;
      n.body.push({
        type: "PrivateProperty",
        span: superClass.span,
        key: {
          type: "PrivateName",
          span: superClass.span,
          id: {
            type: "Identifier",
            span: superClass.span,
            value: PARENT,
            optional: false,
          },
        },
        isStatic: false,
      } as PrivateProperty);
    }
  }

  #createSuperCallStmt(superClass: ExpressionWithSpan): ExpressionStatement {
    return {
      type: "ExpressionStatement",
      span: superClass.span,
      expression: transformSuperCallToObjectAssign(
        getEmptyCallExpression(superClass.span, [
          {
            expression: {
              type: "Identifier",
              span: superClass.span,
              value: CONSTRUCTOR_ARG_NAME,
              optional: false,
            },
          },
        ]),
        superClass,
        true
      ),
    };
  }

  visitProgram(n: Program): Program {
    return super.visitProgram(n);
  }

  visitClass<T extends Class>(n: T): T {
    var prevSuperClass = this.currentSuperClass;
    if (n.superClass) {
      this.currentSuperClass = n.superClass as ExpressionWithSpan;
      this.#addParentProperty(n as ClassExtendExpression);
      n.superClass = undefined;
    }
    const res = super.visitClass(n);
    this.currentSuperClass = prevSuperClass;
    return res;
  }

  visitSuperPropExpression(n: SuperPropExpression): Expression {
    const result = member({
      span: n.span,
      object: identifier({
        span: n.obj.span,
        value: PARENT,
      }),
      property: n.property,
    });
    return super.visitMemberExpression(result);
  }

  visitCallExpression(n: CallExpression): Expression {
    if (
      this.inConstructor &&
      this.currentSuperClass &&
      n.callee.type === "Super"
    ) {
      this.isSuperConstructorFound = true;
      transformSuperCallToObjectAssign(n, this.currentSuperClass);
    }
    return super.visitCallExpression(n);
  }
  visitClassBody(members: ClassMember[]): ClassMember[] {
    let prevInConstructor = this.inConstructor;
    let prevConstructorFound = this.constructorFound;
    this.inConstructor = false;
    this.isInClass = true;
    const res = super.visitClassBody(members);
    if (this.currentSuperClass && !this.constructorFound) {
      const span: Span = this.currentSuperClass.span || {};
      res.push({
        type: "Constructor",
        params: [],
        span,
        key: identifier({
          span,
          value: "constructor",
        }),
        body: {
          type: "BlockStatement",
          span,
          stmts: [this.#createSuperCallStmt(this.currentSuperClass)],
        },
        isOptional: false,
      });
    }
    this.isInClass = false;
    this.constructorFound = prevConstructorFound;
    this.inConstructor = prevInConstructor;
    return res;
  }
  visitConstructor(n: Constructor): ClassMember {
    this.inConstructor = true;
    let prevIsSuperConstructorFound = this.isSuperConstructorFound;
    this.constructorFound = true;
    const res = super.visitConstructor(n);
    if (this.currentSuperClass && !this.isSuperConstructorFound) {
      n.body?.stmts.unshift(this.#createSuperCallStmt(this.currentSuperClass));
    }
    this.inConstructor = false;
    this.isSuperConstructorFound = prevIsSuperConstructorFound;
    return res;
  }

  visitTsType(n: TsType): TsType {
    return n;
  }
}

export default function classExtend() {
  return (program: Program) => new ClassExtend().visitProgram(program);
}

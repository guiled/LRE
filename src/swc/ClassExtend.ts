import {
  Argument,
  CallExpression,
  Class,
  ClassExpression,
  ClassMember,
  Constructor,
  Expression,
  NewExpression,
  PrivateProperty,
  Program,
  Span,
  SuperPropExpression,
  ThisExpression,
} from "@swc/core";
import Visitor from "@swc/core/Visitor";
import member from "./node/expression/member";
import identifier from "./node/identifier";

const getEmptyCallExpression = (span: Span): CallExpression => {
  return {
    type: "CallExpression",
    span: span,
    callee: {
      type: "Identifier",
      optional: false,
      value: "",
      span,
    },
    arguments: [],
    typeArguments: undefined,
  };
};

const getObjectAssignCall = (span: Span): Expression => {
  return {
    type: "MemberExpression",
    span: span,
    object: {
      type: "Identifier",
      span: span,
      value: "Object",
      optional: false,
    },
    property: {
      type: "Identifier",
      span: span,
      value: "assign",
      optional: false,
    },
  };
};

const getThisExpression = (span: Span): ThisExpression => {
  return {
    type: "ThisExpression",
    span: span,
  };
};

const getNewExpression = (
  superClass: Expression,
  args: Argument[],
  span: Span
): NewExpression => {
  return {
    type: "NewExpression",
    span: span,
    callee: superClass,
    arguments: args,
  };
};

const transformSuperCallToObjectAssign = (
  n: CallExpression,
  currentSuperClass: Expression
): CallExpression => {
  const span: Span = n.callee.span;
  n.callee = getObjectAssignCall(span);
  n.arguments = [
    {
      expression: getThisExpression(span),
    },
    {
      expression: {
        type: "AssignmentExpression",
        span,
        operator: "=",
        left: member({
          span,
          object: getThisExpression(span),
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
        right: getNewExpression(currentSuperClass, n.arguments, span),
      },
    },
  ];
  return n;
};

const PARENT = "__parent";

type ClassExtendExpression = Omit<ClassExpression, "superClass"> &
  Required<Pick<ClassExpression, "superClass">>;

class ClassExtend extends Visitor {
  currentSuperClass?: Expression;
  inConstructor: Boolean = false;
  isSuperConstructorFound = false;
  isInClass = false;

  #addParentProoperty(n: ClassExtendExpression) {
    if (
      !n.body.find(
        (m: ClassMember): boolean =>
          m.type === "PrivateProperty" && m.key.id.value === PARENT
      )
    ) {
      n.body.push({
        type: "PrivateProperty",
        span: n.superClass.span,
        key: {
          type: "PrivateName",
          span: n.superClass.span,
          id: {
            type: "Identifier",
            span: n.superClass.span,
            value: PARENT,
            optional: false,
          },
        },
        isStatic: false,
      } as PrivateProperty);
    }
  }

  visitProgram(n: Program): Program {
    return super.visitProgram(n);
  }

  visitClass<T extends Class>(n: T): T {
    var prevSuperClass = this.currentSuperClass;
    if (n.superClass) {
      this.currentSuperClass = n.superClass;
      this.#addParentProoperty(n as ClassExtendExpression);
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
    //console.log('super prop', JSON.stringify(n, false, 2))
    //return super.visitSuperPropExpression(n);
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
    this.inConstructor = false;
    this.isInClass = true;
    const res = super.visitClassBody(members);
    this.isInClass = false;
    this.inConstructor = prevInConstructor;
    return res;
  }
  visitConstructor(n: Constructor): ClassMember {
    this.inConstructor = true;
    let prevIsSuperConstructorFound = this.isSuperConstructorFound;
    const res = super.visitConstructor(n);
    if (this.currentSuperClass && !this.isSuperConstructorFound) {
      const span: Span = this.currentSuperClass.span;
      n.body?.stmts.unshift({
        type: "ExpressionStatement",
        span: span,
        expression: transformSuperCallToObjectAssign(
          getEmptyCallExpression(span),
          this.currentSuperClass
        ),
      });
    }
    this.inConstructor = false;
    this.isSuperConstructorFound = prevIsSuperConstructorFound;
    return res;
  }

  /**/
}

export default function classExtend() {
  return (program: Program) => new ClassExtend().visitProgram(program);
}

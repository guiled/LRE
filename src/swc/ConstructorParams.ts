import {
  Program,
  ClassMember,
  VariableDeclaration,
  VariableDeclarator,
  Span,
} from "@swc/core";
import { Visitor } from "@swc/core/Visitor.js";
import {
  CONSTRUCTOR_ARG_NAME,
  getParamToVariableAST,
  paramToVariableDeclarator,
} from "./utils/paramToVariableDeclarator";

class ConstructorParams extends Visitor {
  parameterModified: boolean = false;

  visitProgram(n: Program): Program {
    const res = super.visitProgram(n);
    if (this.parameterModified) {
      n.body.unshift(getParamToVariableAST());
    }
    return res;
  }

  visitClassBody(members: ClassMember[]): ClassMember[] {
    members.forEach((m) => {
      if (m.type === "Constructor") {
        const body = m.body;

        const declarations: VariableDeclarator[] = [];
        const declarationsSpan: Span = {
          ctxt: -1,
          start: -1,
          end: -1,
        };
        m.params.forEach((p, index) => {
          this.parameterModified = true;
          if (declarationsSpan.ctxt === -1) {
            declarationsSpan.ctxt = p.span.ctxt;
          }
          if (
            declarationsSpan.start === -1 ||
            p.span.start < declarationsSpan.start
          ) {
            declarationsSpan.start = p.span.start;
          }
          if (
            declarationsSpan.end === -1 ||
            p.span.end > declarationsSpan.end
          ) {
            declarationsSpan.end = p.span.end;
          }
          declarations.push(paramToVariableDeclarator(p, index));
        });
        m.params = [
          {
            type: "Parameter",
            span: declarationsSpan,
            decorators: [],
            pat: {
              type: "Identifier",
              span: declarationsSpan,
              value: CONSTRUCTOR_ARG_NAME,
              optional: false,
              typeAnnotation: null,
            },
          },
        ];
        const d: VariableDeclaration = {
          type: "VariableDeclaration",
          span: declarationsSpan,
          kind: "let",
          declare: false,
          declarations: declarations,
        };
        body?.stmts.unshift(d);
      }
    });
    return members;
  }
}

export default function constructorParams() {
  return (program: Program) => new ConstructorParams().visitProgram(program);
};

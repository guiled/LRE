import { Span, VariableDeclaration, VariableDeclarator } from "@swc/core";
import { PatternWithSpan } from "../../types";

type VARIABLE_PARAM = {
  span?: Span;
  kind?: VariableDeclaration["kind"];
  declare?: VariableDeclaration["declare"];
  definite?: VariableDeclarator["definite"];
  id: PatternWithSpan,
  init?: VariableDeclarator["init"]
};

export default function onevariable({
  span,
  id,
  init = undefined,
  definite = false,
  declare = false,
  kind = "var",
}: VARIABLE_PARAM): VariableDeclaration {
  return {
    type: "VariableDeclaration",
    span: span ?? id.span,
    kind,
    declare,
    declarations: [{
      type: "VariableDeclarator",
      span: span ?? id.span,
      id,
      init,
      definite,
    }],
  };
};

import { Span, VariableDeclaration, VariableDeclarator } from "@swc/core";

type VARIABLE_PARAM = {
  span: Span;
  kind?: VariableDeclaration["kind"];
  declare?: VariableDeclaration["declare"];
  definite?: VariableDeclarator["definite"];
  id: VariableDeclarator["id"],
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
    span,
    kind,
    declare,
    declarations: [{
      type: "VariableDeclarator",
      span,
      id,
      init,
      definite,
    }],
  };
};

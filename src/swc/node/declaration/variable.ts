import { VariableDeclaration } from "@swc/core";

type VARIABLE_PARAM = {
  span: Span;
  kind?: VariableDeclaration["kind"];
  declare?: VariableDeclaration["declare"];
  declarations: VariableDeclaration["declarations"];
};

export default ({
  span,
  declarations,
  kind = "var",
  declare = false,
}: VARIABLE_PARAM): VariableDeclaration => {
  return {
    type: "VariableDeclaration",
    span,
    kind,
    declare,
    declarations,
  };
};

import { Span, VariableDeclaration } from "@swc/core";

type VARIABLE_PARAM = {
  span?: Span;
  kind?: VariableDeclaration["kind"];
  declare?: VariableDeclaration["declare"];
  declarations: VariableDeclaration["declarations"];
};

// ts-unused-exports:disable-next-line
export function variable({
  declarations,
  span,
  kind = "var",
  declare = false,
}: VARIABLE_PARAM): VariableDeclaration {
  return {
    type: "VariableDeclaration",
    span: span ?? declarations[0].span,
    kind,
    declare,
    declarations,
  };
}

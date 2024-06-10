import { BindingIdentifier, Identifier, Span } from "@swc/core";

type Identifier_Param = {
  span: Span;
  optional?: BindingIdentifier["optional"];
  typeAnnotation?: BindingIdentifier["typeAnnotation"];
};

export default function undefinedidentifier({
  span,
  optional = false,
  typeAnnotation = undefined,
}: Identifier_Param): BindingIdentifier | Identifier {
  if (typeAnnotation) {
    return {
      type: "Identifier" as BindingIdentifier["type"],
      span,
      value: "undefined",
      optional,
      typeAnnotation,
    };
  } else {
    return {
      type: "Identifier" as Identifier["type"],
      span,
      value: "undefined",
      optional,
    };
  }
}

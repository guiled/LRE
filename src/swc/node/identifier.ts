import { BindingIdentifier, Identifier, Span } from "@swc/core";

type Identifier_Param = {
  span: Span;
  value: BindingIdentifier["value"];
  optional?: BindingIdentifier["optional"];
  typeAnnotation?: BindingIdentifier["typeAnnotation"];
};

export default ({
  span,
  value,
  optional = false,
  typeAnnotation = undefined,
}: Identifier_Param): BindingIdentifier | Identifier => {
  if (typeAnnotation) {
    return {
      type: "Identifier" as BindingIdentifier["type"],
      span,
      value,
      optional,
      typeAnnotation,
    };
  } else {
    return {
      type: "Identifier" as Identifier["type"],
      span,
      value,
      optional,
    };
  }
};

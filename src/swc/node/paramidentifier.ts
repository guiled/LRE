import { Identifier, Param } from "@swc/core";

export function paramidentifier({
  span,
  param,
}: {
  span: Param["span"];
  param: Identifier;
}): Param {
  return {
    span,
    type: "Parameter",
    pat: param,
  };
}

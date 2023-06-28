import { Identifier, Param } from "@swc/core";
import identifier from "./identifier";

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

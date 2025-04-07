import { isNaN } from "./isNaN";
import { stringify } from "./stringify";
import { structuredClone } from "./structuredClone";
import { throwError, newError } from "./throwError";
import { virtualCall } from "./virtualcall";

export const errorHandler = {
  throwError,
  newError,
};

export const globals = {
  isNaN,
  throwError,
  newError,
  structuredClone,
  stringify,
  virtualCall,
};

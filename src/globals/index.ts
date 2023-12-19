import { isNaN } from "./isNaN";
import { stringify } from "./stringify";
import { structuredClone } from "./structuredClone";
import { throwError, newError } from "./throwError";
import { virtualCall, loggedCall } from "./virtualcall";

export const globals = {
  isNaN,
  throwError,
  newError,
  structuredClone,
  stringify,
  virtualCall,
  loggedCall,
};

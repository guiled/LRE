import { isNaN } from "./isNaN";
import { mt_rand } from "./mt_rand";
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
  mt_rand,
};

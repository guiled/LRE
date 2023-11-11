import { isNaN } from "./isNaN";
import { stringify } from "./stringify";
import { structuredClone } from "./structuredClone";
import { throwError, newError } from "./throwError";

export const globals = {
  isNaN,
  throwError,
  newError,
  structuredClone,
  stringify,
};

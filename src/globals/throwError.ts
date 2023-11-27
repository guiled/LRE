import { Error } from "../error";

export const throwError = function (err: any): undefined {
  lastException = err;
  /* @ts-expect-error intentional error */
  null();
};

export const newError = function (message: string = ""): Error {
  return new Error(message);
}
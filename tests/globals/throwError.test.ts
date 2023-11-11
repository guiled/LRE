import { Error } from "../../src/error";
import { newError, throwError } from "../../src/globals/throwError";

// export const newError = function (message: string = ""): Error {
//   return new Error(message);
// }

global.lastException = null;

describe("throwError tests", () => {
  test("throwError", () => {
    expect(lastException).toBeNull();
    const a = {};
    expect(() => {
      throwError(a);
    }).toThrow();
    expect(lastException).toStrictEqual(a);
  });
});

describe("newError test", () => {
  test("newError", () => {
    const msg = "error message";
    const err = newError(msg);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toStrictEqual(msg);
  });
});

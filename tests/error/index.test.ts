import { Error } from "../../src/error";
import { LRE } from "../../src/lre";
import { modeHandlerMock } from "../mock/modeHandler.mock";

jest.mock("../../src/lre");

global.lre = new LRE(modeHandlerMock);
global.errExclFirstLine = 100;
global.errExclLastLine = 150;

describe("Test error handler", () => {
  test("Single line error", () => {
    const message = "This is an error";
    const err = new Error(message);
    expect(err.toString()).toContain(message);
    expect(err.message).toStrictEqual(message);
    expect(err.lineNumber).toStrictEqual(0);
    expect(err.columnNumber).toStrictEqual(0);
    err.thrownBy({
      name: "emptyError",
      message: "message",
    });
    expect(err.lineNumber).toStrictEqual(0);
    expect(err.columnNumber).toStrictEqual(0);
    const err2 = new Error(message, {});
    expect(err2.toString()).toContain(message);
    const err3 = new Error(message, { cause: {} });
    expect(err3.toString()).toContain(message);
  });

  test("Trace analysis", () => {
    const trace: LetsRole.Error = {
      name: "error",
      message: "err",
      trace: [
        {
          type: "not excluded",
          loc: {
            start: {
              line: 12,
              column: 1,
            },
            end: {
              line: 12,
              column: 12,
            },
          },
        },
      ],
    };
    const message = "This is an error";
    const err = new Error(message);
    expect(err.thrownBy(trace)).toStrictEqual(err);
    expect(err.toString()).toContain(message);
    expect(err.message).toStrictEqual(message);
    expect(err.lineNumber).toStrictEqual(12);
    expect(err.columnNumber).toStrictEqual(1);
    const err2 = new Error("second", { cause: err });
    expect(err2.message).toStrictEqual("second");
    expect(err2.lineNumber).toStrictEqual(12);
    expect(err2.columnNumber).toStrictEqual(1);
  });

  test("Error with excluded trace", () => {
    const trace = {
      name: "error",
      message: "err",
      trace: [
        {
          type: "not excluded",
          loc: {
            start: {
              line: 122,
              column: 1,
            },
            end: {
              line: 122,
              column: 12,
            },
          },
        },
        {
          type: "CallExpression",
          callee: {
            name: "throwError",
          },
          loc: {
            start: {
              line: 120,
              column: 1,
            },
            end: {
              line: 140,
              column: 12,
            },
          },
        },
        {
          type: "not excluded",
          loc: {
            start: {
              line: 12,
              column: 1,
            },
            end: {
              line: 14,
              column: 12,
            },
          },
        },
      ],
    };
    const err = new Error("err", { cause: trace });
    expect(err.lineNumber).toStrictEqual(12);
    expect(err.columnNumber).toStrictEqual(1);
    lre.__debug = true;
    const err2 = new Error("err2").thrownBy(new Error("err", { cause: trace }));
    expect(err2.lineNumber).toStrictEqual(120);
    expect(err2.columnNumber).toStrictEqual(1);
  });

  test("Error in debug with no throwError", () => {
    const trace = {
      name: "error",
      message: "err",
      trace: [
        {
          type: "inside lre",
          callee: {
            name: "throwError",
          },
          loc: {
            start: {
              line: 120,
              column: 1,
            },
            end: {
              line: 140,
              column: 12,
            },
          },
        },
        {
          type: "inside lre",
          loc: {
            start: {
              line: 128,
              column: 1,
            },
            end: {
              line: 129,
              column: 12,
            },
          },
        },
      ],
    };
    lre.__debug = true;
    const err = new Error("err", { cause: trace });
    expect(err.lineNumber).toStrictEqual(120);
    expect(err.columnNumber).toStrictEqual(1);
  });
});

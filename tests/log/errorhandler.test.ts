import { Logger } from "../../src/log";
import { handleError } from "../../src/log/errorhandler";

jest.mock("../../src/log");

global.lre = new Logger();
global.errExclFirstLine = 100;
global.errExclLastLine = 150;

describe("Test error handler", () => {
  let err: LetsRole.Error;
  beforeAll(() => {
    err = {
      name: "error name",
      message: "error message",
    };
  });

  test("No trace error is logged", () => {
    expect(global.lre.error).toBeCalledTimes(0);
    handleError(err);
    expect(global.lre.error).toBeCalledTimes(1);
  });

  test("Single line error", () => {
    err.trace = [
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
    ];
    expect(global.lre.error).toBeCalledTimes(0);
    handleError(err);
    expect(global.lre.error).toBeCalledTimes(1);
  });

  test("Multiple line error", () => {
    err.trace = [
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
    ];
    expect(global.lre.error).toBeCalledTimes(0);
    handleError(err);
    expect(global.lre.error).toBeCalledTimes(1);
  });

  test("Error with excluded trace", () => {
    err.trace = [
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
    ];
    handleError(err);
    const loggedErrorString: string = (global.lre.error as jest.Mock).mock
      .calls[0][0];
    err.trace.unshift({
      type: "excluded",
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
    });
    (global.lre.error as jest.Mock).mockClear();
    expect(global.lre.error).toBeCalledTimes(0);
    handleError(err);
    expect(global.lre.error).toBeCalledTimes(1);
    expect((global.lre.error as jest.Mock).mock.calls[0][0]).toStrictEqual(loggedErrorString);
    global.lre.__debug = true;
    (global.lre.error as jest.Mock).mockClear();
    expect(global.lre.error).toBeCalledTimes(0);
    handleError(err);
    expect(global.lre.error).toBeCalledTimes(1);
    expect((global.lre.error as jest.Mock).mock.calls[0][0]).not.toStrictEqual(loggedErrorString);
  });

  test("Handle error with additional information", () => {
    expect(global.lre.error).toBeCalledTimes(0);
    handleError(err, "additional information");
    expect(global.lre.error).toBeCalledTimes(2);
  });
});

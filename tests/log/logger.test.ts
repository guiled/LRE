import { Logger } from "../../src/log";

global.log = jest.fn();

describe("Test all log method", () => {
  test("Check all method", () => {
    const logger = new Logger();
    logger.setLogLevel("all");
    let nbCall = -1;
    expect(global.log).toHaveBeenCalledTimes(++nbCall);
    logger.error("this is an error");
    expect(global.log).toHaveBeenCalledTimes(++nbCall);
    logger.warn("this is a warning");
    expect(global.log).toHaveBeenCalledTimes(++nbCall);
    logger.trace("this is a trace");
    expect(global.log).toHaveBeenCalledTimes(++nbCall);
    logger.log("this is a log");
    expect(global.log).toHaveBeenCalledTimes(++nbCall);
  });

  test("Check no log", () => {
    const logger = new Logger();
    logger.setLogLevel("none");
    logger.error("this is an error");
    logger.warn("this is a warning");
    logger.trace("this is a trace");
    logger.log("this is a log");
    expect(global.log).toHaveBeenCalledTimes(0);
  });

  test("Check log only errors", () => {
    const logger = new Logger();
    logger.setLogLevel("error");
    expect(global.log).toHaveBeenCalledTimes(0);
    logger.error("this is an error");
    expect(global.log).toHaveBeenCalledTimes(1);
    logger.warn("this is a warning");
    logger.trace("this is a trace");
    logger.log("this is a log");
    expect(global.log).toHaveBeenCalledTimes(1);
  });

  test("Check log errors and warnings", () => {
    const logger = new Logger();
    logger.setLogLevel("warn");
    expect(global.log).toHaveBeenCalledTimes(0);
    logger.error("this is an error");
    expect(global.log).toHaveBeenCalledTimes(1);
    logger.warn("this is a warning");
    expect(global.log).toHaveBeenCalledTimes(2);
    logger.trace("this is a trace");
    logger.log("this is a log");
    expect(global.log).toHaveBeenCalledTimes(2);
  });

  test("Check log errors, warnings and trace… so all", () => {
    const logger = new Logger();
    logger.setLogLevel("trace");
    expect(global.log).toHaveBeenCalledTimes(0);
    logger.error("this is an error");
    expect(global.log).toHaveBeenCalledTimes(1);
    logger.warn("this is a warning");
    expect(global.log).toHaveBeenCalledTimes(2);
    logger.trace("this is a trace");
    expect(global.log).toHaveBeenCalledTimes(3);
    logger.log("this is a log");
    expect(global.log).toHaveBeenCalledTimes(4);
  });
});

describe("Log many args", () => {
  test("Log many args", () => {
    const logger = new Logger();
    logger.setLogLevel("all");
    expect(global.log).toHaveBeenCalledTimes(0);
    const firstParam = "First param";
    const secondParam = "2";
    const thirdParam = "third";
    logger.log(firstParam, secondParam, thirdParam);
    expect(global.log).toHaveBeenCalledTimes(3);
    expect((global.log as jest.Mock).mock.calls[0][0]).toContain(firstParam);
    expect((global.log as jest.Mock).mock.calls[1][0]).toContain(secondParam);
    expect((global.log as jest.Mock).mock.calls[2][0]).toContain(thirdParam);
  });

  test("Log with non string args", () => {
    const logger = new Logger();
    let arg: unknown = 42;
    logger.setLogLevel("all");
    expect(global.log).toHaveBeenCalledTimes(0);
    logger.log(arg);
    expect(global.log).toHaveBeenCalledTimes(1);

    (global.log as jest.Mock).mockClear();
    arg = [42];
    logger.log(arg);
    expect(global.log).toHaveBeenCalledTimes(2);
    expect((global.log as jest.Mock).mock.calls[1][0]).toStrictEqual(arg);

    (global.log as jest.Mock).mockClear();
    arg = { a: 42 };
    logger.log(arg);
    expect(global.log).toHaveBeenCalledTimes(2);
    expect((global.log as jest.Mock).mock.calls[1][0]).toStrictEqual(arg);
  });

  test("Unknown log level", () => {
    const logger = new Logger();
    const arg: unknown = 42;
    /* @ts-expect-error because user can do that */
    logger.setLogLevel("unknown");
    expect(global.log).toHaveBeenCalledTimes(0);
    logger.log(arg);
    expect(global.log).toHaveBeenCalledTimes(0);
  });
});

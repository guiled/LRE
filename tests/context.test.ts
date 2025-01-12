import { Context } from "../src/context";

describe("LRE Context mode", () => {
  test("default context is real", () => {
    const context = new Context();

    expect(context.getMode()).toBe("real");
  });

  test("Context mode can be changed", () => {
    const context = new Context();

    expect(context.setMode("virtual")).toBe(context);
    expect(context.getMode()).toBe("virtual");
    expect(context.setMode("real")).toBe(context);
    expect(context.getMode()).toBe("real");
  });
});

describe("Context access logs", () => {
  const allLogTypes: Array<ProxyModeHandlerLogType> = [
    "class",
    "cmp",
    "data",
    "rawValue",
    "text",
    "value",
    "virtualValue",
    "visible",
  ];

  test.each(allLogTypes)(
    "Access logs are all empty at start for %s",
    (logType: ProxyModeHandlerLogType) => {
      const context = new Context();
      context.enableAccessLog();

      expect(context.getAccessLog(logType)).toStrictEqual([]);
      expect(context.getPreviousAccessLog(logType)).toStrictEqual([]);

      const logMessage: [string, string] = [
        "123",
        "This is log type " + logType,
      ];

      expect(context.logAccess(logType, logMessage)).toBe(context);
      expect(context.getAccessLog(logType)).toStrictEqual([logMessage]);
    },
  );

  test("Reset access log", () => {
    const context = new Context();
    allLogTypes.forEach((logType) =>
      context.logAccess(logType, ["123", "Message"]),
    );
    context.popLogContext();
    allLogTypes.forEach((logType) =>
      expect(context.getAccessLog(logType)).toStrictEqual([]),
    );
  });

  test("Disable log access", () => {
    const context = new Context();
    context.enableAccessLog();
    context.logAccess("value", ["123", "a"]);
    context.disableAccessLog();
    context.logAccess("value", ["123", "b"]);
    context.enableAccessLog();
    context.logAccess("value", ["123", "c"]);

    expect(context.getAccessLog("value")).toStrictEqual([
      ["123", "a"],
      ["123", "c"],
    ]);
  });

  test("Access log is reset mode switch", () => {
    const context = new Context();
    context.enableAccessLog();
    allLogTypes.forEach((logType) =>
      context.logAccess(logType, ["123", "Message"]),
    );
    allLogTypes.forEach((logType) =>
      expect(context.getAccessLog(logType)).not.toStrictEqual([]),
    );
    context.setMode("real");
    const saveLogs: Partial<ContextLog> = {};
    allLogTypes.forEach((logType) => {
      saveLogs[logType] = context.getAccessLog(logType);

      expect(saveLogs[logType]).not.toStrictEqual([]);
    });
    context.setMode("virtual");
    allLogTypes.forEach((logType) => {
      expect(context.getAccessLog(logType)).toStrictEqual([]);
      expect(context.getPreviousAccessLog(logType)).toBe(saveLogs[logType]);
    });
    allLogTypes.forEach((logType) =>
      context.logAccess(logType, ["123", "Message"]),
    );
    allLogTypes.forEach((logType) =>
      expect(context.getAccessLog(logType)).not.toStrictEqual([]),
    );
    context.setMode("virtual");
    allLogTypes.forEach((logType) =>
      expect(context.getAccessLog(logType)).not.toStrictEqual([]),
    );
    context.setMode("real");
    allLogTypes.forEach((logType) =>
      expect(context.getAccessLog(logType)).toStrictEqual([]),
    );
  });
});

describe("Context save", () => {
  test("default context is undefined", () => {
    const context = new Context();

    expect(context.getContext("test1")).toBeUndefined();
  });

  test("set context works only in virtual", () => {
    const context = new Context();

    expect(context.setContext("test1", "a")).toBe(context);
    expect(context.getContext("test1")).toBeUndefined();

    context.setMode("virtual");

    expect(context.setContext("test1", "a")).toBe(context);
    expect(context.getContext("test1")).toBe("a");
  });

  test("Context is emptied when going back to real mode", () => {
    const context = new Context();
    context.setMode("virtual");

    expect(context.setContext("test1", "a")).toBe(context);
    expect(context.getContext("test1")).toBe("a");

    context.setMode("virtual");

    expect(context.getContext("test1")).toBe("a");

    context.setMode("real");

    expect(context.getContext("test1")).toBeUndefined();

    context.setMode("virtual");

    expect(context.getContext("test1")).toBeUndefined();
  });
});

describe("Context callback call", () => {
  let context: Context;

  beforeEach(() => {
    context = new Context();
  });

  test("Callback is called", () => {
    const fn = jest.fn();

    context.call(true, fn);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("Enabled state is restored", () => {
    let enabled: boolean;

    const fn = (): void => {
      enabled = context.getLogEnabled();
    };

    expect(context.getLogEnabled()).toBeFalsy();

    context.call(true, fn);

    expect(enabled!).toBeTruthy();
    expect(context.getLogEnabled()).toBeFalsy();

    context.setLogEnabled(true);

    expect(context.getLogEnabled()).toBeTruthy();

    context.call(true, fn);

    expect(enabled!).toBeTruthy();
    expect(context.getLogEnabled()).toBeTruthy();

    context.call(false, fn);

    expect(enabled!).toBeFalsy();
    expect(context.getLogEnabled()).toBeTruthy();
  });

  test("Enabled state is restored with nested calls", () => {
    let before1, after1, after2: boolean;

    const fn = jest.fn(() => {
      before1 = context.getLogEnabled();
      context.call(false, () => {
        after2 = context.getLogEnabled();
      });
      after1 = context.getLogEnabled();
    });

    expect(context.getLogEnabled()).toBeFalsy();

    context.call(true, fn);

    expect(before1!).toBeTruthy();
    expect(after1!).toBeTruthy();
    expect(after2!).toBeFalsy();

    expect(context.getLogEnabled()).toBeFalsy();
  });

  test("Returns the result and an empty access log when no log", () => {
    const result = "theResult";

    const fn = (): string => {
      context.logAccess("value", ["123", "a"]);
      return result;
    };

    const res = context.call(false, fn);

    expect(res).toHaveLength(2);
    expect(res[0]).toBe(result);
    expect(res[1]).toStrictEqual({});
  });

  test("Returns access log", () => {
    const result = "theResult";

    const mockDataProvider: IDataProvider = {} as IDataProvider;

    const fn = (): string => {
      context.logAccess("value", ["123", "a"]);
      context.logAccess("value", ["123", "b"]);
      context.logAccess("value", ["123", "c"]);
      context.logAccess("class", ["123", "a"]);
      context.logAccess("cmp", ["123", "a"]);
      context.logAccess("data", ["123", "a"]);
      context.logAccess("provider", mockDataProvider);
      context.logAccess("rawValue", ["123", "a"]);
      context.logAccess("text", ["123", "a"]);
      context.logAccess("virtualValue", ["123", "a"]);
      context.logAccess("visible", ["123", "a"]);
      return result;
    };

    const res = context.call(true, fn);

    expect(res).toHaveLength(2);
    expect(res[1]).toStrictEqual({
      value: [
        ["123", "a"],
        ["123", "b"],
        ["123", "c"],
      ],
      class: [["123", "a"]],
      cmp: [["123", "a"]],
      data: [["123", "a"]],
      provider: [mockDataProvider],
      rawValue: [["123", "a"]],
      text: [["123", "a"]],
      virtualValue: [["123", "a"]],
      visible: [["123", "a"]],
    });
  });

  test("Returns access log with nested calls", () => {
    const fn = jest.fn(() => {
      context.logAccess("value", ["123", "b"]);
    });
    const result = "theResult";

    const res = context.call(true, () => {
      context.logAccess("value", ["123", "a"]);
      context.call(false, fn);
      context.logAccess("value", ["123", "c"]);

      return result;
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(res).toHaveLength(2);
    expect(res[0]).toBe(result);
    expect(res[1]).toStrictEqual({
      value: [
        ["123", "a"],
        ["123", "c"],
      ],
    });
  });
});

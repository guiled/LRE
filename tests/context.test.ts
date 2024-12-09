import { Context } from "../src/context";

describe("LRE Context mode", () => {
  test("default context is real", () => {
    const subject = new Context();
    expect(subject.getMode()).toBe("real");
  });

  test("Context mode can be changed", () => {
    const subject = new Context();
    expect(subject.setMode("virtual")).toBe(subject);
    expect(subject.getMode()).toBe("virtual");
    expect(subject.setMode("real")).toBe(subject);
    expect(subject.getMode()).toBe("real");
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
      const subject = new Context();
      expect(subject.getAccessLog(logType)).toStrictEqual([]);
      expect(subject.getPreviousAccessLog(logType)).toStrictEqual([]);
      const logMessage: [string, string] = [
        "123",
        "This is log type " + logType,
      ];
      expect(subject.logAccess(logType, logMessage)).toBe(subject);
      expect(subject.getAccessLog(logType)).toStrictEqual([logMessage]);
    },
  );

  test("Reset access log", () => {
    const subject = new Context();
    allLogTypes.forEach((logType) =>
      subject.logAccess(logType, ["123", "Message"]),
    );
    subject.popLogContext();
    allLogTypes.forEach((logType) =>
      expect(subject.getAccessLog(logType)).toStrictEqual([]),
    );
  });

  test("Disable log access", () => {
    const subject = new Context();
    subject.logAccess("value", ["123", "a"]);
    subject.disableAccessLog();
    subject.logAccess("value", ["123", "b"]);
    subject.enableAccessLog();
    subject.logAccess("value", ["123", "c"]);
    expect(subject.getAccessLog("value")).toStrictEqual([
      ["123", "a"],
      ["123", "c"],
    ]);
  });

  test("Access log is reset mode switch", () => {
    const subject = new Context();
    allLogTypes.forEach((logType) =>
      subject.logAccess(logType, ["123", "Message"]),
    );
    allLogTypes.forEach((logType) =>
      expect(subject.getAccessLog(logType)).not.toStrictEqual([]),
    );
    subject.setMode("real");
    const saveLogs: Partial<ContextLog> = {};
    allLogTypes.forEach((logType) => {
      saveLogs[logType] = subject.getAccessLog(logType);
      expect(saveLogs[logType]).not.toStrictEqual([]);
    });
    subject.setMode("virtual");
    allLogTypes.forEach((logType) => {
      expect(subject.getAccessLog(logType)).toStrictEqual([]);
      expect(subject.getPreviousAccessLog(logType)).toBe(saveLogs[logType]);
    });
    allLogTypes.forEach((logType) =>
      subject.logAccess(logType, ["123", "Message"]),
    );
    allLogTypes.forEach((logType) =>
      expect(subject.getAccessLog(logType)).not.toStrictEqual([]),
    );
    subject.setMode("virtual");
    allLogTypes.forEach((logType) =>
      expect(subject.getAccessLog(logType)).not.toStrictEqual([]),
    );
    subject.setMode("real");
    allLogTypes.forEach((logType) =>
      expect(subject.getAccessLog(logType)).toStrictEqual([]),
    );
  });
});

describe("Context save", () => {
  test("default context is undefined", () => {
    const subject = new Context();
    expect(subject.getContext("test1")).toBeUndefined();
  });

  test("set context works only in virtual", () => {
    const subject = new Context();
    expect(subject.setContext("test1", "a")).toBe(subject);
    expect(subject.getContext("test1")).toBeUndefined();
    subject.setMode("virtual");
    expect(subject.setContext("test1", "a")).toBe(subject);
    expect(subject.getContext("test1")).toBe("a");
  });

  test("Context is emptied when going back to real mode", () => {
    const subject = new Context();
    subject.setMode("virtual");
    expect(subject.setContext("test1", "a")).toBe(subject);
    expect(subject.getContext("test1")).toBe("a");
    subject.setMode("virtual");
    expect(subject.getContext("test1")).toBe("a");
    subject.setMode("real");
    expect(subject.getContext("test1")).toBeUndefined();
    subject.setMode("virtual");
    expect(subject.getContext("test1")).toBeUndefined();
  });
});

type TestCb<T = void> = () => T;
type TestLogs = Array<string>;
type TestSuiteResult = {
  logs: TestLogs;
  success: boolean;
};

type CbList = Array<TestCb>;

type TestItem = {
  type: "describe" | "test";
  name: string;
  run: TestCb;
};

type RunSuite = {
  lreBeforeEach: CbList;
  lreAfterEach: CbList;
  logPrefix: string;
};

type MockedFunction<T extends (...args: any[]) => any> = T & {
  mock: true;
  called: number;
  clear: () => void;
};

lreBeforeAll = () => undefined;

lreBeforeEach = () => undefined;

lreAfterAll = () => undefined;

lreAfterEach = () => undefined;

lreDescribe = () => undefined;

lreTest = () => undefined;

const runTestSuiteInCb = (
  name: string,
  cb: TestCb,
  context: RunSuite,
): TestSuiteResult => {
  const saves = {
    lreBeforeAll,
    lreBeforeEach,
    lreAfterAll,
    lreAfterEach,
    lreDescribe,
    lreTest,
  };
  const lreBeforeAllCb: CbList = [];
  const lreAfterAllCb: CbList = [];
  const suite: RunSuite = {
    lreBeforeEach: [...context.lreBeforeEach],
    lreAfterEach: [] as CbList,
    logPrefix: "  " + context.logPrefix,
  };
  const actions: Array<TestItem> = [];

  lreBeforeAll = (callback: () => void) => {
    lreBeforeAllCb.push(callback);
  };

  lreAfterAll = (callback: () => void) => {
    lreAfterAllCb.push(callback);
  };

  lreBeforeEach = (callback: () => void) => {
    suite.lreBeforeEach.push(callback);
  };

  lreAfterEach = (callback: () => void) => {
    suite.lreAfterEach.push(callback);
  };

  lreDescribe = (name: string, runDescribe: () => void) => {
    actions.push({ type: "describe", name, run: runDescribe });
  };

  lreTest = (name: string, runTest: () => void) => {
    actions.push({ type: "test", name, run: runTest });
  };

  const logs: Array<string> = [];

  try {
    cb();
  } catch (e) {
    logs.push(
      `${context.logPrefix}❌ Error in test suite preparation "${name}" "${e}"`,
    );
  }

  suite.lreAfterEach = suite.lreAfterEach.concat(context.lreAfterEach);

  let newLogs: Array<string> = [];
  let hasError = false;

  try {
    lreBeforeAllCb.forEach((cb) => cb());
    newLogs = actions.reduce((acc: Array<string>, { type, name, run }) => {
      const currentLog: Array<string> = [];

      if (type === "describe") {
        try {
          const result = runTestSuiteInCb(name, run, suite);
          hasError = hasError || !result.success;
          currentLog.push(...result.logs);
        } catch (e) {
          hasError = true;
          currentLog.push(
            `${context.logPrefix}❌ Error in suite "${name}" "${e}"`,
          );
        }
      } else {
        try {
          suite.lreBeforeEach.forEach((cb) => cb());
          run();
          suite.lreAfterEach.forEach((cb) => cb());
          currentLog.push(`${context.logPrefix}  ✅ Test "${name}" passed`);
        } catch (e) {
          hasError = true;
          currentLog.push(
            `${context.logPrefix}  ❌ Error in test "${name}" "${e}"`,
          );
        }
      }

      acc.push(...currentLog);
      return acc;
    }, [] as Array<string>);
    lreAfterAllCb.forEach((cb) => cb());
  } catch (e) {
    logs.push(`${context.logPrefix}❌ Suite "${name}" failed "${e}"`);
  }

  if (!hasError) {
    logs.push(`${context.logPrefix}✅ Suite "${name}" passed`);
  } else {
    logs.push(`${context.logPrefix}❌ Suite "${name}" failed`);
  }

  logs.push(...newLogs);

  lreBeforeAll = saves.lreBeforeAll;

  lreBeforeEach = saves.lreBeforeEach;

  lreAfterAll = saves.lreAfterAll;

  lreAfterEach = saves.lreAfterEach;

  lreDescribe = saves.lreDescribe;

  lreTest = saves.lreTest;

  return {
    logs,
    success: !hasError,
  };
};

export const tester = (
  name: string,
  runFile: TestCb,
): TestCb<TestSuiteResult> => {
  return () =>
    runTestSuiteInCb(name, runFile, {
      lreBeforeEach: [],
      lreAfterEach: [],
      logPrefix: "",
    });
};

const mocks: Array<MockedFunction<Callback>> = [];

lreMock = <T extends (...args: any[]) => any>(
  cb: T = (() => undefined) as T,
): MockedFunction<T> => {
  const fn: MockedFunction<T> = function (...args: any[]): ReturnType<T> {
    fn.called++;
    return cb.apply(undefined, args);
  } as MockedFunction<T>;
  fn.mock = true;
  fn.called = 0;
  fn.clear = function () {
    this.called = 0;
  }.bind(fn);
  mocks.push(fn);

  return fn;
};

lreClearAllMocks = () => {
  mocks.forEach((fn) => fn.clear());
};

lreSpyOn = (obj: any, name: string): void => {
  if (!Object.prototype.hasOwnProperty.call(obj, name)) {
    throw new Error(`Cannot spy on ${name} because it is not a function`);
  }

  obj[name] = lreMock(obj[name]);
};

type ExpectFailedMessages = {
  general?: string;
  failed: string;
  not: string;
};

const messages: Record<TExpectTests, ExpectFailedMessages> = {
  toBe: {
    general: "Expected value to be a mock but it was not",
    failed: "Expected function to be called but it was not",
    not: "Expected function not to be called but it was",
  },
  toHaveBeenCalled: {
    general: "Expected value to be a mock but it was not",
    failed: "Expected function to be called but it was not",
    not: "Expected function not to be called but it was",
  },
  toHaveBeenCalledTimes: {
    general: "Expected value to be a mock but it was not",
    failed:
      "Expected function to be called $1 times but it was called $2 times",
    not: "Expected function not to be called $1 times but it was",
  },
  toBeTruthy: {
    failed: "`Expected $2 to be truthy",
    not: "`Expected $2 to be false",
  },
  toBeFalsy: {
    failed: "`Expected $2 to be falsy",
    not: "`Expected $2 to be truthy",
  },
};

const getExpectTests = (
  value: any,
): Record<TExpectTests, Callback<boolean>> => ({
  toBe: (expected: unknown): boolean => {
    return value !== expected;
  },
  toHaveBeenCalled: () => {
    return value.called > 0;
  },
  toHaveBeenCalledTimes: (times: number) => {
    return value.called === times;
  },
  toBeFalsy: () => {
    return !value;
  },
  toBeTruthy: () => {
    return !!value;
  },
});

const generateExpectMessage = (message: string, args: Array<any>): string => {
  return message.replace(/\$(\d+)/g, (_, index) => {
    return args[Number(index) - 1];
  });
};

const generateExpectFunctions = (
  tests: Record<TExpectTests, Callback<boolean>>,
  value: any,
  not: boolean,
) => {
  return (acc: TExpect, methodName: TExpectTests) => {
    acc[methodName] = (...args: any[]) => {
      const test = tests[methodName];
      const message = messages[methodName];

      const result = test.apply(undefined, args);

      if (result === not) {
        throw new Error(
          generateExpectMessage(not ? message.not : message.failed, [
            value,
            ...args,
          ]),
        );
      }
    };

    return acc;
  };
};

lreExpect = (value: any): TExpect => {
  const tests = getExpectTests(value);
  const methodName: Array<TExpectTests> = Object.keys(
    tests,
  ) as Array<TExpectTests>;
  const methods = methodName.reduce(
    generateExpectFunctions(tests, value, false),
    {} as TExpect,
  );
  methods.not = methodName.reduce(
    generateExpectFunctions(tests, value, true),
    {} as TExpect,
  );
  return methods;
};

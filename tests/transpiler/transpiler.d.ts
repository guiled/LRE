type TestCb = () => void;

declare type TExpect = {
  toBe: (expected: unknown) => void;
  toStrictEqual: (expected: unknown) => void;
  toHaveBeenCalled: TestCb;
  toHaveBeenCalledTimes: (times: number) => void;
  toBeTruthy: TestCb;
  toBeFalsy: TestCb;
  toBeGreaterThan: (expected: number) => void;
  toBeLessThan: (expected: number) => void;
  toBeGreaterThanOrEqual: (expected: number) => void;
  toBeLessThanOrEqual: (expected: number) => void;
  hasBeenCalledBefore: (cb: Callback) => void;
  hasBeenCalledAfter: (cb: Callback) => void;
  not: Omit<TExpect, "not">;
};

declare type TExpectTests = keyof Omit<TExpect, "not">;

declare type TestUTils = (TestCb) => void;
declare type TestNamedUtil = (string, TestCb) => void;

declare let lreMock: <T extends (...any) => any>(T?) => T;
declare let lreBeforeAll: TestUTils;
declare let lreBeforeEach: TestUTils;
declare let lreAfterAll: TestUTils;
declare let lreAfterEach: TestUTils;
declare let lreDescribe: TestNamedUtil;
declare let lreTest: TestNamedUtil;
declare let lreExpect: (any) => TExpect;
declare let lreClearAllMocks: TestCb;
declare let lreSpyOn: (obj: any, name: string) => void;

import { Error } from "../src/error";
import { Logger } from "../src/log";
import { LRE } from "../src/lre";
import { ServerMock } from "../src/mock/letsrole/server.mock";
import { Sheet } from "../src/sheet";
import { newMockedWait } from "../src/mock/letsrole/wait.mock";
import { modeHandlerMock } from "./mock/modeHandler.mock";

jest.mock("../src/log");
global.lre = new Logger() as ILRE & Logger & cb;

const { wait, itHasWaitedEverything } = newMockedWait();
global.wait = wait;
lre.wait = wait;

describe("LRE tests", () => {
  let subject: LRE;
  let spyOnMathRandom: jest.SpyInstance;

  beforeEach(() => {
    subject = new LRE(modeHandlerMock);
    lre.deepMerge = subject.deepMerge;
    lre.isObject = subject.isObject;
    spyOnMathRandom = jest.spyOn(global.Math, "random").mockReturnValue(1);
  });

  afterEach(() => {
    spyOnMathRandom.mockClear();
  });

  test("LRE util Object deep merge", () => {
    expect(subject.deepMerge({}, {})).toEqual({});
    const obj1 = {
      a: 1,
      c: {
        a: 10,
      },
    };
    const obj2 = {
      b: 2,
      c: {
        b: 12,
      },
      d: {
        a: 42,
      },
    };
    expect(subject.deepMerge(obj1, obj2)).toEqual({
      a: 1,
      b: 2,
      c: {
        a: 10,
        b: 12,
      },
      d: {
        a: 42,
      },
    });
    const a = ["a", "b", "c"];
    const b = ["e", "f", "a"];
    expect(subject.deepMerge(a, b)).toEqual(a);
  });

  test("numToAlpha generation", () => {
    expect(subject.numToAlpha(0)).toEqual("A");
    expect(subject.numToAlpha(1)).toEqual("B");
    expect(subject.numToAlpha(26)).toEqual("a");
    expect(subject.numToAlpha(52)).toEqual("BA");

    for (let i = 0; i < 100; i++) {
      const n = Math.ceil(Math.random() * Number.MAX_SAFE_INTEGER);
      const res = subject.numToAlpha(n);
      expect(subject.alphaToNum(res)).toEqual(n);
    }

    const mathRandomSpy = jest.spyOn(Math, "random");
    mathRandomSpy.mockImplementation(() => 0.424242);
    expect(subject.getRandomId()).toEqual("BTYuVvaBoU");
    mathRandomSpy.mockImplementation(() => 0.9999999999999999);
    // cSpell:ignore DMZN
    expect(subject.getRandomId()).toEqual("DMZNPvePse");
    mathRandomSpy.mockRestore();
  });

  test("LRE call as a function", () => {
    const cb: jest.Mock = jest.fn();
    global.firstInit = jest.fn();

    const server = new ServerMock({
      views: [
        {
          id: "main",
          children: [],
          className: "View",
        },
      ],
    });

    const sheet1 = server.openView("main", "13");
    const sheet2 = server.openView("main", "", undefined, "theSheet");

    const init = subject.apply(subject, [cb]);

    expect(cb).toHaveBeenCalledTimes(0);
    init(sheet1);
    expect(cb).toHaveBeenCalledTimes(0);
    expect(global.firstInit).toHaveBeenCalledTimes(0);
    itHasWaitedEverything();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toBeInstanceOf(Sheet);
    expect(global.firstInit).toHaveBeenCalledTimes(1);
    expect((global.firstInit as jest.Mock).mock.calls[0][0]).toBeInstanceOf(
      Sheet,
    );
    init(sheet2);
    itHasWaitedEverything();
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb.mock.calls[1][0]).toBeInstanceOf(Sheet);

    const cbErr: jest.Mock = jest.fn(() => {
      throw new Error("arf");
    });
    global.firstInit = jest.fn(() => {
      throw new Error("wow");
    });
    const initErr = subject.apply(subject, [cbErr]);
    initErr(sheet1);
    expect(cbErr).toHaveBeenCalledTimes(0);
    expect(global.firstInit).toHaveBeenCalledTimes(0);
    itHasWaitedEverything();
    expect(cbErr).toThrow();
    expect(global.firstInit).toThrow();
  });

  test("LRE util Object deep equal", () => {
    const a = {};
    expect(subject.deepEqual(a, a)).toBeTruthy();
    expect(subject.deepEqual({}, {})).toBeTruthy();
    expect(subject.deepEqual({}, [1])).toBeFalsy();
    expect(subject.deepEqual({}, 1)).toBeFalsy();
    expect(subject.deepEqual([], [])).toBeTruthy();
    expect(
      subject.deepEqual({ a: 1, b: 2, c: a }, { b: 2, c: a, a: 1 }),
    ).toBeTruthy();
    expect(
      subject.deepEqual({ a: 1, b: 2, c: a }, { b: 2, c: {}, a: 1 }),
    ).toBeTruthy();
    expect(
      subject.deepEqual({ a: 1, b: 2, c: a }, { b: 2, c: { a: 1 }, a: 1 }),
    ).toBeFalsy();
    expect(
      subject.deepEqual({ a: 1, b: 2, c: a, d: 3 }, { b: 2, c: {}, a: 1 }),
    ).toBeFalsy();
    expect(
      subject.deepEqual(
        { a: 1, b: 2, c: a, d: 3 },
        { e: 4, b: 2, c: {}, a: 1 },
      ),
    ).toBeFalsy();
  });

  test("LRE util deep Equal on arrays", () => {
    expect(subject.deepEqual([], [])).toBeTruthy();
    expect(subject.deepEqual([1], [1])).toBeTruthy();
    expect(subject.deepEqual([1], [])).toBeFalsy();
    expect(subject.deepEqual([1], [2])).toBeFalsy();
    expect(subject.deepEqual([1, 2], [1, 2])).toBeTruthy();
    expect(subject.deepEqual([1, 2], [2, 1])).toBeFalsy();
    expect(subject.deepEqual([1, 2], [1, 2, 3])).toBeFalsy();
    expect(subject.deepEqual([1, 2, 3], [1, 2])).toBeFalsy();
    expect(subject.deepEqual([1, 2, 3], [1, 2, 3])).toBeTruthy();
    expect(subject.deepEqual([1, 2, 3], [1, 2, 4])).toBeFalsy();
    expect(
      subject.deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }]),
    ).toBeTruthy();
    expect(
      subject.deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 3 }]),
    ).toBeFalsy();
    expect(subject.deepEqual([1, { a: 1 }], [1, { a: 1 }])).toBeTruthy();
    expect(subject.deepEqual([1, { a: 1 }], [1, { a: 2 }])).toBeFalsy();
    expect(subject.deepEqual([1, { a: 1 }], [1, { b: 1 }])).toBeFalsy();
    expect(subject.deepEqual({ a: [1, 2] }, { a: [1, 2] })).toBeTruthy();
    expect(subject.deepEqual({ a: [1, 2] }, { a: [2, 1] })).toBeFalsy();
    expect(subject.deepEqual({ a: [1, 2] }, { a: [1, 2, 3] })).toBeFalsy();
    expect(subject.deepEqual({ a: [1, 2, 3] }, { a: [1, 2] })).toBeFalsy();
    expect(subject.deepEqual({ a: [1, 2, 3] }, { a: [1, 2, 3] })).toBeTruthy();
    expect(subject.deepEqual({ a: [1, 2, 3] }, { b: [1, 2, 3] })).toBeFalsy();
  });
});

describe("LRE wait", () => {
  let subject: LRE;

  beforeEach(() => {
    subject = new LRE(modeHandlerMock);
  });

  test("calls native wait", () => {
    (wait as jest.Mock).mockClear();
    const cb = jest.fn();
    subject.wait(100, cb, "hop");
    expect(wait).toHaveBeenCalledTimes(1);
    itHasWaitedEverything();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("handles errors", () => {
    /* @ts-expect-error The next error is deliberate */
    const cb = (): void => null();
    subject.wait(100, cb, "hop");
    (lre.error as jest.Mock).mockClear();
    expect(itHasWaitedEverything).not.toThrow();
    expect(lre.error).toHaveBeenCalled();
  });
});

describe("LRE autonum", () => {
  let subject: LRE;

  beforeEach(() => {
    subject = new LRE(modeHandlerMock);
  });

  test.each([
    /* put undefined to specify that the input is not changed */
    ["a", undefined],
    ["1", 1],
    ["2.34", 2.34],
    ["-3.14", -3.14],
    ["0x123", 0x123],
    ["0o123", 0o123],
    ["0b1010", 0b1010],
    ["\u1010", undefined],
    ["0123", 123],
    [1, undefined],
    [-42, undefined],
    ["", undefined],
    ["1as", undefined],
    [{}, undefined],
    [{ 42: 1 }, undefined],
    [[], undefined],
    [[1, 2], undefined],
  ])("Value %s auto conversion", (init, result?) => {
    expect(subject.value(init)).toBe(init);
    subject.autoNum();
    expect(subject.value(init)).toBe(result ?? init);
  });
});

describe("LRE global methods", () => {
  let subject: LRE;

  beforeEach(() => {
    subject = new LRE(modeHandlerMock);
  });

  test.each([
    [undefined, false],
    [null, false],
    ["", false],
    ["non plus", false],
    [0, false],
    [{}, true],
    [[], false],
    [{ a: 1 }, true],
    [[1], false],
    [1, false],
    [true, false],
  ])("Value %s is object", (init, result) => {
    expect(subject.isObject(init)).toBe(result);
  });

  test.each([
    [undefined, false],
    [null, false],
    ["", false],
    ["non plus", false],
    [0, false],
    [{}, false],
    [[], false],
    [{ a: 1 }, false],
    [[1], false],
    [1, false],
    [true, false],
    [
      {
        avatar: "avatar",
        token: "token",
        frame: {
          avatar: null,
          token: null,
        },
      },
      true,
    ],
  ])("Value %s is Avatar Value", (init, result) => {
    // @ts-expect-error The next error is deliberate
    expect(subject.isAvatarValue(init)).toBe(result);
  });

  test.each([
    [undefined, false],
    [null, false],
    ["", false],
    ["non plus", false],
    [0, false],
    [{}, true],
    [[], false],
    [{ a: 1 }, true],
    [[1], false],
    [1, false],
    [true, false],
    [
      {
        avatar: "avatar",
        token: "token",
        frame: {
          avatar: null,
          token: null,
        },
      },
      false,
    ],
  ])("Value %s is repeater value", (init, result) => {
    /* @ts-expect-error The next error is deliberate */
    expect(subject.isRepeaterValue(init)).toBe(result);
  });

  test.each([
    [undefined, false],
    [null, false],
    ["", false],
    ["non plus", false],
    [0, false],
    [{}, true],
    [[], false],
    [{ a: 1 }, false],
    [[1], false],
    [1, false],
    [true, false],
  ])("Value %s is object empty", (init, result) => {
    expect(subject.isObjectEmpty(init)).toBe(result);
  });
});

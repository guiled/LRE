import { Error } from "../src/error";
import { Logger } from "../src/log";
import { LRE } from "../src/lre";
import { Sheet } from "../src/sheet";
import { MockSheet } from "./mock/letsrole/sheet.mock";
import { newMockedWait } from "./mock/letsrole/wait.mock";

jest.mock("../src/log");
global.lre = new Logger() as ILRE & Logger & cb;

const { wait, itHasWaitedEverything } = newMockedWait();
global.wait = wait;
lre.wait = wait;

describe("LRE tests", () => {
  let subject: LRE;
  let spyOnMathRandom: jest.SpyInstance;

  beforeEach(() => {
    subject = new LRE();
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
    expect(subject.getRandomId()).toEqual("DMZNPvePse");
    mathRandomSpy.mockRestore();
  });

  test("LRE call as a function", () => {
    const cb: jest.Mock = jest.fn();
    global.firstInit = jest.fn();

    const sheet1 = MockSheet({ id: "main", realId: "13" });
    const sheet2 = MockSheet({ id: "main", realId: "", properName: "" });

    let init = subject.apply(subject, [cb]);

    expect(cb).toBeCalledTimes(0);
    init(sheet1);
    expect(cb).toBeCalledTimes(0);
    expect(global.firstInit).toBeCalledTimes(0);
    itHasWaitedEverything();
    expect(cb).toBeCalledTimes(1);
    expect(cb.mock.calls[0][0]).toBeInstanceOf(Sheet);
    expect(global.firstInit).toBeCalledTimes(1);
    expect((global.firstInit as jest.Mock).mock.calls[0][0]).toBeInstanceOf(
      Sheet
    );
    init(sheet2);
    itHasWaitedEverything();
    expect(cb).toBeCalledTimes(2);
    expect(cb.mock.calls[1][0]).toBeInstanceOf(Sheet);

    const cbErr: jest.Mock = jest.fn(() => {
      throw new Error("arf");
    });
    global.firstInit = jest.fn(() => {
      throw new Error("wow");
    });
    let initErr = subject.apply(subject, [cbErr]);
    initErr(sheet1);
    expect(cbErr).toBeCalledTimes(0);
    expect(global.firstInit).toBeCalledTimes(0);
    itHasWaitedEverything();
    expect(cbErr).toThrowError();
    expect(global.firstInit).toThrowError();
  });

  test("LRE util Object deep equal", () => {
    const a = {};
    expect(subject.deepEqual(a, a)).toBeTruthy();
    expect(subject.deepEqual({}, {})).toBeTruthy();
    expect(subject.deepEqual({}, [1])).toBeFalsy();
    expect(subject.deepEqual({}, 1)).toBeFalsy();
    expect(subject.deepEqual([], [])).toBeTruthy();
    expect(
      subject.deepEqual({ a: 1, b: 2, c: a }, { b: 2, c: a, a: 1 })
    ).toBeTruthy();
    expect(
      subject.deepEqual({ a: 1, b: 2, c: a }, { b: 2, c: {}, a: 1 })
    ).toBeTruthy();
    expect(
      subject.deepEqual({ a: 1, b: 2, c: a }, { b: 2, c: { a: 1 }, a: 1 })
    ).toBeFalsy();
    expect(
      subject.deepEqual({ a: 1, b: 2, c: a, d: 3 }, { b: 2, c: {}, a: 1 })
    ).toBeFalsy();
    expect(
      subject.deepEqual({ a: 1, b: 2, c: a, d: 3 }, { e: 4, b: 2, c: {}, a: 1 })
    ).toBeFalsy();
  });
});

describe("LRE is a proxy mode handler", () => {
  test("Set mode and get modes works", () => {
    const subject = new LRE();
    expect(subject.getMode()).toBe("real");
    subject.setMode("virtual");
    expect(subject.getMode()).toBe("virtual");
  });
});

describe("LRE wait", () => {
  let subject: LRE;

  beforeEach(() => {
    subject = new LRE();
  });

  test("calls native wait", () => {
    (wait as jest.Mock).mockClear();
    const cb = jest.fn();
    subject.wait(100, cb, "hop");
    expect(wait).toBeCalledTimes(1);
    itHasWaitedEverything();
    expect(cb).toBeCalledTimes(1);
  });

  test("handles errors", () => {
    /* @ts-expect-error */
    const cb = () => null();
    subject.wait(100, cb, "hop");
    (lre.error as jest.Mock).mockClear();
    expect(itHasWaitedEverything).not.toThrowError();
    expect(lre.error).toBeCalled();
  })
});

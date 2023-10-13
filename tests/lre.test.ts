import { Logger } from "../src/log";
import { handleError } from "../src/log/errorhandler";
import { LRE } from "../src/lre";
import { Sheet } from "../src/sheet";
import { MockSheet } from "./mock/letsrole/sheet.mock";

jest.mock("../src/log/errorhandler");
global.lre = new Logger();
let waitedCallbacks: Array<(...args: any[]) => any>;

const itHasWaitedEnough = () => {
  while (waitedCallbacks.length) {
    const toCall = waitedCallbacks.shift();
    toCall?.();
  }
};

beforeAll(() => {
  waitedCallbacks = [];
  global.wait = jest.fn((delay, cb) => waitedCallbacks.push(cb));
});

describe("LRE tests", () => {
  let subject: LRE;
  let spyOnMathRandom;

  beforeEach(() => {
    subject = new LRE();
    spyOnMathRandom = jest.spyOn(global.Math, "random").mockReturnValue(1);
  });

  test("LRE util Object deep merge", () => {
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
    itHasWaitedEnough();
    expect(cb).toBeCalledTimes(1);
    expect(cb.mock.calls[0][0]).toBeInstanceOf(Sheet);
    expect(global.firstInit).toBeCalledTimes(1);
    expect((global.firstInit as jest.Mock).mock.calls[0][0]).toBeInstanceOf(Sheet);
    init(sheet2);
    itHasWaitedEnough();
    expect(cb).toBeCalledTimes(2);
    expect(cb.mock.calls[1][0]).toBeInstanceOf(Sheet);

    const cbErr: jest.Mock = jest.fn(() => {throw new Error('arf')})
    global.firstInit = jest.fn(() => {throw new Error('outch')})
    let initErr = subject.apply(subject, [cbErr]);
    initErr(sheet1);
    expect(cbErr).toBeCalledTimes(0);
    expect(handleError).toBeCalledTimes(0)
    expect(global.firstInit).toBeCalledTimes(0)
    itHasWaitedEnough();
    expect(cbErr).toThrowError();
    expect(global.firstInit).toThrowError()
    expect(handleError).toBeCalledTimes(2)
  });
});

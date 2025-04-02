import { Error } from "../src/error";
import { LRE } from "../src/lre";
import { ServerMock } from "../src/mock/letsrole/server.mock";
import { Sheet } from "../src/sheet";
import {
  initLetsRole,
  itHasWaitedEverything,
  terminateLetsRole,
} from "../src/mock/letsrole/letsrole.mock";
import { setLang } from "../src/mock/letsrole/i18n";
import { LREi18n } from "../src/globals/i18n";

jest.mock("../src/log");

let server: ServerMock;

beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        children: [],
        className: "View",
      },
    ],
    i18n: {
      defaultLang: "en",
      texts: ["trad1", "trad2", "trad3"],
      translations: {
        fr: {
          trad1: "frTrad1",
          trad2: "frTrad2",
        },
      },
    },
  });
  initLetsRole(server);
  global.wait = wait;
});

afterEach(() => {
  jest.restoreAllMocks();
  // @ts-expect-error The next error is deliberate
  delete global.wait;
  terminateLetsRole();
});

describe("LRE tests", () => {
  let subject: LRE;
  let spyOnMathRandom: jest.SpyInstance;

  beforeEach(() => {
    subject = new LRE(context);
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
  });

  test("random id generation", () => {
    const mathRandomSpy = jest.spyOn(Math, "random");
    mathRandomSpy.mockImplementation(() => 0);

    expect(subject.getRandomId()).toEqual("A");

    mathRandomSpy.mockImplementation(() => 0.424242);

    expect(subject.getRandomId()).toEqual("BTYuVvaBoU");

    mathRandomSpy.mockImplementation(() => 0.9999999999999999);

    // cSpell:ignore DMZN
    expect(subject.getRandomId()).toEqual("DMZNPvePse");

    mathRandomSpy.mockRestore();
  });

  test("random id generation with length", () => {
    const mathRandomSpy = jest.spyOn(Math, "random");
    mathRandomSpy.mockImplementation(() => 0);

    expect(subject.getRandomId(1)).toEqual("A");

    mathRandomSpy.mockImplementation(() => 0.9999999999999999);

    expect(subject.getRandomId(3)).toEqual("zzz");

    mathRandomSpy.mockRestore();
  });

  test("LRE call as a function", () => {
    const sheetInit: jest.Mock = jest.fn();
    global.firstInit = jest.fn();
    global.lre = subject;

    const sheet1 = server.openView("main", "13");
    const sheet2 = server.openView("main", "", undefined, "theSheet");

    const init = subject.apply(subject, [sheetInit]);

    expect(sheetInit).toHaveBeenCalledTimes(0);

    init(sheet1);

    expect(sheetInit).toHaveBeenCalledTimes(0);
    expect(global.firstInit).toHaveBeenCalledTimes(0);

    itHasWaitedEverything();

    expect(sheetInit).toHaveBeenCalledTimes(1);
    expect(sheetInit.mock.calls[0][0]).toBeInstanceOf(Sheet);
    expect(global.firstInit).toHaveBeenCalledTimes(1);
    expect((global.firstInit as jest.Mock).mock.calls[0][0]).toBeInstanceOf(
      Sheet,
    );

    init(sheet2);
    itHasWaitedEverything();

    expect(sheetInit).toHaveBeenCalledTimes(2);
    expect(sheetInit.mock.calls[1][0]).toBeInstanceOf(Sheet);

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

    // @ts-expect-error The next error is deliberate
    delete global.lre;
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
    subject = new LRE(context);
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
    jest.spyOn(subject, "error");

    expect(itHasWaitedEverything).not.toThrow();
    expect(subject.error).toHaveBeenCalled();
  });
});

describe("LRE autonum", () => {
  let subject: LRE;

  beforeEach(() => {
    subject = new LRE(context);
  });

  test.each([
    /* put undefined to specify that the input is not changed */
    [42, undefined],
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
    [
      ["42", "13"],
      [42, 13],
    ],
    [
      { a: "43", b: "12" },
      { a: 43, b: 12 },
    ],
  ])("Value %s auto conversion", (init, result?) => {
    expect(subject.value(init)).toBe(init);

    subject.autoNum();

    expect(subject.value(init)).toStrictEqual(result ?? init);

    subject.autoNum(false);

    expect(subject.value(init)).toBe(init);

    if (result !== undefined) {
      expect(subject.value(init)).not.toBe(result);
    }
  });
});

describe("LRE autoTrad", () => {
  let subject: LRE;

  beforeEach(() => {
    setLang("fr");
    subject = new LRE(context);
    subject.i18n = new LREi18n(_);
  });

  test.each([
    /* put undefined to specify that the input is not changed */
    [42, undefined],
    ["a", undefined],
    ["1", undefined],
    ["0123", undefined],
    ["", undefined],
    ["1as", undefined],
    [{}, undefined],
    [{ 42: 1 }, undefined],
    [[], undefined],
    [[1, 2], undefined],
    ["trad1", "frTrad1"],
    ["trad2", "frTrad2"],
    ["trad3", undefined],
    [
      ["oui", "trad1", 42, "43"],
      ["oui", "frTrad1", 42, "43"],
    ],
    [
      { a: "trad1", trad2: "trad1", c: "trad3", d: "42" },
      { a: "frTrad1", trad2: "frTrad1", c: "trad3", d: "42" },
    ],
  ])("Value %s auto translation", (init, result?) => {
    expect(subject.value(init)).toBe(init);

    subject.autoTransl();

    expect(subject.value(init)).toStrictEqual(result ?? init);

    subject.autoTransl(false);

    expect(subject.value(init)).toBe(init);

    if (result !== undefined) {
      expect(subject.value(init)).not.toBe(result);
    }
  });
});

describe("LRE global methods", () => {
  let subject: LRE;

  beforeEach(() => {
    subject = new LRE(context);
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

  test.each([
    [undefined, false],
    [null, false],
    ["", true],
    ["non plus", true],
    [0, true],
    [{}, false],
    [[], false],
    [{ a: 1 }, false],
    [[1], false],
    [1, true],
    [true, false],
  ])("Value %s is useable as index", (init, result) => {
    expect(subject.isIndex(init)).toBe(result);
  });

  test.each([
    [undefined, false],
    [null, false],
    ["", true],
    ["non plus", true],
    [0, false],
    [{}, true],
    [[], true],
    [{ a: 1 }, true],
    [[1], true],
    [1, false],
    [true, false],
  ])("Value %s is iterable", (init, result) => {
    expect(subject.isIterableByEach(init)).toBe(result);
  });
});

describe("LRE each", () => {
  test("lre.each is like let's role each but return the modified object", () => {
    const lre = new LRE(context);
    const obj = { a: 1, b: 2, c: 3 };
    const cb = jest.fn((v) => v + 1);
    const res = lre.each(obj, cb);

    expect(cb).toHaveBeenCalledTimes(3);
    expect(res).toStrictEqual({ a: 2, b: 3, c: 4 });
  });
});

describe("LRE launch", () => {
  test("LRE is callable", () => {
    const subject = new LRE(context);
    global.lre = subject;

    expect(() =>
      subject.apply(subject, [server.openView("main", "13")]),
    ).not.toThrow();

    // @ts-expect-error The next error is deliberate
    delete global.lre;
  });

  test("LRE first launch is launched once", () => {
    const cb = jest.fn();
    const subject = new LRE(context, cb);
    subject.apply(subject, [server.openView("main", "13")]);
    subject.apply(subject, [server.openView("main", "14")]);

    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe("LRE create a data provider with context", () => {
  let subject: LRE;

  beforeEach(() => {
    subject = new LRE(context);
    global.lre = subject;
  });

  afterEach(() => {
    // @ts-expect-error The next error is deliberate
    delete global.lre;
  });

  test("dataProvider returns a DataProvider", () => {
    const data = { a: 1, b: 2 };
    const cb = jest.fn(() => data);
    const randomNumber = "123";
    const dpId = "test";
    lre.getRandomId = jest.fn(() => randomNumber);

    const dataProvider = subject.dataProvider(dpId, cb);

    expect(dataProvider.provider).toStrictEqual(true);
    expect(dataProvider.realId()).toStrictEqual(dpId);
    expect(dataProvider.providedValue()).toStrictEqual(data);
  });
});

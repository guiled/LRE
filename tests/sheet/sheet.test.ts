import { Component } from "../../src/component";
import { MockServer } from "../mock/letsrole/server.mock";
import { MockSheet, MockedSheet } from "../mock/letsrole/sheet.mock";
import { Sheet } from "../../src/sheet/index";
import { LRE } from "../../src/lre";
jest.mock("../../src/log");

global.lre = new LRE();
let waitedCallbacks: Array<(...args: any[]) => any> = [];
global.wait = jest.fn((_delay, cb) => waitedCallbacks.push(cb));

const itHasWaitedEnough = () => {
  while (waitedCallbacks.length) {
    const toCall = waitedCallbacks.shift();
    toCall?.();
  }
};

const createLargeObject = (nbKeys: number): Record<string, number> =>
  Array(nbKeys)
    .fill(0, 0, nbKeys)
    .reduce<Record<string, number>>(
      (obj, _val, idx) => Object.assign(obj, { [`k-${idx}`]: idx }),
      {}
    );

describe("Sheet basics", () => {
  const sheetId = "testedSheet";
  let raw: LetsRole.Sheet, sheet: Sheet;
  beforeEach(() => {
    raw = MockSheet({
      id: sheetId,
      realId: "4242",
    });
    sheet = new Sheet(raw);
  });
  test("Create from raw", () => {
    expect(sheet.lreType()).toEqual("sheet");

    expect(sheet.raw()).toStrictEqual(raw);

    expect(sheet.id()).toEqual(sheetId);

    expect(sheet.sheet()).toStrictEqual(sheet);
  });

  test("pure constructor", () => {
    expect(raw.getData).not.toBeCalled();
    expect(raw.getVariable).not.toBeCalled();
  });

  test("has initialization information", () => {
    expect(sheet.isInitialized()).toBeFalsy();

    expect(raw.getData).toBeCalled();
  });

  test("getVariable calls raw method", () => {
    sheet.getVariable("foo");
    expect(raw.getVariable).toBeCalledTimes(1);
  });

  test("getSheetId calls raw method", () => {
    (raw.getSheetId as jest.Mock).mockClear();
    const res = sheet.getSheetId();
    expect(res).toEqual("4242");
    expect(raw.getSheetId).toBeCalledTimes(1);
    expect(sheet.getSheetAlphaId()).toBe("Bde")
  });

  test("name and properName call raw methods", () => {
    (raw.name as jest.Mock).mockClear();
    (raw.properName as jest.Mock).mockClear();
    sheet.name();
    sheet.properName();
    expect(raw.name).toBeCalledTimes(1);
    expect(raw.properName).toBeCalledTimes(1);
  });

  test("prompt calls raw method", () => {
    sheet.prompt(
      "title",
      "viewId",
      () => {},
      () => {}
    );
    expect(raw.prompt).toBeCalledTimes(1);
  });

  test("id() and readId() calls", () => {
    (raw.id as jest.Mock).mockClear();
    expect(sheet.id()).toEqual(sheetId);
    expect(sheet.realId()).toEqual(sheetId);
    expect(raw.id).toBeCalledTimes(2);
  });
});

describe("Sheet data handling", () => {
  const sheetId = "testedSheet";
  let raw: MockedSheet, sheet: Sheet;
  let server: MockServer;
  beforeEach(() => {
    raw = MockSheet({
      id: sheetId,
      realId: "4242",
    });
    server = new MockServer();
    server.registerMockedSheet(raw);
    sheet = new Sheet(raw);
  });

  test("Test sheet mock", () => {
    expect(() => raw.setData(createLargeObject(30))).toThrowError();

    const validObject = createLargeObject(20);
    expect(() => raw.setData(validObject)).not.toThrowError();
    const raw2 = MockSheet({
      id: sheetId,
      realId: "4242",
    });
    server.registerMockedSheet(raw2);
    expect(raw2.getData()).toEqual(validObject);
  });

  test("setData and getData are batched", () => {
    const processedCb = jest.fn();
    sheet.on("data:processed", processedCb);
    const data: LetsRole.ViewData = {
      a: 1,
      b: 2,
      c: 3,
    };
    raw.getData = jest.fn(() => {
      return data;
    });
    raw.setData = jest.fn((d: LetsRole.ViewData) => {
      for (let i in d) {
        data[i] = d[i];
      }
    });
    sheet.setData({
      a: 11,
      d: 4,
    });
    expect(raw.setData).not.toBeCalled();
    expect(processedCb).not.toBeCalled();
    expect(sheet.getData()).toEqual({
      a: 11,
      b: 2,
      c: 3,
      d: 4,
    });
    expect(raw.getData).toBeCalled();
    expect(sheet.getPendingData("a")).toStrictEqual(11);
    itHasWaitedEnough();
    expect(raw.setData).toBeCalled();
    expect(processedCb).toBeCalled();
  });

  test("No error when sending too much data", () => {
    sheet.setData(createLargeObject(35));
    expect(raw.setData).not.toBeCalled();
    expect(itHasWaitedEnough).not.toThrowError();
    expect(raw.setData).toBeCalled();
    expect(itHasWaitedEnough).not.toThrowError();
    expect(raw.setData).toBeCalledTimes(2);
  });
});

describe("Sheet persisting data", () => {
  let sheet1: Sheet, sheet2: Sheet;
  let server: MockServer;

  const initSheet = function (sheetId: string, realId: string) {
    const raw = MockSheet({
      id: sheetId,
      realId: realId,
    });
    server.registerMockedSheet(raw);
    return new Sheet(raw);
  };

  beforeEach(() => {
    server = new MockServer();
    sheet1 = initSheet("ahah", "4242");
    sheet2 = initSheet("ahah", "4242");
  });
  test("Persisting data shared between sheets", () => {
    sheet1.persistingData("test", 42);
    expect(sheet1.persistingData("test")).toStrictEqual(42);
    itHasWaitedEnough();
    const testSheet = initSheet("ahah", "4242");
    expect(testSheet.persistingData("test")).toStrictEqual(42);
    sheet2.persistingData("test", 43);
    expect(sheet1.persistingData("test")).toStrictEqual(42);
    itHasWaitedEnough();
    expect(sheet1.persistingData("test")).toStrictEqual(43);
    sheet1.persistingData("test", 44);
    sheet2.persistingData("test2", 54);
    expect(sheet1.persistingData("test")).toStrictEqual(44);
    expect(sheet2.persistingData("test2")).toStrictEqual(54);
    expect(sheet1.persistingData("test2")).toBeUndefined();
    expect(sheet2.persistingData("test")).toStrictEqual(43);
    itHasWaitedEnough();
    expect(sheet1.persistingData("test")).toStrictEqual(44);
    expect(sheet2.persistingData("test2")).toStrictEqual(54);
    expect(sheet1.persistingData("test2")).toStrictEqual(54);
    expect(sheet2.persistingData("test")).toStrictEqual(44);

    sheet1.deletePersistingData("test2");
    expect(sheet1.persistingData("test2")).toBeUndefined();
    itHasWaitedEnough();
    expect(sheet2.persistingData("test2")).toBeUndefined();

    sheet2.persistingData("test2", 55);
    expect(sheet1.persistingData("test2")).toBeUndefined();
    expect(sheet2.persistingData("test2")).toStrictEqual(55);
    itHasWaitedEnough();
    expect(sheet1.persistingData("test2")).toStrictEqual(55);
    expect(sheet2.persistingData("test2")).toStrictEqual(55);
    sheet1.deletePersistingData("test2");
    sheet2.persistingData("test2", 56);
    expect(sheet1.persistingData("test2")).toBeUndefined();
    expect(sheet2.persistingData("test2")).toStrictEqual(56);
    itHasWaitedEnough();
    expect(sheet1.persistingData("test2")).toBeUndefined();
    expect(sheet2.persistingData("test2")).toBeUndefined();
    sheet1.persistingData("test3", 3);
    sheet2.deletePersistingData("test3");
    expect(sheet1.persistingData("test3")).toStrictEqual(3);
    expect(sheet2.persistingData("test3")).toBeUndefined();
    itHasWaitedEnough();
    expect(sheet1.persistingData("test3")).toStrictEqual(3);
    expect(sheet2.persistingData("test3")).toStrictEqual(3);
    
    const persistingCmpData = sheet1.persistingData("cmpData");
    const persistingCmpClasses = sheet1.persistingData("cmpClasses");
    const persistingInitialized = sheet1.persistingData("initialized");
    sheet1.deletePersistingData("cmpData");
    sheet1.deletePersistingData("cmpClasses");
    sheet1.deletePersistingData("initialized");
    expect(sheet1.persistingData("cmpData")).toBe(persistingCmpData);
    expect(sheet1.persistingData("cmpClasses")).toBe(persistingCmpClasses);
    expect(sheet1.persistingData("initialized")).toBe(persistingInitialized);
  });

  test("isInitialized", () => {
    expect(sheet1.isInitialized()).toBeFalsy();
    expect(sheet2.isInitialized()).toBeFalsy();
    sheet1.persistingData("initialized", true);
    expect(sheet1.isInitialized()).toBeTruthy();
    expect(sheet2.isInitialized()).toBeFalsy();
    itHasWaitedEnough();
    expect(sheet2.isInitialized()).toBeTruthy();
  });

  test("Persisting cmp data", () => {
    const newData = {
      v1: 1,
      v2: 2,
    };
    const v = sheet1.persistingCmpData("123", newData);
    expect(sheet1.raw().setData).not.toBeCalled();
    expect(itHasWaitedEnough).not.toThrowError();
    expect(sheet1.raw().setData).toBeCalled();
    expect(v).toEqual(newData);
    const v2 = sheet2.persistingCmpData("123");
    expect(v2).toEqual(newData);

    const newData1 = {
      ...newData,
      v3: 3,
    };
    const newData2 = {
      ...newData,
      v4: 4,
    };
    expect(sheet1.persistingCmpData("123", newData1)).toEqual(newData1);
    expect(sheet2.persistingCmpData("123", newData2)).toEqual(newData2);
    itHasWaitedEnough();
    expect(sheet1.persistingCmpData("123")).toEqual({
      ...newData1,
      ...newData2,
    });
    expect(sheet2.persistingCmpData("123")).toEqual({
      ...newData1,
      ...newData2,
    });
    const newData3 = {
      ...newData1,
      v5: {
        v1: 1,
        v2: ["1", "2", "3"],
      },
    };
    const newData4 = {
      ...newData2,
      v5: {
        v3: 42,
        v2: ["4", "5"],
      },
    };
    const result = {
      ...newData1,
      ...newData2,
      v5: {
        v1: 1,
        v2: ["1", "2", "3"],
        v3: 42,
      },
    };
    expect(sheet1.persistingCmpData("123", newData3)).toEqual(newData3);
    expect(sheet2.persistingCmpData("123", newData4)).toEqual(newData4);
    itHasWaitedEnough();
    expect(sheet1.persistingCmpData("123")).toEqual(result);
    expect(sheet2.persistingCmpData("123")).toEqual(result);
  });

  test("Persisting cmp classes", () => {
    const c = ["class1"];
    expect(sheet1.persistingCmpClasses("123", c)).toEqual(c);
    expect(sheet1.persistingCmpClasses("123")).toEqual(c);
    expect(sheet2.persistingCmpClasses("123")).not.toEqual(c);
    expect(itHasWaitedEnough).not.toThrowError();
    expect(sheet2.persistingCmpClasses("123")).toEqual(c);
    const c1 = ["class1", "class1b"];
    const c2 = ["class2"];
    sheet1.persistingCmpClasses("123", c1);
    sheet2.persistingCmpClasses("123", c2);
    expect(itHasWaitedEnough).not.toThrowError();
    // no need today to merge the two arrays of classes
    expect(sheet1.persistingCmpClasses("123")).toEqual(c1);
    expect(sheet2.persistingCmpClasses("123")).toEqual(c1);
  });
});

describe("Sheet get component", () => {
  let sheet1: Sheet;
  let server: MockServer;

  const initSheet = function (sheetId: string, realId: string) {
    const raw = MockSheet({
      id: sheetId,
      realId: realId,
    });
    server.registerMockedSheet(raw);
    return new Sheet(raw);
  };

  beforeEach(() => {
    server = new MockServer();
    sheet1 = initSheet("ahah", "4242");
  });

  test("Prevent errors", () => {
    /* @ts-ignore On purpose for tests */
    expect(sheet1.get({})).toBeNull();
    /* @ts-ignore On purpose for tests */
    expect(sheet1.get(123)).toBeNull();
    /* @ts-ignore On purpose for tests */
    expect(sheet1.get("123")).toBeNull();
    /* @ts-ignore On purpose for tests */
    expect(sheet1.get(new String("123"))).toBeNull();
  });

  test("Get component is cached", () => {
    const cmp1 = sheet1.get("abcd");
    const cmp2 = sheet1.get("abcd");
    expect(cmp1).toStrictEqual(cmp2);
    expect(cmp1).toBeInstanceOf(Component);
  });

  test("Find and get are the same", () => {
    const cmp1 = sheet1.get("abcd");
    const cmp2 = sheet1.find("abcd");
    expect(cmp1).toStrictEqual(cmp2);
    expect(cmp1).toBeInstanceOf(Component);
  });

  test("Find a component in a repeater", () => {
    expect(sheet1.get("a.b.c")).toBeInstanceOf(Component);
    expect(sheet1.get(MockServer.UNKNOWN_CMP_ID + ".b.c")).toBeNull();
  });
});

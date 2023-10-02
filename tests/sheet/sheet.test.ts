import { Component } from "../../src/component";
import { Logger } from "../../src/log";
import { MockServer } from "../mock/letsrole/server.mock";
import { MockSheet, MockedSheet } from "../mock/letsrole/sheet.mock";
import { Sheet } from "../../src/sheet/index";
jest.mock("../../src/log");

global.lre = new Logger();
let waitedCallbacks: Array<(...args: any[]) => any> = [];
global.wait = jest.fn((delay, cb) => waitedCallbacks.push(cb));

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
    expect(raw2.getData()).toMatchObject(validObject);
  });

  test("setData and getData are batched", () => {
    const processedCb = jest.fn((...args: any[]) => {});
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
    expect(sheet.getData()).toMatchObject({
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
});

describe("Sheet get component", () => {
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

  test("Prevent errors", () => {
    /* @ts-ignore Voluntary for tests */
    expect(sheet1.get({})).toBeNull();
    /* @ts-ignore Voluntary for tests */
    expect(sheet1.get(123)).toBeNull();
    /* @ts-ignore Voluntary for tests */
    expect(sheet1.get("123")).toBeNull();
    /* @ts-ignore Voluntary for tests */
    expect(sheet1.get(new String("123"))).toBeNull();
  });

  test("Get component is cached", () => {
    const cmp1 = sheet1.get('abcd');
    const cmp2 = sheet1.get('abcd');
    expect(cmp1).toStrictEqual(cmp2);
    console.log((global.lre.error as jest.Mock).mock.calls)
    expect(cmp1).toBeInstanceOf(Component);
  })
});

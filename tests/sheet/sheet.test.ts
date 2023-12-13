import { Component } from "../../src/component";
import { MockServer } from "../mock/letsrole/server.mock";
import { MockSheet, MockedSheet } from "../mock/letsrole/sheet.mock";
import { ClassChanges, Sheet } from "../../src/sheet/index";
import { LRE } from "../../src/lre";
import { newMockedWait } from "../mock/letsrole/wait.mock";
import { DataBatcher } from "../../src/sheet/databatcher";
import { modeHandlerMock } from "../mock/modeHandler.mock";

global.lre = new LRE(modeHandlerMock);
const mockedWaitDefs = newMockedWait();
global.wait = mockedWaitDefs.wait;

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
    sheet = new Sheet(raw, new DataBatcher(modeHandlerMock, raw));
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
    expect(sheet.getSheetAlphaId()).toBe("Bde");
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
  const rawSheetData = {
    id: sheetId,
    realId: "4242",
  };
  let raw: MockedSheet, sheet: Sheet;
  let server: MockServer;
  beforeEach(() => {
    raw = MockSheet(rawSheetData);
    server = new MockServer();
    server.registerMockedSheet(raw);
    sheet = new Sheet(raw, new DataBatcher(modeHandlerMock, raw));
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

  test("setData and getData are batched and events are triggered", () => {
    const processedCb: jest.Mock = jest.fn();
    const pendingCb: jest.Mock = jest.fn();
    sheet.on("data-processed", processedCb);
    sheet.on("data-pending", pendingCb);
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
    expect(pendingCb).not.toBeCalled();
    sheet.setData({
      a: 11,
      d: 4,
    });
    expect(pendingCb).toBeCalledTimes(1);
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
    mockedWaitDefs.itHasWaitedEverything();
    expect(raw.setData).toBeCalled();
    expect(pendingCb).toBeCalledTimes(1);
    expect(processedCb).toBeCalled();
    processedCb.mockClear();

    const newRaw = MockSheet(rawSheetData);
    const prevRaw = sheet.raw();
    expect(newRaw).not.toBe(prevRaw);
    sheet.refreshRaw(newRaw);
    expect(sheet.raw()).toBe(newRaw);
    expect(sheet.raw()).not.toBe(prevRaw);
    expect(pendingCb).toBeCalledTimes(1);
    sheet.setData({
      a: 11,
      d: 4,
    });
    expect(pendingCb).toBeCalledTimes(2);
    expect(processedCb).not.toBeCalled();
    mockedWaitDefs.itHasWaitedEverything();
    expect(processedCb).toBeCalled();
    expect(pendingCb).toBeCalledTimes(2);
  });

  test("No error when sending too much data", () => {
    sheet.setData(createLargeObject(35));
    expect(raw.setData).not.toBeCalled();
    expect(mockedWaitDefs.itHasWaitedEverything).not.toThrowError();
    expect(raw.setData).toBeCalled();
    expect(mockedWaitDefs.itHasWaitedEverything).not.toThrowError();
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
    return new Sheet(raw, new DataBatcher(modeHandlerMock, raw));
  };

  beforeEach(() => {
    server = new MockServer();
    sheet1 = initSheet("main", "4242");
    sheet2 = initSheet("main", "4242");
  });
  test("Persisting data shared between sheets", () => {
    sheet1.persistingData("test", 42);
    expect(sheet1.persistingData("test")).toStrictEqual(42);
    mockedWaitDefs.itHasWaitedEverything();
    const testSheet = initSheet("main", "4242");
    expect(testSheet.persistingData("test")).toStrictEqual(42);
    sheet2.persistingData("test", 43);
    expect(sheet1.persistingData("test")).toStrictEqual(42);
    mockedWaitDefs.itHasWaitedEverything();
    expect(sheet1.persistingData("test")).toStrictEqual(43);
    sheet1.persistingData("test", 44);
    sheet2.persistingData("test2", 54);
    expect(sheet1.persistingData("test")).toStrictEqual(44);
    expect(sheet2.persistingData("test2")).toStrictEqual(54);
    expect(sheet1.persistingData("test2")).toBeUndefined();
    expect(sheet2.persistingData("test")).toStrictEqual(43);
    mockedWaitDefs.itHasWaitedEverything();
    expect(sheet1.persistingData("test")).toStrictEqual(44);
    expect(sheet2.persistingData("test2")).toStrictEqual(54);
    expect(sheet1.persistingData("test2")).toStrictEqual(54);
    expect(sheet2.persistingData("test")).toStrictEqual(44);

    sheet1.deletePersistingData("test2");
    expect(sheet1.persistingData("test2")).toBeUndefined();
    mockedWaitDefs.itHasWaitedEverything();
    expect(sheet2.persistingData("test2")).toBeUndefined();

    sheet2.persistingData("test2", 55);
    expect(sheet1.persistingData("test2")).toBeUndefined();
    expect(sheet2.persistingData("test2")).toStrictEqual(55);
    mockedWaitDefs.itHasWaitedEverything();
    expect(sheet1.persistingData("test2")).toStrictEqual(55);
    expect(sheet2.persistingData("test2")).toStrictEqual(55);
    sheet1.deletePersistingData("test2");
    sheet2.persistingData("test2", 56);
    expect(sheet1.persistingData("test2")).toBeUndefined();
    expect(sheet2.persistingData("test2")).toStrictEqual(56);
    mockedWaitDefs.itHasWaitedEverything();
    expect(sheet1.persistingData("test2")).toBeUndefined();
    expect(sheet2.persistingData("test2")).toBeUndefined();
    sheet1.persistingData("test3", 3);
    sheet2.deletePersistingData("test3");
    expect(sheet1.persistingData("test3")).toStrictEqual(3);
    expect(sheet2.persistingData("test3")).toBeUndefined();
    mockedWaitDefs.itHasWaitedEverything();
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
    mockedWaitDefs.itHasWaitedEverything();
    expect(sheet2.isInitialized()).toBeTruthy();
  });

  test("Persisting cmp data", () => {
    const newData = {
      v1: 1,
      v2: 2,
    };
    const v = sheet1.persistingCmpData("123", newData);
    expect(sheet1.raw().setData).not.toBeCalled();
    expect(mockedWaitDefs.itHasWaitedEverything).not.toThrowError();
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
    mockedWaitDefs.itHasWaitedEverything();
    expect(sheet1.persistingCmpData("123")).toEqual({
      ...newData1,
      ...newData2,
    });
    expect(sheet2.persistingCmpData("123")).toEqual({
      ...newData1,
      ...newData2,
    });
    const newRawSheet1 = MockSheet({
      id: sheet1.id(),
      realId: sheet1.getSheetId(),
    });
    server.registerMockedSheet(newRawSheet1);
    sheet1.refreshRaw(newRawSheet1);
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
    mockedWaitDefs.itHasWaitedEverything();
    expect(sheet1.persistingCmpData("123")).toEqual(result);
    expect(sheet2.persistingCmpData("123")).toEqual(result);
  });

  test("Persisting cmp classes", () => {
    const c: ClassChanges = { class1: 1 };
    expect(sheet1.persistingCmpClasses("123", c)).toEqual(c);
    expect(sheet1.persistingCmpClasses("123")).toEqual(c);
    expect(sheet2.persistingCmpClasses("123")).not.toEqual(c);
    expect(mockedWaitDefs.itHasWaitedEverything).not.toThrowError();
    expect(sheet2.persistingCmpClasses("123")).toEqual(c);
    const c1: ClassChanges = { class1: -1, class1b: 1 };
    const c2: ClassChanges = { class2: 1 };
    sheet1.persistingCmpClasses("123", c1);
    sheet2.persistingCmpClasses("123", c2);
    expect(mockedWaitDefs.itHasWaitedEverything).not.toThrowError();
    // no need today to merge the two arrays of classes
    const result: ClassChanges = {
      ...c1,
      ...c2,
    };
    expect(sheet1.persistingCmpClasses("123")).toEqual(result);
    expect(sheet2.persistingCmpClasses("123")).toEqual(result);
  });
});

describe("Sheet clean data", () => {
  let raw: LetsRole.Sheet;
  let server: MockServer;

  beforeEach(() => {
    raw = MockSheet({
      id: "main",
      realId: "123",
    });
    server = new MockServer();
    server.registerMockedSheet(raw);
  });

  test("Clean data", () => {
    let data: LetsRole.ViewData = {
      main: {
        cmpData: {},
        cmpClasses: {},
        initialized: false,
      },
    };
    raw.getData = jest.fn(() => data);
    raw.setData = jest.fn((d) => (data = { ...data, ...d }));
    let save = structuredClone(data);
    let sheet = new Sheet(raw, new DataBatcher(modeHandlerMock, raw));
    sheet.cleanCmpData();
    expect(sheet.getData()).toEqual(save);
    mockedWaitDefs.itHasWaitedEverything();
    expect(sheet.getData()).toEqual(save);
    data = {
      main: {
        cmpData: {
          a: { love: "test" },
        },
        cmpClasses: {},
        initialized: false,
      },
    };
    save = structuredClone(data);
    sheet = new Sheet(raw, new DataBatcher(modeHandlerMock, raw));
    sheet.cleanCmpData();
    expect(sheet.getData()).toEqual(save);
    mockedWaitDefs.itHasWaitedEverything();
    expect(sheet.getData()).toEqual(save);
    const large = createLargeObject(30);
    data = {
      main: {
        cmpData: {
          ...large,
          a: { love: "test" },
          [MockServer.UNKNOWN_CMP_ID]: { itWillBe: "deleted" },
          [MockServer.UNKNOWN_CMP_ID + ".b.c"]: { itWillBe: "deleted" },
          [`a.${MockServer.UNKNOWN_CMP_ID}.c`]: { itWillBe: "deleted" },
          [`a.b.${MockServer.UNKNOWN_CMP_ID}`]: { itWillBe: "deleted" },
        },
        cmpClasses: {
          ...large,
          b: { love: "test" },
          ["a" + MockServer.UNKNOWN_CMP_ID]: ["cl1", "cl2"],
          [MockServer.UNKNOWN_CMP_ID + ".a.c"]: ["cl1", "cl2"],
          [`b.${MockServer.UNKNOWN_CMP_ID}.c`]: ["cl1", "cl2"],
          [`b.b.${MockServer.UNKNOWN_CMP_ID}`]: ["cl1", "cl2"],
        },
        initialized: false,
      },
    };
    save = structuredClone(data);
    let save2 = structuredClone(data);
    sheet = new Sheet(raw, new DataBatcher(modeHandlerMock, raw));
    sheet.cleanCmpData();
    expect(sheet.getData()).toEqual(save);
    mockedWaitDefs.itHasWaitedEverything();
    /* @ts-ignore */
    delete save2.main!.cmpData![MockServer.UNKNOWN_CMP_ID];
    /* @ts-ignore */
    delete save2.main!.cmpData![MockServer.UNKNOWN_CMP_ID + ".b.c"];
    /* @ts-ignore */
    delete save2.main!.cmpData![`a.${MockServer.UNKNOWN_CMP_ID}.c`];
    /* @ts-ignore */
    delete save2.main!.cmpData![`a.b.${MockServer.UNKNOWN_CMP_ID}`];
    /* @ts-ignore */
    delete save2.main!.cmpClasses!["a" + MockServer.UNKNOWN_CMP_ID];
    /* @ts-ignore */
    delete save2.main!.cmpClasses![MockServer.UNKNOWN_CMP_ID + ".a.c"];
    /* @ts-ignore */
    delete save2.main!.cmpClasses![`b.${MockServer.UNKNOWN_CMP_ID}.c`];
    /* @ts-ignore */
    delete save2.main!.cmpClasses![`b.b.${MockServer.UNKNOWN_CMP_ID}`];
    expect(sheet.getData()).toEqual(save2);
    expect(sheet.getData()).not.toEqual(save);
    mockedWaitDefs.itHasWaitedEverything();
    expect(sheet.getData()).toEqual(save2);
    expect(sheet.getData()).not.toEqual(save);
  });
});

describe("Sheet get component", () => {
  let sheet1: Sheet;
  let server: MockServer;
  let raw: MockedSheet;

  const initSheet = function (sheetId: string, realId: string) {
    raw = MockSheet({
      id: sheetId,
      realId: realId,
    });
    server.registerMockedSheet(raw);
    return new Sheet(raw, new DataBatcher(modeHandlerMock, raw));
  };

  beforeEach(() => {
    server = new MockServer();
    sheet1 = initSheet("main", "4242");
  });

  test("Prevent errors", () => {
    /* @ts-expect-error On purpose for tests */
    expect(sheet1.get({})).toBeNull();
    /* @ts-expect-error On purpose for tests */
    expect(sheet1.get(123)).toBeNull();
    expect(sheet1.get("123")).toBeNull();
    /* @ts-expect-error On purpose for tests */
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
    expect(sheet1.get("a.b")).toBeInstanceOf(Component);
    expect(sheet1.get("a.b.c")).toBeInstanceOf(Component);
  });

  test("Non existing component search", () => {
    const errorLogSpy = jest.spyOn(lre, "error");
    expect(sheet1.get(MockServer.UNKNOWN_CMP_ID)).toBeNull();
    expect(errorLogSpy).toBeCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(`${MockServer.UNKNOWN_CMP_ID}.b.c`)).toBeNull();
    expect(errorLogSpy).toBeCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(`rep.${MockServer.UNKNOWN_CMP_ID}.c`)).toBeNull();
    expect(errorLogSpy).toBeCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(`rep.b.${MockServer.UNKNOWN_CMP_ID}`)).toBeNull();
    expect(errorLogSpy).toBeCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(MockServer.NULL_CMP_ID)).toBeNull();
    expect(errorLogSpy).toBeCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(`${MockServer.NULL_CMP_ID}.b.c`)).toBeNull();
    expect(errorLogSpy).toBeCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(`rep.${MockServer.NULL_CMP_ID}.c`)).toBeNull();
    expect(errorLogSpy).toBeCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(`rep.b.${MockServer.NULL_CMP_ID}`)).toBeNull();
    expect(errorLogSpy).toBeCalled();
    errorLogSpy.mockClear();

    expect(sheet1.get(MockServer.UNKNOWN_CMP_ID, true)).toBeNull();
    expect(sheet1.get(`${MockServer.UNKNOWN_CMP_ID}.b.c`, true)).toBeNull();
    expect(sheet1.get(`rep.${MockServer.UNKNOWN_CMP_ID}.c`, true)).toBeNull();
    expect(sheet1.get(`rep.b.${MockServer.UNKNOWN_CMP_ID}`, true)).toBeNull();
    expect(sheet1.get(MockServer.NULL_CMP_ID, true)).toBeNull();
    expect(sheet1.get(`${MockServer.NULL_CMP_ID}.b.c`, true)).toBeNull();
    expect(sheet1.get(`rep.${MockServer.NULL_CMP_ID}.c`, true)).toBeNull();
    expect(sheet1.get(`rep.b.${MockServer.NULL_CMP_ID}`, true)).toBeNull();
    expect(errorLogSpy).toBeCalledTimes(0);

    expect(sheet1.componentExists("a")).toBeTruthy();
    expect(sheet1.componentExists(MockServer.NULL_CMP_ID)).toBeFalsy();
    expect(sheet1.componentExists(MockServer.UNKNOWN_CMP_ID)).toBeFalsy();
    sheet1.raw().getData = jest.fn(() => {
      return {
        a: {
          b: {
            c: "ah",
          },
        },
      };
    });
    expect(sheet1.componentExists("a.b")).toBeTruthy();
    expect(sheet1.componentExists("a.b.c")).toBeTruthy();
    expect(sheet1.componentExists("a.z")).toBeFalsy();
    expect(sheet1.componentExists("a.z.y")).toBeFalsy();
    expect(sheet1.componentExists("a.z.y")).toBeFalsy();
    expect(
      sheet1.componentExists(`${MockServer.UNKNOWN_CMP_ID}.b.c`)
    ).toBeFalsy();
    expect(
      sheet1.componentExists(`a.${MockServer.UNKNOWN_CMP_ID}.c`)
    ).toBeFalsy();
    expect(
      sheet1.componentExists(`a.b.${MockServer.UNKNOWN_CMP_ID}`)
    ).toBeFalsy();
    expect(sheet1.componentExists(MockServer.NULL_CMP_ID)).toBeFalsy();
    expect(sheet1.componentExists(`${MockServer.NULL_CMP_ID}.b.c`)).toBeFalsy();
    expect(sheet1.componentExists(`a.${MockServer.NULL_CMP_ID}.c`)).toBeFalsy();
    expect(sheet1.componentExists(`a.b.${MockServer.NULL_CMP_ID}`)).toBeFalsy();
    expect(
      sheet1.componentExists(`${MockServer.NON_EXISTING_CMP_ID}.b.c`)
    ).toBeFalsy();
    expect(
      sheet1.componentExists(`a.${MockServer.NON_EXISTING_CMP_ID}.c`)
    ).toBeFalsy();
    expect(
      sheet1.componentExists(`a.b.${MockServer.NON_EXISTING_CMP_ID}`)
    ).toBeFalsy();

    expect(errorLogSpy).toBeCalledTimes(0);
  });

  test("Sheet remember/forget component", () => {
    (raw.get as jest.Mock).mockClear();
    expect(raw.get).toBeCalledTimes(0);
    sheet1.remember("abc");
    expect(raw.get).toBeCalledTimes(0);
    mockedWaitDefs.itHasWaitedEverything();
    expect(raw.get).toBeCalledTimes(1);
    sheet1.get("abc");
    expect(raw.get).toBeCalledTimes(1);
    sheet1.forget("abc");
    mockedWaitDefs.itHasWaitedEverything();
    sheet1.get("abc");
    expect(raw.get).toBeCalledTimes(2);
  });

  test("Sheet get children of a component", () => {
    const rep = sheet1.get("a")!;
    const searchedIds = ["a.b.c1", "a.b.c2", "a.b.c3", "a.b.c4"];

    const foundCmp = searchedIds.map((id) => sheet1.get(id));
    const knownChildren = sheet1.knownChildren(rep);

    expect(
      foundCmp.every((cmp) => knownChildren.some((child) => child === cmp))
    );
    expect(
      knownChildren.every((children) =>
        foundCmp.some((cmp) => children === cmp)
      )
    );
  });
});

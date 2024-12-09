import { Component } from "../../src/component";
import { ClassChanges, Sheet } from "../../src/sheet/index";
import { LRE } from "../../src/lre";
import { DataBatcher } from "../../src/sheet/databatcher";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import {
  initLetsRole,
  itHasWaitedEverything,
} from "../../src/mock/letsrole/letsrole.mock";
import { ViewMock } from "../../src/mock/letsrole/view.mock";

const createLargeObject = (nbKeys: number): Record<string, number> =>
  Array(nbKeys)
    .fill(0, 0, nbKeys)
    .reduce<Record<string, number>>(
      (obj, _val, idx) => Object.assign(obj, { [`k-${idx}`]: idx }),
      {},
    );

let server: ServerMock;

beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        className: "View",
        children: [
          {
            id: "a",
            className: "Repeater",
            viewId: "vw1",
            readViewId: "vw2",
          },
          {
            id: "b",
            className: "Label",
            text: "test",
          },
          {
            id: "abcd",
            className: "Label",
          },
          {
            id: "abc",
            className: "Label",
          },
          {
            id: "cmp1",
            className: "Label",
          },
        ],
      },
      {
        id: "testedSheet",
        className: "View",
        children: [],
      },
      {
        id: "vw1",
        className: "View",
        children: [],
      },
      {
        id: "vw2",
        className: "View",
        children: [
          {
            id: "c",
            className: "Label",
          },
        ],
      },
    ],
  });
  initLetsRole(server);
  global.lre = new LRE(context);
});

describe("Sheet basics", () => {
  const sheetId = "main";
  let raw: LetsRole.Sheet, sheet: Sheet;
  beforeEach(() => {
    raw = server.openView(sheetId, "4242", {});
    jest.spyOn(raw, "getData");
    jest.spyOn(raw, "getVariable");
    sheet = new Sheet(raw, new DataBatcher(context, raw), context);
  });
  test("Create from raw", () => {
    expect(sheet.lreType()).toEqual("sheet");

    expect(sheet.raw()).toStrictEqual(raw);

    expect(sheet.id()).toEqual(sheetId);

    expect(sheet.sheet()).toStrictEqual(sheet);
  });

  test("pure constructor", () => {
    expect(raw.getData).not.toHaveBeenCalled();
    expect(raw.getVariable).not.toHaveBeenCalled();
  });

  test("has initialization information", () => {
    expect(sheet.isInitialized()).toBeFalsy();

    expect(raw.getData).toHaveBeenCalled();
  });

  test("getVariable calls raw method", () => {
    sheet.getVariable("foo");
    expect(raw.getVariable).toHaveBeenCalledTimes(1);
  });

  test("getSheetId calls raw method", () => {
    jest.spyOn(raw, "getSheetId");
    const res = sheet.getSheetId();
    expect(res).toEqual("4242");
    expect(raw.getSheetId).toHaveBeenCalledTimes(1);
    expect(sheet.getSheetAlphaId()).toBe("Bde");
  });

  test("name and properName call raw methods", () => {
    jest.spyOn(raw, "name");
    jest.spyOn(raw, "properName");
    sheet.name();
    sheet.properName();
    expect(raw.name).toHaveBeenCalledTimes(1);
    expect(raw.properName).toHaveBeenCalledTimes(1);
  });

  test("prompt calls raw method", () => {
    jest.spyOn(raw, "prompt");
    sheet.prompt(
      "title",
      "viewId",
      () => {},
      () => {},
    );
    expect(raw.prompt).toHaveBeenCalledTimes(1);
  });

  test("id() and readId() calls", () => {
    jest.spyOn(raw, "id");
    expect(sheet.id()).toEqual(sheetId);
    expect(sheet.realId()).toEqual(sheetId);
    expect(raw.id).toHaveBeenCalledTimes(2);
  });
});

describe("Sheet data handling", () => {
  const sheetId = "testedSheet";
  let raw: ViewMock, sheet: Sheet;

  beforeEach(() => {
    raw = server.openView(sheetId, "4242", {});
    sheet = new Sheet(raw, new DataBatcher(context, raw), context);
  });

  test("Test sheet mock", () => {
    jest.spyOn(server, "showError");
    raw.setData(createLargeObject(30));
    expect(server.showError).toHaveBeenCalled();

    (server.showError as jest.Mock).mockClear();
    const validObject = createLargeObject(20);
    expect(server.showError).not.toHaveBeenCalled();
    expect(() => raw.setData(validObject)).not.toThrow();
    const raw2 = server.openView(sheetId, "4242");
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
      for (const i in d) {
        data[i] = d[i];
      }
    });
    expect(pendingCb).not.toHaveBeenCalled();
    sheet.setData({
      a: 11,
      d: 4,
    });
    expect(pendingCb).toHaveBeenCalledTimes(1);
    expect(raw.setData).not.toHaveBeenCalled();
    expect(processedCb).not.toHaveBeenCalled();
    expect(sheet.getData()).toEqual({
      a: 11,
      b: 2,
      c: 3,
      d: 4,
    });
    expect(raw.getData).toHaveBeenCalled();
    expect(sheet.getPendingData("a")).toStrictEqual(11);
    itHasWaitedEverything();
    expect(raw.setData).toHaveBeenCalled();
    expect(pendingCb).toHaveBeenCalledTimes(1);
    expect(processedCb).toHaveBeenCalled();
    processedCb.mockClear();

    const newRaw = server.openView(sheetId, "4242", {});
    const prevRaw = sheet.raw();
    expect(newRaw).not.toBe(prevRaw);
    sheet.refreshRaw(newRaw);
    expect(sheet.raw()).toBe(newRaw);
    expect(sheet.raw()).not.toBe(prevRaw);
    expect(pendingCb).toHaveBeenCalledTimes(1);
    sheet.setData({
      a: 11,
      d: 4,
    });
    expect(pendingCb).toHaveBeenCalledTimes(2);
    expect(processedCb).not.toHaveBeenCalled();
    itHasWaitedEverything();
    expect(processedCb).toHaveBeenCalled();
    expect(pendingCb).toHaveBeenCalledTimes(2);
  });

  test("No error when sending too much data", () => {
    jest.spyOn(raw, "setData");
    sheet.setData(createLargeObject(35));
    expect(raw.setData).not.toHaveBeenCalled();
    expect(itHasWaitedEverything).not.toThrow();
    expect(raw.setData).toHaveBeenCalled();
    expect(itHasWaitedEverything).not.toThrow();
    expect(raw.setData).toHaveBeenCalledTimes(2);
  });

  test("Sheet.getData can give a specific component data", () => {
    const repValue: LetsRole.RepeaterValue = {
      a: {
        txt: "ok",
      },
    };
    const data: LetsRole.ViewData = {
      a: 1,
      b: 2,
      c: 3,
      rep: repValue,
    };
    raw.getData = jest.fn(() => {
      return data;
    });
    expect(sheet.getData("a")).toStrictEqual(1);
    expect(sheet.getData("rep")).toStrictEqual(repValue);
    expect(sheet.getData("rep.a")).toStrictEqual(repValue.a);
    expect(sheet.getData("rep.a.txt")).toStrictEqual(repValue.a.txt);
    expect(sheet.getData("b")).toBe(2);
    expect(sheet.getData("b.a")).toBeNull();
    expect(sheet.getData("b.a.txt")).toBeNull();
  });
});

describe("Sheet persisting data", () => {
  let sheet1: Sheet, sheet2: Sheet;

  const initSheet = function (sheetId: string, realId: string): Sheet {
    const raw = server.openView(sheetId, realId);
    return new Sheet(raw, new DataBatcher(context, raw), context);
  };

  beforeEach(() => {
    sheet1 = initSheet("main", "4242");
    sheet2 = initSheet("main", "4242");
  });
  test("Persisting data shared between sheets", () => {
    sheet1.persistingData("test", 42);
    expect(sheet1.persistingData("test")).toStrictEqual(42);
    itHasWaitedEverything();
    const testSheet = initSheet("main", "4242");
    expect(testSheet.persistingData("test")).toStrictEqual(42);
    sheet2.persistingData("test", 43);
    expect(sheet1.persistingData("test")).toStrictEqual(42);
    itHasWaitedEverything();
    expect(sheet1.persistingData("test")).toStrictEqual(43);
    sheet1.persistingData("test", 44);
    sheet2.persistingData("test2", 54);
    expect(sheet1.persistingData("test")).toStrictEqual(44);
    expect(sheet2.persistingData("test2")).toStrictEqual(54);
    expect(sheet1.persistingData("test2")).toBeUndefined();
    expect(sheet2.persistingData("test")).toStrictEqual(43);
    itHasWaitedEverything();
    expect(sheet1.persistingData("test")).toStrictEqual(44);
    expect(sheet2.persistingData("test2")).toStrictEqual(54);
    expect(sheet1.persistingData("test2")).toStrictEqual(54);
    expect(sheet2.persistingData("test")).toStrictEqual(44);

    sheet1.deletePersistingData("test2");
    expect(sheet1.persistingData("test2")).toBeUndefined();
    itHasWaitedEverything();
    expect(sheet2.persistingData("test2")).toBeUndefined();

    sheet2.persistingData("test2", 55);
    expect(sheet1.persistingData("test2")).toBeUndefined();
    expect(sheet2.persistingData("test2")).toStrictEqual(55);
    itHasWaitedEverything();
    expect(sheet1.persistingData("test2")).toStrictEqual(55);
    expect(sheet2.persistingData("test2")).toStrictEqual(55);
    sheet1.deletePersistingData("test2");
    sheet2.persistingData("test2", 56);
    expect(sheet1.persistingData("test2")).toBeUndefined();
    expect(sheet2.persistingData("test2")).toStrictEqual(56);
    itHasWaitedEverything();
    expect(sheet1.persistingData("test2")).toBeUndefined();
    expect(sheet2.persistingData("test2")).toBeUndefined();
    sheet1.persistingData("test3", 3);
    sheet2.deletePersistingData("test3");
    expect(sheet1.persistingData("test3")).toStrictEqual(3);
    expect(sheet2.persistingData("test3")).toBeUndefined();
    itHasWaitedEverything();
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
    itHasWaitedEverything();
    expect(sheet2.isInitialized()).toBeTruthy();
  });

  test("Persisting cmp data", () => {
    const newData = {
      v1: 1,
      v2: 2,
    };
    const v = sheet1.persistingCmpData("123", newData);
    jest.spyOn(sheet1.raw(), "setData");
    expect(sheet1.raw().setData).not.toHaveBeenCalled();
    expect(itHasWaitedEverything).not.toThrow();
    expect(sheet1.raw().setData).toHaveBeenCalled();
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
    itHasWaitedEverything();
    expect(sheet1.persistingCmpData("123")).toEqual({
      ...newData1,
      ...newData2,
    });
    expect(sheet2.persistingCmpData("123")).toEqual({
      ...newData1,
      ...newData2,
    });
    const newRawSheet1 = server.openView(sheet1.id(), sheet1.getSheetId());
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
    itHasWaitedEverything();
    expect(sheet1.persistingCmpData("123")).toEqual(result);
    expect(sheet2.persistingCmpData("123")).toEqual(result);
  });

  test("Persisting cmp classes", () => {
    const c: ClassChanges = { class1: 1 };
    expect(sheet1.persistingCmpClasses("123", c)).toEqual(c);
    expect(sheet1.persistingCmpClasses("123")).toEqual(c);
    expect(sheet2.persistingCmpClasses("123")).not.toEqual(c);
    expect(itHasWaitedEverything).not.toThrow();
    expect(sheet2.persistingCmpClasses("123")).toEqual(c);
    const c1: ClassChanges = { class1: -1, class1b: 1 };
    const c2: ClassChanges = { class2: 1 };
    sheet1.persistingCmpClasses("123", c1);
    sheet2.persistingCmpClasses("123", c2);
    expect(itHasWaitedEverything).not.toThrow();
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

  beforeEach(() => {
    raw = server.openView("main", "123");
  });

  test("Clean data", () => {
    let data = {
      main: {
        cmpData: {} as Partial<Record<LetsRole.ComponentID, LetsRole.ViewData>>,
        cmpClasses: {} as Partial<
          Record<LetsRole.ComponentID, Array<LetsRole.ClassName>>
        >,
        initialized: false,
      },
    };
    raw.getData = jest.fn(() => data);
    raw.setData = jest.fn((d) => (data = { ...data, ...d }));
    let save = structuredClone(data);
    let sheet = new Sheet(raw, new DataBatcher(context, raw), context);
    sheet.cleanCmpData();
    expect(sheet.getData()).toEqual(save);
    itHasWaitedEverything();
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
    sheet = new Sheet(raw, new DataBatcher(context, raw), context);
    sheet.cleanCmpData();
    expect(sheet.getData()).toEqual(save);
    itHasWaitedEverything();
    expect(sheet.getData()).toEqual(save);
    const large = createLargeObject(30);
    data = {
      main: {
        cmpData: {
          ...large,
          a: { love: "test" },
          unknown1: { itWillBe: "deleted" },
          "unknown2.b.c": { itWillBe: "deleted" },
          "a.unknown.c": { itWillBe: "deleted" },
          "a.b.unknown": { itWillBe: "deleted" },
        },
        cmpClasses: {
          ...large,
          //b: { love: "test" },
          aUnknown: ["cl1", "cl2"],
          "unknown.a.c": ["cl1", "cl2"],
          "b.unknown.c": ["cl1", "cl2"],
          "b.b.unknown": ["cl1", "cl2"],
        },
        initialized: false,
      },
    };

    for (const o in large) {
      server.dynamicAddComponentToView("main", {
        id: o,
        className: "Label",
        text: "test",
      });
    }

    save = structuredClone(data);
    const save2 = structuredClone(data);
    sheet = new Sheet(raw, new DataBatcher(context, raw), context);
    sheet.cleanCmpData();
    expect(sheet.getData()).toEqual(save);
    itHasWaitedEverything();
    delete save2.main!.cmpData!["unknown1"];
    delete save2.main!.cmpData!["unknown.b.c"];
    delete save2.main!.cmpData![`a.unknown.c`];
    delete save2.main!.cmpData![`a.b.unknown`];
    delete save2.main!.cmpData![`unknown2.b.c`];
    delete save2.main!.cmpClasses!["aUnknown"];
    delete save2.main!.cmpClasses!["unknown.a.c"];
    delete save2.main!.cmpClasses![`b.unknown.c`];
    delete save2.main!.cmpClasses![`b.b.unknown`];
    expect(sheet.getData()).toEqual(save2);
    expect(sheet.getData()).not.toEqual(save);
    itHasWaitedEverything();
    expect(sheet.getData()).toEqual(save2);
    expect(sheet.getData()).not.toEqual(save);
  });
});

describe("Sheet get component", () => {
  let sheet1: Sheet;
  let raw: ViewMock;

  const initSheet = function (
    sheetId: string,
    realId: string,
    data: LetsRole.ViewData | undefined = undefined,
  ): Sheet {
    raw = server.openView(sheetId, realId, data);
    return new Sheet(raw, new DataBatcher(context, raw), context);
  };

  beforeEach(() => {
    sheet1 = initSheet("main", "4242", {
      a: {
        b: {},
      },
    });
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
    expect(sheet1.get("unknown")).toBeNull();
    expect(errorLogSpy).toHaveBeenCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(`unknown.b.c`)).toBeNull();
    expect(errorLogSpy).toHaveBeenCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(`rep.unknown.c`)).toBeNull();
    expect(errorLogSpy).toHaveBeenCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(`rep.b.unknown`)).toBeNull();
    expect(errorLogSpy).toHaveBeenCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get("nullCmp")).toBeNull();
    expect(errorLogSpy).toHaveBeenCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(`nullCmp.b.c`)).toBeNull();
    expect(errorLogSpy).toHaveBeenCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(`rep.nullCmp.c`)).toBeNull();
    expect(errorLogSpy).toHaveBeenCalled();
    errorLogSpy.mockClear();
    expect(sheet1.get(`rep.b.nullCmp`)).toBeNull();
    expect(errorLogSpy).toHaveBeenCalled();
    errorLogSpy.mockClear();

    expect(sheet1.get("unknown", true)).toBeNull();
    expect(sheet1.get(`unknown.b.c`, true)).toBeNull();
    expect(sheet1.get(`rep.unknown.c`, true)).toBeNull();
    expect(sheet1.get(`rep.b.unknown`, true)).toBeNull();
    expect(sheet1.get("nullCmp", true)).toBeNull();
    expect(sheet1.get(`nullCmp.b.c`, true)).toBeNull();
    expect(sheet1.get(`rep.nullCmp.c`, true)).toBeNull();
    expect(sheet1.get(`rep.b.nullCmp`, true)).toBeNull();
    expect(errorLogSpy).toHaveBeenCalledTimes(0);

    expect(sheet1.componentExists("a")).toBeTruthy();
    expect(sheet1.componentExists("nullCmp")).toBeFalsy();
    expect(sheet1.componentExists("unknown")).toBeFalsy();
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
    expect(sheet1.componentExists(`unknown.b.c`)).toBeFalsy();
    expect(sheet1.componentExists(`a.unknown.c`)).toBeFalsy();
    expect(sheet1.componentExists(`a.b.unknown`)).toBeFalsy();
    expect(sheet1.componentExists("nullCmp")).toBeFalsy();
    expect(sheet1.componentExists(`nullCmp.b.c`)).toBeFalsy();
    expect(sheet1.componentExists(`a.nullCmp.c`)).toBeFalsy();
    expect(sheet1.componentExists(`a.b.nullCmp`)).toBeFalsy();
    expect(sheet1.componentExists(`nonexisting.b.c`)).toBeFalsy();
    expect(sheet1.componentExists(`a.nonexisting.c`)).toBeFalsy();
    expect(sheet1.componentExists(`a.b.nonexisting`)).toBeFalsy();

    expect(errorLogSpy).toHaveBeenCalledTimes(0);
  });

  test("Sheet remember/forget component", () => {
    jest.spyOn(raw, "get");
    expect(raw.get).toHaveBeenCalledTimes(0);
    sheet1.remember("abc");
    expect(raw.get).toHaveBeenCalledTimes(0);
    itHasWaitedEverything();
    expect(raw.get).toHaveBeenCalledTimes(1);
    sheet1.get("abc");
    expect(raw.get).toHaveBeenCalledTimes(1);
    sheet1.forget("abc");
    itHasWaitedEverything();
    sheet1.get("abc");
    expect(raw.get).toHaveBeenCalledTimes(2);
  });

  test("Sheet get children of a component", () => {
    const rep = sheet1.get("a")! as IComponent;
    const searchedIds = ["a.b.c1", "a.b.c2", "a.b.c3", "a.b.c4"];

    const foundCmp = searchedIds.map((id) => sheet1.get(id));
    const knownChildren = sheet1.knownChildren(rep);

    expect(
      foundCmp.every((cmp) => knownChildren.some((child) => child === cmp)),
    );
    expect(
      knownChildren.every((children) =>
        foundCmp.some((cmp) => children === cmp),
      ),
    );
  });

  test("Sheet get group", () => {
    const grp = sheet1.group(`grpUnknown`);
    expect(grp.lreType()).toBe("group");
    let grp2;
    expect(() => (grp2 = sheet1.group("cmp1"))).toThrow();
    expect(grp2).toBeUndefined();

    const grp3 = sheet1.group(`grpUnknown`);
    expect(grp3).toBe(grp);

    const grp4 = sheet1.get(`grpUnknown`);
    expect(grp4).toBe(grp);
  });
});

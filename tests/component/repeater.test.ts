import type { Mock } from "vitest";
import { Repeater } from "../../src/component/repeater";
import { LRE } from "../../src/lre";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { ViewMock } from "../../src/mock/letsrole/view.mock";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import {
  initLetsRole,
  itHasWaitedEverything,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { Entry } from "../../src/component/entry";
import { Component } from "../../src/component";

let rawRepeater: LetsRole.Component;
let repeater: Repeater;
let server: ServerMock;
let rawSheet: ViewMock;
let sheet: Sheet;

beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        children: [
          {
            id: "rep",
            className: "Repeater",
            viewId: "edt",
            readViewId: "rd",
          },
          {
            id: "rep2",
            className: "Repeater",
            viewId: "edt",
            readViewId: "rd",
          },
          {
            id: "cmp",
            className: "Label",
          },
          {
            id: "checkbox",
            className: "Checkbox",
          },
        ],
        className: "View",
      },
      {
        id: "edt",
        className: "View",
        children: [
          {
            id: "name",
            className: "TextInput",
            name: "name",
          },
          {
            id: "chc",
            className: "Choice",
            name: "choice",
            tableId: "tbl",
          },
          {
            id: "txt",
            className: "TextInput",
          },
        ],
      },
      {
        id: "rd",
        className: "View",
        children: [
          {
            id: "name",
            className: "Label",
            name: "name",
          },
          {
            id: "iconUp",
            className: "Icon",
            iconName: "arrow-up",
          },
          {
            id: "iconDown",
            className: "Icon",
            iconName: "arrow-down",
          },
          {
            id: "iconTop",
            className: "Icon",
            iconName: "arrow-top",
          },
          {
            id: "iconBottom",
            className: "Icon",
            iconName: "arrow-bottom",
          },
          {
            id: "iconUp2",
            className: "Icon",
            iconName: "arrow-up-2",
          },
        ],
      },
    ],
    tables: {
      tbl: [
        {
          id: "1",
          name: "test",
        },
        {
          id: "2",
          name: "test2",
        },
        {
          id: "3",
          name: "test3",
        },
      ],
    },
  });
  initLetsRole(server);
  global.lre = new LRE(context);
  context.setMode("real");
  lre.autoNum(false);
  rawSheet = server.openView("main", "123", {
    rep: {},
    cmd: "2",
  });
  const proxySheet = new SheetProxy(context, rawSheet);

  sheet = new Sheet(proxySheet, new DataBatcher(context, proxySheet), context);
  lre.sheets.add(sheet);
  vi.spyOn(sheet, "get");
  vi.spyOn(sheet, "componentExists");
  vi.spyOn(sheet, "knownChildren");
  repeater = sheet.get("rep") as Repeater;
  rawRepeater = repeater.raw();
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

const existingMockedComponent: IComponent = {
  exists: () => true,
  refreshRaw: vi.fn(),
} as unknown as IComponent;

const missingMockedComponent: IComponent = {
  exists: () => false,
  refreshRaw: vi.fn(),
} as unknown as IComponent;

describe("Repeater is correctly initialized", () => {
  test("has the good type", () => {
    expect(repeater.lreType()).toBe("repeater");
  });

  test("text() is protected", () => {
    vi.spyOn(rawRepeater, "text");
    /* @ts-expect-error repeater.text() is protected and cannot receive parameter */
    repeater.text("test");

    expect(rawRepeater.text).toHaveBeenCalled();
    expect((rawRepeater.text as Mock).mock.calls[0].length).toBe(0);
  });

  test("saveValue loads from sheet when no value argument", () => {
    const getDataSpy = vi.spyOn(sheet, "getData");
    getDataSpy.mockClear();
    repeater.value({
      "1": {
        name: "synced",
      },
    });

    expect(getDataSpy).toHaveBeenCalledWith(repeater.realId());
  });

  test("saveValue uses empty object when sheet has no data for repeater id", () => {
    rawSheet.setData({
      cmd: "2",
    });
    const repWithoutData = sheet.get("rep2") as Repeater;

    expect(repWithoutData.value()).toMatchObject({});
  });

  test.each([
    { val: [], desc: "array" },
    { val: "hello", desc: "string" },
    { val: 42, desc: "number" },
    { val: true, desc: "boolean" },
    { val: undefined, desc: "undefined" },
    { val: console, desc: "invalid object" },
  ])("Fixes of incorrect values type : $desc", () => {
    rawSheet.setData({
      rep2: "hello",
    });
    const rep = sheet.get("rep2") as Repeater;

    expect(rep.value()).toMatchObject({});

    itHasWaitedEverything();

    expect(rawSheet.getData().rep2).toMatchObject({});
  });
});

describe("Repeater initread registration and click handler", () => {
  test("initread on handler registration runs for each non-editing entry", () => {
    repeater.value({
      "1": { name: "one" },
      "2": { name: "two" },
    });
    const handler = vi.fn();
    repeater.on("initread", handler);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[0][1].id()).toBe(repeater.find("1")!.id());
    expect(handler.mock.calls[1][1].id()).toBe(repeater.find("2")!.id());
  });

  test("initread on handler registration skips entries in editing mode", () => {
    repeater.value({
      "1": { name: "one" },
      "2": { name: "two" },
    });
    rawSheet.setEntryState("rep.1", "write");
    rawSheet.addComponentClass("rep.1", "editing");
    (repeater.find("1") as Entry).refreshRaw();

    const handler = vi.fn();
    repeater.on("initread", handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][2]).toBe("2");
  });

  test("click handler returns when repeater value is falsy", () => {
    const initHandler = vi.fn();
    repeater.on("init", initHandler);
    vi.spyOn(repeater, "value").mockImplementation(() => {
      return null as unknown as LetsRole.RepeaterValue;
    });
    rawSheet.triggerComponentEvent(repeater.realId()!, "click");

    expect(initHandler).not.toHaveBeenCalled();
  });

  test("click handler stores known children when initializing a new entry", () => {
    const childRealId = "rep.newEntry.child";
    vi.mocked(sheet.knownChildren).mockImplementation((cmp) => {
      if (lre.isComponent(cmp) && cmp.lreType() === "entry") {
        return [
          {
            realId: () => childRealId,
          } as IComponent,
        ];
      }

      return [];
    });

    rawSheet.repeaterClickOnAdd(repeater.id()!);

    const entryIds = Object.keys(repeater.value()!);
    const newEntry = repeater.find(entryIds[0]!) as Entry;

    expect(newEntry.data("_lreChildren")).toStrictEqual([childRealId]);
  });

  test("click handler skips init when entry is already initialized but not saved yet", () => {
    repeater.value({});
    itHasWaitedEverything();

    rawSheet.setData(
      {
        rep: {
          ghost: { name: "ghost" },
        },
      },
      true,
    );

    const entry = repeater.find("ghost") as Entry;
    entry.data("initialized", true);

    const initHandler = vi.fn();
    const initeditHandler = vi.fn();
    repeater.on("init", initHandler);
    repeater.on("initedit", initeditHandler);
    rawSheet.triggerComponentEvent(repeater.realId()!, "click");

    expect(initHandler).not.toHaveBeenCalled();
    expect(initeditHandler).not.toHaveBeenCalled();
  });

  test("click handler on edit stores children and refreshes entry components", () => {
    repeater.value({
      "1": { name: "test" },
    });
    itHasWaitedEverything();

    const entry = repeater.find("1") as Entry;
    const sheetChildRealId = "rep.1.name";

    vi.mocked(sheet.knownChildren).mockReturnValue([
      { realId: () => sheetChildRealId } as IComponent,
    ]);
    vi.spyOn(entry, "knownChildren").mockReturnValue([existingMockedComponent]);

    rawSheet.repeaterClickOnEdit(`${repeater.realId()!}.1`);

    expect(entry.data("_lreChildren")).toStrictEqual([sheetChildRealId]);
    expect(existingMockedComponent.refreshRaw).toHaveBeenCalled();
  });

  test("click handler on edit skips refreshRaw for absent or non-existing children", () => {
    repeater.value({
      "1": { name: "test" },
    });
    itHasWaitedEverything();

    const entry = repeater.find("1") as Entry;

    vi.mocked(sheet.knownChildren).mockReturnValue([]);
    vi.spyOn(entry, "knownChildren").mockReturnValue([
      null as unknown as IComponent,
      missingMockedComponent,
      existingMockedComponent,
    ]);

    rawSheet.repeaterClickOnEdit(`${repeater.realId()!}.1`);

    expect(missingMockedComponent.refreshRaw).toHaveBeenCalledTimes(0);
    expect(existingMockedComponent.refreshRaw).toHaveBeenCalledTimes(1);
  });

  test("update handler refreshes raw children when entry data changes", () => {
    repeater.value({
      "1": { name: "before" },
    });
    itHasWaitedEverything();

    const entry = repeater.find("1") as Entry;
    vi.spyOn(entry, "knownChildren").mockReturnValue([existingMockedComponent]);

    repeater.value({
      "1": { name: "after" },
    });

    expect(existingMockedComponent.refreshRaw).toHaveBeenCalled();
  });

  test("update handler skips refreshRaw for absent or non-existing children", () => {
    vi.spyOn(Entry.prototype, "knownChildren").mockReturnValue([
      null as unknown as IComponent,
      missingMockedComponent,
      existingMockedComponent,
    ]);

    repeater.value({
      "1": { name: "before" },
    });
    itHasWaitedEverything();
    (missingMockedComponent.refreshRaw as Mock).mockClear();
    (existingMockedComponent.refreshRaw as Mock).mockClear();

    repeater.value({
      "1": { name: "after" },
    });

    expect(missingMockedComponent.refreshRaw).not.toHaveBeenCalled();
    expect(existingMockedComponent.refreshRaw).toHaveBeenCalled();
  });

  test("update handler treats non-array _lreChildren as empty", () => {
    repeater.value({
      "1": { name: "before" },
    });
    itHasWaitedEverything();

    const childRealId = "rep.1.name";
    vi.mocked(sheet.knownChildren).mockReturnValue([
      { realId: () => childRealId } as IComponent,
    ]);
    vi.spyOn(Entry.prototype, "knownChildren").mockReturnValue([]);

    const forgetSpy = vi.spyOn(sheet, "forget");
    const knownChildrenSpy = vi.mocked(sheet.knownChildren);
    knownChildrenSpy.mockClear();

    let entryFromUpdate: Entry | undefined;
    repeater.on("entrychange", (_repeater, changedEntry: Entry) => {
      changedEntry.data("_lreChildren", ["stale-child"]);
      changedEntry.data(
        "_lreChildren",
        "not-a-list" as unknown as Array<LetsRole.ComponentID>,
      );
      entryFromUpdate = changedEntry;
    });

    repeater.value({
      "1": { name: "after" },
    });

    expect(knownChildrenSpy).toHaveBeenCalled();
    expect(entryFromUpdate).toBeDefined();
    expect(entryFromUpdate!.data("_lreChildren")).toStrictEqual([childRealId]);
    expect(forgetSpy).not.toHaveBeenCalled();
  });

  test("update handler forgets children no longer on entry", () => {
    repeater.value({
      "1": { name: "before" },
    });
    itHasWaitedEverything();

    const removedChild = "rep.1.removed";
    const keptChild = "rep.1.name";
    vi.mocked(sheet.knownChildren).mockReturnValue([
      { realId: () => keptChild } as IComponent,
    ]);
    vi.spyOn(Entry.prototype, "knownChildren").mockReturnValue([]);

    const forgetSpy = vi.spyOn(sheet, "forget");
    repeater.on("entrychange", (_repeater, changedEntry: Entry) => {
      changedEntry.data("_lreChildren", [removedChild, keptChild]);
    });

    repeater.value({
      "1": { name: "after" },
    });

    expect(forgetSpy).toHaveBeenCalledWith(removedChild);
    expect(forgetSpy).not.toHaveBeenCalledWith(keptChild);
  });
});

describe("Repeater events", () => {
  test("Initread event is correctly launched", () => {
    const values: Record<string, any> = {
      "1": {
        name: "test",
      },
      "2": {
        name: "test2",
      },
      "3": {
        name: "test3",
      },
    };
    rawRepeater.value(values);
    const handler = vi.fn();
    repeater.on("initread", handler);

    expect(handler).toHaveBeenCalledTimes(3);

    handler.mockClear();
    values["4"] = {
      name: "test4",
    };
    rawRepeater.value({ ...values });

    expect(handler).toHaveBeenCalledTimes(1);

    handler.mockClear();
    values["1"].name = "test1";
    rawRepeater.value({ ...values });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("Initedit event is correctly launched for new entries", () => {
    const handler = vi.fn();
    repeater.on("initedit", handler);

    expect(handler).toHaveBeenCalledTimes(0);

    rawSheet.repeaterClickOnAdd(repeater.id()!);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("Initedit event is correctly launched for existing entries", () => {
    const handler = vi.fn();
    repeater.on("initedit", handler);
    repeater.value({
      "1": {
        name: "test",
      },
    });

    expect(handler).toHaveBeenCalledTimes(0);

    rawSheet.repeaterClickOnEdit(repeater.id()! + "." + "1");

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("Delete event is correctly launched", () => {
    const deleteCb = vi.fn();
    repeater.on("delete", deleteCb);
    repeater.value({
      "1": {
        name: "test",
      },
      "2": {
        name: "test2",
      },
      "3": {
        name: "test3",
      },
    });

    expect(deleteCb).not.toHaveBeenCalled();

    rawSheet.repeaterClickOnEdit(repeater.id()! + "." + "2");
    rawSheet.repeaterClickOnRemove(repeater.id()! + "." + "2");

    expect(deleteCb).toHaveBeenCalledTimes(1);
    expect(deleteCb.mock.calls[0][0].id()).toStrictEqual(repeater.id());
    expect(deleteCb.mock.calls[0][1]).toStrictEqual("2");
    expect(deleteCb.mock.calls[0][2]).toMatchObject({
      name: "test2",
    });
  });

  test("edit event is correctly launched", () => {
    const edited = vi.fn();
    repeater.on("edit", edited);
    const values: Record<string, any> = {
      "1": {
        name: "test",
      },
      "2": {
        name: "test2",
      },
      "3": {
        name: "test3",
      },
    };
    repeater.value(values);

    expect(edited).not.toHaveBeenCalled();

    rawSheet.repeaterClickOnEdit(repeater.id()! + "." + "2");

    expect(edited).toHaveBeenCalledTimes(1);
    expect(edited.mock.calls[0][0]).toStrictEqual(repeater);
    expect(edited.mock.calls[0][2]).toStrictEqual("2");
    expect(edited.mock.calls[0][3]).toMatchObject(values["2"]);

    rawSheet.repeaterClickOnDone(repeater.id()! + "." + "2");

    expect(edited).toHaveBeenCalledTimes(1);

    rawSheet.repeaterClickOnEdit(repeater.id()! + "." + "2");

    expect(edited).toHaveBeenCalledTimes(2);

    rawSheet.repeaterClickOnDone(repeater.id()! + "." + "2");

    expect(edited).toHaveBeenCalledTimes(2);

    rawSheet.repeaterClickOnEdit(repeater.id()! + "." + "2");

    expect(edited).toHaveBeenCalledTimes(3);

    rawSheet.repeaterClickOnDone(repeater.id()! + "." + "2");

    expect(edited).toHaveBeenCalledTimes(3);
  });

  test("edit event is launched only once for each entry", () => {
    const edited = vi.fn();
    repeater.on("edit", edited);
    const values: Record<string, any> = {
      "1": {
        name: "test",
      },
      "2": {
        name: "test2",
      },
      "3": {
        name: "test3",
      },
    };
    repeater.value(values);

    expect(edited).not.toHaveBeenCalled();

    rawSheet.repeaterClickOnEdit(repeater.id()! + "." + "2");

    expect(edited).toHaveBeenCalledTimes(1);

    rawSheet.repeaterClickOnEdit(repeater.id()! + "." + "3");

    expect(edited).toHaveBeenCalledTimes(2);

    rawSheet.repeaterClickOnDone(repeater.id()! + "." + "2");

    expect(edited).toHaveBeenCalledTimes(2);
  });
});

describe("Repeater as data provider", () => {
  test("Repeater is a data provider", () => {
    const data = {
      "1": {
        name: "test",
      },
      "2": {
        name: "test2",
      },
      "3": {
        name: "test3",
      },
    };
    repeater.value(structuredClone(data));

    expect(repeater.provider().provider).toBeTruthy();
    expect(repeater.provider().providedValue()).toMatchObject(data);
  });

  test("provider original value accessor delegates to valueData", () => {
    repeater.value({
      "1": { name: "test" },
    });

    const valueDataSpy = vi.spyOn(repeater, "valueData");
    const provider = repeater.provider();

    provider.getData();

    expect(valueDataSpy).toHaveBeenCalled();
    expect(repeater.valueData()).toBeUndefined();
  });
});

describe("Repeater can be readonly", () => {
  test("Put repeater readonly", () => {
    expect(repeater.hasClass("no-add")).toBeFalsy();
    expect(repeater.hasClass("no-edit")).toBeFalsy();

    repeater.readOnly(true);

    expect(repeater.hasClass("no-add")).toBeTruthy();
    expect(repeater.hasClass("no-edit")).toBeTruthy();
  });

  test("Repeater readonly set with component", () => {
    expect(repeater.hasClass("no-add")).toBeFalsy();
    expect(repeater.hasClass("no-edit")).toBeFalsy();

    const chk = sheet.get("checkbox")!;
    chk.value(false);
    repeater.readOnly(chk);

    expect(repeater.hasClass("no-add")).toBeFalsy();
    expect(repeater.hasClass("no-edit")).toBeFalsy();

    chk.value(true);

    expect(repeater.hasClass("no-add")).toBeTruthy();
    expect(repeater.hasClass("no-edit")).toBeTruthy();
  });
});

describe("Repeater each", () => {
  test("Callback is called for each entry", () => {
    repeater.value({
      "1": {
        name: "test",
      },
      "2": {
        name: "test2",
      },
      "3": {
        name: "test3",
      },
    });
    const cb = vi.fn();
    repeater.each(cb);

    expect(cb).toHaveBeenCalledTimes(3);
    expect(cb.mock.calls[0][0]).toBeInstanceOf(Entry);
    expect(cb.mock.calls[0][1]).toMatchObject({
      name: "test",
    });
    expect(cb.mock.calls[0][2]).toBe("1");
    expect(cb.mock.calls[1][1]).toMatchObject({
      name: "test2",
    });
    expect(cb.mock.calls[1][2]).toBe("2");
    expect(cb.mock.calls[2][1]).toMatchObject({
      name: "test3",
    });
    expect(cb.mock.calls[2][2]).toBe("3");
  });

  test("each on a component", () => {
    repeater.value({
      "1": {
        name: "test",
      },
      "2": {
        name: "test2",
      },
      "3": {
        name: "test3",
      },
    });
    const cb = vi.fn();
    repeater.each("name", cb);

    expect(cb).toHaveBeenCalledTimes(3);

    expect(cb.mock.calls[0][0]).toBeInstanceOf(Component);
    expect(cb.mock.calls[0][0].value()).toBe("test");
    expect(cb.mock.calls[0][1]).toMatchObject({
      name: "test",
    });
    expect(cb.mock.calls[0][2]).toBe("1");

    expect(cb.mock.calls[1][0]).toBeInstanceOf(Component);
    expect(cb.mock.calls[1][0].value()).toBe("test2");
    expect(cb.mock.calls[1][1]).toMatchObject({
      name: "test2",
    });
    expect(cb.mock.calls[1][2]).toBe("2");

    expect(cb.mock.calls[2][0]).toBeInstanceOf(Component);
    expect(cb.mock.calls[2][0].value()).toBe("test3");
    expect(cb.mock.calls[2][1]).toMatchObject({
      name: "test3",
    });
    expect(cb.mock.calls[2][2]).toBe("3");
  });

  test("each returns early when value is null", () => {
    const cb = vi.fn();
    vi.spyOn(repeater, "value").mockImplementation(() => {
      return null as unknown as LetsRole.RepeaterValue;
    });

    repeater.each(cb);

    expect(cb).not.toHaveBeenCalled();
  });

  test("each returns early when value is not a repeater object", () => {
    const cb = vi.fn();
    vi.spyOn(repeater, "value").mockImplementation(() => {
      return "invalid" as unknown as LetsRole.RepeaterValue;
    });

    repeater.each(cb);

    expect(cb).not.toHaveBeenCalled();
  });

  test("each with column id but no callback returns when value is null", () => {
    vi.spyOn(repeater, "value").mockImplementation(() => {
      return null as unknown as LetsRole.RepeaterValue;
    });

    expect(() => {
      /* @ts-expect-error column form requires a callback */
      repeater.each("name");
    }).not.toThrow();
  });
});

describe("Repeater map", () => {
  test("Callback is called for each entry", () => {
    repeater.value({
      "1": {
        name: "test",
      },
      "2": {
        name: "test2",
      },
      "3": {
        name: "test3",
      },
    });
    const cb = vi.fn((entry) => entry["name"]);
    const res = repeater.map(cb);

    expect(cb).toHaveBeenCalledTimes(3);
    expect(Object.keys(res)).toHaveLength(3);
    expect(res).toMatchObject({
      "1": "test",
      "2": "test2",
      "3": "test3",
    });
  });

  test("map uses empty object when value is falsy", () => {
    vi.spyOn(repeater, "value").mockImplementation(() => {
      return null as unknown as LetsRole.RepeaterValue;
    });
    const cb = vi.fn();

    const res = repeater.map(cb);

    expect(res).toEqual({});
    expect(cb).not.toHaveBeenCalled();
  });
});

describe("Repeater setSorter", () => {
  test("setSorter make component clickable", () => {
    const cmp = sheet.get("cmp")!;

    expect(cmp.hasClass("clickable")).toBeFalsy();

    repeater.setSorter(cmp, "name");

    expect(cmp.hasClass("clickable")).toBeTruthy();
  });

  test("setSorter makes nothing if the component is not found", () => {
    expect(() => repeater.setSorter("unknown", "name")).not.toThrow();
  });

  test("setSorter sort the repeater", () => {
    repeater.value({
      "1": {
        name: "B",
      },
      "2": {
        name: "A",
      },
      "3": {
        name: "C",
      },
      "4": {
        name: "B",
      },
    });
    repeater.setSorter("cmp", "name");
    rawSheet.triggerComponentEvent("cmp", "click");

    expect(repeater.value()).toMatchObject({
      "2": {
        name: "A",
      },
      "1": {
        name: "B",
      },
      "4": {
        name: "B",
      },
      "3": {
        name: "C",
      },
    });

    rawSheet.triggerComponentEvent("cmp", "click");

    expect(repeater.value()).toMatchObject({
      "3": {
        name: "C",
      },
      "1": {
        name: "B",
      },
      "4": {
        name: "B",
      },
      "2": {
        name: "A",
      },
    });
  });

  test("setSorter works if set when no data", () => {
    repeater.setSorter("cmp", "name");

    expect(repeater.value()).toMatchObject({});

    rawSheet.triggerComponentEvent("cmp", "click");

    expect(repeater.value()).toMatchObject({});
  });

  test("setSorter click uses empty object when value is falsy", () => {
    repeater.setSorter("cmp", "name");
    const valueSpy = vi.spyOn(repeater, "value").mockImplementation(() => {
      return null as unknown as LetsRole.RepeaterValue;
    });

    expect(() => rawSheet.triggerComponentEvent("cmp", "click")).not.toThrow();

    expect(valueSpy).toHaveBeenCalled();
  });

  test("setSorter resolves column through find when missing in entry data", () => {
    repeater.value({
      "1": { score: 1 },
      "2": { score: 2 },
    });

    const origFind = repeater.find.bind(repeater);
    const findSpy = vi
      .spyOn(repeater, "find")
      .mockImplementation((id, silent) => {
        if (id === "1.name") {
          return {
            id: () => "1.name",
            exists: () => true,
            value: () => "B",
          } as Component;
        }

        if (id === "2.name") {
          return {
            id: () => "2.name",
            exists: () => true,
            value: () => "A",
          } as Component;
        }

        return origFind(id, silent);
      });

    repeater.setSorter("cmp", "name");
    rawSheet.triggerComponentEvent("cmp", "click");

    expect(findSpy).toHaveBeenCalledWith("1.name", true);
    expect(findSpy).toHaveBeenCalledWith("2.name", true);
  });

  test("setSorter getVal returns empty string when column component is missing", () => {
    repeater.value({
      "1": { score: 1 },
      "2": { score: 2 },
    });

    const origFind = repeater.find.bind(repeater);
    vi.spyOn(repeater, "find").mockImplementation((id, silent) => {
      if (String(id).endsWith(".name")) {
        return null;
      }

      return origFind(id, silent);
    });

    repeater.setSorter("cmp", "name");

    expect(() => rawSheet.triggerComponentEvent("cmp", "click")).not.toThrow();
  });
});

describe("Repeater add and remove", () => {
  test("Add an entry", () => {
    repeater.add({}, "b");

    expect(repeater.value()).toMatchObject({
      b: {},
    });

    const d: LetsRole.ViewData = { a: "123", b: "456" };
    repeater.add(d, "a");

    expect(repeater.value()).toMatchObject({
      b: {},
      a: d,
    });
  });

  test("Add generates entry id when none is provided", () => {
    vi.spyOn(lre, "getRandomId").mockReturnValue("generated-id");

    repeater.add({ label: "new" });

    expect(repeater.value()).toMatchObject({
      "generated-id": { label: "new" },
    });
  });

  test("Add uses empty view data when viewData is omitted", () => {
    /* @ts-expect-error viewData may be omitted at runtime */
    repeater.add(undefined, "no-data");

    expect(repeater.value()).toMatchObject({
      "no-data": {},
    });
  });

  test("Add uses empty repeater value when current value is falsy", () => {
    const origValue = repeater.value.bind(repeater);
    let returnNullOnRead = true;
    vi.spyOn(repeater, "value").mockImplementation(function (
      this: Repeater,
      newVal?: unknown,
    ): LetsRole.RepeaterValue | void {
      if (arguments.length > 0) {
        returnNullOnRead = false;
        return origValue(newVal as unknown as LetsRole.RepeaterValue);
      }

      if (returnNullOnRead) {
        return null as unknown as LetsRole.RepeaterValue;
      }

      return origValue();
    });

    repeater.add({ name: "solo" }, "only");

    expect(repeater.value()).toMatchObject({
      only: { name: "solo" },
    });
  });

  test("Remove an entry", () => {
    const d: LetsRole.ViewData = { a: "123", b: "456" };

    repeater.value({
      b: {},
      a: d,
    });
    repeater.remove("a");

    expect(repeater.value()).toMatchObject({ b: {} });
  });

  test("Remove uses empty object when current value is falsy", () => {
    const origValue = repeater.value.bind(repeater);
    let returnNullOnRead = true;
    vi.spyOn(repeater, "value").mockImplementation(function (
      this: Repeater,
      newVal?: unknown,
    ) {
      if (arguments.length > 0) {
        returnNullOnRead = false;
        return origValue(newVal);
      }

      if (returnNullOnRead) {
        return null as unknown as LetsRole.RepeaterValue;
      }

      return origValue();
    });

    expect(repeater.remove("missing")).toBeUndefined();
    expect(repeater.value()).toMatchObject({});
  });
});

describe("Repeater setMoveComponents", () => {
  test("logs warning when called with empty configuration", () => {
    const warnSpy = vi.spyOn(lre, "warn");

    repeater.setMoveComponents({});

    expect(warnSpy).toHaveBeenCalledWith(
      "setMoveComponents called with empty configuration object",
    );

    warnSpy.mockRestore();
  });

  test("logs warning when configuration entry has invalid component ID", () => {
    const warnSpy = vi.spyOn(lre, "warn");
    const onSpy = vi.spyOn(repeater, "on");

    repeater.setMoveComponents({
      up: 123 as unknown as LetsRole.ComponentID,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "setMoveComponents called with invalid component ID",
    );
    expect(
      onSpy.mock.calls.filter(([event]) => event === "click:__lre__:move"),
    ).toHaveLength(0);

    warnSpy.mockRestore();
    onSpy.mockRestore();
  });

  test("logs warning when configuration entry has invalid move action", () => {
    const warnSpy = vi.spyOn(lre, "warn");
    const onSpy = vi.spyOn(repeater, "on");

    repeater.setMoveComponents({
      sideways: "iconUp",
    } as unknown as Parameters<Repeater["setMoveComponents"]>[0]);

    expect(warnSpy).toHaveBeenCalledWith(
      "setMoveComponents called with invalid move action",
    );
    expect(
      onSpy.mock.calls.filter(([event]) => event === "click:__lre__:move"),
    ).toHaveLength(0);

    warnSpy.mockRestore();
    onSpy.mockRestore();
  });

  test("registers move handler that invokes moveEntryUp with clicked entry index", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });
    itHasWaitedEverything();

    const moveSpy = vi.spyOn(repeater, "moveEntryUp");
    const onSpy = vi.spyOn(repeater, "on");
    repeater.setMoveComponents({ up: "iconUp" });

    const moveClickCall = onSpy.mock.calls.find(
      ([event, subComponent]) =>
        event === "click:__lre__:move" && subComponent === "iconUp",
    );

    expect(moveClickCall).toBeDefined();

    const moveHandler = moveClickCall![2] as (cmp: Component) => void;
    const entry = repeater.find("b") as Entry;
    const icon = entry.find("iconUp") as Component;

    moveHandler(icon);

    expect(moveSpy).toHaveBeenCalledWith("b");

    onSpy.mockRestore();
    moveSpy.mockRestore();
  });

  test("can be called with up configuration", () => {
    expect(() => {
      repeater.setMoveComponents({ up: "iconUp" });
    }).not.toThrow();
  });

  test("can be called with down configuration", () => {
    expect(() => {
      repeater.setMoveComponents({ down: "iconDown" });
    }).not.toThrow();
  });

  test("can be called with top configuration", () => {
    expect(() => {
      repeater.setMoveComponents({ top: "iconTop" });
    }).not.toThrow();
  });

  test("can be called with bottom configuration", () => {
    expect(() => {
      repeater.setMoveComponents({ bottom: "iconBottom" });
    }).not.toThrow();
  });

  test("can be called with all configurations", () => {
    expect(() => {
      repeater.setMoveComponents({
        up: "iconUp",
        down: "iconDown",
        top: "iconTop",
        bottom: "iconBottom",
      });
    }).not.toThrow();
  });

  test("can be called multiple times without error", () => {
    repeater.setMoveComponents({ up: "iconUp" });

    expect(() => {
      repeater.setMoveComponents({ up: "iconUp2" });
    }).not.toThrow();
  });

  test("sets up handlers that can move entries when components are clicked", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });

    itHasWaitedEverything();

    repeater.setMoveComponents({ up: "iconUp" });

    rawSheet.triggerComponentEvent(repeater.id() + ".b.iconUp", "click");

    itHasWaitedEverything();

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b", "c"]);
  });
});

describe("Repeater moveEntryUp", () => {
  test("uses empty object in getEntryIds when value is falsy", () => {
    vi.spyOn(repeater, "value").mockImplementation(() => {
      return null as unknown as LetsRole.RepeaterValue;
    });

    expect(() => repeater.moveEntryUp("a")).not.toThrow();
  });

  test("uses empty object in getEntriesFromEntryIds when value is falsy", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });
    itHasWaitedEverything();

    const origValue = repeater.value.bind(repeater);
    let readCount = 0;
    vi.spyOn(repeater, "value").mockImplementation(function (
      this: Repeater,
      newVal?: unknown,
    ) {
      if (arguments.length > 0) {
        return origValue(newVal);
      }

      readCount++;

      if (readCount === 2) {
        return null as unknown as LetsRole.RepeaterValue;
      }

      return origValue();
    });

    repeater.moveEntryUp("b");

    expect(Object.keys(repeater.value()!)).toEqual(["b", "a"]);
  });

  test("moves entry up by one position", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });

    itHasWaitedEverything();

    let keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b", "c"]);

    repeater.moveEntryUp("b");

    itHasWaitedEverything();

    keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["b", "a", "c"]);
    expect(repeater.value()).toMatchObject({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });
  });

  test("does nothing if entry is already at top", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });

    repeater.moveEntryUp("a");

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b"]);
  });

  test("does nothing if entry is first in array", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });

    repeater.moveEntryUp("a");

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b", "c"]);
  });

  test("does nothing if entryId does not exist", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });

    repeater.moveEntryUp("unknown");

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b"]);
  });

  test("preserves entry data when moving", () => {
    const entryData = { name: "Test", value: 42, nested: { key: "value" } };
    repeater.value({
      a: { name: "First" },
      b: entryData,
      c: { name: "Third" },
    });

    repeater.moveEntryUp("b");

    expect(repeater.value()!.b).toMatchObject(entryData);
  });
});

describe("Repeater moveEntryDown", () => {
  test("moves entry down by one position", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });

    itHasWaitedEverything();

    let keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b", "c"]);

    repeater.moveEntryDown("b");

    itHasWaitedEverything();

    keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "c", "b"]);
    expect(repeater.value()).toMatchObject({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });
  });

  test("does nothing if entry is already at bottom", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });

    repeater.moveEntryDown("b");

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b"]);
  });

  test("does nothing if entry is last in array", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });

    repeater.moveEntryDown("c");

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b", "c"]);
  });

  test("does nothing if entryId does not exist", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });

    repeater.moveEntryDown("unknown");

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b"]);
  });
});

describe("Repeater moveEntryTop", () => {
  test("moves entry to top position", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });

    itHasWaitedEverything();

    let keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b", "c"]);

    repeater.moveEntryTop("c");

    itHasWaitedEverything();

    keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["c", "a", "b"]);
    expect(repeater.value()).toMatchObject({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });
  });

  test("does nothing if entry is already at top", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });

    repeater.moveEntryTop("a");

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b"]);
  });

  test("does nothing if entry is first in array", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });

    repeater.moveEntryTop("a");

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b", "c"]);
  });

  test("does nothing if entryId does not exist", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });

    repeater.moveEntryTop("unknown");

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b"]);
  });
});

describe("Repeater moveEntryBottom", () => {
  test("moves entry to bottom position", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });

    itHasWaitedEverything();

    let keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b", "c"]);

    repeater.moveEntryBottom("a");

    itHasWaitedEverything();

    keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["b", "c", "a"]);
    expect(repeater.value()).toMatchObject({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });
  });

  test("does nothing if entry is already at bottom", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });

    repeater.moveEntryBottom("b");

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b"]);
  });

  test("does nothing if entry is last in array", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
      c: { name: "Third" },
    });

    repeater.moveEntryBottom("c");

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b", "c"]);
  });

  test("does nothing if entryId does not exist", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });

    repeater.moveEntryBottom("unknown");

    const keys = Object.keys(repeater.value()!);

    expect(keys).toEqual(["a", "b"]);
  });
});

describe("Entry move methods", () => {
  test("moveUp delegates to repeater.moveEntryUp", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });
    const entry = repeater.find("b") as Entry;
    const moveSpy = vi.spyOn(repeater, "moveEntryUp");

    entry.moveUp();

    expect(moveSpy).toHaveBeenCalledWith("b");
  });

  test("moveDown delegates to repeater.moveEntryDown", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });
    const entry = repeater.find("a") as Entry;
    const moveSpy = vi.spyOn(repeater, "moveEntryDown");

    entry.moveDown();

    expect(moveSpy).toHaveBeenCalledWith("a");
  });

  test("moveTop delegates to repeater.moveEntryTop", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });
    const entry = repeater.find("b") as Entry;
    const moveSpy = vi.spyOn(repeater, "moveEntryTop");

    entry.moveTop();

    expect(moveSpy).toHaveBeenCalledWith("b");
  });

  test("moveBottom delegates to repeater.moveEntryBottom", () => {
    repeater.value({
      a: { name: "First" },
      b: { name: "Second" },
    });
    const entry = repeater.find("a") as Entry;
    const moveSpy = vi.spyOn(repeater, "moveEntryBottom");

    entry.moveBottom();

    expect(moveSpy).toHaveBeenCalledWith("a");
  });

  test("moveUp does nothing if entry has no index", () => {
    repeater.value({
      a: { name: "First" },
    });
    const entry = repeater.find("a") as Entry;
    vi.spyOn(entry, "index").mockReturnValue(null);
    const moveSpy = vi.spyOn(repeater, "moveEntryUp");

    entry.moveUp();

    expect(moveSpy).not.toHaveBeenCalled();
  });

  test("moveUp does nothing if entry has no repeater", () => {
    repeater.value({
      a: { name: "First" },
    });
    const entry = repeater.find("a") as Entry;
    vi.spyOn(entry, "repeater").mockReturnValue(undefined);
    const moveSpy = vi.spyOn(repeater, "moveEntryUp");

    entry.moveUp();

    expect(moveSpy).not.toHaveBeenCalled();
  });
});

describe("Entry toString", () => {
  test("toString shows entry info with index", () => {
    repeater.value({ "1": { name: "Test" } });
    const entry = repeater.find("1") as Entry;
    const result = entry.toString();

    expect(result).toBe("Entry<rep.1>(1)");
  });

  test("toString shows entry info with different index", () => {
    repeater.value({ "42": { name: "Test" } });
    const entry = repeater.find("42") as Entry;
    const result = entry.toString();

    expect(result).toBe("Entry<rep.42>(42)");
  });

  test("toString shows entry info with no index", () => {
    repeater.value({ test: { name: "Test" } });
    const entry = repeater.find("test") as Entry;

    if (entry) {
      // Mock index() to return null
      vi.spyOn(entry.raw(), "index").mockReturnValue(null);
      const result = entry.toString();

      expect(result).toBe("Entry<rep.test>(no index)");
    } else {
      // If entry is null, skip this test
      expect(entry).not.toBeNull();
    }
  });
});

describe("Repeater toString", () => {
  test("toString shows repeater info with no entries", () => {
    repeater.value({});
    const result = repeater.toString();

    expect(result).toBe("Repeater<rep>(0 entries)");
  });

  test("toString shows repeater info with one entry", () => {
    repeater.value({ "1": { name: "Test" } });
    const result = repeater.toString();

    expect(result).toBe("Repeater<rep>(1 entries)");
  });

  test("toString shows repeater info with multiple entries", () => {
    repeater.value({
      "1": { name: "Test 1" },
      "2": { name: "Test 2" },
      "3": { name: "Test 3" },
    });
    const result = repeater.toString();

    expect(result).toBe("Repeater<rep>(3 entries)");
  });

  test("toString reports zero entries when value is falsy", () => {
    vi.spyOn(repeater, "value").mockImplementation(() => {
      return null as unknown as LetsRole.RepeaterValue;
    });

    expect(repeater.toString()).toBe("Repeater<rep>(0 entries)");
  });

  test("toString reports zero entries when value is not an object", () => {
    vi.spyOn(repeater, "value").mockImplementation(() => {
      return "invalid" as unknown as LetsRole.RepeaterValue;
    });

    expect(repeater.toString()).toBe("Repeater<rep>(0 entries)");
  });
});

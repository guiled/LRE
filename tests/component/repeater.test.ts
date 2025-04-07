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
  jest.spyOn(sheet, "get");
  jest.spyOn(sheet, "componentExists");
  jest.spyOn(sheet, "knownChildren");
  repeater = sheet.get("rep") as Repeater;
  rawRepeater = repeater.raw();
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

describe("Repeater is correctly initialized", () => {
  test("has the good type", () => {
    expect(repeater.lreType()).toBe("repeater");
  });

  test("text() is protected", () => {
    jest.spyOn(rawRepeater, "text");
    /* @ts-expect-error repeater.text() is protected and cannot receive parameter */
    repeater.text("test");

    expect(rawRepeater.text).toHaveBeenCalled();
    expect((rawRepeater.text as jest.Mock).mock.calls[0].length).toBe(0);
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
    const handler = jest.fn();
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
    const handler = jest.fn();
    repeater.on("initedit", handler);

    expect(handler).toHaveBeenCalledTimes(0);

    rawSheet.repeaterClickOnAdd(repeater.id()!);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("Initedit event is correctly launched for existing entries", () => {
    const handler = jest.fn();
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
    const deleteCb = jest.fn();
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
    const cb = jest.fn();
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
    const cb = jest.fn();
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
    const cb = jest.fn((entry) => entry["name"]);
    const res = repeater.map(cb);

    expect(cb).toHaveBeenCalledTimes(3);
    expect(Object.keys(res)).toHaveLength(3);
    expect(res).toMatchObject({
      "1": "test",
      "2": "test2",
      "3": "test3",
    });
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

  test("Remove an entry", () => {
    const d: LetsRole.ViewData = { a: "123", b: "456" };

    repeater.value({
      b: {},
      a: d,
    });
    repeater.remove("a");

    expect(repeater.value()).toMatchObject({ b: {} });
  });
});

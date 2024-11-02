import { ComponentCache } from "../../src/component/cache";
import { LRE } from "../../src/lre";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { modeHandlerMock } from "../mock/modeHandler.mock";
import { initLetsRole, itHasWaitedEverything } from "../../src/mock/letsrole/letsrole.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { ViewMock } from "../../src/mock/letsrole/view.mock";
import { Component } from "../../src/component";
import { FailingComponent } from "../../src/mock/letsrole/component.mock";

jest.mock("../../src/lre");
jest.mock("../../src/component/component");


let cache: ComponentCache;
let server: ServerMock;
let rawSheet: ViewMock;
let sheet: Sheet;

beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "sheet",
        className: "View",
        children: [{
          id: "lbl1",
          className: "Label",
          text: "label1",
        },
        {
          id: "rep",
          className: "Repeater",
          viewId: "edt",
          readViewId: "rd"
        },
        {
          id: "123",
          className: "Repeater",
          viewId: "edt",
          readViewId: "rd"
        },
        {
          id: "abc",
          className: "Label",
          text: "label1",
        },
        {
          id: "b",
          className: "Label",
          text: "label1",
        },
        ],
      },
      {
        id: "edt",
        className: "View",
        children: [
          {
            id: "txt",
            className: "TextInput",
            defaultValue: "",
          }
        ]
      },
      {
        id: "rd",
        className: "View",
        children: [
          {
            id: "a",
            className: "Label",
            text: "label",
          },
          {
            id: "b",
            className: "Label",
            text: "label",
          },
          {
            id: "c",
            className: "Label",
            text: "label",
          },
        ],
      }
    ]
  });
  initLetsRole(server);
  global.lre = new LRE(modeHandlerMock);
  lre.wait = wait;
  rawSheet = server.openView("sheet", "realId", {
    rep: {
      1: {
        a: "a",
        b: "b",
        c: "c",
      },
      2: {
        a: "a",
        b: "b",
        c: "c",
      },
      b: {
        a: "a",
        b: "b",
        c: "c",
      },
    },
    123: {
      1: {
        a: "a",
        b: "b",
        c: "c",
      },
      2: {
        a: "a",
        b: "b",
        c: "c",
      },
      b: {
        a: "a",
        b: "b",
        c: "c",
      },
    }
  });
  sheet = new Sheet(
    rawSheet,
    new DataBatcher(modeHandlerMock, rawSheet),
    modeHandlerMock
  );
});


const newCmp = jest.fn((id: string): ComponentSearchResult => {
  const rawCmp = rawSheet.get(id);

  if (rawCmp instanceof FailingComponent) {
    return null;
  }

  const cmp = new Component(
    rawSheet.get(id),
    sheet,
    id
  );

  jest.spyOn(cmp, "realId").mockReturnValue(id);

  return cmp;
});

beforeAll(() => {
  cache = new ComponentCache(modeHandlerMock, newCmp);
});

describe("Component cache set/get/unset/inCache", () => {
  test("Set / Get / In cache", () => {
    expect(cache.get("unknown")).toBeNull();
    expect(newCmp).toHaveBeenCalledTimes(1);
    expect(cache.inCache("unknown")).toBeFalsy();
    expect(cache.inCache("lbl1")).toBeFalsy();
    expect(newCmp).toHaveBeenCalledTimes(1);
    newCmp.mockClear();
    expect(cache.get("lbl1")).not.toBeNull();
    expect(newCmp).toHaveBeenCalledTimes(1);
    expect(cache.inCache("lbl1")).toBeTruthy();
    const cmp = newCmp("lbl1")!;
    cache.set("lbl1", cmp);
    newCmp.mockClear();
    expect(newCmp).not.toHaveBeenCalled();
    expect(cache.get("lbl1")).toStrictEqual(cmp);
    expect(newCmp).not.toHaveBeenCalled();
    cache.unset("lbl1");
    expect(newCmp).not.toHaveBeenCalled();
    expect(cache.get("lbl1")).not.toStrictEqual(cmp);
    expect(newCmp).toHaveBeenCalledTimes(1);
  });

  test("Set / Get / In cache for repeaters", () => {
    const rep = newCmp("rep")!;
    cache.set("rep", rep);
    const entry1 = newCmp("rep.1")!;
    cache.set("rep.1", entry1);
    const cmp1a = newCmp("rep.1.a")!;
    cache.set("rep.1.a", cmp1a);
    const cmp1b = newCmp("rep.1.b")!;
    cache.set("rep.1.b", cmp1a);
    const entry2 = newCmp("rep.2")!;
    cache.set("rep.2", entry2);
    newCmp("rep.2.a");
    cache.set("rep.2.a", cmp1a);
    newCmp("rep.1.b");
    cache.set("rep.2.b", cmp1b);
    expect(cache.inCache("*rep")).toBeTruthy();
    expect(cache.inCache("*noRep")).toBeFalsy();
    expect(cache.inCache("*rep.1")).toBeTruthy();
    expect(cache.inCache("*rep.1")).toBeTruthy();
    expect(cache.children("rep.1").sort()).toEqual(
      ["rep.1.a", "rep.1.b"].sort()
    );
    expect(cache.children("rep").sort()).toEqual(
      ["rep.2.a", "rep.2", "rep.1", "rep.2.b", "rep.1.a", "rep.1.b"].sort()
    );
  });
});

describe("Component cache forget/remember", () => {
  beforeEach(() => {
    newCmp.mockClear();
    cache = new ComponentCache(modeHandlerMock, newCmp);
  });

  test("forget/remember", () => {
    expect(cache.inCache("123")).toBeFalsy();
    cache.remember("123");
    cache.remember("abc");
    expect(newCmp).not.toHaveBeenCalled();
    cache.get("123.b.c");
    expect(cache.inCache("123")).toBeFalsy();
    itHasWaitedEverything();
    expect(cache.inCache("123")).not.toBeFalsy();
    expect(newCmp).toHaveBeenCalled();
    expect(cache.inCache("123.b.c")).not.toBeFalsy();
    cache.forget("123");
    expect(cache.inCache("123.b.c")).not.toBeFalsy();
    expect(cache.inCache("123")).not.toBeFalsy();
    itHasWaitedEverything();
    expect(cache.inCache("123.b.c")).toBeFalsy();
    expect(cache.inCache("123")).toBeFalsy();
    cache.get("b");
    cache.forget("b");
    cache.remember("a");
    cache.remember("b");
    cache.forget("a");
    itHasWaitedEverything();
    expect(cache.inCache("a")).toBeFalsy();
    expect(cache.inCache("b")).not.toBeFalsy();
  });
});

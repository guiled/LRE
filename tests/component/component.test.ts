import { Component } from "../../src/component";
import { Container } from "../../src/component/container";
import { Entry } from "../../src/component/entry";
import { Repeater } from "../../src/component/repeater";
import { Sheet } from "../../src/sheet";
import { MockComponent } from "../mock/letsrole/component.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { LRE } from "../../src/lre";
import { MockServer } from "../mock/letsrole/server.mock";
import {
  initLetsRole,
  itHasWaitedEverything,
} from "../mock/letsrole/letsrole.mock";
import { DataBatcher } from "../../src/sheet/databatcher";
import { modeHandlerMock } from "../mock/modeHandler.mock";

global.lre = new LRE(modeHandlerMock);
initLetsRole();

let rawSheet: LetsRole.Sheet;
let sheet: Sheet;
let rawCmp: LetsRole.Component;
let cmp: Component;
const cmpId = "cmp";
const cmpName = "ComponentName";
const cmpClasses = ["cl1", "cl2", "cl3"];
const realId = "main.cmp";
const cmpText = "cmpText";
let cmpDefs;

let server: MockServer;

beforeEach(() => {
  server = new MockServer();
  rawSheet = MockSheet({
    id: "main",
    realId: "123",
  });
  server.registerMockedSheet(rawSheet);

  sheet = new Sheet(rawSheet, new DataBatcher(modeHandlerMock, rawSheet));
  sheet.raw = jest.fn(() => rawSheet);
  jest.spyOn(sheet, "get");
  cmpDefs = {
    id: cmpId,
    sheet: rawSheet,
    name: cmpName,
    classes: [...cmpClasses],
    text: cmpText,
  };
  rawCmp = MockComponent(cmpDefs);
  rawSheet.get = jest.fn(() => {
    return rawCmp;
  });
  cmp = new Component(rawCmp, sheet, realId);
});

describe("Component construction", () => {
  test("Instantiates correctly", () => {
    expect(cmp.init()).toBe(cmp);
    expect(cmp.raw()).toBe(rawCmp);
    expect(cmp.lreType()).toBe<ComponentType>("component");
    cmp.lreType("container");
    expect(cmp.lreType()).toBe("container");

    (rawCmp.id as jest.Mock).mockClear();
    expect(cmp.id()).toEqual(cmpId);
    expect(rawCmp.id).toBeCalledTimes(1);

    expect(cmp.realId()).toEqual(realId);

    (rawCmp.index as jest.Mock).mockClear();
    expect(cmp.index()).toBeNull();
    expect(rawCmp.index).toBeCalledTimes(1);

    (rawCmp.name as jest.Mock).mockClear();
    expect(cmp.name()).toBe(cmpName);
    expect(rawCmp.name).toBeCalledTimes(1);

    expect(cmp.sheet()).toBe(sheet);
    expect(cmp.parent()).toBeUndefined();

    (rawCmp.hide as jest.Mock).mockClear();
    cmp.hide();
    expect(rawCmp.hide).toBeCalledTimes(1);

    (rawCmp.visible as jest.Mock).mockClear();
    expect(cmp.visible()).toBeFalsy();
    expect(rawCmp.visible).toBeCalledTimes(1);

    (rawCmp.show as jest.Mock).mockClear();
    cmp.show();
    expect(rawCmp.show).toBeCalledTimes(1);

    (rawCmp.visible as jest.Mock).mockClear();
    expect(cmp.visible()).toBeTruthy();
    expect(rawCmp.visible).toBeCalledTimes(1);

    (rawCmp.text as jest.Mock).mockClear();
    expect(cmp.text()).toBe(cmpText);
    expect(rawCmp.text).toBeCalledTimes(1);
    const newText = "new Text";
    expect(cmp.text(newText)).toBeUndefined();
    expect(cmp.text()).toBe(newText);
    expect(rawCmp.text).toBeCalledTimes(3);

    (rawCmp.setChoices as jest.Mock).mockClear();
    cmp.setChoices({ a: "a", b: "b" });
    expect(rawCmp.setChoices).toBeCalledTimes(1);

    (rawCmp.virtualValue as jest.Mock).mockClear();
    cmp.virtualValue();
    expect(rawCmp.virtualValue).toBeCalledTimes(1);
    cmp.virtualValue("virtual");
    expect(rawCmp.virtualValue).toBeCalledTimes(2);
  });

  test("Component classes", () => {
    (rawCmp.addClass as jest.Mock).mockClear();
    (rawCmp.removeClass as jest.Mock).mockClear();
    (rawCmp.hasClass as jest.Mock).mockClear();
    (rawCmp.getClasses as jest.Mock).mockClear();

    expect(cmp.getClasses()).toEqual(cmpClasses);
    expect(rawCmp.getClasses).toBeCalledTimes(1);
    expect(cmp.hasClass("cl1")).toBeTruthy();
    expect(cmp.hasClass("cl2")).toBeTruthy();
    expect(cmp.hasClass("cl3")).toBeTruthy();
    expect(cmp.hasClass("cl0")).toBeFalsy();
    expect(rawCmp.hasClass).toBeCalledTimes(4);
    cmp.addClass("cl0");
    expect(rawCmp.addClass).toBeCalledTimes(1);
    expect(cmp.hasClass("cl0")).toBeTruthy();
    cmp.removeClass("cl2");
    expect(cmp.getClasses().sort()).toEqual(["cl0", "cl1", "cl3"].sort());
    expect(cmp.hasClass("cl2")).toBeFalsy();
    cmp.toggleClass("cl2");
    expect(cmp.hasClass("cl2")).toBeTruthy();
    cmp.toggleClass("cl2");
    expect(cmp.hasClass("cl2")).toBeFalsy();
  });

  test("Component save classes", () => {
    jest.spyOn(sheet, "persistingCmpClasses");
    expect(sheet.persistingCmpClasses).toBeCalledTimes(0);
    expect(cmp.autoLoadSaveClasses()).toBe(cmp);
    expect(sheet.persistingCmpClasses).toBeCalledTimes(1);
    cmp.addClass("clX");
    cmp.removeClass("cl2");
    expect(sheet.persistingCmpClasses).toBeCalledTimes(3);
    const rawCmp2 = MockComponent(cmpDefs!);
    expect(rawCmp2.hasClass("clX")).toBeTruthy();
    expect(rawCmp2.hasClass("clY")).toBeFalsy();
    const cmp2 = new Component(rawCmp2, sheet, realId);
    cmp2.autoLoadSaveClasses();
    expect(cmp2.hasClass("clX")).toBeTruthy();
    expect(cmp2.hasClass("clY")).toBeFalsy();
  });
});

describe("Component tree", () => {
  test("Getters and setters test", () => {
    expect(cmp.repeater()).toBeUndefined();
    expect(cmp.parent()).toBeUndefined();
    expect(cmp.entry()).toBeUndefined();

    const parent = new Container(
      MockComponent({ id: "container", sheet: rawSheet }),
      sheet,
      "container"
    );
    expect(cmp.parent(parent)).toBe(parent);
    expect(cmp.parent()).toBe(parent);

    const rep = new Repeater(
      MockComponent({ id: "rep", sheet: rawSheet }),
      sheet,
      "rep"
    );
    expect(cmp.repeater(rep)).toBe(rep);
    expect(cmp.repeater()).toBe(rep);

    const entry = new Entry(
      MockComponent({ id: "entry", sheet: rawSheet }),
      sheet,
      "rep"
    );
    expect(cmp.entry(entry)).toBe(entry);
    expect(cmp.entry()).toBe(entry);
  });

  test("Find in a component (not complete yet… todo : test to find a sub component", () => {
    cmp.find("test");
    expect(sheet.get).toBeCalled();
    (sheet.get as jest.Mock).mockClear();
    cmp.get("test");
    expect(sheet.get).toBeCalled();
  });
});

describe("Component value", () => {
  test("temp tests waiting for implementation", () => {
    expect(cmp.rawValue).toThrowError();
    expect(cmp.value).toThrowError();
  });
});

describe("Persistent data are sync between sheets", () => {
  test("Sync persistent data", () => {
    const rawSheet2 = MockSheet({
      id: "main",
      realId: "123",
    });
    /* @ts-ignore */
    rawSheet.num = 1;
    /* @ts-ignore */
    rawSheet2.num = 2;
    server.registerMockedSheet(rawSheet2);

    const sheet2 = new Sheet(
      rawSheet2,
      new DataBatcher(modeHandlerMock, rawSheet2)
    );
    const cmp2 = sheet2.get("rep.a.b")!;
    /* @ts-ignore */
    sheet.sheet = "1";
    /* @ts-ignore */
    sheet2.sheet = "2";
    const cmp1 = new Component(rawCmp, sheet, "rep.a.b");
    //const cmp2 = new Component(rawCmp, sheet2, "rep.a.b");
    expect(cmp1.data("not")).toBeUndefined();
    expect(cmp2.data("not")).toBeUndefined();
    expect(sheet.persistingCmpData("rep.a.b")).toBeUndefined();
    cmp1.data("test", 42, true);
    expect(sheet.persistingCmpData("rep.a.b")).toStrictEqual({ test: 42 });
    expect(cmp2.data("test")).toBeUndefined();
    itHasWaitedEverything();
    expect(sheet2.persistingCmpData("rep.a.b")).toStrictEqual({ test: 42 });
    expect(cmp2.data("test")).toBe(42);
  });
});

describe("Component events on sub component", () => {
  // @todo
});

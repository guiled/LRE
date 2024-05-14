import { Component } from "../../src/component";
import { Container } from "../../src/component/container";
import { Entry } from "../../src/component/entry";
import { Repeater } from "../../src/component/repeater";
import { Sheet } from "../../src/sheet";
import {
  MockComponent,
  MockedComponent,
} from "../mock/letsrole/component.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { LRE } from "../../src/lre";
import { MockServer } from "../mock/letsrole/server.mock";
import {
  initLetsRole,
  itHasWaitedEnough,
  itHasWaitedEverything,
} from "../mock/letsrole/letsrole.mock";
import { DataBatcher } from "../../src/sheet/databatcher";
import { modeHandlerMock } from "../mock/modeHandler.mock";

global.lre = new LRE(modeHandlerMock);
initLetsRole();

let rawSheet: LetsRole.Sheet;
let sheet: Sheet;
let rawCmp: MockedComponent;
let cmp: Component;
const cmpId = "cmp";
const cmpName = "ComponentName";
const cmpValue = "42";
const cmpClasses = ["cl1", "cl2", "cl3"];
const realId = "cmp";
const cmpText = "cmpText";
let cmpDefs;

let server: MockServer;

beforeEach(() => {
  modeHandlerMock.setMode("real");
  lre.autoNum(false);
  server = new MockServer();
  rawSheet = MockSheet({
    id: "main",
    realId: "123",
    data: {
      cmp2: cmpValue,
    },
  });
  server.registerMockedSheet(rawSheet);

  sheet = new Sheet(
    rawSheet,
    new DataBatcher(modeHandlerMock, rawSheet),
    modeHandlerMock
  );
  sheet.raw = jest.fn(() => rawSheet);
  jest.spyOn(sheet, "get");
  jest.spyOn(sheet, "componentExists");
  jest.spyOn(sheet, "knownChildren");
  cmpDefs = {
    id: cmpId,
    sheet: rawSheet,
    name: cmpName,
    classes: [...cmpClasses],
    text: cmpText,
    value: cmpValue,
  };
  rawCmp = MockComponent(cmpDefs);
  server.registerMockedComponent(rawCmp);
  cmp = new Component(rawCmp, sheet, realId);
});

describe("Component construction", () => {
  test("Instantiates correctly and basic methods", () => {
    expect(cmp.init()).toBe(cmp);
    expect(cmp.raw()).toBe(rawCmp);
    expect(cmp.lreType()).toBe<ComponentType>("component");
    cmp.lreType("container");
    expect(cmp.lreType()).toBe("container");

    (rawCmp.id as jest.Mock).mockClear();
    expect(cmp.id()).toEqual(cmpId);
    expect(rawCmp.id).toHaveBeenCalledTimes(1);

    expect(cmp.realId()).toEqual(realId);

    (rawCmp.index as jest.Mock).mockClear();
    expect(cmp.index()).toBeNull();
    expect(rawCmp.index).toHaveBeenCalledTimes(1);

    (rawCmp.name as jest.Mock).mockClear();
    expect(cmp.name()).toBe(cmpName);
    expect(rawCmp.name).toHaveBeenCalledTimes(1);

    expect(cmp.sheet()).toBe(sheet);
    expect(cmp.parent()).toBeUndefined();

    (rawCmp.hide as jest.Mock).mockClear();
    cmp.hide();
    expect(rawCmp.hide).toHaveBeenCalledTimes(1);

    (rawCmp.visible as jest.Mock).mockClear();
    expect(cmp.visible()).toBeFalsy();
    expect(rawCmp.visible).toHaveBeenCalledTimes(1);

    (rawCmp.show as jest.Mock).mockClear();
    cmp.show();
    expect(rawCmp.show).toHaveBeenCalledTimes(1);

    (rawCmp.visible as jest.Mock).mockClear();
    expect(cmp.visible()).toBeTruthy();
    expect(rawCmp.visible).toHaveBeenCalledTimes(1);

    (rawCmp.text as jest.Mock).mockClear();
    expect(cmp.text()).toBe(cmpText);
    expect(rawCmp.text).toHaveBeenCalledTimes(1);
    const newText = "new Text";
    expect(cmp.text(newText)).toBeUndefined();
    expect(cmp.text()).toBe(newText);
    expect(rawCmp.text).toHaveBeenCalledTimes(3);

    (rawCmp.setChoices as jest.Mock).mockClear();
    cmp.setChoices({ a: "a", b: "b" });
    expect(rawCmp.setChoices).toHaveBeenCalledTimes(1);

    (rawCmp.virtualValue as jest.Mock).mockClear();
    cmp.virtualValue();
    expect(rawCmp.virtualValue).toHaveBeenCalledTimes(1);
    cmp.virtualValue("virtual");
    expect(rawCmp.virtualValue).toHaveBeenCalledTimes(2);

    (rawCmp.rawValue as jest.Mock).mockClear();
    cmp.rawValue();
    expect(rawCmp.rawValue).toHaveBeenCalledTimes(1);

    (rawCmp.setToolTip as jest.Mock).mockClear();
    cmp.setToolTip("the tool tip");
    expect(rawCmp.setToolTip).toHaveBeenCalledTimes(1);
    expect((rawCmp.setToolTip as jest.Mock).mock.calls[0].length).toBe(1);
    expect((rawCmp.setToolTip as jest.Mock).mock.calls[0][0]).toBe(
      "the tool tip"
    );
    cmp.setToolTip("the tool tip", "top");
    expect(rawCmp.setToolTip).toHaveBeenCalledTimes(2);
    expect((rawCmp.setToolTip as jest.Mock).mock.calls[1].length).toBe(2);
    expect((rawCmp.setToolTip as jest.Mock).mock.calls[1][1]).toBe("top");

    expect(cmp.visible()).toBeTruthy();
    cmp.toggle();
    expect(cmp.visible()).toBeFalsy();
    cmp.toggle();
    expect(cmp.visible()).toBeTruthy();
  });

  test("Component classes", () => {
    (rawCmp.addClass as jest.Mock).mockClear();
    (rawCmp.removeClass as jest.Mock).mockClear();
    (rawCmp.hasClass as jest.Mock).mockClear();
    (rawCmp.getClasses as jest.Mock).mockClear();

    expect(cmp.getClasses()).toEqual(cmpClasses);
    expect(rawCmp.getClasses).toHaveBeenCalledTimes(1);
    expect(cmp.hasClass("cl1")).toBeTruthy();
    expect(cmp.hasClass("cl2")).toBeTruthy();
    expect(cmp.hasClass("cl3")).toBeTruthy();
    expect(cmp.hasClass("cl0")).toBeFalsy();
    expect(rawCmp.hasClass).toHaveBeenCalledTimes(4);
    cmp.addClass("cl0");
    expect(rawCmp.addClass).toHaveBeenCalledTimes(1);
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
    expect(sheet.persistingCmpClasses).toHaveBeenCalledTimes(0);
    expect(cmp.autoLoadSaveClasses()).toBe(cmp);
    expect(sheet.persistingCmpClasses).toHaveBeenCalledTimes(1);
    cmp.addClass("clX");
    cmp.removeClass("cl2");
    expect(sheet.persistingCmpClasses).toHaveBeenCalledTimes(3);
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
    expect(sheet.get).toHaveBeenCalled();
    (sheet.get as jest.Mock).mockClear();
    cmp.get("test");
    expect(sheet.get).toHaveBeenCalled();
  });

  test("Sheet methods shortcuts", () => {
    cmp.exists();
    expect(sheet.componentExists).toHaveBeenCalled();
    cmp.knownChildren();
    expect(sheet.knownChildren).toHaveBeenCalled();
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
      new DataBatcher(modeHandlerMock, rawSheet2),
      modeHandlerMock
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

describe("Component get and set value", () => {
  test("Value get", () => {
    const raw = rawSheet.get("cmp2");
    const cmp = sheet.get("cmp2")!;
    expect(cmp.value()).toBe("42");
    expect(raw.value).toHaveBeenCalled();
    sheet.setData({
      [cmp.realId()]: "4242",
    });
    (raw.value as jest.Mock).mockClear();
    expect(cmp.value()).toBe("4242");
    lre.autoNum();
    expect(cmp.value()).toBe(4242);
    expect(raw.value).not.toHaveBeenCalled();
    itHasWaitedEverything();
    expect(cmp.value()).toBe(4242);
    expect(raw.value).toHaveBeenCalled();
    /* @ts-ignore */
    raw.value = jest.fn(() => {
      /* @ts-expect-error */
      null();
    });
    expect(() => cmp.value()).not.toThrowError();
    expect(cmp.value()).toBeUndefined();
  });

  test("normal value set", () => {
    const updateEvent = jest.fn();
    cmp.on("update", updateEvent);
    cmp.value(cmp.value());
    const newVal = "44";
    expect(updateEvent).not.toHaveBeenCalled();
    cmp.value(newVal);
    expect(updateEvent).toHaveBeenCalledWith(cmp);
    expect(cmp.value()).toBe(newVal);
    expect(sheet.getPendingData(cmp.id())).toBe(newVal);
    itHasWaitedEverything();
    expect(sheet.getData()[cmp.id()]).toBe(newVal);
  });

  test("value set with a function", () => {
    const cmp1 = sheet.get("cmp1")!;
    const cmp2 = sheet.get("cmp2")!;
    cmp1.value(4242);
    cmp2.value(1313);
    const valSet = jest.fn(() => {
      return cmp2.value();
    });
    expect(() => cmp1.value(valSet)).not.toThrowError();
    expect(valSet).toHaveBeenCalledTimes(1);
    expect(cmp1.value()).toBe(cmp2.value());
    itHasWaitedEnough();
    cmp2.value(4243);
    expect(valSet).toHaveBeenCalledTimes(2);
    expect(cmp1.value()).toBe(cmp2.value());
    itHasWaitedEnough();
  });
});

describe("Component visible setter", () => {
  test("Visible set with boolean", () => {
    jest.spyOn(cmp, "hide");
    jest.spyOn(cmp, "show");
    cmp.visible(false);
    expect(cmp.hide).toHaveBeenCalledTimes(1);
    expect(cmp.visible()).toBeFalsy();
    cmp.visible(true);
    expect(cmp.show).toHaveBeenCalledTimes(1);
    expect(cmp.visible()).toBeTruthy();
  });

  test("Visible set with a function", () => {
    jest.spyOn(cmp, "hide");
    jest.spyOn(cmp, "show");
    expect(cmp.visible()).toBeTruthy();
    const chk = sheet.get("chk")!;
    chk.value(false);
    cmp.visible(chk.value.bind(chk) as () => boolean);
    expect(cmp.visible()).toBeFalsy();
    expect(cmp.hide).toHaveBeenCalledTimes(1);
    expect(cmp.show).toHaveBeenCalledTimes(0);
    chk.value(true);
    expect(cmp.visible()).toBeTruthy();
    expect(cmp.hide).toHaveBeenCalledTimes(1);
    expect(cmp.show).toHaveBeenCalledTimes(1);
    cmp.visible(() => {
      return !!chk.value();
    });
    expect(cmp.visible()).toBeTruthy();
    jest.spyOn(cmp, "hide");
    jest.spyOn(cmp, "show");
    (cmp.hide as jest.Mock).mockClear();
    (cmp.show as jest.Mock).mockClear();
    chk.value(false);
    expect(cmp.hide).toHaveBeenCalledTimes(1);
    cmp.visible(true);
    expect(cmp.show).toHaveBeenCalledTimes(1);
    (cmp.hide as jest.Mock).mockClear();
    (cmp.show as jest.Mock).mockClear();
    chk.value(false);
    expect(cmp.hide).toHaveBeenCalledTimes(0);
    expect(cmp.show).toHaveBeenCalledTimes(0);
    chk.value(true);
    expect(cmp.hide).toHaveBeenCalledTimes(0);
    expect(cmp.show).toHaveBeenCalledTimes(0);
    chk.value(false);
    expect(cmp.hide).toHaveBeenCalledTimes(0);
    expect(cmp.show).toHaveBeenCalledTimes(0);
  });
});

describe("Component simple event handling", () => {
  test("Click is triggered", () => {
    const handler = jest.fn();
    const handlerLabeled = jest.fn();
    cmp.on("click", handler);
    cmp.on("click:label", handlerLabeled);
    expect(handler).not.toHaveBeenCalled();
    expect(handlerLabeled).not.toHaveBeenCalled();
    rawCmp._trigger("click");
    expect(handler).toHaveBeenCalled();
    expect(handlerLabeled).toHaveBeenCalled();
  });
});

describe("Component events on sub component", () => {
  // @todo
});

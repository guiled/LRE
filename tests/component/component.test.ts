import { Component } from "../../src/component";
import { Container } from "../../src/component/container";
import { Entry } from "../../src/component/entry";
import { Repeater } from "../../src/component/repeater";
import { Sheet } from "../../src/sheet";
import { LRE } from "../../src/lre";
import {
  initLetsRole,
  itHasWaitedEnough,
  itHasWaitedEverything,
} from "../../src/mock/letsrole/letsrole.mock";
import { DataBatcher } from "../../src/sheet/databatcher";
import { modeHandlerMock } from "../mock/modeHandler.mock";
import { Choice } from "../../src/component/choice";
import { LreTables } from "../../src/tables";
import { SheetProxy } from "../../src/proxy/sheet";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { ComponentMock } from "../../src/mock/letsrole/component.mock";

let rawSheet: LetsRole.Sheet;
let sheet: Sheet;
let rawCmp: ComponentMock;
let cmp: Component;
const cmpId = "cmp";
const cmpName = "ComponentName";
const cmpValue = "42";
const cmpClasses = ["cl1", "cl2", "cl3"];
const realId = "cmp";
const cmpText = "42";
//let cmpDefs;

let server: ServerMock;

beforeEach(() => {
  modeHandlerMock.setMode("real");
  modeHandlerMock.resetAccessLog();
  server = new ServerMock({
    views: [
      {
        id: "main",
        className: "View",
        children: [
          {
            id: cmpId,
            className: "TextInput",
            name: cmpName,
            classes: cmpClasses.join(" "),
            defaultValue: cmpValue,
          },
          {
            id: "container",
            className: "Container",
          },
          {
            id: "rep",
            className: "Repeater",
            viewId: "edt",
            readViewId: "rd",
          },
          {
            id: "cmp1",
            className: "TextInput",
            defaultValue: "42",
          },
          {
            id: "cmp2",
            className: "TextInput",
            defaultValue: "42",
          },
          {
            id: "cmp3",
            className: "TextInput",
            defaultValue: "42",
          },
          {
            id: "choice",
            className: "Choice",
          },
          {
            id: "chk",
            className: "Checkbox",
          },
        ],
      },
      {
        id: "edt",
        className: "View",
        children: [],
      },
      {
        id: "rd",
        className: "View",
        children: [
          {
            id: "b",
            className: "Label",
            text: "label1",
          },
        ],
      },
    ],
    tables: {
      theTable: [
        { id: "1", a: "x", b: "y" },
        { id: "2", a: "z", b: "w" },
      ],
    },
  });
  initLetsRole(server);
  global.lre = new LRE(modeHandlerMock);
  lre.autoNum(false);

  rawSheet = server.openView("main", "123", {
    [cmpId]: cmpValue,
    cmp2: cmpValue,
    cmp3: "1342",
    rep: {
      "123": {},
    },
  });

  const proxySheet = new SheetProxy(modeHandlerMock, rawSheet);

  sheet = new Sheet(
    proxySheet,
    new DataBatcher(modeHandlerMock, proxySheet),
    modeHandlerMock,
  );
  sheet.raw = jest.fn(() => proxySheet);
  jest.spyOn(sheet, "get");
  jest.spyOn(sheet, "componentExists");
  jest.spyOn(sheet, "knownChildren");
  rawCmp = rawSheet.get(cmpId) as ComponentMock;
  cmp = new Component(rawCmp, sheet, realId);
});

describe("Component construction", () => {
  test("Instantiates correctly and basic methods", () => {
    expect(cmp.init()).toBe(cmp);
    expect(cmp.raw()).toBe(rawCmp);
    expect(cmp.lreType()).toBe<ComponentType>("component");
    cmp.lreType("container");
    expect(cmp.lreType()).toBe("container");

    jest.spyOn(rawCmp, "id");
    expect(cmp.id()).toEqual(cmpId);
    expect(rawCmp.id).toHaveBeenCalledTimes(1);

    expect(cmp.realId()).toEqual(realId);

    jest.spyOn(rawCmp, "index");
    expect(cmp.index()).toBeNull();
    expect(rawCmp.index).toHaveBeenCalledTimes(1);

    jest.spyOn(rawCmp, "name");
    expect(cmp.name()).toBe(cmpName);
    expect(rawCmp.name).toHaveBeenCalledTimes(1);

    expect(cmp.sheet()).toBe(sheet);
    expect(cmp.parent()).toBeUndefined();

    jest.spyOn(rawCmp, "hide");
    cmp.hide();
    expect(rawCmp.hide).toHaveBeenCalledTimes(1);

    jest.spyOn(rawCmp, "visible");
    expect(cmp.visible()).toBeFalsy();
    expect(rawCmp.visible).toHaveBeenCalledTimes(1);

    jest.spyOn(rawCmp, "show");
    cmp.show();
    expect(rawCmp.show).toHaveBeenCalledTimes(1);

    (rawCmp.visible as jest.Mock).mockClear();
    expect(cmp.visible()).toBeTruthy();
    expect(rawCmp.visible).toHaveBeenCalledTimes(1);

    jest.spyOn(rawCmp, "text");
    expect(cmp.text()).toBe(cmpText);
    expect(rawCmp.text).toHaveBeenCalledTimes(1);
    const newText = "new Text";
    expect(cmp.text(newText)).toBeUndefined();
    expect(cmp.text()).toBe(newText);
    expect(rawCmp.text).toHaveBeenCalledTimes(3);

    jest.spyOn(rawCmp, "setChoices");
    cmp.setChoices({ a: "a", b: "b" });
    expect(rawCmp.setChoices).toHaveBeenCalledTimes(1);

    jest.spyOn(rawCmp, "virtualValue");
    cmp.virtualValue();
    expect(rawCmp.virtualValue).toHaveBeenCalledTimes(1);
    cmp.virtualValue("virtual");
    expect(rawCmp.virtualValue).toHaveBeenCalledTimes(2);

    jest.spyOn(rawCmp, "rawValue");
    cmp.rawValue();
    expect(rawCmp.rawValue).toHaveBeenCalledTimes(1);

    jest.spyOn(rawCmp, "setToolTip");
    cmp.setToolTip("the tool tip");
    expect(rawCmp.setToolTip).toHaveBeenCalledTimes(1);
    expect((rawCmp.setToolTip as jest.Mock).mock.calls[0].length).toBe(1);
    expect((rawCmp.setToolTip as jest.Mock).mock.calls[0][0]).toBe(
      "the tool tip",
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
    jest.spyOn(rawCmp, "addClass");
    jest.spyOn(rawCmp, "removeClass");
    jest.spyOn(rawCmp, "hasClass");
    jest.spyOn(rawCmp, "getClasses");

    expect(cmp.getClasses()).toEqual(expect.arrayContaining(cmpClasses));
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
    expect(cmp.getClasses()).toEqual(
      expect.arrayContaining(["cl0", "cl1", "cl3"]),
    );
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
    const rawCmp2 = rawSheet.get(cmpId);
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

    const parent = new Container(rawSheet.get("container"), sheet, "container");
    expect(cmp.parent(parent)).toBe(parent);
    expect(cmp.parent()).toBe(parent);

    const rep = new Repeater(rawSheet.get("rep"), sheet, "rep");
    expect(cmp.repeater(rep)).toBe(rep);
    expect(cmp.repeater()).toBe(rep);

    const entry = new Entry(rawSheet.get("rep.123"), sheet, "rep");
    expect(cmp.entry(entry)).toBe(entry);
    expect(cmp.entry()).toBe(entry);
  });

  test("Find in a component (not complete yet… todo : test to find a sub component", () => {
    cmp.find("test");
    expect(sheet.get).toHaveBeenCalled();
    jest.spyOn(sheet, "get");
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

describe("Component update event handling", () => {
  test("Update not triggered after sheet setData if data not changed", () => {
    const updateEvent = jest.fn();
    cmp.on("update", updateEvent);
    expect(updateEvent).not.toHaveBeenCalled();
    rawCmp.value(42);
    expect(updateEvent).toHaveBeenCalledTimes(1);
    sheet.setData({
      [cmp.id()!]: 43,
    });
    itHasWaitedEverything();
    expect(updateEvent).toHaveBeenCalledTimes(2);
    rawCmp.value(43);
    expect(updateEvent).toHaveBeenCalledTimes(2);
  });

  test("Raw sheet set data triggers update event", () => {
    const updateEvent = jest.fn();
    cmp.on("update", updateEvent);
    rawSheet.setData({
      [cmp.id()!]: 43,
    });
    expect(updateEvent).toHaveBeenCalledTimes(1);
  });

  test("Raw Component value change applied to sheet data", () => {
    expect(rawSheet.getData()[rawCmp.id()!]).toBe(cmpValue);
    rawCmp.value(43);
    expect(rawSheet.getData()[rawCmp.id()!]).toBe(43);
  });
});

describe("Persistent data are sync between sheets", () => {
  test("Sync persistent data", () => {
    const rawSheet2 = server.openView("main", "123");
    /* @ts-expect-error Intended error */
    rawSheet.num = 1;
    /* @ts-expect-error Intended error */
    rawSheet2.num = 2;

    const sheet2 = new Sheet(
      rawSheet2,
      new DataBatcher(modeHandlerMock, rawSheet2),
      modeHandlerMock,
    );
    const cmp2 = sheet2.get("rep.123.b")!;
    /* @ts-expect-error Intended error */
    sheet.sheet = "1";
    /* @ts-expect-error Intended error */
    sheet2.sheet = "2";
    const cmp1 = new Component(rawCmp, sheet, "rep.123.b");
    //const cmp2 = new Component(rawCmp, sheet2, "rep.a.b");
    expect(cmp1.data("not")).toBeUndefined();
    expect(cmp2.data("not")).toBeUndefined();
    expect(sheet.persistingCmpData("rep.123.b")).toBeUndefined();
    cmp1.data("test", 42, true);
    expect(sheet.persistingCmpData("rep.123.b")).toStrictEqual({ test: 42 });
    expect(cmp2.data("test")).toBeUndefined();
    itHasWaitedEverything();
    expect(sheet2.persistingCmpData("rep.123.b")).toStrictEqual({ test: 42 });
    expect(cmp2.data("test")).toBe(42);
  });
});

describe("Component get and set value", () => {
  test("Value get", () => {
    const cmp = sheet.get("cmp2")!;
    const raw = cmp.raw() as LetsRole.Component;
    jest.spyOn(raw, "value");
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
    /* @ts-expect-error Typing this mock is not important */
    raw.value = jest.fn(() => {
      /* @ts-expect-error Intended error */
      null();
    });
    expect(() => cmp.value()).not.toThrow();
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
    expect(sheet.getPendingData(cmp.id()!)).toBe(newVal);
    itHasWaitedEverything();
    const data = sheet.getData() as LetsRole.ViewData;
    expect(data[cmp.id()!]).toBe(newVal);
  });

  test("value set with a function", () => {
    const cmp1 = sheet.get("cmp1")!;
    const cmp2 = sheet.get("cmp2")!;
    cmp1.value(4242);
    cmp2.value(1313);
    const valSet = jest.fn(() => {
      return cmp2.value();
    });
    expect(() => cmp1.value(valSet)).not.toThrow();
    expect(valSet).toHaveBeenCalledTimes(1);
    expect(cmp1.value()).toBe(1313);
    expect(valSet).toHaveBeenCalledTimes(1);
    itHasWaitedEnough();
    expect(valSet).toHaveBeenCalledTimes(1);
    cmp2.value(4243);
    expect(valSet).toHaveBeenCalledTimes(2);
    expect(cmp1.value()).toBe(cmp2.value());
    itHasWaitedEnough();
    const cmp3 = sheet.get("cmp3")!;
    cmp3.value("oh");
    cmp1.value(() => {
      return cmp2.value() + " " + cmp3.value();
    });
    expect(cmp1.value()).toBe("4243 oh");
    cmp3.value("");
    expect(cmp1.value()).toBe("4243 ");
  });

  test("value set with a component", () => {
    const cmp1 = sheet.get("cmp1")!;
    const cmp2 = sheet.get("cmp2")!;
    cmp1.value(4242);
    expect(() => cmp2.value(cmp1)).not.toThrow();
    expect(cmp2.value()).toBe(4242);
    cmp1.value(1313);
    expect(cmp2.value()).toBe(1313);
  });

  test("valueData passed", () => {
    const rawChoice = rawSheet.get("choice");
    Tables = new LreTables(Tables);
    const choice = new Choice(rawChoice, sheet, "choice");
    choice.populate("theTable", "a");
    choice.value("y");
    const cmp1 = sheet.get("cmp1")!;
    cmp1.value(choice);
    expect(cmp1.value()).toBe("y");
    expect(cmp1.valueData()).toBe(choice.choiceData());
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
    let eventTarget;
    const handler = jest.fn((target) => {
      eventTarget = target;
    });
    const handlerLabeled = jest.fn();
    cmp.on("click", handler);
    cmp.on("click:label", handlerLabeled);
    expect(handler).not.toHaveBeenCalled();
    expect(handlerLabeled).not.toHaveBeenCalled();
    expect(eventTarget).toBeUndefined();
    rawCmp.trigger("click");
    expect(handler).toHaveBeenCalled();
    expect(handlerLabeled).toHaveBeenCalled();
    expect(eventTarget).toStrictEqual(cmp);
  });
});

describe("Component events on sub component", () => {
  it.todo("Test of event delegation");
});

describe("Component behavior with context", () => {
  test("Context has component ref when value is get", () => {
    const cmpProxy = sheet.get(cmpId)!;
    expect(modeHandlerMock.getAccessLog("value")).toHaveLength(0);
    cmpProxy.value();
    expect(modeHandlerMock.getAccessLog("value")).toHaveLength(1);
    expect(modeHandlerMock.getAccessLog("value")[0]).toStrictEqual(cmpId);
    cmpProxy.value(42);
    modeHandlerMock.resetAccessLog();
    expect(modeHandlerMock.getAccessLog("value")).toHaveLength(0);
    cmpProxy.value();
    expect(modeHandlerMock.getAccessLog("value")).toHaveLength(1);
  });
});

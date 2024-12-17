import { Component } from "../../src/component";
import { LRE } from "../../src/lre";
import { initLetsRole } from "../../src/mock/letsrole/letsrole.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { ComponentProxy } from "../../src/proxy/component";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";

jest.mock("../../src/sheet");

let server: ServerMock;
let parent: LetsRole.Component;
let raw: LetsRole.Component;
let rawSheet: LetsRole.Sheet;
let sheetProxy: SheetProxy;
const initValue = "42";
const initClasses = ["class1", "class2"];
const initText = "42";

beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        className: "View",
        children: [
          {
            id: "parent_test",
            className: "Container",
            children: [
              {
                id: "test",
                className: "NumberInput",
                classes: "class1 class2",
                defaultValue: initValue,
              },
              {
                id: "container",
                className: "Container",
                classes: "class1 class2",
                children: [
                  {
                    id: "hop",
                    className: "NumberInput",
                    classes: "class1 class2",
                    defaultValue: initValue,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "prompt",
        className: "View",
        children: [
          {
            id: "lbl",
            className: "Label",
            text: "This is a label",
          },
        ],
      },
    ],
  });
  initLetsRole(server);
});

const initTestMocks = (
  isVirtual: boolean = false,
  cmpId = "test",
  sheet?: SheetProxy,
): ComponentProxy => {
  rawSheet = server.openView("main", "1234", {}, "Sheet 1");
  parent = rawSheet.get("parent_test");
  raw = rawSheet.get(cmpId);
  sheetProxy = sheet ?? new SheetProxy(context, rawSheet);

  const subject = new ComponentProxy(context, raw, sheetProxy, () => ({
    cmpClasses: {},
    cmpTexts: {},
    sheetData: {},
    virtualValues: {},
    visible: {},
  }));

  if (isVirtual) {
    context.setMode("virtual");
  }

  return subject;
};

const methodsWithoutEffect: Array<keyof LetsRole.Component> = [
  "id",
  "name",
  "index",
];

const methodsWithNoParams: Array<keyof LetsRole.Component> = [
  "parent",
  "hide", // put this value before visible because it will set a hidden value to true
  "show", // put this value before visible because it will set a hidden value to false
  "rawValue",
  "text",
  "visible", // put this value after hide or show because it will use the hidden value
  "value",
  "virtualValue",
];

const methodsWithParams: Array<[keyof LetsRole.Component, any]> = [
  ["find", ["toto"]],
  ["on", ["update", () => {}]],
  ["off", ["update"]],
  ["addClass", ["text-danger"]],
  ["removeClass", ["text-danger"]],
  ["hasClass", ["text-danger"]],
  ["toggleClass", ["text-danger"]],
  ["getClasses", []],
  ["setChoices", [{ a: 1, b: 2 }]],
  ["setToolTip", ["this is a tooltip", "top"]],
];

describe("Real mode", () => {
  let subject: ComponentProxy;

  beforeEach(() => {
    subject = initTestMocks();
  });

  test.each([...methodsWithoutEffect, ...methodsWithNoParams])(
    "Proxy call %s calls raw method",
    (method) => {
      jest.spyOn(raw, method as any);
      /* @ts-expect-error Dynamic calls */
      subject[method].call(subject);
      expect(raw[method!]).toHaveBeenCalledTimes(1);
    },
  );

  test.each(methodsWithParams)(
    "Proxy call %s calls raw method",
    (method, args) => {
      jest.spyOn(raw, method as any);
      /* @ts-expect-error Dynamic calls */
      subject[method].apply(subject, args);
      expect(raw[method]).toHaveBeenCalledTimes(1);
    },
  );
});

describe("Virtual mode", () => {
  let subject: ComponentProxy;

  beforeEach(() => {
    subject = initTestMocks(true);
  });

  const methodsWithNoParamsBis = methodsWithNoParams.filter(
    (m) => !["find", "parent"].includes(m),
  );

  test.each(methodsWithNoParamsBis)(
    "Proxy call %s doesn't call raw method",
    (method) => {
      subject.getDest();
      jest.spyOn(raw, method as any);
      /* @ts-expect-error Dynamic calls */
      subject[method].call(subject);
      expect(raw[method!]).not.toHaveBeenCalled();
    },
  );

  const methodsWithParamsBis = methodsWithParams.filter(
    (m) => !["find", "parent"].includes(m[0]),
  );

  test.each(methodsWithParamsBis)(
    "Proxy call %s doesn't call raw method",
    (method, args) => {
      subject.getDest();
      jest.spyOn(raw, method as any);
      /* @ts-expect-error Dynamic calls */
      subject[method].apply(subject, args);
      expect(raw[method!]).not.toHaveBeenCalled();
    },
  );
});

describe("Virtual mode sheet, find and parent are virtual", () => {
  let subject: ComponentProxy;

  beforeAll(() => {
    subject = initTestMocks(true, "container");
  });

  test("cmp.sheet() is virtual", () => {
    jest.spyOn(raw, "sheet");
    expect(subject.sheet()).toBe(sheetProxy);
    expect(subject.sheet()).not.toBe(rawSheet);
    expect(raw.sheet).not.toHaveBeenCalled();
  });
  test("cmp.parent() is virtual", () => {
    const p = subject.parent();
    expect(p).toBeInstanceOf(ComponentProxy);
    expect(p).not.toBe(parent);
    expect(p.id()).toBe(parent.id());
  });
  test("cmp.find() is virtual", () => {
    const c = subject.find("hop");
    expect(c).toBeInstanceOf(ComponentProxy);
    expect(c.id()).toBe("hop");
  });
});

describe("Virtual mode show hide", () => {
  let subject: ComponentProxy;

  beforeAll(() => {
    subject = initTestMocks(true);
  });

  test("Visible, show, hide correctly mocked", () => {
    jest.spyOn(raw, "visible");
    jest.spyOn(raw, "show");
    jest.spyOn(raw, "hide");
    expect(subject.visible()).toBeTruthy();
    expect(raw.visible).toHaveBeenCalledTimes(1);
    expect(raw.show).not.toHaveBeenCalled();
    expect(raw.hide).not.toHaveBeenCalled();

    subject.hide();
    expect(raw.hide).not.toHaveBeenCalled();
    expect(subject.visible()).toBeFalsy();
    expect(raw.visible).toHaveBeenCalledTimes(1);

    subject.show();
    expect(raw.show).not.toHaveBeenCalled();
    expect(subject.visible()).toBeTruthy();
    expect(raw.visible).toHaveBeenCalledTimes(1);
  });
});

describe("Virtual mode changes are applied", () => {
  let subject: ComponentProxy;

  beforeAll(() => {
    subject = initTestMocks(true);
    subject.getDest();
    jest.spyOn(raw, "value");
    jest.spyOn(raw, "getClasses");
  });

  test("Value is virtually applied ", () => {
    jest.spyOn(rawSheet, "setData");
    const nbMockCalls = (raw.value as jest.Mock).mock.calls.length;
    const val = subject.value();
    expect(raw.value).toHaveBeenCalledTimes(nbMockCalls);
    expect(val).toBe(initValue);
    const newValue = Math.random();
    subject.value(newValue);
    expect(subject.value()).toBe(newValue);
    expect(raw.value).toHaveBeenCalledTimes(nbMockCalls);
    expect(rawSheet.setData).not.toHaveBeenCalled();
  });

  test("Show / Hide are virtually applied ", () => {
    jest.spyOn(raw, "hide");
    jest.spyOn(raw, "show");
    jest.spyOn(raw, "addClass");
    jest.spyOn(raw, "removeClass");
    jest.spyOn(raw, "toggleClass");
    expect(subject.visible()).toBeTruthy();
    subject.hide();
    expect(subject.visible()).toBeFalsy();
    expect(raw.hide).not.toHaveBeenCalled();
    expect(raw.addClass).not.toHaveBeenCalled();
    expect(raw.removeClass).not.toHaveBeenCalled();
    expect(raw.toggleClass).not.toHaveBeenCalled();
    subject.show();
    expect(subject.visible()).toBeTruthy();
    expect(raw.show).not.toHaveBeenCalled();
    expect(raw.addClass).not.toHaveBeenCalled();
    expect(raw.removeClass).not.toHaveBeenCalled();
    expect(raw.toggleClass).not.toHaveBeenCalled();
  });

  test("Class changes are virtually applied", () => {
    jest.spyOn(raw, "hasClass");
    jest.spyOn(raw, "addClass");
    jest.spyOn(raw, "removeClass");
    jest.spyOn(raw, "toggleClass");
    jest.spyOn(raw, "getClasses");
    expect(subject.getClasses().sort().join(",")).toMatch(
      initClasses.sort().join(","),
    );
    expect(raw.getClasses).not.toHaveBeenCalled();

    subject.addClass("added1");
    expect(subject.getClasses().sort().join(",")).toMatch(
      ["added1", ...initClasses].sort().join(","),
    );
    expect(subject.hasClass("added1")).toBeTruthy();
    expect(raw.hasClass).not.toHaveBeenCalled();
    expect(raw.getClasses).not.toHaveBeenCalled();

    subject.removeClass("added1");
    expect(subject.getClasses().sort().join(",")).toMatch(
      initClasses.sort().join(","),
    );
    expect(subject.hasClass("added1")).toBeFalsy();
    expect(raw.hasClass).not.toHaveBeenCalled();
    expect(raw.getClasses).not.toHaveBeenCalled();

    subject.toggleClass("added1");
    expect(subject.getClasses().sort().join(",")).toMatch(
      ["added1", ...initClasses].sort().join(","),
    );
    expect(raw.getClasses).not.toHaveBeenCalled();
    subject.toggleClass("added1");
    expect(subject.getClasses().sort().join(",")).toMatch(
      initClasses.sort().join(","),
    );
    expect(raw.getClasses).not.toHaveBeenCalled();

    subject.hide();
    expect(subject.hasClass("d-none")).toBeTruthy();
    expect(raw.addClass).not.toHaveBeenCalled();
    expect(raw.removeClass).not.toHaveBeenCalled();
    expect(raw.toggleClass).not.toHaveBeenCalled();
    expect(raw.hasClass).not.toHaveBeenCalled();

    subject.show();
    expect(subject.hasClass("d-none")).toBeFalsy();
    expect(raw.addClass).not.toHaveBeenCalled();
    expect(raw.removeClass).not.toHaveBeenCalled();
    expect(raw.toggleClass).not.toHaveBeenCalled();
    expect(raw.hasClass).not.toHaveBeenCalled();
    expect(raw.getClasses).not.toHaveBeenCalled();
  });

  test("Virtual values are virtually applied", () => {
    jest.spyOn(raw, "virtualValue");
    expect(subject.virtualValue()).toBeNull();
    expect(raw.virtualValue).not.toHaveBeenCalled();
    subject.virtualValue(1313);
    expect(raw.virtualValue).not.toHaveBeenCalled();
    expect(subject.virtualValue()).toBe(1313);
  });

  test("Text are virtually applied", () => {
    jest.spyOn(raw, "text");
    expect(subject.text()).toBe(initText);
    expect(raw.text).not.toHaveBeenCalled();
    subject.text("1313");
    expect(raw.text).not.toHaveBeenCalled();
    expect(subject.text()).toBe("1313");
  });
});

describe("Proxy logs", () => {
  let subject: ComponentProxy;

  beforeEach(() => {
    subject = initTestMocks();
    subject.getDest();
    jest.spyOn(raw, "value");
    jest.spyOn(raw, "getClasses");
    jest.spyOn(context, "logAccess");
  });

  test.each(["value", "rawValue", "virtualValue", "text", "visible"])(
    "logs %s",
    (logType: any) => {
      expect(context.logAccess).toHaveBeenCalledTimes(0);
      /* @ts-expect-error Dynamic calls */
      subject[logType]!();
      expect(context.logAccess).toHaveBeenCalledTimes(1);
      expect((context.logAccess as jest.Mock).mock.calls[0][0]).toBe(logType);
      expect((context.logAccess as jest.Mock).mock.calls[0][1][1]).toBe(
        subject.id(),
      );
    },
  );

  test.each(["hasClass", "getClasses"])(
    "Class access with %s",
    (method: any) => {
      expect(context.logAccess).toHaveBeenCalledTimes(0);
      /* @ts-expect-error Dynamic calls */
      subject[method]!("toto");
      expect(context.logAccess).toHaveBeenCalledTimes(1);
      expect((context.logAccess as jest.Mock).mock.calls[0][0]).toBe("class");
      expect((context.logAccess as jest.Mock).mock.calls[0][1][1]).toBe(
        subject.id(),
      );
    },
  );

  test("Proxy log with view in prompt", () => {
    global.lre = new LRE(context);
    const prompt = server.openView("prompt", undefined);
    const sheetProxy = new SheetProxy(context, prompt);
    const lbl = prompt.get("lbl");
    const lblProxy = new ComponentProxy(context, lbl, sheetProxy, () => ({
      cmpClasses: {},
      cmpTexts: {},
      sheetData: {},
      virtualValues: {},
      visible: {},
    }));
    jest.spyOn(context, "logAccess");
    const cmp = new Component(
      lblProxy,
      new Sheet(sheetProxy, new DataBatcher(context, sheetProxy), context),
      "lbl",
    );
    lblProxy.setDestGetter(() => cmp);

    lblProxy.value();
    expect(context.logAccess).toHaveBeenCalledTimes(1);
    const log = context.getAccessLog("value");
    expect(log.some((l) => l === cmp)).toBeTruthy();
  });
});

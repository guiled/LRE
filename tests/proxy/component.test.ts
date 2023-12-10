import { ProxyMode, ProxyModeHandler } from "../../src/proxy";
import { ComponentProxy } from "../../src/proxy/component";
import { SheetProxy } from "../../src/proxy/sheet";
import {
  MockComponent,
  MockedComponent,
} from "../mock/letsrole/component.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";

jest.mock("../../src/sheet");

let parent: MockedComponent;
let raw: LetsRole.Component;
let rawSheet: LetsRole.Sheet;
let sheetProxy: SheetProxy;
const initValue = 42;
const initClasses = ["class1", "class2"];
const initText = "42";

const initTestMocks = (isVirtual: boolean = false): ComponentProxy => {
  let mode: ProxyMode = "real";
  const modes: ProxyModeHandler = {
    getMode() {
      return mode;
    },
    setMode(newMode) {
      mode = newMode;
    },
  };
  rawSheet = MockSheet({
    id: "main",
    realId: "1234",
    properName: "Kwalish",
  });
  parent = MockComponent({
    id: "parent_test",
    sheet: rawSheet,
  });
  raw = MockComponent({
    id: "test",
    sheet: rawSheet,
    parent,
    value: initValue,
    classes: [...initClasses],
    text: initText,
  });
  sheetProxy = new SheetProxy(modes, rawSheet);

  const subject = new ComponentProxy(modes, raw, sheetProxy, () => ({
    cmpClasses: {},
    cmpTexts: {},
    sheetData: {},
    virtualValues: {},
  }));

  isVirtual && modes.setMode("virtual");

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
  ["setTooltip", ["this is a tooltip", "top"]],
];

describe("Real mode", () => {
  let subject: ComponentProxy;

  beforeAll(() => {
    subject = initTestMocks();
  });

  test.each([...methodsWithoutEffect, ...methodsWithNoParams])(
    "Proxy call %s calls raw method",
    (method) => {
      expect(raw[method!]).not.toBeCalled();
      /* @ts-ignore */
      subject[method].call(subject);
      expect(raw[method!]).toBeCalledTimes(1);
    }
  );

  test.each(methodsWithParams)(
    "Proxy call %s calls raw method",
    (method, args) => {
      expect(raw[method]).not.toBeCalled();
      /* @ts-ignore */
      subject[method].apply(subject, args);
      expect(raw[method]).toBeCalledTimes(1);
    }
  );
});
describe("Virtual mode", () => {
  let subject: ComponentProxy;

  beforeAll(() => {
    subject = initTestMocks(true);
  });

  const methodsWithNoParamsBis = methodsWithNoParams.filter(
    (m) => !["find", "parent"].includes(m)
  );

  test.each(methodsWithNoParamsBis)(
    "Proxy call %s doesn't call raw method",
    (method) => {
      const nbCalls = (raw[method] as jest.Mock).mock.calls.length;
      /* @ts-ignore */
      subject[method].call(subject);
      expect(raw[method!]).toBeCalledTimes(nbCalls);
    }
  );

  const methodsWithParamsBis = methodsWithParams.filter(
    (m) => !["find", "parent"].includes(m[0])
  );

  test.each(methodsWithParamsBis)(
    "Proxy call %s doesn't call raw method",
    (method, args) => {
      const nbCalls = (raw[method] as jest.Mock).mock.calls.length;
      /* @ts-ignore */
      subject[method].apply(subject, args);
      expect(raw[method!]).toBeCalledTimes(nbCalls);
    }
  );
});

describe("Virtual mode sheet, find and parent are virtual", () => {
  let subject: ComponentProxy;

  beforeAll(() => {
    subject = initTestMocks(true);
  });

  test("cmp.sheet() is virtual", () => {
    expect(subject.sheet()).toBe(sheetProxy);
    expect(subject.sheet()).not.toBe(rawSheet);
    expect(raw.sheet).not.toBeCalled();
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
    expect(raw.visible).not.toBeCalled();
    expect(raw.show).not.toBeCalled();
    expect(raw.hide).not.toBeCalled();
    expect(subject.visible()).toBeTruthy();
    expect(raw.visible).toBeCalledTimes(1);
    expect(raw.show).not.toBeCalled();
    expect(raw.hide).not.toBeCalled();

    subject.hide();
    expect(raw.hide).not.toBeCalled();
    expect(subject.visible()).toBeFalsy();
    expect(raw.visible).toBeCalledTimes(1);

    subject.show();
    expect(raw.show).not.toBeCalled();
    expect(subject.visible()).toBeTruthy();
    expect(raw.visible).toBeCalledTimes(1);
  });
});

describe("Virtual mode changes are applied", () => {
  let subject: ComponentProxy;

  beforeEach(() => {
    subject = initTestMocks(true);
    subject.getDest();
    (raw.value as jest.Mock).mockClear();
    (raw.getClasses as jest.Mock).mockClear();
  });

  test("Value is virtually applied ", () => {
    const nbMockCalls = (raw.value as jest.Mock).mock.calls.length;
    const val = subject.value();
    expect(raw.value).toBeCalledTimes(nbMockCalls);
    expect(val).toBe(initValue);
    const newValue = Math.random();
    subject.value(newValue);
    expect(subject.value()).toBe(newValue);
    expect(raw.value).toBeCalledTimes(nbMockCalls);
    expect(rawSheet.setData).not.toBeCalled();
  });

  test("Show / Hide are virtually applied ", () => {
    expect(subject.visible()).toBeTruthy();
    subject.hide();
    expect(subject.visible()).toBeFalsy();
    expect(raw.hide).not.toBeCalled();
    expect(raw.addClass).not.toBeCalled();
    expect(raw.removeClass).not.toBeCalled();
    expect(raw.toggleClass).not.toBeCalled();
    subject.show();
    expect(subject.visible()).toBeTruthy();
    expect(raw.show).not.toBeCalled();
    expect(raw.addClass).not.toBeCalled();
    expect(raw.removeClass).not.toBeCalled();
    expect(raw.toggleClass).not.toBeCalled();
  });
  test("Class changes are virtually applied", () => {
    //const nbMockCalls = (raw.getClasses as jest.Mock).mock.calls.length;
    expect(subject.getClasses().sort().join(",")).toMatch(
      initClasses.sort().join(",")
    );
    //expect(raw.getClasses).toBeCalledTimes(nbMockCalls);
    expect(raw.getClasses).not.toBeCalled();

    subject.addClass("added1");
    expect(subject.getClasses().sort().join(",")).toMatch(
      ["added1", ...initClasses].sort().join(",")
    );
    expect(subject.hasClass("added1")).toBeTruthy();
    expect(raw.hasClass).not.toBeCalled();
    expect(raw.getClasses).not.toBeCalled();

    subject.removeClass("added1");
    expect(subject.getClasses().sort().join(",")).toMatch(
      initClasses.sort().join(",")
    );
    expect(subject.hasClass("added1")).toBeFalsy();
    expect(raw.hasClass).not.toBeCalled();
    expect(raw.getClasses).not.toBeCalled();

    subject.toggleClass("added1");
    expect(subject.getClasses().sort().join(",")).toMatch(
      ["added1", ...initClasses].sort().join(",")
    );
    expect(raw.getClasses).not.toBeCalled();
    subject.toggleClass("added1");
    expect(subject.getClasses().sort().join(",")).toMatch(
      initClasses.sort().join(",")
    );
    expect(raw.getClasses).not.toBeCalled();

    subject.hide();
    expect(subject.hasClass("d-none")).toBeTruthy();
    expect(raw.addClass).not.toBeCalled();
    expect(raw.removeClass).not.toBeCalled();
    expect(raw.toggleClass).not.toBeCalled();
    expect(raw.hasClass).not.toBeCalled();

    subject.show();
    expect(subject.hasClass("d-none")).toBeFalsy();
    expect(raw.addClass).not.toBeCalled();
    expect(raw.removeClass).not.toBeCalled();
    expect(raw.toggleClass).not.toBeCalled();
    expect(raw.hasClass).not.toBeCalled();
    expect(raw.getClasses).not.toBeCalled();
  });
  
  test("Virtualvalues are virtually applied", () => {
    const nbMockCalls = (raw.virtualValue as jest.Mock).mock.calls.length;
    expect(subject.virtualValue()).toBeNull();
    expect(raw.virtualValue).toBeCalledTimes(nbMockCalls);
    subject.virtualValue(1313);
    expect(raw.virtualValue).toBeCalledTimes(nbMockCalls);
    expect(subject.virtualValue()).toBe(1313);
  });

  test("Text are virtually applied", () => {
    const nbMockCalls = (raw.text as jest.Mock).mock.calls.length;
    expect(subject.text()).toBe(initText);
    expect(raw.text).toBeCalledTimes(nbMockCalls);
    subject.text("1313");
    expect(raw.text).toBeCalledTimes(nbMockCalls);
    expect(subject.text()).toBe("1313");
  });
});

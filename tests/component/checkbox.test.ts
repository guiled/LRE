import { Checkbox } from "../../src/component/checkbox";
import { LRE } from "../../src/lre";
import {
  initLetsRole,
  itHasWaitedEverything,
} from "../../src/mock/letsrole/letsrole.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { ViewMock } from "../../src/mock/letsrole/view.mock";

let server: ServerMock;
let rawSheet: ViewMock;
let sheetProxy: SheetProxy;
let sheet: Sheet;
let rawCheckbox: LetsRole.Component;

beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        className: "View",
        children: [
          {
            id: "checkbox",
            className: "Checkbox",
          },
          {
            id: "checkbox2",
            className: "Checkbox",
          },
        ],
      },
    ],
  });
  initLetsRole(server);
  global.lre = new LRE(context);
  context.setMode("real");
  rawSheet = server.openView("main", "12345");
  rawCheckbox = rawSheet.get("checkbox");
  sheetProxy = new SheetProxy(context, rawSheet);

  sheet = new Sheet(sheetProxy, new DataBatcher(context, sheetProxy), context);
  lre.sheets.add(sheet);
});

describe("Checkbox basics", () => {
  test("instantiation by factory", () => {
    const cmp = sheet.get("checkbox");
    expect(cmp).toBeInstanceOf(Checkbox);
  });

  test("enabling and disabling", () => {
    const cmp: Checkbox = new Checkbox(rawCheckbox, sheet, "checkbox");
    expect(cmp.isEnabled()).toBe(true);
    expect(cmp.isDisabled()).toBe(false);
    cmp.disable();
    expect(cmp.isEnabled()).toBe(false);
    expect(cmp.isDisabled()).toBe(true);
  });

  test("Checkbox value and not", () => {
    rawSheet.setData({
      checkbox: true,
    });
    const cmp = new Checkbox(rawCheckbox, sheet, "checkbox");
    expect(cmp.value()).toBe(true);
    expect(cmp.not()).toBe(false);
    rawSheet.triggerComponentEvent("checkbox", "click");
    expect(cmp.value()).toBe(false);
    expect(cmp.not()).toBe(true);
  });
});

describe("Checkbox disabling", () => {
  test("Disabled checkbox doesn't change value", () => {
    const update = jest.fn();
    const cmp = new Checkbox(rawCheckbox, sheet, "checkbox");
    cmp.on("update", update);
    expect(cmp.value()).toBe(false);

    cmp.disable();
    rawSheet.triggerComponentEvent("checkbox", "click");
    itHasWaitedEverything();
    expect(cmp.value()).toBe(false);
    expect(update).not.toHaveBeenCalled();

    cmp.enable();
    rawSheet.triggerComponentEvent("checkbox", "click");
    itHasWaitedEverything();
    expect(cmp.value()).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);

    cmp.disable();
    rawSheet.triggerComponentEvent("checkbox", "click");
    itHasWaitedEverything();
    expect(cmp.value()).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);

    cmp.enable();
    rawSheet.triggerComponentEvent("checkbox", "click");
    itHasWaitedEverything();
    expect(cmp.value()).toBe(false);
    expect(update).toHaveBeenCalledTimes(2);
  });

  test("Enable can be controlled by data", () => {
    const cmp = new Checkbox(rawCheckbox, sheet, "checkbox");
    const cmpProxy = sheetProxy.get("checkbox2");
    const cmp2 = new Checkbox(cmpProxy, sheet, "checkbox2");
    expect(() => cmp.enable(cmp2)).not.toThrow();
    expect(cmp.isEnabled()).toBe(false);
    rawSheet.triggerComponentEvent("checkbox2", "click");
    expect(cmp.isEnabled()).toBe(true);
    rawSheet.triggerComponentEvent("checkbox2", "click");
    expect(cmp.isEnabled()).toBe(false);
  });
});

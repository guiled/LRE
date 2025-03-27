import { Toggle } from "../../src/component/toggle";
import {
  initLetsRole,
  itHasWaitedEverything,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { LRE } from "../../src/lre";
import { ViewMock } from "../../src/mock/letsrole/view.mock";
import { DirectDataProvider } from "../../src/dataprovider";

let server: ServerMock;
let rawSheet: ViewMock;
let sheet: Sheet;

beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        className: "View",
        children: [
          {
            id: "toggle",
            className: "Label",
          },
          {
            id: "toggle2",
            className: "Label",
            classes: "clickable",
          },
          {
            id: "lbl1",
            className: "Label",
          },
          {
            id: "lbl2",
            className: "Label",
          },
          {
            id: "lbl3",
            className: "Label",
          },
          {
            id: "lbl4",
            className: "Label",
          },
          {
            id: "container1",
            className: "Container",
          },
          {
            id: "container2",
            className: "Container",
          },
        ],
      },
    ],
  });
  initLetsRole(server);
  rawSheet = server.openView("main", "12345");
  global.lre = new LRE(context);
  sheet = new Sheet(rawSheet, new DataBatcher(context, rawSheet), context);
  lre.sheets.add(sheet);
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

describe("Toggle", () => {
  test("toggling on label", () => {
    const toggle = sheet.get("toggle") as Toggle;

    expect(toggle).toBeInstanceOf(Toggle);
    expect(toggle.value()).toStrictEqual("");

    toggle.toggling(
      {
        on: "text1",
        off: "text2",
      },
      "off",
    );

    expect(toggle.hasClass("clickable")).toStrictEqual(true);
    expect(toggle.value()).toStrictEqual("off");
    expect(rawSheet.getData()).not.toHaveProperty("toggle");

    itHasWaitedEverything();

    expect(rawSheet.getData()).toMatchObject({
      toggle: "text2",
    });

    toggle.untoggling();

    expect(toggle.value()).toStrictEqual("text2");

    toggle.toggling({
      on: "text1",
      off: "text2",
    });

    expect(toggle.value()).toStrictEqual("on");
  });

  test("Toggling with objects", () => {
    const toggle = sheet.get("toggle") as Toggle;
    toggle.toggling(
      {
        on: {
          icon: "icon1",
        },
        off: {
          icon: "icon2",
        },
      },
      "off",
    );

    expect(toggle.value()).toStrictEqual("off");
    expect(rawSheet.getData()).not.toHaveProperty("toggle");

    itHasWaitedEverything();

    expect(rawSheet.getData()).toMatchObject({
      toggle: "icon2",
    });

    toggle.value("on");

    expect(toggle.value()).toStrictEqual("on");

    itHasWaitedEverything();

    expect(rawSheet.getData()).toMatchObject({
      toggle: "icon1",
    });
  });

  test("Initialization with default value from component", () => {
    const toggle = sheet.get("toggle") as Toggle;
    toggle.value("off");
    itHasWaitedEverything();
    toggle.toggling(
      {
        on: "text1",
        off: "text2",
      },
      "unknown",
    );
    itHasWaitedEverything();

    expect(toggle.value()).toStrictEqual("off");
  });

  test("Clickable class handling", () => {
    const toggle = sheet.get("toggle") as Toggle;

    expect(toggle.hasClass("clickable")).toStrictEqual(false);

    toggle.toggling(
      {
        on: "text1",
        off: "text2",
      },
      "off",
    );

    expect(toggle.hasClass("clickable")).toStrictEqual(true);

    toggle.untoggling();

    expect(toggle.hasClass("clickable")).toStrictEqual(false);

    const toggle2 = sheet.get("toggle2") as Toggle;

    expect(toggle2.hasClass("clickable")).toStrictEqual(true);

    toggle2.toggling(
      {
        on: "text1",
        off: "text2",
      },
      "off",
    );

    expect(toggle2.hasClass("clickable")).toStrictEqual(true);

    toggle2.untoggling();

    expect(toggle2.hasClass("clickable")).toStrictEqual(true);
  });

  test("Click on a toggle changes its value", () => {
    const toggle = sheet.get("toggle") as Toggle;
    toggle.toggling(
      {
        on: "text1",
        off: "text2",
      },
      "off",
    );

    expect(toggle.value()).toStrictEqual("off");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("on");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("off");
  });

  test("Toggle with no values", () => {
    const toggle = sheet.get("toggle") as Toggle;

    expect(toggle.value()).toStrictEqual("");

    toggle.toggling({});

    expect(toggle.value()).toStrictEqual("");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("");

    toggle.untoggling();

    expect(toggle.value()).toStrictEqual("");
  });

  test("Toggling with more than 2 values", () => {
    const toggle = sheet.get("toggle") as Toggle;
    toggle.toggling({
      state1: "Value 1",
      state2: "Value 2",
      state3: "Value 3",
      state4: "Value 4",
    });

    expect(toggle.value()).toStrictEqual("state1");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("state2");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("state3");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("state4");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("state1");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("state2");
  });

  test("Toggling hide and show", () => {
    const toggle = sheet.get("toggle") as Toggle;
    const lbl1 = sheet.get("lbl1")!;
    const lbl2 = sheet.get("lbl2")!;
    const lbl3 = sheet.get("lbl3")!;
    const lbl4 = sheet.get("lbl4")!;
    toggle.toggling({
      on: {
        icon: "icon1",
        show: ["lbl1", "lbl2"],
        hide: ["lbl3"],
      },
      off: {
        icon: "icon2",
        show: ["lbl4"],
      },
    });

    expect(toggle.value()).toStrictEqual("on");

    itHasWaitedEverything();

    expect(lbl1.hasClass("d-none")).toStrictEqual(false);
    expect(lbl2.hasClass("d-none")).toStrictEqual(false);
    expect(lbl3.hasClass("d-none")).toStrictEqual(true);
    expect(lbl4.hasClass("d-none")).toStrictEqual(true);

    rawSheet.triggerComponentEvent("toggle", "click");
    itHasWaitedEverything();

    expect(lbl1.hasClass("d-none")).toStrictEqual(true);
    expect(lbl2.hasClass("d-none")).toStrictEqual(true);
    expect(lbl3.hasClass("d-none")).toStrictEqual(false);
    expect(lbl4.hasClass("d-none")).toStrictEqual(false);
  });

  test("Toggling showflex and hideflex", () => {
    const toggle = sheet.get("toggle") as Toggle;
    const container1 = sheet.get("container1")!;
    const container2 = sheet.get("container2")!;
    toggle.toggling({
      on: {
        icon: "icon1",
        showflex: ["container1"],
        hideflex: ["container2"],
      },
      off: {
        icon: "icon2",
        showflex: ["container2"],
        hideflex: ["container1"],
      },
    });

    expect(toggle.value()).toStrictEqual("on");

    itHasWaitedEverything();

    expect(container1.hasClass("d-flex")).toStrictEqual(true);
    expect(container1.hasClass("d-none")).toStrictEqual(false);
    expect(container2.hasClass("d-flex")).toStrictEqual(false);
    expect(container2.hasClass("d-none")).toStrictEqual(true);

    rawSheet.triggerComponentEvent("toggle", "click");
    itHasWaitedEverything();

    expect(container1.hasClass("d-flex")).toStrictEqual(false);
    expect(container1.hasClass("d-none")).toStrictEqual(true);
    expect(container2.hasClass("d-flex")).toStrictEqual(true);
    expect(container2.hasClass("d-none")).toStrictEqual(false);
  });

  test("Toggling class changes", () => {
    const toggle = sheet.get("toggle") as Toggle;
    toggle.toggling({
      1: {
        icon: "icon1",
        classes: ["class1"],
      },
      2: {
        icon: "icon2",
        classes: ["class2", "class1"],
      },
      3: {
        icon: "icon3",
        classes: ["class3", "class2"],
      },
    });
    itHasWaitedEverything();

    expect(toggle.value()).toStrictEqual("1");
    expect(toggle.hasClass("class1")).toStrictEqual(true);
    expect(toggle.hasClass("class2")).toStrictEqual(false);
    expect(toggle.hasClass("class3")).toStrictEqual(false);

    rawSheet.triggerComponentEvent("toggle", "click");
    itHasWaitedEverything();

    expect(toggle.value()).toStrictEqual("2");
    expect(toggle.hasClass("class1")).toStrictEqual(true);
    expect(toggle.hasClass("class2")).toStrictEqual(true);
    expect(toggle.hasClass("class3")).toStrictEqual(false);

    rawSheet.triggerComponentEvent("toggle", "click");
    itHasWaitedEverything();

    expect(toggle.value()).toStrictEqual("3");
    expect(toggle.hasClass("class1")).toStrictEqual(false);
    expect(toggle.hasClass("class2")).toStrictEqual(true);
    expect(toggle.hasClass("class3")).toStrictEqual(true);

    rawSheet.triggerComponentEvent("toggle", "click");
    itHasWaitedEverything();

    expect(toggle.value()).toStrictEqual("1");
    expect(toggle.hasClass("class1")).toStrictEqual(true);
    expect(toggle.hasClass("class2")).toStrictEqual(false);
    expect(toggle.hasClass("class3")).toStrictEqual(false);
  });

  test("Update event trigger on toggle", () => {
    const toggle = sheet.get("toggle") as Toggle;
    const cb = jest.fn();
    toggle.toggling({
      state1: "Value 1",
      state2: "Value 1",
      state3: "Value 3",
      state4: "Value 4",
    });
    itHasWaitedEverything();
    toggle.on("update", cb);

    expect(cb).not.toHaveBeenCalled();
    expect(toggle.value()).toStrictEqual("state1");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("state2");

    itHasWaitedEverything();

    expect(cb).toHaveBeenCalledTimes(1);

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("state3");

    itHasWaitedEverything();

    expect(cb).toHaveBeenCalledTimes(2);

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("state4");

    itHasWaitedEverything();

    expect(cb).toHaveBeenCalledTimes(3);

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("state1");

    itHasWaitedEverything();

    expect(cb).toHaveBeenCalledTimes(4);

    const rawCb = jest.fn();
    const rawToggle = rawSheet.get("toggle")!;
    rawToggle.on("update", rawCb);

    expect(rawCb).not.toHaveBeenCalled();
    expect(rawToggle.value()).toStrictEqual("Value 1");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(rawToggle.value()).toStrictEqual("Value 1");
    expect(rawCb).not.toHaveBeenCalled();

    itHasWaitedEverything();

    expect(rawToggle.value()).toStrictEqual("Value 1");
    expect(rawCb).toHaveBeenCalledTimes(1);

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(rawToggle.value()).toStrictEqual("Value 1");
    expect(rawCb).toHaveBeenCalledTimes(1);

    itHasWaitedEverything();

    expect(rawToggle.value()).toStrictEqual("Value 3");
    expect(rawCb).toHaveBeenCalledTimes(2);

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(rawToggle.value()).toStrictEqual("Value 3");
    expect(rawCb).toHaveBeenCalledTimes(2);

    itHasWaitedEverything();

    expect(rawToggle.value()).toStrictEqual("Value 4");
    expect(rawCb).toHaveBeenCalledTimes(3);

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(rawToggle.value()).toStrictEqual("Value 4");
    expect(rawCb).toHaveBeenCalledTimes(3);

    itHasWaitedEverything();

    expect(rawToggle.value()).toStrictEqual("Value 1");
    expect(rawCb).toHaveBeenCalledTimes(4);
  });

  test("Update is triggered even is no value change", () => {
    const toggle = sheet.get("toggle") as Toggle;
    toggle.value("OK");
    const cb = jest.fn();
    toggle.toggling({
      state1: {
        classes: ["class1"],
      },
      state2: {
        classes: ["class2"],
      },
    });
    toggle.on("update", cb);
    itHasWaitedEverything();

    expect(cb).not.toHaveBeenCalled();
    expect(toggle.value()).toStrictEqual("state1");
    expect(toggle.hasClass("class1")).toStrictEqual(true);
    expect(toggle.hasClass("class2")).toStrictEqual(false);

    rawSheet.triggerComponentEvent("toggle", "click");
    itHasWaitedEverything();

    expect(cb).toHaveBeenCalledTimes(1);
    expect(toggle.value()).toStrictEqual("state2");
    expect(toggle.hasClass("class1")).toStrictEqual(false);
    expect(toggle.hasClass("class2")).toStrictEqual(true);
  });

  test("Saved toggling value is restored", () => {
    const toggle = sheet.get("toggle") as Toggle;

    expect(toggle).toBeInstanceOf(Toggle);
    expect(toggle.value()).toStrictEqual("");

    toggle.toggling(
      {
        on: "text1",
        off: "text2",
      },
      { default: "off", save: true },
    );

    expect(toggle.value()).toStrictEqual("off");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("on");

    itHasWaitedEverything();

    const rawSheet2 = server.openView("main", "12345");
    const sheet2 = new Sheet(
      rawSheet2,
      new DataBatcher(context, rawSheet2),
      context,
    );
    const toggle2 = sheet2.get("toggle") as Toggle;
    toggle2.toggling(
      {
        on: "text1",
        off: "text2",
      },
      "off",
    );

    expect(toggle2.value()).toStrictEqual("on");
  });

  test("Unsaved toggling value is not restored", () => {
    const toggle = sheet.get("toggle") as Toggle;

    expect(toggle).toBeInstanceOf(Toggle);
    expect(toggle.value()).toStrictEqual("");

    toggle.toggling(
      {
        on: "text1",
        off: "text2",
      },
      "off",
      false,
    );

    expect(toggle.value()).toStrictEqual("off");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("on");

    itHasWaitedEverything();

    const rawSheet2 = server.openView("main", "12345");
    const sheet2 = new Sheet(
      rawSheet2,
      new DataBatcher(context, rawSheet2),
      context,
    );
    const toggle2 = sheet2.get("toggle") as Toggle;
    toggle2.toggling(
      {
        on: "text1",
        off: "text2",
      },
      "off",
      false,
    );

    expect(toggle2.value()).toStrictEqual("off");
  });

  test("Refresh raw restores current value", () => {
    const toggle = sheet.get("toggle") as Toggle;
    toggle.toggling(
      {
        on: "text1",
        off: "text2",
      },
      "off",
    );

    expect(toggle.value()).toStrictEqual("off");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("on");

    itHasWaitedEverything();

    toggle.refreshRaw();
    itHasWaitedEverything();

    expect(toggle.value()).toStrictEqual("on");
  });

  test("Toggle based on data provider", () => {
    const toggle = sheet.get("toggle") as Toggle;
    const data: Record<string, string> = {
      on: "text1",
      off: "text2",
    };
    const fn = jest.fn(() => data);
    const dp = new DirectDataProvider("source", context, fn);
    toggle.toggling(dp);

    expect(toggle.value()).toStrictEqual("on");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("off");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("on");

    data.between = "text3";
    dp.refresh();

    expect(toggle.value()).toStrictEqual("on");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("off");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("between");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("on");
  });

  test("Dynamic value is kept after changing toggling data", () => {
    const toggle = sheet.get("toggle") as Toggle;
    const data: Record<string, string> = {
      on: "text1",
      off: "text2",
    };
    toggle.toggling(data);

    const dp = new DirectDataProvider("source", context, () => "on");
    jest.spyOn(dp, "subscribeRefresh");
    jest.spyOn(dp, "unsubscribeRefresh");

    toggle.value(dp);

    expect(dp.subscribeRefresh).toHaveBeenCalledTimes(1);
    expect(dp.unsubscribeRefresh).not.toHaveBeenCalled();

    jest.clearAllMocks();
    data.on = "text3";
    data.off = "text4";
    toggle.toggling(data);

    expect(dp.subscribeRefresh).not.toHaveBeenCalled();
    expect(dp.unsubscribeRefresh).not.toHaveBeenCalled();
  });

  test("Get next value", () => {
    const toggle = sheet.get("toggle") as Toggle;
    toggle.toggling({
      1: "Value 1",
      2: "Value 2",
      3: "Value 3",
      4: "Value 4",
    });

    expect(toggle.value()).toStrictEqual("1");
    expect(toggle.next()).toStrictEqual("2");
    expect(toggle.next(1)).toStrictEqual("2");
    expect(toggle.next(2)).toStrictEqual("3");
    expect(toggle.next(3)).toStrictEqual("4");
    expect(toggle.next(4)).toStrictEqual("1");
    expect(toggle.next(5)).toStrictEqual("2");

    const lbl1 = sheet.get("lbl1")!;
    lbl1.value(toggle.next.bind(toggle));

    expect(lbl1.value()).toStrictEqual("2");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("2");
    expect(toggle.next()).toStrictEqual("3");
    expect(lbl1.value()).toStrictEqual("3");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.next()).toStrictEqual("4");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.next()).toStrictEqual("1");
  });

  test("Get previous value", () => {
    const toggle = sheet.get("toggle") as Toggle;
    toggle.toggling({
      1: "Value 1",
      2: "Value 2",
      3: "Value 3",
      4: "Value 4",
    });

    expect(toggle.value()).toStrictEqual("1");
    expect(toggle.prev()).toStrictEqual("4");
    expect(toggle.prev(1)).toStrictEqual("4");
    expect(toggle.prev(2)).toStrictEqual("3");
    expect(toggle.prev(3)).toStrictEqual("2");
    expect(toggle.prev(4)).toStrictEqual("1");
    expect(toggle.prev(5)).toStrictEqual("4");

    const lbl1 = sheet.get("lbl1")!;
    lbl1.value(toggle.prev.bind(toggle));

    expect(lbl1.value()).toStrictEqual("4");

    rawSheet.triggerComponentEvent("toggle", "click");

    expect(toggle.value()).toStrictEqual("2");
    expect(toggle.prev()).toStrictEqual("1");
    expect(lbl1.value()).toStrictEqual("1");
  });
});

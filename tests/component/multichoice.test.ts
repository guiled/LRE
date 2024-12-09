import { Component } from "../../src/component";
import { MultiChoice } from "../../src/component/multichoice";
import { LRE } from "../../src/lre";
import { ComponentMock } from "../../src/mock/letsrole/component.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { initLetsRole } from "../../src/mock/letsrole/letsrole.mock";
import { ComponentProxy } from "../../src/proxy/component";

let rawSheet: LetsRole.Sheet;
let sheet: Sheet;

let server: ServerMock;

let rawMultiChoice: ComponentMock;
let proxyMultiChoice: ComponentProxy;
let multiChoice: MultiChoice;
beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        children: [
          {
            id: "multi",
            className: "Choice",
            multiple: true,
          },
          {
            id: "cmd",
            name: "command",
            className: "TextInput",
            defaultValue: "2",
          },
        ],
        className: "View",
      },
    ],
  });
  initLetsRole(server);
  global.lre = new LRE(context);
  context.setMode("real");
  lre.autoNum(false);
  rawSheet = server.openView("main", "123", {
    multi: [],
    cmd: "2",
  });
  const proxySheet = new SheetProxy(context, rawSheet);

  sheet = new Sheet(proxySheet, new DataBatcher(context, proxySheet), context);
  lre.sheets.add(sheet);
  sheet.raw = jest.fn(() => proxySheet);
  jest.spyOn(sheet, "get");
  jest.spyOn(sheet, "componentExists");
  jest.spyOn(sheet, "knownChildren");
  multiChoice = sheet.get("multi") as MultiChoice;
  proxyMultiChoice = multiChoice.raw() as ComponentProxy;
  rawMultiChoice = proxyMultiChoice.getDest() as ComponentMock;
});

describe("MultiChoice", () => {
  test("Multichoice has the good type", () => {
    expect(multiChoice.lreType()).toBe("multichoice");
  });

  test("Multichoice values are converted to number", () => {
    const value = ["1", "2", "3", "a"];
    rawMultiChoice.value(value);
    expect(multiChoice.value()).toEqual(value);
    lre.autoNum(true);
    expect(multiChoice.value()).toEqual([1, 2, 3, "a"]);
    expect(multiChoice.value()).not.toEqual(["1", "2", "3", "a"]);
  });

  test("Remove values in the multichoice values call a setChoices", () => {
    multiChoice.value(["1", "2"]);
    jest.spyOn(rawMultiChoice, "setChoices");
    jest.spyOn(rawSheet, "setData");
    expect(rawSheet.setData).toHaveBeenCalledTimes(0);
    expect(rawMultiChoice.setChoices).toHaveBeenCalledTimes(0);
    multiChoice.value(["1"]);
    expect(rawSheet.setData).toHaveBeenCalledTimes(1);
    expect(rawMultiChoice.setChoices).toHaveBeenCalledTimes(1);
  });

  test("Multichoice value change triggers select event", () => {
    let value = ["1"];
    const mockSelectEvent = jest.fn();
    multiChoice.on("select", mockSelectEvent);
    rawMultiChoice.value(value);
    expect(mockSelectEvent).toHaveBeenCalledTimes(1);
    expect(mockSelectEvent).toHaveBeenCalledWith(
      multiChoice,
      value[0],
      undefined,
      null,
    );
    value = [...value, "2", "3"];
    mockSelectEvent.mockReset();
    rawMultiChoice.value(value);
    expect(mockSelectEvent).toHaveBeenCalledTimes(1);
    expect(mockSelectEvent).toHaveBeenCalledWith(
      multiChoice,
      [value[1], value[2]],
      { 2: "", 3: "" },
      { 2: null, 3: null },
    );
  });

  test("Multichoice value change triggers select event", () => {
    const value = ["1", "2"];
    rawMultiChoice.value(value);
    const mockUnselectEvent = jest.fn();
    multiChoice.on("unselect", mockUnselectEvent);
    rawMultiChoice.value([]);
    expect(mockUnselectEvent).toHaveBeenCalledTimes(1);
    expect(mockUnselectEvent).toHaveBeenCalledWith(
      multiChoice,
      [value[0], value[1]],
      { 1: "", 2: "" },
      { 1: null, 2: null },
    );
  });

  test("Multichoice selection operations", () => {
    const value = ["1", "2"];
    rawMultiChoice.value(value);
    const mockUnselectEvent = jest.fn();
    multiChoice.setChoices({
      "1": "One",
      "2": "Two",
      "3": "Three",
      "4": "Four",
      "5": "Five",
      "6": "Six",
    });
    multiChoice.on("unselect", mockUnselectEvent);
    multiChoice.clear();
    expect(mockUnselectEvent).toHaveBeenCalledTimes(1);
    expect(mockUnselectEvent).toHaveBeenCalledWith(
      multiChoice,
      [value[0], value[1]],
      { "1": "One", "2": "Two" },
      { "1": null, "2": null },
    );
    expect(multiChoice.value()).toEqual([]);
    multiChoice.value(["1"]);
    multiChoice.selectNone();
    expect(multiChoice.value()).toEqual([]);
    multiChoice.value(["1"]);
    multiChoice.unselectAll();
    expect(multiChoice.value()).toEqual([]);
    multiChoice.selectAll();
    expect(multiChoice.value()).toEqual(["1", "2", "3", "4", "5", "6"]);
    multiChoice.invert();
    expect(multiChoice.value()).toEqual([]);
    multiChoice.invert();
    expect(multiChoice.value()).toEqual(["1", "2", "3", "4", "5", "6"]);
    rawMultiChoice.value(["1", "3", "5"]);
    multiChoice.invert();
    expect(multiChoice.value()).toEqual(["2", "4", "6"]);
  });

  test("Multichoice checked() and unchecked() return providers", () => {
    const data = lre.dataProvider("test", () => {
      return {
        a: { id: "1", lbl: "One", nb: 10 },
        b: { id: "2", lbl: "Two", nb: 20 },
        c: { id: "3", lbl: "Three", nb: 30 },
        d: { id: "4", lbl: "Four", nb: 40 },
        e: { id: "5", lbl: "Five", nb: 50 },
        f: { id: "6", lbl: "Six", nb: 60 },
      };
    });
    multiChoice.setChoices(data.select("lbl"));
    const checked = multiChoice.checked();
    const unchecked = multiChoice.unchecked();
    expect(checked.provider).toBeTruthy();
    expect(unchecked.provider).toBeTruthy();
    expect(checked.providedValue()).toEqual({});
    expect(unchecked.providedValue()).toEqual({
      a: "One",
      b: "Two",
      c: "Three",
      d: "Four",
      e: "Five",
      f: "Six",
    });
    multiChoice.value(["a"]);
    expect(checked.providedValue()).toEqual({ a: "One" });
    expect(unchecked.providedValue()).toEqual({
      b: "Two",
      c: "Three",
      d: "Four",
      e: "Five",
      f: "Six",
    });
    multiChoice.value(["a", "c"]);
    expect(checked.providedValue()).toEqual({ a: "One", c: "Three" });
    expect(unchecked.providedValue()).toEqual({
      b: "Two",
      d: "Four",
      e: "Five",
      f: "Six",
    });
    expect(checked.getData("a")).toStrictEqual({
      id: "1",
      lbl: "One",
      nb: 10,
    });
    expect(unchecked.getData("b")).toStrictEqual({
      id: "2",
      lbl: "Two",
      nb: 20,
    });
  });

  test("Limit min and max choices with numbers", () => {
    multiChoice.on("click:other", jest.fn());
    const data = lre.dataProvider("test", () => {
      return {
        1: { id: "1", lbl: "One", nb: 10 },
        2: { id: "2", lbl: "Two", nb: 20 },
        3: { id: "3", lbl: "Three", nb: 30 },
        4: { id: "4", lbl: "Four", nb: 40 },
        5: { id: "5", lbl: "Five", nb: 50 },
        6: { id: "6", lbl: "Six", nb: 60 },
      };
    });
    multiChoice.setChoices(data.select("lbl"));
    rawMultiChoice.value([]);
    multiChoice.on("click", jest.fn());
    multiChoice.maxChoiceNb(2);
    rawMultiChoice.value(["1"]);
    expect(multiChoice.value()).toEqual(["1"]);
    rawMultiChoice.value(["1", "2"]);
    expect(multiChoice.value()).toEqual(["1", "2"]);
    rawMultiChoice.value(["1", "2", "3"]);
    expect(multiChoice.value()).toEqual(["1", "2"]);
    multiChoice.value(["1", "2", "3", "4"]);
    expect(multiChoice.value()).toEqual(["1", "2"]);
    multiChoice.maxChoiceNb(3);
    multiChoice.minChoiceNb(2);
    multiChoice.value(["1", "2", "3"]);
    expect(multiChoice.value()).toEqual(["1", "2", "3"]);
    rawMultiChoice.value(["1"]);
    expect(multiChoice.value()).toEqual(["1", "2", "3"]);
  });

  test("Limit min and max choices with providers", () => {
    const data = lre.dataProvider("test", () => {
      return {
        1: { id: "1", lbl: "One", nb: 10 },
        2: { id: "2", lbl: "Two", nb: 20 },
        3: { id: "3", lbl: "Three", nb: 30 },
        4: { id: "4", lbl: "Four", nb: 40 },
        5: { id: "5", lbl: "Five", nb: 50 },
        6: { id: "6", lbl: "Six", nb: 60 },
      };
    });

    multiChoice.setChoices(data.select("lbl"));
    const rawCmd = rawSheet.get("cmd");
    const cmp = sheet.get("cmd") as Component;
    multiChoice.maxChoiceNb(cmp);
    expect(
      context.getPreviousAccessLog("value").map((l) => l.join("-")),
    ).toContain(sheet.getSheetId() + "-cmd");
    const updateEvent = jest.fn();
    multiChoice.on("update", updateEvent);

    rawMultiChoice.value(["1"]);
    expect(updateEvent).toHaveBeenCalledTimes(1);
    updateEvent.mockReset();
    expect(multiChoice.value()).toEqual(["1"]);

    rawMultiChoice.value(["1", "2"]);
    expect(updateEvent).toHaveBeenCalledTimes(1);
    updateEvent.mockReset();
    expect(multiChoice.value()).toEqual(["1", "2"]);

    rawMultiChoice.value(["1", "2", "3"]);
    expect(multiChoice.value()).toEqual(["1", "2"]);
    expect(rawMultiChoice.value()).toEqual(["1", "2"]);
    expect(updateEvent).toHaveBeenCalledTimes(0);
    updateEvent.mockReset();

    rawCmd.value("3");
    rawMultiChoice.value(["1", "2", "3"]);
    expect(updateEvent).toHaveBeenCalledTimes(1);
    updateEvent.mockReset();
    expect(multiChoice.value()).toEqual(["1", "2", "3"]);
    multiChoice.maxChoiceNb(50, (_lbl, _id, data: any, _prev) => {
      return data?.nb;
    });
    rawMultiChoice.value(["1", "2", "3", "4"]);
    expect(multiChoice.value()).toEqual(["1", "2", "3"]);

    multiChoice.minChoiceNb(() => (cmp.value() as number) - 1);
    rawMultiChoice.value(["1", "2"]);
    expect(multiChoice.value()).toEqual(["1", "2"]);
    rawMultiChoice.value(["1"]);
    expect(multiChoice.value()).toEqual(["1", "2"]);
    rawCmd.value(2);
    rawMultiChoice.value(["1"]);
    expect(multiChoice.value()).toEqual(["1"]);
    rawMultiChoice.value([]);
    expect(multiChoice.value()).toEqual(["1"]);
    rawCmd.value(3);
    expect(multiChoice.value()).toEqual(["1"]);
    rawMultiChoice.value([]);
    expect(multiChoice.value()).toEqual(["1"]);
    rawMultiChoice.value(["1", "2"]);
    expect(multiChoice.value()).toEqual(["1", "2"]);
  });

  test("Multichoice triggers limit event", () => {
    const data = lre.dataProvider("test", () => {
      return {
        1: { id: "1", lbl: "One", nb: 10 },
        2: { id: "2", lbl: "Two", nb: 20 },
        3: { id: "3", lbl: "Three", nb: 30 },
        4: { id: "4", lbl: "Four", nb: 40 },
        5: { id: "5", lbl: "Five", nb: 50 },
        6: { id: "6", lbl: "Six", nb: 60 },
      };
    });

    multiChoice.setChoices(data.select("lbl"));
    multiChoice.maxChoiceNb(2);
    multiChoice.minChoiceNb(1);
    const limitEvent = jest.fn();
    multiChoice.on("limit", limitEvent);
    expect(limitEvent).not.toHaveBeenCalled();
    rawMultiChoice.value(["1"]);
    expect(limitEvent).not.toHaveBeenCalled();
    rawMultiChoice.value([]);
    expect(limitEvent).toHaveBeenCalledTimes(1);
    rawMultiChoice.value(["1", "2"]);
    expect(limitEvent).toHaveBeenCalledTimes(1);
    rawMultiChoice.value(["1", "2", "3"]);
    expect(limitEvent).toHaveBeenCalledTimes(2);
  });

  test("Limit multichoice with object as condition", () => {
    const data = lre.dataProvider("test", () => {
      return {
        1: { id: "1", lbl: "One", nb: 2, weight: 30 },
        2: { id: "2", lbl: "Two", nb: 2, weight: 10 },
        3: { id: "3", lbl: "Three", nb: 1, weight: 20 },
        4: { id: "4", lbl: "Four", nb: 1, weight: 10 },
        5: { id: "5", lbl: "Five", nb: 3, weight: 1 },
        6: { id: "6", lbl: "Six", nb: 1, weight: 50 },
        7: { id: "7", lbl: "Seven", nb: 3, weight: 10 },
      };
    });
    multiChoice.setChoices(data.select("lbl"));
    multiChoice.maxChoiceNb({ weight: 40 }, (_lbl, _id, data: any, _prev) => {
      return data?.weight;
    });

    // doesn't exceed the limit
    rawMultiChoice.value(["1", "2"]);
    expect(multiChoice.value()).toEqual(["1", "2"]);

    // exceeds the limit
    rawMultiChoice.value(["1", "2", "3"]);
    expect(multiChoice.value()).toEqual(["1", "2"]);

    // new limit
    multiChoice.maxChoiceNb({ weight: 40 }, (_lbl, _id, data: any, _prev) => {
      return {
        data: data?.weight,
      };
    });

    // doesn't exceed the limit
    rawMultiChoice.value(["1", "2", "3"]);
    expect(multiChoice.value()).toEqual(["1", "2", "3"]);

    // composed limit
    multiChoice.maxChoiceNb(
      { cnt: 5, weight: 80 },
      (_lbl, _id, data: any, _prev) => {
        return {
          cnt: 1,
          weight: data?.weight,
        };
      },
    );
    rawMultiChoice.value(["1", "2", "3", "4", "6"]);
    expect(multiChoice.value()).toEqual(["1", "2", "3"]);

    rawMultiChoice.value(["1", "2", "3", "4", "5"]);
    expect(multiChoice.value()).toEqual(["1", "2", "3", "4", "5"]);

    rawMultiChoice.value(["1", "2", "3", "4", "5", "7"]);
    expect(multiChoice.value()).toEqual(["1", "2", "3", "4", "5"]);
  });
});

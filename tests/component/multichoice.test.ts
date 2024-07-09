import { Component } from "../../src/component";
import { MultiChoice } from "../../src/component/multichoice";
import { DirectDataProvider } from "../../src/dataprovider";
import { LRE } from "../../src/lre";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import {
  MockComponent,
  MockedComponent,
} from "../mock/letsrole/component.mock";
import { initLetsRole } from "../mock/letsrole/letsrole.mock";
import { MockServer } from "../mock/letsrole/server.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

global.lre = new LRE(modeHandlerMock);
initLetsRole();

let rawSheet: LetsRole.Sheet;
let sheet: Sheet;

let server: MockServer;
let cmpDefs;

let rawMultiChoice: MockedComponent;
let multiChoice: MultiChoice;
beforeEach(() => {
  modeHandlerMock.setMode("real");
  lre.autoNum(false);
  server = new MockServer();
  rawSheet = MockSheet({
    id: "main",
    realId: "123",
    data: {
      multi: [],
      cmd: "2",
    },
  });
  server.registerMockedSheet(rawSheet, [
    {
      id: "cmd",
      name: "command",
      classes: ["label"],
      value: "2",
    },
  ]);
  const proxySheet = new SheetProxy(modeHandlerMock, rawSheet);

  sheet = new Sheet(
    proxySheet,
    new DataBatcher(modeHandlerMock, proxySheet),
    modeHandlerMock
  );
  sheet.raw = jest.fn(() => proxySheet);
  jest.spyOn(sheet, "get");
  jest.spyOn(sheet, "componentExists");
  jest.spyOn(sheet, "knownChildren");
  cmpDefs = {
    id: "multi",
    sheet: proxySheet,
    name: "multichoice",
    classes: ["choice", "multiple"],
    value: [],
  };
  rawMultiChoice = MockComponent(cmpDefs);
  rawMultiChoice.text = jest.fn(() => {
    return null;
  });
  server.registerMockedComponent(rawMultiChoice);
  multiChoice = new MultiChoice(rawMultiChoice, sheet, "multi");
});

describe("MultiChoice", () => {
  test("Multichoice has the good type", () => {
    expect(multiChoice.lreType()).toBe("multichoice");
  });

  test("Remove values in the multichoice values call a setChoices", () => {
    multiChoice.value(["1", "2"]);
    jest.spyOn(rawMultiChoice, "setChoices");
    (rawSheet.setData as jest.Mock).mockClear();
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
      null,
      null
    );
    value = [...value, "2", "3"];
    mockSelectEvent.mockReset();
    rawMultiChoice.value(value);
    expect(mockSelectEvent).toHaveBeenCalledTimes(1);
    expect(mockSelectEvent).toHaveBeenCalledWith(
      multiChoice,
      [value[1], value[2]],
      { 2: null, 3: null },
      { 2: null, 3: null }
    );
  });

  test("Multichoice value change triggers select event", () => {
    let value = ["1", "2"];
    rawMultiChoice.value(value);
    const mockUnselectEvent = jest.fn();
    multiChoice.on("unselect", mockUnselectEvent);
    rawMultiChoice.value([]);
    expect(mockUnselectEvent).toHaveBeenCalledTimes(1);
    expect(mockUnselectEvent).toHaveBeenCalledWith(
      multiChoice,
      [value[0], value[1]],
      { 1: null, 2: null },
      { 1: null, 2: null }
    );
  });

  test("Multichoice selection operations", () => {
    let value = ["1", "2"];
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
      { "1": null, "2": null }
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
    const data = new DirectDataProvider(() => {
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
    const checked = multiChoice.checked();
    const unchecked = multiChoice.unchecked();
    expect(checked.provider).toBeTruthy();
    expect(unchecked.provider).toBeTruthy();
    expect(checked.providedValue()).toEqual({});
    expect(unchecked.providedValue()).toEqual({
      1: "One",
      2: "Two",
      3: "Three",
      4: "Four",
      5: "Five",
      6: "Six",
    });
    multiChoice.value(["1"]);
    expect(checked.providedValue()).toEqual({ 1: "One" });
    expect(unchecked.providedValue()).toEqual({
      2: "Two",
      3: "Three",
      4: "Four",
      5: "Five",
      6: "Six",
    });
    multiChoice.value(["1", "3"]);
    expect(checked.providedValue()).toEqual({ 1: "One", 3: "Three" });
    expect(unchecked.providedValue()).toEqual({
      2: "Two",
      4: "Four",
      5: "Five",
      6: "Six",
    });
    expect(checked.getData("1")).toStrictEqual({
      id: "1",
      lbl: "One",
      nb: 10,
    });
    expect(unchecked.getData("2")).toStrictEqual({
      id: "2",
      lbl: "Two",
      nb: 20,
    });
  });

  test("Limit min and max choices with numbers", () => {
    const data = new DirectDataProvider(() => {
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
    const data = new DirectDataProvider(() => {
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
    modeHandlerMock.resetAccessLog();
    multiChoice.maxChoiceNb(cmp);
    expect(modeHandlerMock.getPreviousAccessLog("value")).toContain("cmd");
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
    const data = new DirectDataProvider(() => {
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
    const data = new DirectDataProvider(() => {
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
      }
    );
    rawMultiChoice.value(["1", "2", "3", "4", "6"]);
    expect(multiChoice.value()).toEqual(["1", "2", "3"]);

    rawMultiChoice.value(["1", "2", "3", "4", "5"]);
    expect(multiChoice.value()).toEqual(["1", "2", "3", "4", "5"]);

    rawMultiChoice.value(["1", "2", "3", "4", "5", "7"]);
    expect(multiChoice.value()).toEqual(["1", "2", "3", "4", "5"]);
  });
});

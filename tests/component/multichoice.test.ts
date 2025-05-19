import { Component } from "../../src/component";
import { MultiChoice } from "../../src/component/multichoice";
import { LRE } from "../../src/lre";
import { ComponentMock } from "../../src/mock/letsrole/component.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import {
  initLetsRole,
  itHasWaitedEverything,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { ComponentProxy } from "../../src/proxy/component";
import { Choice } from "../../src/component/choice";
import { DirectDataProvider } from "../../src/dataprovider";

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
          {
            id: "choiceOn",
            className: "Choice",
          },
          {
            id: "choiceOff",
            className: "Choice",
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
  multiChoice = sheet.get("multi") as MultiChoice;
  proxyMultiChoice = multiChoice.raw() as ComponentProxy;
  rawMultiChoice = proxyMultiChoice.getDest() as ComponentMock;
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
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

  test("Set value of the sames values doesn't trigger update event", () => {
    multiChoice.value(["1", "2"]);
    const mockUpdateEvent = jest.fn();
    multiChoice.on("update", mockUpdateEvent);
    multiChoice.value(["1", "2"]);

    expect(mockUpdateEvent).toHaveBeenCalledTimes(0);
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

  test("Multichoice value change triggers unselect event", () => {
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

    expect(cmp.value()).toBe("2");

    multiChoice.maxChoiceNb(cmp);

    expect(
      context
        .getPreviousAccessLog("value")
        .map((l) => (l as Array<string>).join("-")),
    ).toContain(sheet.getSheetId() + "-cmd");

    const updateEvent = jest.fn();
    multiChoice.on("update", updateEvent);

    rawMultiChoice.value(["1"]);

    expect(updateEvent).toHaveBeenCalledTimes(1);
    expect(multiChoice.value()).toEqual(["1"]);

    updateEvent.mockReset();

    rawMultiChoice.value(["1", "2"]);

    expect(updateEvent).toHaveBeenCalledTimes(1);
    expect(multiChoice.value()).toEqual(["1", "2"]);

    updateEvent.mockReset();

    rawMultiChoice.value(["1", "2", "3"]);

    expect(multiChoice.value()).toEqual(["1", "2"]);
    expect(rawMultiChoice.value()).toEqual(["1", "2"]);
    expect(updateEvent).toHaveBeenCalledTimes(0);

    updateEvent.mockReset();

    rawCmd.value("3");
    rawMultiChoice.value(["1", "2", "3"]);

    expect(multiChoice.value()).toEqual(["1", "2", "3"]);
    expect(updateEvent).toHaveBeenCalledTimes(1);

    updateEvent.mockReset();

    multiChoice.maxChoiceNb(50, (_lbl, _id, data: any, _prev) => {
      return data?.nb;
    });
    rawMultiChoice.value(["1", "2", "3", "4"]);

    expect(multiChoice.value()).toEqual(["1", "2", "3"]);

    multiChoice.minChoiceNb(() => (cmp.value() as number) - 1);

    expect(multiChoice.minChoiceNb()).toBe(2);

    rawMultiChoice.value(["1", "2"]);

    expect(multiChoice.value()).toEqual(["1", "2"]);

    rawMultiChoice.value(["1"]);

    expect(multiChoice.value()).toEqual(["1", "2"]);

    rawCmd.value(2);

    expect(multiChoice.minChoiceNb()).toBe(1);

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
    const limitEventMin = jest.fn();
    const limitEventMax = jest.fn();
    multiChoice.on("limit", limitEvent);
    multiChoice.on("limitmin", limitEventMin);
    multiChoice.on("limitmax", limitEventMax);

    expect(limitEvent).not.toHaveBeenCalled();
    expect(limitEventMin).not.toHaveBeenCalled();
    expect(limitEventMax).not.toHaveBeenCalled();

    rawMultiChoice.value(["1"]);

    expect(limitEvent).not.toHaveBeenCalled();
    expect(limitEventMin).not.toHaveBeenCalled();
    expect(limitEventMax).not.toHaveBeenCalled();

    rawMultiChoice.value([]);

    expect(limitEvent).toHaveBeenCalledTimes(1);
    expect(limitEventMin).toHaveBeenCalledTimes(1);
    expect(limitEventMax).not.toHaveBeenCalled();

    rawMultiChoice.value(["1", "2"]);

    expect(limitEvent).toHaveBeenCalledTimes(1);
    expect(limitEventMin).toHaveBeenCalledTimes(1);
    expect(limitEventMax).not.toHaveBeenCalled();

    rawMultiChoice.value(["1", "2", "3"]);

    expect(limitEvent).toHaveBeenCalledTimes(2);
    expect(limitEventMin).toHaveBeenCalledTimes(1);
    expect(limitEventMax).toHaveBeenCalledTimes(1);
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

describe("Multichoice setChoices", () => {
  let fnUpdate: jest.Mock;
  let fnSelect: jest.Mock;
  let fnUnselect: jest.Mock;

  beforeEach(() => {
    multiChoice.setChoices({
      a: "One",
      b: "Two",
      c: "Three",
    });
    multiChoice.value(["b"]);
    itHasWaitedEverything();
    fnUpdate = jest.fn(() => {
      return true;
    });
    fnSelect = jest.fn();
    fnUnselect = jest.fn();
    multiChoice.on("update", fnUpdate);
    multiChoice.on("select", fnSelect);
    multiChoice.on("unselect", fnUnselect);
    jest.clearAllMocks();
  });

  test("Unique value is kept if in new choices, no update event", () => {
    expect(multiChoice.value()).toEqual(["b"]);

    multiChoice.setChoices({
      a: "One",
      b: "Two",
      c: "Three",
      d: "Four",
    });

    expect(multiChoice.value()).toEqual(["b"]);
    expect(fnUpdate).not.toHaveBeenCalled();
    expect(fnSelect).not.toHaveBeenCalled();
    expect(fnUnselect).not.toHaveBeenCalled();
  });

  test("Unique value is lost if not in new choices", () => {
    multiChoice.value(["b"]);

    expect(multiChoice.value()).toEqual(["b"]);

    jest.clearAllMocks();

    multiChoice.setChoices({
      a: "One",
      c: "Three",
      d: "Four",
    });

    expect(multiChoice.value()).toEqual([]);
    expect(fnUpdate).toHaveBeenCalledTimes(1);
    expect(fnSelect).not.toHaveBeenCalled();
    expect(fnUnselect).toHaveBeenCalledTimes(1);
  });

  test("Multiple values are kept if all in new choices", () => {
    multiChoice.value(["b", "c"]);

    expect(multiChoice.value()).toEqual(["b", "c"]);

    jest.clearAllMocks();

    multiChoice.setChoices({
      a: "One",
      b: "Two",
      c: "Three",
      d: "Four",
    });

    expect(multiChoice.value()).toEqual(["b", "c"]);
    expect(fnUpdate).not.toHaveBeenCalled();
    expect(fnSelect).not.toHaveBeenCalled();
    expect(fnUnselect).not.toHaveBeenCalled();
  });

  test("Multiple values are lost if none in new choices", () => {
    multiChoice.value(["b", "c"]);

    expect(multiChoice.value()).toEqual(["b", "c"]);

    jest.clearAllMocks();

    multiChoice.setChoices({
      a: "One",
      d: "Four",
      e: "Five",
      f: "Six",
    });

    expect(multiChoice.value()).toEqual([]);
    expect(fnUpdate).toHaveBeenCalledTimes(1);
    expect(fnSelect).not.toHaveBeenCalled();
    expect(fnUnselect).toHaveBeenCalledTimes(1);
  });

  test("Multiple values are kept for those in new choices", () => {
    multiChoice.value(["b", "c"]);

    expect(multiChoice.value()).toEqual(["b", "c"]);

    jest.clearAllMocks();

    multiChoice.setChoices({
      a: "One",
      d: "Four",
      e: "Five",
      c: "Three",
      f: "Six",
    });

    expect(multiChoice.value()).toEqual(["c"]);
    expect(fnUpdate).toHaveBeenCalledTimes(1);
    expect(fnSelect).not.toHaveBeenCalled();
    expect(fnUnselect).toHaveBeenCalledTimes(1);
  });
});

describe("Multichoice checked and unchecked", () => {
  let data: IDataProvider;

  beforeEach(() => {
    data = lre.dataProvider("test", () => {
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
  });

  test("Checked and unchecked always return the same provider", () => {
    const checked1 = multiChoice.checked();
    const checked2 = multiChoice.checked();
    const unchecked1 = multiChoice.unchecked();
    const unchecked2 = multiChoice.unchecked();

    expect(checked1).toBe(checked2);
    expect(unchecked1).toBe(unchecked2);
  });

  test("Multichoice checked() and unchecked() return providers", () => {
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

  test("Checked and unchecked pass on multichoice update", () => {
    const checked = multiChoice.checked();
    const unchecked = multiChoice.unchecked();
    const choiceOn = sheet.get("choiceOn") as Choice;
    const choiceOff = sheet.get("choiceOff") as Choice;
    const transformed = checked.transform("lbl") as DirectDataProvider;
    choiceOn.setChoices(transformed);
    choiceOff.setChoices(unchecked);

    expect(choiceOn.getChoices()).toStrictEqual({});
    expect(choiceOff.getChoices()).toStrictEqual({
      a: "One",
      b: "Two",
      c: "Three",
      d: "Four",
      e: "Five",
      f: "Six",
    });

    multiChoice.value(["a"]);

    expect(checked.providedValue()).toStrictEqual({ a: "One" });
    expect(unchecked.providedValue()).toStrictEqual({
      b: "Two",
      c: "Three",
      d: "Four",
      e: "Five",
      f: "Six",
    });
    expect(choiceOn.getChoices()).toStrictEqual({ a: "One" });
  });

  test("Value is reset if choices totally changed", () => {
    const checked = multiChoice.checked() as DirectDataProvider;
    const unchecked = multiChoice.unchecked() as DirectDataProvider;
    const fnCheckedUpdate = jest.fn();
    const fnUncheckedUpdate = jest.fn();
    checked.on("refresh", fnCheckedUpdate);
    unchecked.on("refresh", fnUncheckedUpdate);
    checked.refresh(); // force data provider dependencies
    unchecked.refresh(); // force data provider dependencies

    const data = {
      a: "One",
      b: "Two",
      c: "Three",
      d: "Four",
      e: "Five",
      f: "Six",
    };

    expect(multiChoice.getChoices()).toStrictEqual(data);

    multiChoice.value(["a", "c"]);

    expect(multiChoice.value()).toStrictEqual(["a", "c"]);

    multiChoice.setChoices({
      g: "Seven",
      h: "Eight",
      i: "Nine",
    });

    expect(multiChoice.value()).toStrictEqual([]);
    expect(fnCheckedUpdate).toHaveBeenCalledTimes(1);
    expect(fnUncheckedUpdate).toHaveBeenCalledTimes(1);
    expect(checked.providedValue()).toStrictEqual({});
    expect(unchecked.providedValue()).toStrictEqual(data);
  });
});

describe("Multichoice filled with data", () => {
  test("valueProvider returns the right data", () => {
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
    multiChoice.value([]);

    const provider = multiChoice.valueProvider()!;

    expect(provider).toHaveProperty("provider");
    expect(provider.providedValue()).toStrictEqual({});

    multiChoice.value(["1"]);

    expect(provider.providedValue()).toStrictEqual({
      1: "One",
    });

    multiChoice.value(["1", "4"]);

    expect(provider.providedValue()).toStrictEqual({
      1: "One",
      4: "Four",
    });
    expect(provider.getData()).toStrictEqual({
      1: { id: "1", lbl: "One", nb: 2, weight: 30 },
      4: { id: "4", lbl: "Four", nb: 1, weight: 10 },
    });

    const transformed = provider.transform({
      id: "id",
      name: "lbl",
      points: "weight",
    });

    expect(transformed.providedValue()).toStrictEqual({
      1: { id: "1", name: "One", points: 30 },
      4: { id: "4", name: "Four", points: 10 },
    });

    const unchecked = multiChoice.unchecked();

    expect(unchecked.providedValue()).toStrictEqual({
      2: "Two",
      3: "Three",
      5: "Five",
      6: "Six",
      7: "Seven",
    });

    const transformedChecked = unchecked.transform({
      id: "id",
      name: "lbl",
      points: "weight",
    });

    expect(transformedChecked.providedValue()).toStrictEqual({
      2: { id: "2", name: "Two", points: 10 },
      3: { id: "3", name: "Three", points: 20 },
      5: { id: "5", name: "Five", points: 1 },
      6: { id: "6", name: "Six", points: 50 },
      7: { id: "7", name: "Seven", points: 10 },
    });
  });
});

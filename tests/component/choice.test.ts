import { Choice, ChoicesWithData } from "../../src/component/choice";
import { DirectDataProvider } from "../../src/dataprovider";
import { LRE } from "../../src/lre";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { LreTables } from "../../src/tables";
import {
  initLetsRole,
  itHasWaitedEverything,
  defineTable,
} from "../mock/letsrole/letsrole.mock";
import { MockServer } from "../mock/letsrole/server.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

let raw: LetsRole.Component;
let rawSheet: LetsRole.Sheet;
let sheet: ISheet;

beforeEach(() => {
  initLetsRole();
  global.lre = new LRE(modeHandlerMock);
  Tables = new LreTables(Tables);

  rawSheet = MockSheet({
    id: "main",
    realId: "12345",
  });
  const server = new MockServer();
  server.registerMockedSheet(rawSheet, [
    {
      id: "ch",
      name: "choice",
      classes: ["choice"],
      text: "theChoice",
    },
    {
      id: "chA",
      name: "choice",
      classes: ["choice"],
      text: "theChoice",
      value: "a",
    },
  ]);
  sheet = new Sheet(
    rawSheet,
    new DataBatcher(modeHandlerMock, rawSheet),
    modeHandlerMock
  );
  raw = rawSheet.get("ch");
});

describe("Choice basic", () => {
  test("label", () => {
    const choice = new Choice(raw, sheet, "ch");
    expect(choice.label()).toBe("theChoice");
  });

  test("setChoices", () => {
    const choice = new Choice(raw, sheet, "ch");
    expect(choice.value()).toBe("");
    expect(raw.setChoices).not.toHaveBeenCalled();
    const newChoices = {
      a: "1",
      b: "2",
    };
    choice.setChoices(newChoices);
    expect(raw.setChoices).toHaveBeenCalledWith(newChoices);
  });

  test("Events", () => {
    const choice = new Choice(raw, sheet, "ch");
    const select = jest.fn();
    const unselect = jest.fn();
    const valselect1 = jest.fn();
    const valselect2 = jest.fn();
    const valunselect1 = jest.fn();
    const valunselect2 = jest.fn();
    const valclick = jest.fn();
    choice.on("select", select);
    choice.on("unselect", unselect);
    choice.on("valselect:1", valselect1);
    choice.on("valselect:2", valselect2);
    choice.on("valunselect:1", valunselect1);
    choice.on("valunselect:2", valunselect2);
    choice.on("valclick", valclick);
    expect(choice.value()).toBe("");

    choice.value(1);
    expect(select).toHaveBeenCalledWith(choice, 1);
  });
});

describe("Choice get and set choices", () => {
  test("empty getChoices gives a message", () => {
    const ch = new Choice(raw, sheet, "ch");
    jest.spyOn(lre, "warn");
    expect(ch.getChoices()).toStrictEqual({});
    expect(lre.warn).toHaveBeenCalled();
  });

  test("set choice is error protected", () => {
    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
    expect(ch.getChoices()).toStrictEqual({});
    expect(() =>
      ch.setChoices({
        a: "1",
        b: "2",
      })
    ).not.toThrowError();
    ch.value("a");
    itHasWaitedEverything();
    expect(ch.value()).toBe("a");
    expect(() =>
      ch.setChoices({
        c: "2",
        d: "3",
      })
    ).not.toThrowError();
  });
});

describe("Set choice dynamically", () => {
  test("Set Choices from function", () => {
    const cmp1 = sheet.get("cmp1")!;
    const cmp2 = sheet.get("cmp2")!;
    cmp1.value("a");
    cmp2.value("b");
    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
    ch.setChoices((): ChoicesWithData => {
      return {
        1: cmp1.value() as string,
        2: cmp2.value() as string,
      };
    });
    expect(ch.getChoices()).toStrictEqual({ 1: "a", 2: "b" });
    cmp1.value("c");
    expect(ch.getChoices()).toStrictEqual({ 1: "c", 2: "b" });
    const data1 = { a: 1 };
    const data2 = { b: 2 };
    ch.setChoices((): ChoicesWithData => {
      return {
        1: { value: cmp1.value() as string, data: data1 },
        2: { value: cmp2.value() as string, data: data2 },
      };
    });
    ch.value(2);
    expect(ch.choiceData()).toStrictEqual(data2);
    ch.value(1);
    expect(ch.choiceData()).toStrictEqual(data1);
  });

  test("Set Choices from data provider", () => {
    let a = "42";
    let b = "13";
    const p = new DirectDataProvider(() => ({
      a,
      b,
    }));

    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
    ch.setChoices(p);
    expect(ch.getChoices()).toStrictEqual({
      a,
      b,
    });
    const cmp1 = sheet.get("cmp1")!;
    const cmp2 = sheet.get("cmp2")!;
    cmp1.value("1");
    cmp2.value(2);
    const g = sheet.group("_nonexisting_", ["cmp1", "cmp2"]);
    ch.setChoices(g);
    expect(ch.getChoices()).toStrictEqual({
      cmp1: "1",
      cmp2: 2,
    });
    cmp1.value("42");
    expect(ch.getChoices()).toStrictEqual({
      cmp1: "42",
      cmp2: 2,
    });
  });
});

describe("choice populate", () => {
  const TABLE_NAME = "theTable";
  beforeAll(() => {
    defineTable(TABLE_NAME, [
      {
        id: "a",
        a: "1",
        b: "2",
      },
      {
        id: "b",
        a: "2",
        b: "3",
      },
    ]);
  });

  test("populate with table name", () => {
    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
    ch.populate(TABLE_NAME, "a");
    expect(ch.getChoices()).toStrictEqual({
      a: "1",
      b: "2",
    });
    expect(ch.getChoiceData("b")).toStrictEqual({
      id: "b",
      a: "2",
      b: "3",
    });
  });

  test("populate with table object", () => {
    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
    const table = (Tables as LreTables).get(TABLE_NAME)!;
    ch.populate(table, "a");
    expect(ch.getChoices()).toStrictEqual({
      a: "1",
      b: "2",
    });
    expect(ch.getChoiceData("b")).toStrictEqual({
      id: "b",
      a: "2",
      b: "3",
    });
  });

  test("populate with callback", () => {
    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
    ch.populate(() => {
      return {
        a: "1",
        b: "2",
      };
    });
    expect(ch.getChoices()).toStrictEqual({
      a: "1",
      b: "2",
    });
    expect(ch.getChoiceData("b")).toBeNull();
  });
});

describe("set choices with optional", () => {
  let rawChoice: LetsRole.Component;
  beforeEach(() => {
    rawChoice = rawSheet.get("chA");
  });
  test("setChoices with optional", () => {
    const ch = new Choice(rawChoice, sheet, "chA");
    ch.optional(true);
    ch.setChoices({
      a: "1",
      b: "2",
    });
    expect(rawChoice.setChoices).toHaveBeenCalledWith({
      "": "",
      a: "1",
      b: "2",
    });
    expect(ch.getChoices()).toStrictEqual({
      a: "1",
      b: "2",
    });
  });

  test("dynamic optional change", () => {
    const ch = new Choice(rawChoice, sheet, "chA");
    ch.setChoices({
      a: "1",
      b: "2",
    });
    expect(rawChoice.setChoices).toHaveBeenCalledWith({
      a: "1",
      b: "2",
    });
    expect(ch.getChoices()).toStrictEqual({
      a: "1",
      b: "2",
    });
    (rawChoice.setChoices as jest.Mock).mockClear();
    const defaultLabel = "no choice";
    ch.optional(true, defaultLabel);
    expect(rawChoice.setChoices).toHaveBeenCalledWith({
      "": defaultLabel,
      a: "1",
      b: "2",
    });
    expect(ch.getChoices()).toStrictEqual({
      a: "1",
      b: "2",
    });
  });
});

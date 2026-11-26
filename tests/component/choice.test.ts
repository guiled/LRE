import type { Mock } from "vitest";
import {
  Choice,
  ChoicesWithData,
  UPDATE_CHECK_CHANGES,
} from "../../src/component/choice";
import { LRE } from "../../src/lre";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { LreTables } from "../../src/tables";
import {
  initLetsRole,
  itHasWaitedEverything,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { SheetProxy } from "../../src/proxy/sheet";

let raw: LetsRole.Component;
let rawSheet: LetsRole.Sheet;
let sheetProxy: SheetProxy;
let sheet: ISheet;

beforeEach(() => {
  const server = new ServerMock({
    views: [
      {
        id: "main",
        children: [
          {
            id: "ch",
            className: "Choice",
            tableId: "theTable",
            label: "lbl",
          },
          {
            id: "chA",
            className: "Choice",
            tableId: "theTable",
            label: "lbl",
          },
          {
            id: "cmp1",
            className: "TextInput",
          },
          {
            id: "cmp2",
            className: "TextInput",
          },
        ],
        className: "View",
        name: "theSheet",
      },
    ],
    tables: {
      theTable: [
        { id: "a", lbl: "theChoiceA", a: "1", b: "2" },
        { id: "b", lbl: "theChoiceB", a: "2", b: "3" },
      ],
    },
  });
  initLetsRole(server);
  global.lre = new LRE(context);
  Tables = new LreTables(Tables, context);

  rawSheet = server.openView("main", "12345", {
    chA: "a",
  });
  sheetProxy = new SheetProxy(context, rawSheet);
  sheet = new Sheet(sheetProxy, new DataBatcher(context, rawSheet), context);
  lre.sheets.add(sheet);
  raw = rawSheet.get("ch");
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

describe("Choice basic", () => {
  test("label", () => {
    const choice = new Choice(rawSheet.get("chA"), sheet, "chA");

    expect(choice.label()).toBe("theChoiceA");
  });

  test("setChoices", () => {
    vi.spyOn(raw, "setChoices");
    const choice = new Choice(raw, sheet, "ch");

    expect(choice.value()).toBeNull();
    expect(raw.setChoices).not.toHaveBeenCalled();

    const newChoices = {
      a: "1",
      b: "2",
    };
    choice.setChoices(newChoices);

    expect(raw.setChoices).toHaveBeenCalledWith(newChoices);
  });

  test("constructor uses custom checkWithValue when four arguments are passed", () => {
    const checkWithValue = vi.fn();
    const choice = new Choice(raw, sheet, "ch", checkWithValue);
    const newChoices = {
      a: "1",
      b: "2",
    };

    choice.setChoices(newChoices);

    expect(checkWithValue).toHaveBeenCalledTimes(1);
    expect(checkWithValue).toHaveBeenCalledWith(newChoices);
  });

  test("constructor logs error when native value() throws", () => {
    const errorSpy = vi.spyOn(lre, "error");
    const valueSpy = vi.spyOn(lre, "value");
    vi.spyOn(raw, "value").mockImplementation(() => {
      throw new Error("native value failure");
    });

    expect(() => new Choice(raw, sheet, "ch")).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      "[Choice] Unable to get ch value. Error: native value failure",
    );
    expect(valueSpy).not.toHaveBeenCalled();
  });

  test("Events", () => {
    const choice = new Choice(raw, sheet, "ch");
    const select = vi.fn();
    const unselect = vi.fn();
    const valselect1 = vi.fn();
    const valselect2 = vi.fn();
    const valunselect1 = vi.fn();
    const valunselect2 = vi.fn();
    const valclick = vi.fn();
    choice.on("select", select);
    choice.on("unselect", unselect);
    choice.on("valselect:1", valselect1);
    choice.on("valselect:2", valselect2);
    choice.on("valunselect:1", valunselect1);
    choice.on("valunselect:2", valunselect2);
    choice.on("valclick", valclick);

    expect(choice.value()).toBeNull();

    choice.value(1);

    expect(select).toHaveBeenCalledWith(choice, 1);
  });

  test("checkChanges triggers only valclick when value is unchanged", () => {
    const choice = new Choice(rawSheet.get("chA"), sheet, "chA");
    const select = vi.fn();
    const unselect = vi.fn();
    const valselect = vi.fn();
    const valunselect = vi.fn();
    const valclick = vi.fn();
    choice.on("select", select);
    choice.on("unselect", unselect);
    choice.on("valselect:a", valselect);
    choice.on("valunselect:a", valunselect);
    choice.on("valclick:a", valclick);

    expect(choice.value()).toBe("a");

    choice.trigger(UPDATE_CHECK_CHANGES, choice);

    expect(select).not.toHaveBeenCalled();
    expect(unselect).not.toHaveBeenCalled();
    expect(valselect).not.toHaveBeenCalled();
    expect(valunselect).not.toHaveBeenCalled();
    expect(valclick).toHaveBeenCalledWith(choice);
  });
});

describe("Choice get and set choices", () => {
  test("empty getChoices gives a message", () => {
    const ch = new Choice(raw, sheet, "ch");
    vi.spyOn(lre, "warn");

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
      }),
    ).not.toThrow();

    ch.value("a");
    itHasWaitedEverything();

    expect(ch.value()).toBe("a");
    expect(() =>
      ch.setChoices({
        c: "2",
        d: "3",
      }),
    ).not.toThrow();
  });

  test("set choice that does not change the value does not trigger update event", () => {
    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
    ch.setChoices({
      a: "1",
      b: "2",
    });
    ch.value("a");
    const update = vi.fn();
    ch.on("update", update);

    expect(update).not.toHaveBeenCalled();

    ch.setChoices({
      a: "1",
      c: "3",
    });

    expect(update).not.toHaveBeenCalled();
  });

  test("set choice that changes the value triggers update event", () => {
    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
    ch.setChoices({
      a: "1",
      b: "2",
    });
    ch.value("a");
    const update = vi.fn();
    ch.on("update", update);

    expect(update).not.toHaveBeenCalled();

    ch.setChoices({
      c: "1",
      d: "3",
    });

    expect(update).toHaveBeenCalledTimes(1);
  });

  test("setChoices with non-object value clears internal choices", () => {
    const ch = new Choice(raw, sheet, "ch");
    ch.setChoices({ a: "1" });
    ch.setChoices(42 as unknown as LetsRole.Choices);

    expect(ch.getChoices()).toStrictEqual({});
  });

  test("refreshChoices pushes current choices to raw component", () => {
    vi.spyOn(raw, "setChoices");
    const ch = new Choice(raw, sheet, "ch");
    ch.setChoices({ a: "1", b: "2" });

    (raw.setChoices as Mock).mockClear();
    ch.refreshChoices();

    expect(raw.setChoices).toHaveBeenCalledWith({ a: "1", b: "2" });
  });
});

describe("Choice label and getChoiceData", () => {
  test("label with another choice value returns its display label", () => {
    const ch = new Choice(raw, sheet, "ch");
    ch.setChoices({ a: "Label A", b: "Label B" });
    ch.value("a");

    expect(ch.label("b")).toBe("Label B");
    expect(ch.label("missing")).toBeUndefined();
  });

  test("label with current value delegates to text", () => {
    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");

    expect(ch.label("a")).toBe("theChoiceA");
  });

  test("label for value when no choices are set logs error and returns empty", () => {
    const ch = new Choice(raw, sheet, "ch");
    const errorSpy = vi.spyOn(lre, "error");

    expect(ch.label("a")).toBe("");
    expect(errorSpy).toHaveBeenCalledWith(
      "No choices known for this component. Use setChoices first.",
    );
  });

  test("getChoiceData without provider returns stored choice data map", () => {
    const ch = new Choice(raw, sheet, "ch");
    const rowB = { id: "b", score: 2 };
    ch.setChoices({
      a: { value: "A", data: { id: "a", score: 1 } },
      b: { value: "B", data: rowB },
    });

    expect(ch.getChoiceData()).toStrictEqual({
      a: { id: "a", score: 1 },
      b: rowB,
    });
    expect(ch.getChoiceData("b")).toStrictEqual(rowB);
    expect(ch.getChoiceData(undefined)).toStrictEqual({
      a: { id: "a", score: 1 },
      b: rowB,
    });
  });

  test("getChoiceData with data provider uses provider accessors", () => {
    const ch = new Choice(raw, sheet, "ch");
    const p = lre.dataProvider("test", () => ({ a: "1", b: "2" }));
    ch.setChoices(p);

    expect(ch.getChoiceData()).toStrictEqual({ a: "1", b: "2" });
    expect(ch.getChoiceData(null as unknown as string)).toBeNull();

    const getDataSpy = vi.spyOn(p, "getData").mockReturnValue({ row: 1 });

    expect(ch.getChoiceData("a")).toStrictEqual({ row: 1 });

    getDataSpy.mockReturnValue(undefined);

    expect(ch.getChoiceData("a")).toBeNull();
  });

  test("getChoiceData with provider returns null when providedValue is falsy", () => {
    const ch = new Choice(raw, sheet, "ch");
    const p = lre.dataProvider("test", () => ({ a: "1" }));
    ch.setChoices(p);
    vi.spyOn(p, "providedValue").mockReturnValue(
      null as unknown as Record<string, string>,
    );

    expect(ch.getChoiceData()).toBeNull();
  });

  test("getChoiceData without provider returns null when choice data is empty", () => {
    const ch = new Choice(raw, sheet, "ch");

    expect(ch.getChoiceData()).toBeNull();
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
    const a = "42";
    const b = "13";
    const data = {
      a,
      b,
    };
    const p = lre.dataProvider("test", () => data);

    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
    ch.setChoices(p);

    expect(ch.getChoices()).toStrictEqual({
      a,
      b,
    });

    data.a = "43";

    expect(ch.getChoices()).toStrictEqual({
      a: "42",
      b: "13",
    });

    p.refresh();

    expect(ch.getChoices()).toStrictEqual({
      a: "43",
      b: "13",
    });
  });

  test("Set Choices from group", () => {
    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
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
  test("populate with table name", () => {
    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
    ch.populate("theTable", "a");

    expect(ch.getChoices()).toStrictEqual({
      a: "1",
      b: "2",
    });
    expect(ch.getChoiceData("b")).toStrictEqual({
      id: "b",
      a: "2",
      b: "3",
      lbl: "theChoiceB",
    });

    ch.value("b");

    expect(ch.valueData()).toStrictEqual({
      id: "b",
      a: "2",
      b: "3",
      lbl: "theChoiceB",
    });
    expect(ch.row()).toStrictEqual({
      id: "b",
      a: "2",
      b: "3",
      lbl: "theChoiceB",
    });
  });

  test("populate with array", () => {
    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
    ch.populate(
      [
        { id: "a", lbl: "theChoiceA", a: "1", b: "2" },
        { id: "b", lbl: "theChoiceB", a: "2", b: "3" },
      ],
      "lbl",
    );

    expect(ch.getChoices()).toStrictEqual({
      a: "theChoiceA",
      b: "theChoiceB",
    });
    expect(ch.getChoiceData("b")).toStrictEqual({
      id: "b",
      lbl: "theChoiceB",
      a: "2",
      b: "3",
    });
  });

  test("populate with array only skips optional when label argument is omitted", () => {
    const rawChoice = rawSheet.get("chA");
    vi.spyOn(rawChoice, "setChoices");
    const ch = new Choice(rawChoice, sheet, "chA");
    ch.populate([{ id: "a", lbl: "Display A" }]);

    expect(rawChoice.setChoices).toHaveBeenCalledWith({ a: "a" });
  });

  test("populate with table object", () => {
    const ch = new Choice(rawSheet.get("chA"), sheet, "chA");
    const table = Tables.get("theTable")!;
    ch.populate(table, "a");

    expect(ch.getChoices()).toStrictEqual({
      a: "1",
      b: "2",
    });
    expect(ch.getChoiceData("b")).toStrictEqual({
      id: "b",
      a: "2",
      b: "3",
      lbl: "theChoiceB",
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

  test("populate with array validates rows and warns on missing label", () => {
    const ch = new Choice(raw, sheet, "ch");
    vi.spyOn(lre, "error");
    vi.spyOn(lre, "warn");

    // @ts-expect-error - test error
    ch.populate([{ lbl: "no id" } as LetsRole.TableRow], "lbl");

    expect(lre.error).toHaveBeenCalledWith("Table row must have an id field");
    expect(ch.getChoices()).toStrictEqual({});

    (lre.error as Mock).mockClear();
    ch.populate([{ id: "a" } as LetsRole.TableRow], "lbl");

    expect(lre.warn).toHaveBeenCalledWith("Table row misses a lbl field");
    expect(ch.getChoices()).toStrictEqual({
      a: undefined,
    });
  });

  test("populate with array and optional flag applies optional while building", () => {
    const rawChoice = rawSheet.get("chA");
    vi.spyOn(rawChoice, "setChoices");
    const ch = new Choice(rawChoice, sheet, "chA");
    ch.populate(
      [
        { id: "a", lbl: "A" },
        { id: "b", lbl: "B" },
      ],
      "lbl",
      true,
    );

    expect(rawChoice.setChoices).toHaveBeenCalledWith({
      "": "",
      a: "A",
      b: "B",
    });
  });

  test("populate with object rows uses row id and label fields", () => {
    const ch = new Choice(raw, sheet, "ch");
    ch.populate(
      {
        key: {
          id: "rowId",
          lbl: "Row label",
          extra: 1,
        } as unknown as LetsRole.TableRow,
      },
      "lbl",
    );

    expect(ch.getChoices()).toStrictEqual({
      rowId: "Row label",
    });
    expect(ch.getChoiceData("rowId")).toStrictEqual({
      id: "rowId",
      lbl: "Row label",
      extra: 1,
    });
  });

  test("populate object row falls back to entry key when id and label fields are missing", () => {
    const ch = new Choice(raw, sheet, "ch");
    ch.populate(
      {
        entryKey: { extra: 1 } as unknown as LetsRole.TableRow,
      },
      "lbl",
    );

    expect(ch.getChoices()).toStrictEqual({
      entryKey: "entryKey",
    });
    expect(ch.getChoiceData("entryKey")).toStrictEqual({ extra: 1 });
  });

  test("populate with choices object skips optional with a single argument", () => {
    const rawChoice = rawSheet.get("chA");
    vi.spyOn(rawChoice, "setChoices");
    const ch = new Choice(rawChoice, sheet, "chA");
    ch.populate({ a: "1", b: "2" });

    expect(rawChoice.setChoices).toHaveBeenCalledWith({ a: "1", b: "2" });
  });

  test("populate with table name only skips optional when extra arguments are omitted", () => {
    const rawChoice = rawSheet.get("chA");
    vi.spyOn(rawChoice, "setChoices");
    const ch = new Choice(rawChoice, sheet, "chA");
    ch.populate("theTable");

    expect(rawChoice.setChoices).toHaveBeenCalledWith({
      a: "a",
      b: "b",
    });
  });

  test("populate with unknown table name is a no-op", () => {
    const ch = new Choice(raw, sheet, "ch");
    vi.spyOn(raw, "setChoices");

    ch.populate("missingTable", "a");

    expect(ch.getChoices()).toStrictEqual({});
    expect(raw.setChoices).not.toHaveBeenCalled();
  });

  test("populate ignores unsupported source types", () => {
    const ch = new Choice(raw, sheet, "ch");
    vi.spyOn(raw, "setChoices");

    ch.populate(42 as unknown as Parameters<Choice["populate"]>[0]);

    expect(ch.getChoices()).toStrictEqual({});
    expect(raw.setChoices).not.toHaveBeenCalled();
  });

  test("populate with table name and optional adds empty choice", () => {
    const rawChoice = rawSheet.get("chA");
    vi.spyOn(rawChoice, "setChoices");
    const ch = new Choice(rawChoice, sheet, "chA");
    ch.populate("theTable", "a", true);

    expect(rawChoice.setChoices).toHaveBeenCalledWith({
      "": "",
      a: "1",
      b: "2",
    });
  });
});

describe("valueProvider tests", () => {
  let ch: Choice;

  beforeEach(() => {
    ch = sheet.get("chA") as Choice;
  });

  test("valueProvider is undefined if no provider given", () => {
    expect(ch.valueProvider()).toBeUndefined();
  });

  test("valueProvider always returns the same provider", () => {
    const p = lre.dataProvider("test", () => ({}));

    ch.setChoices(p);

    const p1 = ch.valueProvider();
    const p2 = ch.valueProvider();

    expect(p1).toBe(p2);
  });

  test("valueProvider is changed if the choices are changed", () => {
    const p = lre.dataProvider("test", () => ({}));

    ch.setChoices(p);

    const p1 = ch.valueProvider();

    expect(p1).toHaveProperty("provider");

    ch.setChoices({
      a: "1",
      b: "2",
    });

    expect(ch.valueProvider()).toBeUndefined();

    ch.setChoices(p);

    expect(ch.valueProvider()).not.toBe(p1);
  });

  test("valueProvider is refreshed when choice value changed", () => {
    const ch = sheet.get("chA") as Choice;

    expect(ch.valueProvider()).toBeUndefined();

    const a = "42";
    const b = "13";
    const data = {
      a,
      b,
    };
    const p = lre.dataProvider("test", () => data);
    ch.setChoices(p);
    const provider = ch.valueProvider()!;

    expect(ch.value()).toBe("a");
    expect(provider).toHaveProperty("provider");
    expect(provider.providedValue()).toStrictEqual({ a });

    ch.value("b");

    expect(provider.providedValue()).toStrictEqual({ b });
  });

  test("valueProvider filter keeps keys included in array value", () => {
    const ch = new Choice(raw, sheet, "ch");
    const p = lre.dataProvider("test", () => ({
      a: "1",
      b: "2",
      c: "3",
    }));
    ch.setChoices(p);
    vi.spyOn(ch, "value").mockImplementation(((...args: unknown[]) => {
      if (args.length > 0) {
        return;
      }

      return ["a", "c"] as LetsRole.ComponentValue;
    }) as typeof ch.value);

    const provider = ch.valueProvider()!;

    expect(provider.providedValue()).toStrictEqual({ a: "1", c: "3" });
  });
});

describe("set choices with optional", () => {
  let rawChoice: LetsRole.Component;

  beforeEach(() => {
    rawChoice = rawSheet.get("chA");
  });

  test("setChoices with optional", () => {
    vi.spyOn(rawChoice, "setChoices");
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
    vi.spyOn(rawChoice, "setChoices");
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

    (rawChoice.setChoices as Mock).mockClear();
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

  test("setDefaultValue sets empty string when optional", () => {
    const ch = new Choice(rawChoice, sheet, "chA");
    ch.setChoices({
      a: "1",
      b: "2",
    });
    ch.optional(true);
    ch.value("a");

    expect(ch.value()).toBe("a");

    ch.setDefaultValue();

    expect(ch.value()).toBe("");
  });
});

describe("Choice toString", () => {
  test("toString shows choice info with selected value", () => {
    const choice = new Choice(rawSheet.get("chA"), sheet, "chA");
    choice.setChoices({ a: "Choice A", b: "Choice B" });
    rawSheet.setData({ chA: "a" });
    const result = choice.toString();

    expect(result).toMatch(/^Choice<chA>\(selected=a "theChoiceA"\)$/);
  });

  test("toString shows choice info without label when label equals value", () => {
    const choice = new Choice(raw, sheet, "ch");
    choice.setChoices({ a: "a", b: "b" });
    rawSheet.setData({ ch: "a" });
    // Mock text() to return the same as value to simulate label equals value
    vi.spyOn(choice.raw(), "text").mockImplementation(() => "a");
    const result = choice.toString();

    expect(result).toBe("Choice<ch>(selected=a)");
  });

  test("toString shows choice info with null value", () => {
    const choice = new Choice(raw, sheet, "ch");
    choice.setChoices({ a: "Choice A", b: "Choice B" });
    rawSheet.setData({ ch: null });
    const result = choice.toString();

    expect(result).toMatch(/^Choice<ch>\(selected=null\)$/);
  });
});

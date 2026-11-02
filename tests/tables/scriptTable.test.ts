import { ChangeTracker } from "../../src/globals/changetracker";
import { LRE } from "../../src/lre";
import {
  initLetsRole,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { ScriptTable } from "../../src/tables/scriptTable";
import { modeHandlerMock } from "../mock/modeHandler.mock";

const context = modeHandlerMock();

const sampleRows: LetsRole.TableRow[] = [
  { id: "a", col1: "val1", col2: "val2" },
  { id: "b", col1: "val3", col2: "val4" },
  { id: "c", col1: "val5", col2: "val6" },
];

beforeEach(() => {
  initLetsRole(new ServerMock({ tables: {} }));
  global.lre = new LRE(context);
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

describe("ScriptTable identity", () => {
  test("id and change tracker", () => {
    const table = new ScriptTable(sampleRows, context, "myTable");

    expect(table.id()).toBe("myTable");
    expect(table.getChangeTracker()).toBeInstanceOf(ChangeTracker);
  });
});

describe("ScriptTable get", () => {
  test("array source resolves rows by id", () => {
    const table = new ScriptTable(sampleRows, context, "t");

    expect(table.get("a")).toEqual(sampleRows[0]);
    expect(table.get("missing")).toBeNull();
  });

  test("object source assigns ids from keys", () => {
    const table = new ScriptTable(
      {
        x: { col1: "one" },
        y: { col1: "two" },
      },
      context,
      "t",
    );

    expect(table.get("x")).toMatchObject({ col1: "one" });
    expect(table.get("x")!.id).toBe("x");
    expect(table.get("y")).toMatchObject({ col1: "two" });
  });

  test("rejects non-index ids", () => {
    const table = new ScriptTable(sampleRows, context, "t");
    const trace = vi.spyOn(lre, "trace");

    expect(table.get(undefined as unknown as LetsRole.ColumnId)).toBeNull();
    expect(table.get(false as unknown as LetsRole.ColumnId)).toBeNull();
    expect(trace).toHaveBeenCalled();
  });

  test("logs when row id is valid but missing", () => {
    const table = new ScriptTable(sampleRows, context, "t");
    const trace = vi.spyOn(lre, "trace");

    expect(table.get("missing")).toBeNull();
    expect(trace).toHaveBeenCalledWith(
      expect.stringContaining("can't find row missing"),
    );
  });

  test("function source rebuilds indexes on each access", () => {
    let rows = [...sampleRows];
    const table = new ScriptTable(() => rows, context, "t");

    expect(table.get("a")).toEqual(sampleRows[0]);

    rows = [{ id: "z", col1: "only" }];

    expect(table.get("a")).toBeNull();
    expect(table.get("z")).toEqual({ id: "z", col1: "only" });
  });

  test("function source without arg calls data()", () => {
    const fn = vi.fn(() => sampleRows);
    const table = new ScriptTable(fn, context, "t");

    expect(table.get("a")).toEqual(sampleRows[0]);
    expect(fn).toHaveBeenCalledWith();
  });

  test("function source with constructor arg", () => {
    const fn = vi.fn((filter?: unknown) =>
      sampleRows.filter((row) => row.id === (filter as { keep: string }).keep),
    );
    const table = new ScriptTable(fn, context, "t", { keep: "b" });

    expect(table.get("b")).toEqual(sampleRows[1]);
    expect(fn).toHaveBeenCalledWith({ keep: "b" });
    expect(table.get("a")).toBeNull();
  });

  test("function returning object rows", () => {
    const table = new ScriptTable(
      () => ({
        k: { col1: "from-object" },
      }),
      context,
      "t",
    );

    expect(table.get("k")).toMatchObject({ id: "k", col1: "from-object" });
  });

  test("nested function source unwraps to rows", () => {
    const table = new ScriptTable(
      () => () => [{ id: "nested", col1: "ok" }],
      context,
      "t",
    );

    expect(table.get("nested")).toEqual({ id: "nested", col1: "ok" });
  });
});

describe("ScriptTable each", () => {
  test("iterates all rows with id as key", () => {
    const table = new ScriptTable(sampleRows, context, "t");
    const fn = vi.fn();

    table.each(fn);

    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenNthCalledWith(1, sampleRows[0], "a", sampleRows[0]);
    expect(fn).toHaveBeenNthCalledWith(2, sampleRows[1], "b", sampleRows[1]);
    expect(fn).toHaveBeenNthCalledWith(3, sampleRows[2], "c", sampleRows[2]);
  });
});

describe("ScriptTable random", () => {
  afterEach(() => {
    vi.spyOn(global.Math, "random").mockRestore();
  });

  test("single callback picks one row and returns it", () => {
    const table = new ScriptTable(sampleRows, context, "t");
    vi.spyOn(global.Math, "random").mockReturnValue(0);
    const fn = vi.fn();

    const picked = table.random(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(sampleRows[0]);
    expect(picked).toEqual(sampleRows[0]);
  });

  test("count and callback return multiple rows without mutating source", () => {
    const table = new ScriptTable(sampleRows, context, "t");
    vi.spyOn(global.Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);
    const fn = vi.fn();

    const picked = table.random(2, fn);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(picked).toHaveLength(2);
    expect(table.get("a")).toEqual(sampleRows[0]);
    expect(table.get("b")).toEqual(sampleRows[1]);
  });

  test("empty data yields undefined for single pick", () => {
    const table = new ScriptTable([], context, "t");
    const fn = vi.fn();

    expect(table.random(fn)).toBeUndefined();
    expect(fn).not.toHaveBeenCalled();
  });

  test("empty data with count returns empty array", () => {
    const table = new ScriptTable([], context, "t");

    expect(table.random(3, vi.fn())).toEqual([]);
  });
});

describe("ScriptTable as DataProvider", () => {
  test("providedValue maps row ids to rows", () => {
    const table = new ScriptTable(sampleRows, context, "t");

    expect(table.providedValue()).toStrictEqual({
      a: sampleRows[0],
      b: sampleRows[1],
      c: sampleRows[2],
    });
  });
});

import { LRE } from "../../src/lre";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { Table } from "../../src/tables/table";
import {
  initLetsRole,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";

beforeEach(() => {
  initLetsRole(
    new ServerMock({
      tables: {
        theTable: [
          { id: "_123", a: "42", b: "13", c: "one" },
          { id: "_124", a: "1", b: "2", c: "two" },
          { id: "_125", a: "4", b: "5", c: "three" },
          { id: "oh", a: "2", b: "100", c: "last" },
        ],
        a: [
          { id: "_1", a: "42", b: "13", c: "four" },
          { id: "_2", a: "1", b: "2", c: "five" },
          { id: "_3", a: "4", b: "5", c: "six" },
          { id: "oh", a: "2", b: "100", c: "last" },
        ],
      },
    }),
  );
  global.lre = new LRE(context);
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

describe("Table test", () => {
  test("Table id", () => {
    const rawTable = Tables.get("theTable")!;
    const table = new Table(rawTable, "123");

    expect(table.id()).toBe("123");
  });

  test("Get, each, random on raw", () => {
    const rawTable = Tables.get("theTable")!;
    jest.spyOn(rawTable, "get");
    jest.spyOn(rawTable, "each");
    jest.spyOn(rawTable, "random");
    const table = new Table(rawTable, "123");
    table.get("123");

    expect(rawTable.get).toHaveBeenCalledTimes(1);

    table.each(() => {});

    expect(rawTable.each).toHaveBeenCalledTimes(1);

    table.random(() => {});

    expect(rawTable.random).toHaveBeenCalledTimes(1);

    table.random(3, () => {});

    expect(rawTable.random).toHaveBeenCalledTimes(2);
  });
});

describe("Table basic operations", () => {
  test("Table get", () => {
    const table = new Table(Tables.get("a"), "123");

    expect(table.get("_1")).toMatchObject({
      id: "_1",
      a: "42",
      b: "13",
      c: "four",
    });
  });

  test("Table each", () => {
    const table = new Table(Tables.get("a"), "_123");
    const result: (string | number)[] = [];
    table.each((row) => {
      result.push(row.a);
    });

    expect(result).toStrictEqual(["42", "1", "4", "2"]);
  });

  test("random", () => {
    const table = new Table(Tables.get("a"), "a");
    let result: string[] = [];

    jest.spyOn(global.Math, "random").mockReturnValue(0);

    table.random((row: LetsRole.TableRow) => {
      result.push(row.a);
    });

    expect(result).toStrictEqual(["42"]);

    result = [];
    jest.spyOn(global.Math, "random").mockReturnValue(0.999);
    table.random(2, (row: LetsRole.TableRow) => {
      result.push(row.a);
    });

    expect(result).toStrictEqual(["2", "4"]);

    jest.spyOn(global.Math, "random").mockRestore();
  });
});

describe("Table additional features", () => {
  test("Autonum of fields with Table.get", () => {
    const rawTable = Tables.get("theTable")!;
    const table = new Table(rawTable, "theTable");

    expect(table.get("_123")).toMatchObject({
      id: "_123",
      a: "42",
      b: "13",
      c: "one",
    });

    lre.autoNum();

    expect(table.get("_123")).toStrictEqual({
      id: "_123",
      a: 42,
      b: 13,
      c: "one",
    });
  });

  test("Autonum of fields with Table.each", () => {
    const rawTable = Tables.get("theTable")!;
    const table = new Table(rawTable, "theTable");
    const fn = jest.fn();
    lre.autoNum();
    table.each(fn);

    expect(fn).toHaveBeenCalledTimes(4);
    expect(fn.mock.calls[0][0]).toStrictEqual({
      id: "_123",
      a: 42,
      b: 13,
      c: "one",
    });
    expect(fn.mock.calls[1][0]).toStrictEqual({
      id: "_124",
      a: 1,
      b: 2,
      c: "two",
    });
  });

  test("Autonum of fields with Table.random", () => {
    const rawTable = Tables.get("theTable")!;
    const table = new Table(rawTable, "theTable");
    const fn = jest.fn();
    table.random(2, fn);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(typeof fn.mock.calls[0][0].a).not.toBe("number");
    expect(typeof fn.mock.calls[1][0].a).not.toBe("number");

    fn.mockClear();
    lre.autoNum();
    table.random(2, fn);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(typeof fn.mock.calls[0][0].a).toBe("number");
    expect(typeof fn.mock.calls[1][0].a).toBe("number");
  });

  test("random returns the row", () => {
    const table = new Table(Tables.get("a"), "a");
    let rowAsArg: LetsRole.TableRow | undefined;

    const rowAsReturn = table.random((row: LetsRole.TableRow) => {
      rowAsArg = row;
    });

    expect(rowAsArg).toStrictEqual(rowAsReturn);

    const rowsAsArg: Array<LetsRole.TableRow> = [];
    const rowsAsReturn = table.random(2, (row: LetsRole.TableRow) => {
      rowsAsArg.push(row);
    });

    expect(rowsAsArg).toStrictEqual(rowsAsReturn);
  });
});

describe("Table as DataProvider", () => {
  test("Table select a column", () => {
    const rawTable = Tables.get("a")!;
    const table = new Table(rawTable, "a");

    expect(table.providedValue()).toStrictEqual({
      _1: { id: "_1", a: "42", b: "13", c: "four" },
      _2: { id: "_2", a: "1", b: "2", c: "five" },
      _3: { id: "_3", a: "4", b: "5", c: "six" },
      oh: { id: "oh", a: "2", b: "100", c: "last" },
    });

    const onlyA = table.select("a").sort("b");

    expect(JSON.stringify(onlyA.providedValue())).toBe(
      JSON.stringify({
        oh: "2",
        _1: "42",
        _2: "1",
        _3: "4",
      }),
    );
  });
});

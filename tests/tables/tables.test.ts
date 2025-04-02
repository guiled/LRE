import { LRE } from "../../src/lre";
import {
  initLetsRole,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { LreTables, overloadTables } from "../../src/tables";

beforeEach(() => {
  initLetsRole(
    new ServerMock({
      tables: {
        theTable: [
          { id: "123", a: "42", b: "13", c: "24" },
          { id: "124", a: "1", b: "2", c: "3" },
          { id: "125", a: "4", b: "5", c: "6" },
        ],
        a: [
          { id: "1", a: "42", b: "13", c: "24" },
          { id: "2", a: "1", b: "2", c: "3" },
          { id: "3", a: "4", b: "5", c: "6" },
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

describe("Tables overload", () => {
  test("Overload", () => {
    const get: jest.Mock = jest.fn();
    global.Tables = {
      get,
    } as LetsRole.Tables;

    expect(get).toHaveBeenCalledTimes(0);

    overloadTables(global.Tables, context);
    Tables.get("123");

    expect(get).toHaveBeenCalledTimes(1);
  });

  test("Tables get table", () => {
    const tables = new LreTables(
      {
        get: (_id: LetsRole.TableID): LetsRole.Table => {
          return {
            get: jest.fn() as LetsRole.Table["get"],
            each: jest.fn() as LetsRole.Table["each"],
            random: jest.fn() as LetsRole.Table["random"],
          };
        },
      },
      context,
    );

    const table = tables.get("theTable");

    expect(table).not.toBeNull();
    expect(table!.id()).toBe("theTable");
  });
});

describe("Script tables", () => {
  beforeEach(() => {
    overloadTables(global.Tables, context);
  });

  test("register a table from an array", () => {
    const data = [
      { id: "a", col1: "val1", col2: "val2" },
      { id: "b", col1: "val3", col2: "val4" },
      { id: "c", col1: "val5", col2: "val6" },
    ];
    Tables.register("testTable", data);
    const table = Tables.get("testTable");

    expect(table).not.toBeNull();
    expect(table!.id()).toBe("testTable");
    expect(table!.get("a")).toEqual(data[0]);
    expect(table!.get("b")).toEqual(data[1]);
    expect(table!.get("c")).toEqual(data[2]);
    expect(table!.get("d")).toBeNull();

    const fn = jest.fn();
    table!.each(fn);

    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenNthCalledWith(1, data[0], "a", data[0]);
    expect(fn).toHaveBeenNthCalledWith(2, data[1], "b", data[1]);
    expect(fn).toHaveBeenNthCalledWith(3, data[2], "c", data[2]);

    jest.spyOn(global.Math, "random").mockReturnValue(0);
    const fn2 = jest.fn();
    table!.random(fn2);

    expect(fn2).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenNthCalledWith(1, data[0]);
  });

  test("register a table from an object", () => {
    const data = {
      a: { col1: "val1", col2: "val2" },
      b: { col1: "val3", col2: "val4" },
      c: { col1: "val5", col2: "val6" },
    };
    Tables.register("testTable", data);
    const table = Tables.get("testTable");

    expect(table).not.toBeNull();
    expect(table!.id()).toBe("testTable");

    const getA = table!.get("a");

    expect(getA).toMatchObject(data.a);
    expect(getA.id).toBe("a");

    const getB = table!.get("b");

    expect(getB).toMatchObject(data.b);
    expect(getB.id).toBe("b");

    const getC = table!.get("c");

    expect(getC).toMatchObject(data.c);
    expect(getC.id).toBe("c");

    expect(table!.get("d")).toBeNull();

    const fn = jest.fn();
    table!.each(fn);

    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenNthCalledWith(1, { id: "a", ...data.a }, "a", {
      id: "a",
      ...data.a,
    });
    expect(fn).toHaveBeenNthCalledWith(2, { id: "b", ...data.b }, "b", {
      id: "b",
      ...data.b,
    });
    expect(fn).toHaveBeenNthCalledWith(3, { id: "c", ...data.c }, "c", {
      id: "c",
      ...data.c,
    });

    jest.spyOn(global.Math, "random").mockReturnValue(0);
    const fn2 = jest.fn();
    table!.random(fn2);

    expect(fn2).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenNthCalledWith(1, { id: "a", ...data.a });
  });

  test("register a table from a function", () => {
    const data = [
      { id: "a", col1: "val1", col2: "val2" },
      { id: "b", col1: "val3", col2: "val4" },
      { id: "c", col1: "val5", col2: "val6" },
    ];

    const fnData = jest.fn(() => data);
    Tables.register("testTable", fnData);
    const table = Tables.get("testTable");

    expect(table).not.toBeNull();
    expect(table!.id()).toBe("testTable");
    expect(table!.get("a")).toEqual(data[0]);
    expect(table!.get("b")).toEqual(data[1]);
    expect(table!.get("c")).toEqual(data[2]);
    expect(table!.get("d")).toBeNull();

    const fn = jest.fn();
    table!.each(fn);

    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenNthCalledWith(1, data[0], "a", data[0]);
    expect(fn).toHaveBeenNthCalledWith(2, data[1], "b", data[1]);
    expect(fn).toHaveBeenNthCalledWith(3, data[2], "c", data[2]);

    jest.spyOn(global.Math, "random").mockReturnValue(0);
    const fn2 = jest.fn();
    table!.random(fn2);

    expect(fn2).toHaveBeenCalledTimes(1);

    expect(fn2).toHaveBeenNthCalledWith(1, data[0]);
  });
});

import { DataProvider, DirectDataProvider } from "../../src/dataprovider";
import { LRE } from "../../src/lre";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import {
  initLetsRole,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { SheetProxy } from "../../src/proxy/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { Sheet } from "../../src/sheet";
import { ViewMock } from "../../src/mock/letsrole/view.mock";

let server: ServerMock;

beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        name: "Main",
        className: "View",
        children: [
          {
            id: "lbl",
            name: "Label",
            className: "Label",
            text: "Hello",
          },
          {
            id: "txt1",
            name: "Text",
            className: "TextInput",
            defaultValue: "World",
          },
          {
            id: "txt2",
            name: "Text",
            className: "TextInput",
            defaultValue: "World2",
          },
        ],
      },
    ],
  });
  initLetsRole(server);
  global.lre = new LRE(context);
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

describe("Data provider basics", () => {
  test("Get value", () => {
    const data = "42";
    const dataGetter = vi.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);

    expect(dp.providedValue()).toBe(data);
    expect(dataGetter).toHaveBeenCalled();
  });

  test("mixin DataProvider id is auto-generated dp prefix", () => {
    const DpClass = DataProvider(class {});
    const dp = new DpClass(context, () => 1);

    expect(dp.id()).toMatch(/^dp-/);
    expect(dp.id()).toBe(dp.realId());
  });
});

describe("Data provider sort", () => {
  test("Sort single value", () => {
    const data = "42";
    const dataGetter = vi.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);
    const sorted = dp.sort();

    expect(sorted.provider).toBeTruthy();
    expect(sorted.providedValue()).toBe(data);
  });

  test("Sort array", () => {
    const data = ["42", "4", "24", "24"];
    const dataGetter = vi.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);
    const sorted = dp.sort();

    expect(sorted.provider).toBeTruthy();
    expect(sorted.providedValue()).toStrictEqual(["24", "24", "4", "42"]);
  });

  test("Sort array of object", () => {
    const data = [{ a: "42" }, { a: "4" }, { a: "24" }, { a: "24" }];
    const dataGetter = vi.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);
    const sorted = dp.sort("a");

    expect(sorted.provider).toBeTruthy();
    expect(sorted.providedValue()).toStrictEqual([
      { a: "24" },
      { a: "24" },
      { a: "4" },
      { a: "42" },
    ]);

    const sorted2 = dp.sort("a", "DESC");

    expect(sorted2.provider).toBeTruthy();
    expect(sorted2.providedValue()).toStrictEqual([
      { a: "42" },
      { a: "4" },
      { a: "24" },
      { a: "24" },
    ]);
  });

  test("Sort object", () => {
    const data = { a: "42", b: "13", c: "24" };
    const dataGetter = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);
    const sorted = dp.sort();

    expect(sorted.provider).toBeTruthy();

    sorted.providedValue({
      a: "43",
    });

    expect(data.a).toBe("43");
    expect(sorted.providedValue()).toStrictEqual({
      b: "13",
      c: "24",
      a: "43",
    });

    const sorted2 = dp.sort(undefined, "DESC");

    expect(sorted2.providedValue()).toStrictEqual({
      a: "43",
      c: "24",
      b: "13",
    });
  });

  test("Sort object of object", () => {
    const data = { a: "42", b: "13", c: "24" };
    const dataGetter = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);
    const sorted = dp.sort();

    expect(sorted.provider).toBeTruthy();

    sorted.providedValue({
      a: "43",
    });

    expect(data.a).toBe("43");
    expect(sorted.providedValue()).toStrictEqual({
      b: "13",
      c: "24",
      a: "43",
    });
  });

  test("Sort with function", () => {
    const data = {
      a: { a: "42", b: "1" },
      b: { a: "4", b: "2" },
      c: { a: "24", b: "3" },
      d: { a: "24", b: "4" },
    };
    const dataGetter = vi.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);

    const sorter = (a: any, b: any): number => {
      return Number(a.a) - Number(b.a);
    };

    const sorted = dp.sort(sorter);

    expect(sorted.provider).toBeTruthy();
    expect(sorted.providedValue()).toStrictEqual({
      b: { a: "4", b: "2" },
      c: { a: "24", b: "3" },
      d: { a: "24", b: "4" },
      a: { a: "42", b: "1" },
    });
  });

  test("SortBy with function that returns a value to sort", () => {
    const data = {
      a: { a: "10", b: "1" },
      b: { a: "4", b: "2" },
      c: { a: "2", b: "3" },
      d: { a: "1", b: "6" },
    };
    const dataGetter = vi.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);
    const cols = dp.select("a");

    const sorter: DataProviderComputer = (
      a: any,
      _key: any,
      data: any,
    ): number => {
      return Number(a.a) + Number(data.b);
    };

    const sorted = cols.sortBy(sorter);

    expect(sorted.provider).toBeTruthy();
    expect(sorted.providedValue()).toStrictEqual({
      c: "2",
      b: "4",
      d: "1",
      a: "10",
    });

    const sorted2 = cols.sortBy(sorter, "DESC");

    expect(sorted2.provider).toBeTruthy();
    expect(sorted2.providedValue()).toStrictEqual({
      a: "10",
      b: "4",
      c: "2",
      d: "1",
    });
  });

  test("Sort on field from original data", () => {
    const data = {
      a: { a: "10", b: "1", c: "11" },
      b: { a: "4", b: "2", c: "100" },
      c: { a: "2", b: "3", c: "150" },
      d: { a: "1", b: "6", c: "30" },
    };
    const dataGetter = vi.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);
    const sorted = dp.select("a").sort("c");

    // sorted by string value of c
    expect(sorted.providedValue()).toStrictEqual({
      b: "4",
      a: "10",
      c: "2",
      d: "1",
    });

    lre.autoNum();
    sorted.refresh();

    // sorted by numeric value of c
    expect(JSON.stringify(sorted.providedValue())).toStrictEqual(
      JSON.stringify({
        a: 10,
        d: 1,
        b: 4,
        c: 2,
      }),
    );
  });

  test("Sort DESC on field from original data", () => {
    lre.autoNum();
    const data = {
      a: { a: "10", b: "1", c: "11" },
      c: { a: "20", b: "3", c: "50" },
      b: { a: "4", b: "2", c: "100" },
      d: { a: "1", b: "6", c: "30" },
    };
    const dataGetter = vi.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);
    const sorted2 = dp.select("a").sort("c", "DESC");

    expect(JSON.stringify(sorted2.providedValue())).toStrictEqual(
      JSON.stringify({
        b: 4,
        c: 20,
        d: 1,
        a: 10,
      }),
    );
  });

  test("sort throws when random derived id cannot be allocated", () => {
    const dp = lre.dataProvider("rndExhaust", () => ({ a: 1 }));
    const sortSlot = `${dp.realId()}-sort-same`;
    vi.spyOn(lre, "getRandomId").mockReturnValue("same");
    dp.subscribeRefresh(sortSlot, () => {});

    expect(() => dp.sort()).toThrow("Could not generate a unique random id");
  });

  test("sort warns on numeric object keys when debug is enabled", () => {
    const warnSpy = vi.spyOn(lre, "warn").mockImplementation(() => {});
    const dp = lre.dataProvider("numKeys", () => ({
      1: { a: 2 },
      2: { a: 1 },
    }));

    dp.sort("a").providedValue();

    expect(warnSpy).toHaveBeenCalledWith(
      "Numeric keys prevent sort from working properly",
    );

    warnSpy.mockRestore();
  });
});

describe("DataProvider each", () => {
  test("empty each", () => {
    const dataGetter = vi.fn((_a: any) => {
      return undefined;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const fn = vi.fn();

    dp.each(fn);

    expect(fn).not.toHaveBeenCalled();
  });

  test("each single value", () => {
    const data = "42";
    const dataGetter = vi.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const fn = vi.fn();

    dp.each(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toStrictEqual("42");
  });

  test("each array", () => {
    const data = ["42", "13", "24"];
    const dataGetter = vi.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const fn = vi.fn();

    dp.each(fn);

    expect(fn).toHaveBeenCalledTimes(data.length);
    expect(fn.mock.calls[0][0]).toStrictEqual("42");
    expect(fn.mock.calls[1][0]).toStrictEqual("13");
    expect(fn.mock.calls[2][0]).toStrictEqual("24");
  });

  test("each", () => {
    const data = { a: "42", b: "13", c: "24" };
    const dataGetter = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const fn = vi.fn();

    dp.each(fn);

    expect(fn).toHaveBeenCalledTimes(Object.keys(data).length);
    expect(fn.mock.calls[0][0]).toStrictEqual("42");
    expect(fn.mock.calls[1][0]).toStrictEqual("13");
    expect(fn.mock.calls[2][0]).toStrictEqual("24");
  });

  test("each stops when cb returns false", () => {
    const data = { a: "42", b: "13", c: "24" };

    const dataGetter = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);
    let cnt = 0;
    const MAX = 2;
    const fn = vi.fn(() => ++cnt < MAX);

    dp.each(fn);

    expect(fn).toHaveBeenCalledTimes(MAX);
  });
});

describe("DataProvider select a column", () => {
  test("Select", () => {
    const data: any = {
      "1": { a: "42", b: "13", c: "24" },
      "2": { a: "1", b: "2", c: "3" },
      "4": { b: "5", c: "6" },
      "3": { a: "4", b: "5", c: "6" },
    };
    const dataGetter = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const result = dp.select("a");

    expect(result.provider).toBeTruthy();
    expect(result.providedValue()).toStrictEqual({
      "1": "42",
      "2": "1",
      "3": "4",
      "4": undefined,
    });
  });

  test("Select with a dynamic column", () => {
    const data: any = {
      "1": { a: "42", b: "13", c: "24" },
      "2": { a: "1", b: "2", c: "3" },
      "4": { b: "5", c: "6" },
      "3": { a: "4", b: "5", c: "6" },
    };
    const dataGetter = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    let val = "a";
    const dpVal = lre.dataProvider("val", () => val);

    const result = dp.select(dpVal);

    expect(result.provider).toBeTruthy();
    expect(result.providedValue()).toStrictEqual({
      "1": "42",
      "2": "1",
      "3": "4",
      "4": undefined,
    });

    val = "b";
    dpVal.refresh();

    expect(result.providedValue()).toStrictEqual({
      "1": "13",
      "2": "2",
      "3": "5",
      "4": "5",
    });
  });
});

describe("Dataprovider getData", () => {
  test("getData", () => {
    let data: any = 42;
    const dataGetter = vi.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    expect(dp.getData("1")).toBe(data);

    data = [42, "13", 24];
    dp.refresh();

    expect(dp.getData(1)).toStrictEqual("13");
    expect(dp.getData("2")).toStrictEqual(24);
    expect(dp.getData([0, "2"])).toStrictEqual({ 0: 42, 2: 24 });

    data = { a: "42", b: "13", c: "24" };
    dp.refresh();

    expect(dp.getData("a")).toStrictEqual("42");
    expect(dp.getData("b")).toStrictEqual("13");
    expect(dp.getData(["a", "b"])).toStrictEqual({ a: "42", b: "13" });
  });

  test("getData through select", () => {
    const data: any = {
      "1": { a: "42", b: "13", c: "24" },
      "2": { a: "1", b: "2", c: "3" },
      "3": { a: "4", b: "5", c: "6" },
    };
    const dataGetter = vi.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const result = dp.select("a");

    expect(result.provider).toBeTruthy();
    expect(result.getData("1")).toStrictEqual({ a: "42", b: "13", c: "24" });
    expect(result.getData("2")).toStrictEqual({ a: "1", b: "2", c: "3" });
    expect(result.getData("3")).toStrictEqual({ a: "4", b: "5", c: "6" });
  });

  test("getData with array of ids returns map of rows", () => {
    const dp = lre.dataProvider("multiId", () => ({
      "1": { a: "A" },
      "2": { a: "B" },
    }));

    expect(dp.getData(["1", "2"])).toStrictEqual({
      "1": { a: "A" },
      "2": { a: "B" },
    });
  });

  test("getData with non-index id returns empty object map", () => {
    const dp = lre.dataProvider("nonIndexId", () => ({
      "1": { a: "A" },
    }));

    expect(dp.getData({ invalid: true } as unknown as string[])).toStrictEqual(
      {},
    );
  });

  test("getData with single id on array-backed rows", () => {
    const dp = lre.dataProvider("arrRow", () => [{ a: "A" }, { a: "B" }]);

    expect(dp.getData(1)).toStrictEqual({ a: "B" });
  });
});

describe("DataProvider filter and where", () => {
  test("Filter data", () => {
    const data: Record<string, LetsRole.TableRow> = {
      "1": { id: "1", a: "42", b: "13", c: "24" },
      "2": { id: "2", a: "1", b: "2", c: "3" },
      "3": { id: "3", a: "4", b: "5", c: "6" },
    };
    const dataGetter = vi.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);
    const filtered = dp.filter((v: any, _k: any) => {
      return 1 * v?.b < 10;
    });

    expect(filtered.provider).toBeTruthy();
    expect(filtered.providedValue()).toStrictEqual({
      "2": { id: "2", a: "1", b: "2", c: "3" },
      "3": { id: "3", a: "4", b: "5", c: "6" },
    });
  });

  test("Where", () => {
    const data: Record<string, LetsRole.TableRow> = {
      "1": { id: "1", a: "42", b: "13", c: "24" },
      "2": { id: "2", a: "1", b: "5", c: "3" },
      "3": { id: "3", a: "4", b: "5", c: "6" },
    };
    const dataGetter = vi.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);
    let result = dp.select("a").where("1");

    expect(result.provider).toBeTruthy();
    expect(result.providedValue()).toStrictEqual({
      2: "1",
    });

    result = dp.select("a").where("b", "5");

    expect(result.provider).toBeTruthy();
    expect(result.providedValue()).toStrictEqual({
      2: "1",
      3: "4",
    });
  });

  test("Where with function", () => {
    const data: Record<string, LetsRole.TableRow> = {
      "1": { id: "1", a: "42", b: "13", c: "24" },
      "2": { id: "2", a: "1", b: "2", c: "3" },
      "3": { id: "3", a: "4", b: "5", c: "6" },
    };
    const dataGetter = vi.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);
    let result = dp.where((v: any) => {
      return v.b === "2";
    });

    expect(result.providedValue()).toStrictEqual({
      "2": { id: "2", a: "1", b: "2", c: "3" },
    });

    result = dp.where((v: any) => {
      return v.b === "2";
    });

    expect(result.providedValue()).toStrictEqual({
      "2": { id: "2", a: "1", b: "2", c: "3" },
    });
  });

  test("Where with array", () => {
    const data: Record<string, LetsRole.TableRow> = {
      "1": { id: "1", a: "42", b: "13", c: "24" },
      "2": { id: "2", a: "1", b: "2", c: "3" },
      "3": { id: "3", a: "4", b: "5", c: "6" },
      "4": { id: "3", a: "4", b: "5", c: "6" },
    };
    const dataGetter = vi.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);
    const result = dp.select("a").where("b", ["2", "5"]);

    expect(result.provider).toBeTruthy();
    expect(result.providedValue()).toStrictEqual({
      2: "1",
      3: "4",
      4: "4",
    });
  });
});

describe("DataProvider get single value", () => {
  test("Single value", () => {
    const data: any = {
      "1": { a: "42", b: "13", c: "24" },
      "2": { a: "1", b: "2", c: "3" },
      "3": { a: "4", b: "5", c: "6" },
    };
    const dataGetter = vi.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    expect(dataGetter).toHaveBeenCalledTimes(0);

    const select = dp.select("a");

    expect(dataGetter).toHaveBeenCalledTimes(0);

    const result = select.where((_v: any, _k: any, data: any) => {
      return data.b === "2";
    });

    expect(result.provider).toBeTruthy();
    expect(dataGetter).toHaveBeenCalledTimes(0);

    expect(result.getData()).toStrictEqual({ 2: { a: "1", b: "2", c: "3" } });
    expect(dataGetter).toHaveBeenCalledTimes(1);
    expect(result.singleValue()).toBe("1");
    expect(result.singleId()).toBe("2");

    const result2 = select.where((_v: any, _k: any, data: any) => {
      return data.b === "5";
    });

    expect(result2.getData()).toStrictEqual({ 3: { a: "4", b: "5", c: "6" } });
    expect(dataGetter).toHaveBeenCalledTimes(1);

    data["2"]["a"] = "42";
    dp.refresh();

    expect(result.singleValue()).toBe("42");
  });

  test("getBy", () => {
    const data: any = {
      "1": { a: "42", b: "13", c: "24" },
      "2": { a: "1", b: "2", c: "3" },
      "3": { a: "4", b: "5", c: "6" },
    };
    const dataGetter = vi.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter).select("a");

    expect(dp.getBy("b", "2")).toStrictEqual({
      "2": "1",
    });

    const calculator = (_v: any, _k: any, data: any): number => {
      return Number(data.a) + Number(data.b) + Number(data.c);
    };

    expect(dp.getBy(calculator, 15)).toStrictEqual({
      "3": "4",
    });
  });
});

describe("DataProvider analysis", () => {
  let dp: IDataProvider;
  let data: any;

  beforeEach(() => {
    data = {
      _1: { a: "402", b: "13", c: "34" },
      _2: { a: "1", b: "9", c: "3" },
      _3: { a: "41", b: "5", c: "6" },
    };
    const dataGetter = vi.fn((_a: any) => {
      return data as any;
    });
    dp = lre.dataProvider("test", dataGetter);
  });

  test("Count | length data provider result", () => {
    expect(dp.count()).toBe(3);
    expect(dp.length()).toBe(3);
  });

  test("Count on filtered data", () => {
    const filtered = dp.select("a").where((_v, _k, data: any) => {
      return data.b === "9";
    });

    expect(filtered.count()).toBe(1);

    data["_4"] = { a: "420", b: "9", c: "240" };
    filtered.refresh();

    expect(filtered.count()).toBe(2);
    expect(filtered.where("no").length()).toBe(0);
  });

  test("Min on column", () => {
    const min = dp.min("a");

    expect(min.provider).toBeTruthy();
    expect(min.providedValue()).toStrictEqual({
      _2: { a: "1", b: "9", c: "3" },
    });
  });

  test("Min on value", () => {
    const min = dp.select("a").min();

    expect(min.providedValue()).toStrictEqual({ _2: "1" });
    expect(min.singleValue()).toStrictEqual("1");
    expect(min.singleId()).toStrictEqual("_2");
  });

  test("Min on original data", () => {
    const min = dp.select("b").min("a");

    expect(min.providedValue()).toStrictEqual({ _2: "9" });
  });

  test("Max", () => {
    const min = dp.max("a");

    expect(min.provider).toBeTruthy();
    expect(min.providedValue()).toStrictEqual({
      _3: { a: "41", b: "5", c: "6" },
    });
  });

  test("Max on numerics", () => {
    lre.autoNum();
    dp.refresh();
    const min = dp.max("a");

    expect(min.provider).toBeTruthy();
    expect(min.providedValue()).toStrictEqual({
      _1: { a: 402, b: 13, c: 34 },
    });
  });

  test("countDistinct", () => {
    expect(dp.countDistinct()).toBe(3);
    expect(dp.countDistinct("a")).toBe(3);

    data["_4"] = { a: "1", b: "9", c: "3" };

    expect(dp.countDistinct()).toBe(3);
    expect(dp.countDistinct("a")).toBe(3);

    data["_5"] = { a: "1", b: "10", c: "3" };

    expect(dp.countDistinct()).toBe(4);
    expect(dp.countDistinct("a")).toBe(3);
  });

  test("sum", () => {
    expect(dp.sum("a")).toBe(444);
    expect(dp.sum("b")).toBe(27);
    expect(dp.sum("c")).toBe(43);

    data["_4"] = { a: "1", b: "9", c: "3" };

    expect(dp.sum("a")).toBe(445);
    expect(dp.sum("b")).toBe(36);
    expect(dp.sum("c")).toBe(46);

    const selected = dp.select("a");

    expect(selected.sum()).toBe(445);
  });

  test("limit = get a limited number of data", () => {
    lre.autoNum();
    const limited = dp.sort("a").limit(2);

    expect(limited.provider).toBeTruthy();
    expect(
      Object.keys(limited.providedValue() as Record<any, any>),
    ).toHaveLength(2);
    expect(limited.length()).toBe(2);
    expect(limited.providedValue()).toStrictEqual({
      _2: { a: 1, b: 9, c: 3 },
      _3: { a: 41, b: 5, c: 6 },
    });

    const arr = [
      { a: 1, b: 10 },
      { a: 3, b: 4 },
      { a: 5, b: 3 },
      { a: 7, b: 8 },
    ];

    const dpArray = lre.dataProvider("testArray", () => arr);

    const limitedArray = dpArray.sort("b").limit(3);

    expect(limitedArray.provider).toBeTruthy();
    expect(limitedArray.providedValue()).toHaveLength(3);
    expect(limitedArray.length()).toBe(3);

    arr.push({ a: 2, b: 6 });

    limitedArray.refresh();

    expect(limitedArray.length()).toBe(3);
    expect(limitedArray.providedValue()).toStrictEqual([
      { a: 5, b: 3 },
      { a: 3, b: 4 },
      { a: 2, b: 6 },
    ]);
  });

  test("sum with non-numeric column values still adds totals", () => {
    const dp = lre.dataProvider("strSum", () => ({
      a: { tag: "x" },
      b: { tag: "y" },
    }));

    expect(dp.sum("tag")).toBeNaN();
  });

  test("sum sets hasNaN when column value is number NaN", () => {
    const dp = lre.dataProvider("nanSum", () => ({
      a: { score: Number.NaN },
      b: { score: 3 },
    }));

    expect(dp.sum("score")).toBeNaN();
  });

  test("sum warns when non-numeric values were summed", () => {
    const warnSpy = vi.spyOn(lre, "warn").mockImplementation(() => {});
    const dp = lre.dataProvider("sumWarn", () => ({
      a: { score: "not-a-num" },
    }));

    expect(dp.sum("score")).toBeNaN();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "could have failed because of non numeric values",
      ),
    );

    warnSpy.mockRestore();
  });

  test("countDistinct treats deep-equal objects as one value", () => {
    const shared = { score: 1 };
    const dp = lre.dataProvider("distinctObj", () => ({
      "1": shared,
      "2": { score: 1 },
      "3": { score: 2 },
    }));

    expect(dp.countDistinct()).toBe(2);
  });
});

describe("DataProvider transform", () => {
  let dp: IDataProvider;
  let data: any;

  beforeEach(() => {
    context.popLogContext();
    data = {
      _1: { a: "402", b: "13", c: "34" },
      _2: { a: "1", b: "9", c: "3" },
      _3: { a: "41", b: "5", c: "6" },
    };
    const dataGetter = vi.fn((_a: any) => {
      return data as any;
    });
    dp = lre.dataProvider("testTransform", dataGetter);
  });

  test("Transform single value", () => {
    const select = dp.select("a");

    expect(select.providedValue()).toStrictEqual({
      _1: "402",
      _2: "1",
      _3: "41",
    });

    const transformed = select.transform("b");

    expect(transformed.providedValue()).toStrictEqual({
      _1: "13",
      _2: "9",
      _3: "5",
    });
  });

  test("Transform object", () => {
    expect(dp.providedValue()).toStrictEqual(data);

    const transformMap = {
      z: "a",
      y: "b",
      x: "c",
    };

    const transformed = dp.transform(transformMap);

    expect(transformed.providedValue()).toStrictEqual({
      _1: { z: "402", y: "13", x: "34" },
      _2: { z: "1", y: "9", x: "3" },
      _3: { z: "41", y: "5", x: "6" },
    });
  });

  test("Transform object missing key", () => {
    expect(dp.providedValue()).toStrictEqual(data);

    const transformMap = {
      z: "a",
      y: "b",
      x: "d",
    };

    const transformed = dp.transform(transformMap);

    expect(transformed.providedValue()).toStrictEqual({
      _1: { z: "402", y: "13" },
      _2: { z: "1", y: "9" },
      _3: { z: "41", y: "5" },
    });
  });

  test("Transform object from original data key", () => {
    expect(dp.providedValue()).toStrictEqual(data);

    const transformMap = {
      z: "a",
      y: "b",
    };

    const transformed = dp.transform({ a: "a" }).transform(transformMap);

    expect(transformed.providedValue()).toStrictEqual({
      _1: { z: "402", y: "13" },
      _2: { z: "1", y: "9" },
      _3: { z: "41", y: "5" },
    });
  });

  test("Transform object with function", () => {
    expect(dp.providedValue()).toStrictEqual(data);

    const transform = function (_v: any, _k: any, data: any): string {
      return data.a + data.b + data.c;
    };

    const transformed = dp.transform({ lbl: transform });

    expect(transformed.providedValue()).toStrictEqual({
      _1: { lbl: "4021334" },
      _2: { lbl: "193" },
      _3: { lbl: "4156" },
    });
  });
});

describe("Dataprovider from cb refresh", () => {
  let rawSheet: ViewMock;
  let sheetProxy: SheetProxy;
  let sheet: Sheet;

  beforeEach(() => {
    rawSheet = server.openView("main", "123");
    sheetProxy = new SheetProxy(context, rawSheet);
    sheet = new Sheet(
      sheetProxy,
      new DataBatcher(context, sheetProxy),
      context,
    );
    lre.sheets.add(sheet);
    rawSheet.componentChangedManually("txt1", "HelloOne");
    rawSheet.componentChangedManually("txt2", "WorldTwo");
  });

  test("Refresh from component change", () => {
    const txt1 = sheet.get("txt1")!;
    const txt2 = sheet.get("txt2")!;
    const fn = vi.fn(() => {
      return {
        one: txt1.value(),
        two: txt2.value(),
      };
    });
    const derived = vi.fn(() => {
      const a = 1;
      return a;
    });
    const dp = lre.dataProvider("test", fn);

    expect(fn).toHaveBeenCalledTimes(0);

    expect(dp.providedValue()).toStrictEqual({
      one: "HelloOne",
      two: "WorldTwo",
    });

    dp.subscribeRefresh("derived", derived);

    expect(derived).toHaveBeenCalledTimes(0);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.spyOn(txt1, "value");

    rawSheet.componentChangedManually("txt1", "Hello");

    expect(fn).toHaveBeenCalledTimes(2);
    expect(derived).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();

    expect(dp.providedValue()).toStrictEqual({
      one: "Hello",
      two: "WorldTwo",
    });

    expect(txt1.value).toHaveBeenCalledTimes(0);
    expect(fn).toHaveBeenCalledTimes(0);
    expect(derived).toHaveBeenCalledTimes(0);
  });

  test("dataProvider with original and source refresh callbacks", () => {
    const sourceRefresh = vi.fn();
    const dp = lre.dataProvider(
      "withRefresh",
      () => ({ v: 1 }),
      () => ({ v: 0 }),
      sourceRefresh,
    );

    expect(dp.getData("v")).toBe(0);

    dp.refresh();

    expect(sourceRefresh).toHaveBeenCalled();
  });
});

describe("Dataprovider search", () => {
  test("Search on id", () => {
    const data = { a: "42", b: "13", c: "24" };
    const dataGetter = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const search = dp.search("id", "b");

    expect(search.provider).toBeTruthy();

    expect(search.providedValue()).toStrictEqual({
      b: "13",
    });
  });

  test("Search object row on id", () => {
    const data = {
      a: { id: "a", a: "42", b: "13", c: "24" },
      b: { id: "b", a: "1", b: "2", c: "3" },
      c: { id: "c", a: "4", b: "5", c: "6" },
    };
    const dataGetter = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const search = dp.search("id", "b");

    expect(search.provider).toBeTruthy();

    expect(search.providedValue()).toStrictEqual({
      b: { id: "b", a: "1", b: "2", c: "3" },
    });
  });

  test("Search on column", () => {
    const data = {
      a: { a: "42", b: "13", c: "24" },
      b: { a: "1", b: "2", c: "3" },
      c: { a: "4", b: "5", c: "6" },
      d: { a: "24", b: "2", c: "6" },
      e: { a: "111", b: "2", c: "8" },
    };
    const dataGetter = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const search = dp.search("b", "2");

    expect(search.provider).toBeTruthy();

    expect(search.providedValue()).toStrictEqual({
      b: { a: "1", b: "2", c: "3" },
      d: { a: "24", b: "2", c: "6" },
      e: { a: "111", b: "2", c: "8" },
    });
  });
});

describe("Dataprovider toArray", () => {
  test("default toArray with scalar value", () => {
    const data = { a: "42", b: "13", c: "24" };
    const dataGetter = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    expect(dp.toArray()).toEqual(
      expect.arrayContaining([
        { id: "a", value: "42" },
        { id: "b", value: "13" },
        { id: "c", value: "24" },
      ]),
    );
  });

  test("default toArray with objects", () => {
    const data = {
      c: { value: "24", type: 42 },
      a: { value: "42", type: 13 },
      b: { value: "13", type: 24 },
    };
    const dataGetter = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    expect(dp.toArray()).toEqual(
      expect.arrayContaining([
        { id: "a", value: "42", type: 13 },
        { id: "b", value: "13", type: 24 },
        { id: "c", value: "24", type: 42 },
      ]),
    );
  });

  test("toArray with custom function", () => {
    const data = {
      c: { value: "24", type: 42 },
      a: { value: "42", type: 13 },
      b: { value: "13", type: 24 },
    };
    const dataGetter = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const transform = (v: any, k: any, _data: any): any => {
      return {
        identifier: k,
        value: parseInt(v.value) + v.type,
      };
    };

    expect(dp.toArray(transform)).toEqual(
      expect.arrayContaining([
        { identifier: "b", value: 37 },
        { identifier: "a", value: 55 },
        { identifier: "c", value: 66 },
      ]),
    );
  });

  test("default toArray assigns random id when each passes undefined key", () => {
    const dp = lre.dataProvider("undefKey", () => "scalar");
    vi.spyOn(dp, "each").mockImplementation((mapper) => {
      mapper("scalar", undefined as any, "scalar");
    });

    expect(dp.toArray()).toEqual([{ id: expect.any(String), value: "scalar" }]);
  });
});

describe("DataProvider union", () => {
  let dp1: IDataProvider;
  let dp2: IDataProvider;
  let data1: any;
  let data2: any;
  let getter1: any;
  let getter2: any;

  beforeEach(() => {
    data1 = {
      c: { value: "24", type: 42 },
    };
    getter1 = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data1, _a);
      }

      return data1 as any;
    });
    dp1 = lre.dataProvider("test", getter1);
    data2 = {
      d: { value: "24", type: 42 },
    };
    getter2 = vi.fn((_a: any) => {
      if (_a) {
        Object.assign(data2, _a);
      }

      return data2 as any;
    });
    dp2 = lre.dataProvider("test2", getter2);
  });

  test("Union two data providers works well", () => {
    const dp = dp1.union(dp2);

    expect(dp.provider).toBeTruthy();
  });

  test("Each on union-ed dp run the cb on both dp lines", () => {
    const dp = dp1.union(dp2);

    expect(dp.length()).toBe(2);

    const fn = vi.fn();
    dp.each(fn);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[0][0]).toStrictEqual({ value: "24", type: 42 });
    expect(fn.mock.calls[1][0]).toStrictEqual({ value: "24", type: 42 });
    expect(fn.mock.calls[0][1]).toBe("c");
    expect(fn.mock.calls[1][1]).toBe("d");
  });

  test("Union on duplicate id overwrites the first one", () => {
    data2 = {
      c: { value: "111", type: 123 },
    };
    const dp = dp1.union(dp2);

    expect(getter1).not.toHaveBeenCalled();
    expect(getter2).not.toHaveBeenCalled();

    expect(dp.length()).toBe(1);
    expect(getter1).toHaveBeenCalledTimes(1);
    expect(getter2).toHaveBeenCalledTimes(1);
    expect(dp.providedValue()).toStrictEqual({
      c: { value: "111", type: 123 },
    });
  });
});

describe("DataProvider join", () => {
  let dp1: IDataProvider;
  let dp2: IDataProvider;
  let data1: any;
  let data2: any;
  let getter1: any;
  let getter2: any;

  beforeEach(() => {
    data1 = {
      a: { value: "24", type: 42, ref: "d" },
      b: { value: "25", type: 43, ref: "d" },
      c: { value: "26", type: 44, ref: "e" },
      d: { value: "27", type: 45, ref: "f" },
    };
    getter1 = vi.fn((_a: any) => data1);
    dp1 = lre.dataProvider("test", getter1);
    data2 = [
      { id: "a", name: "nameA", strength: 1, value: "42" },
      { id: "b", name: "nameB", strength: 2, value: "52" },
      { id: "c", name: "nameC", strength: 3, value: "62" },
      { id: "d", name: "nameD", strength: 4, value: "72" },
      { id: "e", name: "nameE", strength: 5, value: "82" },
    ];
    getter2 = vi.fn((_a: any) => data2);
    dp2 = lre.dataProvider("test2", getter2);
  });

  test("Union two data providers with strings works well", () => {
    const join = dp1.innerJoin(dp2, "ref", "id");

    expect(join.provider).toBeTruthy();
    expect(join.length()).toBe(3);
    expect(join.providedValue()).toStrictEqual({
      a: {
        value: "24",
        type: 42,
        ref: "d",
        name: "nameD",
        strength: 4,
        value_: "72",
      },
      b: {
        value: "25",
        type: 43,
        ref: "d",
        name: "nameD",
        strength: 4,
        value_: "72",
      },
      c: {
        value: "26",
        type: 44,
        ref: "e",
        name: "nameE",
        strength: 5,
        value_: "82",
      },
    });
  });

  test("Join with function works well", () => {
    const join = dp1.innerJoin(dp2, (v1: any, v2: any): boolean => {
      return v1.ref === v2.id;
    });

    expect(join.provider).toBeTruthy();
    expect(join.length()).toBe(3);
    expect(join.providedValue()).toStrictEqual({
      a: {
        value: "24",
        type: 42,
        ref: "d",
        name: "nameD",
        strength: 4,
        value_: "72",
      },
      b: {
        value: "25",
        type: 43,
        ref: "d",
        name: "nameD",
        strength: 4,
        value_: "72",
      },
      c: {
        value: "26",
        type: 44,
        ref: "e",
        name: "nameE",
        strength: 5,
        value_: "82",
      },
    });
  });
});

describe("DataProvider original value and getData branches", () => {
  test("getData uses originalValueCb when provided", () => {
    const current = { "1": { a: "current", b: "1" } };
    const original = { "1": { a: "original", b: "1" } };
    const dp = lre.dataProvider(
      "orig",
      () => current,
      () => original,
    );

    expect(dp.getData("1")).toStrictEqual({ a: "original", b: "1" });
    expect(dp.select("a").getData("1")).toStrictEqual({
      a: "original",
      b: "1",
    });
  });

  test("getData without id when current is array builds index map", () => {
    const dp = lre.dataProvider("arr", () => [10, 20, 30]);

    expect(dp.getData()).toStrictEqual({ 0: 10, 1: 20, 2: 30 });
  });

  test("getData without id returns original array when shape differs", () => {
    const dp = lre.dataProvider(
      "mixed",
      () => ({ only: "current" }),
      () => [1, 2] as unknown as LetsRole.ComponentValue,
    );

    expect(dp.getData()).toStrictEqual([1, 2]);
  });

  test("getData without id returns scalar original", () => {
    const dp = lre.dataProvider(
      "scalarOrig",
      () => ({ x: 1 }),
      () => "original-scalar" as LetsRole.ComponentValue,
    );

    expect(dp.getData()).toBe("original-scalar");
  });

  test("getData maps object keys from current to original rows", () => {
    const current = { a: "1", b: "2" };
    const original = { a: { v: "A" }, b: { v: "B" } };
    const dp = lre.dataProvider(
      "map",
      () => current,
      () => original,
    );

    expect(dp.getData()).toStrictEqual({ a: { v: "A" }, b: { v: "B" } });
  });

  test("getData with id on avatar original values returns undefined", () => {
    const avatar: LetsRole.AvatarValue = {
      avatar: "pic.png",
      token: "tok.png",
      frame: { avatar: null, token: null },
    };
    const dp = lre.dataProvider(
      "avatarOrig",
      () => ({ row: 1 }),
      () => avatar,
    );

    expect(dp.getData("row")).toBeUndefined();
  });

  test("getData without id uses empty object when current is null and original is object", () => {
    const dp = lre.dataProvider(
      "noCurrent",
      () => null as any,
      () => ({ a: { v: 1 }, b: { v: 2 } }),
    );

    expect(dp.getData()).toStrictEqual({});
  });

  test("original value callback undefined falls back to current for getData", () => {
    const dp = lre.dataProvider(
      "origFallback",
      () => ({ k: { v: 2 } }),
      () => undefined as unknown as LetsRole.ComponentValue,
    );

    expect(dp.getData()).toStrictEqual({ k: { v: 2 } });
  });
});

describe("DataProvider select and column edge cases", () => {
  test("select falls back to id when column provider is not string or number", () => {
    const rows = {
      a: { id: "a", label: "first" },
      b: { id: "b", label: "second" },
    };
    const dp = lre.dataProvider("rows", () => rows);
    const colDp = lre.dataProvider("col", () => ({ bad: true }) as any);

    expect(dp.select(colDp).providedValue()).toStrictEqual({
      a: "a",
      b: "b",
    });
  });

  test("select on scalar value returns single column value", () => {
    const dp = lre.dataProvider("scalar", () => "hello");

    expect(dp.select("anything").providedValue()).toBeUndefined();
  });

  test("select detects membership on array row values", () => {
    const dp = lre.dataProvider("tags", () => ({
      "1": ["alpha", "beta"],
      "2": ["gamma"],
    }));

    expect(dp.select("alpha").providedValue()).toStrictEqual({
      "1": true,
      "2": false,
    });
  });

  test("select skips undefined row values when reading column", () => {
    const dp = lre.dataProvider("undefRow", () => ({
      "1": undefined as unknown as LetsRole.ComponentValue,
      "2": { a: 5 },
    }));

    expect(dp.select("a").providedValue()).toStrictEqual({
      "1": undefined,
      "2": 5,
    });
  });
});

describe("DataProvider where edge cases", () => {
  test("where with no args returns same provider", () => {
    const dp = lre.dataProvider("noop", () => ({ a: 1 }));

    // @ts-expect-error zero-arg where is a runtime no-op, not in the public signature
    expect(dp.where()).toBe(dp);
  });

  test("where with undefined condition returns same provider", () => {
    const dp = lre.dataProvider("noop2", () => ({ a: 1 }));

    expect(dp.where(undefined as any)).toBe(dp);
  });

  test("where compares column to component value", () => {
    const rawSheet = server.openView("main", "where-comp");
    const sheetProxy = new SheetProxy(context, rawSheet);
    const sheet = new Sheet(
      sheetProxy,
      new DataBatcher(context, sheetProxy),
      context,
    );
    lre.sheets.add(sheet);
    rawSheet.componentChangedManually("txt1", "World");

    const data = {
      "1": { b: "World", a: "1" },
      "2": { b: "Other", a: "2" },
    };
    const dp = lre.dataProvider("whereComp", () => data);
    const txt = sheet.get("txt1")! as IComponent;
    const filtered = dp.where("b", txt);

    expect(filtered.providedValue()).toStrictEqual({
      "1": { b: "World", a: "1" },
    });
  });

  test("where throws on invalid column type", () => {
    const dp = lre.dataProvider("badWhere", () => ({ a: 1 }));

    expect(() => dp.where(42 as any, "x")).toThrow("Invalid where condition");
  });
});

describe("DataProvider scalar and single entry helpers", () => {
  test("count length and single helpers on scalar value", () => {
    const dp = lre.dataProvider("scalarCount", () => 99);

    expect(dp.count()).toBe(1);
    expect(dp.length()).toBe(1);
    expect(dp.singleValue()).toBe(99);
    expect(dp.singleId()).toBe(0);
  });

  test("singleId uses id field on first array row when present", () => {
    const dp = lre.dataProvider("arrId", () => [
      { id: "row-7", a: 1 },
      { id: "row-8", a: 2 },
    ]);

    expect(dp.singleValue()).toStrictEqual({ id: "row-7", a: 1 });
    expect(dp.singleId()).toBe("row-7");
  });

  test("singleId on array without id field is zero", () => {
    const dp = lre.dataProvider("arrNoId", () => ["x", "y"]);

    expect(dp.singleId()).toBe(0);
  });

  test("limit on scalar returns the scalar", () => {
    const dp = lre.dataProvider("scalarLimit", () => "only");

    expect(dp.limit(2).providedValue()).toBe("only");
  });

  test("min skips falsy numeric column values", () => {
    const data = {
      _1: { a: 0, b: "1" },
      _2: { a: 5, b: "2" },
    };
    const dp = lre.dataProvider("minSkip", () => data);

    expect(dp.min("a").providedValue()).toStrictEqual({
      _2: { a: 5, b: "2" },
    });
  });
});

describe("DataProvider transform string source", () => {
  test("transform string reads missing key from original row data", () => {
    const data = {
      "1": { a: "1", c: "from-original" },
      "2": { a: "2", c: "other" },
    };
    const dp = lre.dataProvider("transformStr", () => data);

    expect(dp.select("a").transform("c").providedValue()).toStrictEqual({
      "1": "from-original",
      "2": "other",
    });
  });

  test("transform with top-level string column name", () => {
    const data = {
      "1": { a: "10", b: "20" },
    };
    const dp = lre.dataProvider("transformTop", () => data);

    expect(dp.transform("b").providedValue()).toStrictEqual({
      "1": "20",
    });
  });

  test("transform with function callback", () => {
    const data = {
      "1": { a: "10", b: "20" },
    };
    const dp = lre.dataProvider("transformFn", () => data);

    expect(
      dp.transform((_v, k) => `${k}-merged`).providedValue(),
    ).toStrictEqual({
      "1": "1-merged",
    });
  });

  test("transform string returns undefined when key missing everywhere", () => {
    const data = { "1": { a: "10" } };
    const dp = lre.dataProvider("transformMiss", () => data);

    expect(dp.select("a").transform("missing").providedValue()).toStrictEqual({
      "1": undefined,
    });
  });
});

describe("DataProvider each on avatar value", () => {
  test("each treats avatar value as single scalar entry", () => {
    const avatar: LetsRole.AvatarValue = {
      avatar: "pic.png",
      token: "tok.png",
      frame: { avatar: null, token: null },
    };
    const dp = lre.dataProvider("avatar", () => avatar);
    const fn = vi.fn();

    dp.each(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toStrictEqual(avatar);
    expect(fn.mock.calls[0][1]).toBe("");
  });
});

describe("DataProvider refresh subscription", () => {
  test("unsubscribeRefresh stops refreshSelf on derived provider", () => {
    const dp = lre.dataProvider("sub", () => ({ a: 1 }));
    const sorted = dp.sort("a");
    const refreshSelfSpy = vi.spyOn(
      sorted as unknown as { refreshSelf: () => void },
      "refreshSelf",
    );

    dp.unsubscribeRefresh(sorted.realId());
    dp.refresh();

    expect(refreshSelfSpy).not.toHaveBeenCalled();
  });
});

describe("DataProvider providedValue setter", () => {
  test("providedValue setter forwards to value callback", () => {
    const data = { a: "1" };
    const getter = vi.fn((patch?: typeof data) => {
      if (patch) {
        Object.assign(data, patch);
      }

      return data;
    });
    const dp = lre.dataProvider("set", getter);

    dp.providedValue({ a: "2" });

    expect(getter).toHaveBeenCalledWith({ a: "2" });
    expect(data.a).toBe("2");
  });
});

describe("DataProvider join extended", () => {
  test("leftJoin matches innerJoin for string columns", () => {
    const left = {
      a: { ref: "d", v: 1 },
    };
    const right = [{ id: "d", name: "joined" }];
    const dp1 = lre.dataProvider("left", () => left);
    const dp2 = lre.dataProvider("right", () => right);

    expect(dp1.leftJoin(dp2, "ref", "id").providedValue()).toStrictEqual({
      a: { ref: "d", v: 1, name: "joined" },
    });
  });

  test("innerJoin defaults right column to id when omitted", () => {
    const left = { a: { ref: "x", v: 1 } };
    const right = [{ id: "x", label: "ok" }];
    const dp1 = lre.dataProvider("defaultRight", () => left);
    const dp2 = lre.dataProvider("defaultRight2", () => right);

    expect(dp1.innerJoin(dp2, "ref").providedValue()).toStrictEqual({
      a: { ref: "x", v: 1, label: "ok" },
    });
  });

  test("innerJoin accepts JoinOptions object", () => {
    const left = { a: { ref: "x", v: 1 } };
    const right = [{ id: "x", extra: "yes" }];
    const dp1 = lre.dataProvider("l", () => left);
    const dp2 = lre.dataProvider("r", () => right);

    const joined = dp1.innerJoin(dp2, {
      leftColumn: "ref",
      rightColumn: "id",
    });

    expect(joined.providedValue()).toStrictEqual({
      a: { ref: "x", v: 1, extra: "yes" },
    });
  });

  test("innerJoin reuses indexed right row for duplicate left keys", () => {
    const left = {
      a: { ref: "d", tag: "first" },
      b: { ref: "d", tag: "second" },
    };
    const right = [{ id: "d", name: "shared" }];
    const dp1 = lre.dataProvider("dupLeft", () => left);
    const dp2 = lre.dataProvider("dupRight", () => right);

    const joined = dp1.innerJoin(dp2, "ref", "id");

    expect(joined.length()).toBe(2);
    expect(joined.providedValue()).toStrictEqual({
      a: { ref: "d", tag: "first", name: "shared" },
      b: { ref: "d", tag: "second", name: "shared" },
    });
  });

  test("innerJoin keeps scalar rows on the left", () => {
    const left = { k: "plain-string" };
    const right = [{ id: "1", x: 1 }];
    const dp1 = lre.dataProvider("scalarLeft", () => left);
    const dp2 = lre.dataProvider("r2", () => right);

    expect(dp1.innerJoin(dp2, "id", "id").providedValue()).toStrictEqual({
      k: "plain-string",
    });
  });

  test("innerJoin throws on invalid join options", () => {
    const dp1 = lre.dataProvider("j1", () => ({}));
    const dp2 = lre.dataProvider("j2", () => []);

    expect(() => dp1.innerJoin(dp2, true as any).providedValue()).toThrow(
      "Invalid join options",
    );
    expect(() =>
      dp1
        .innerJoin(dp2, { leftColumn: true as any, rightColumn: "id" })
        .providedValue(),
    ).toThrow("Invalid join options, missing comparison function");
  });

  test("innerJoin with invalid left ref logs error and yields undefined value", () => {
    const left = { a: { ref: false, v: 1 } };
    const right = [{ id: "x", label: "ok" }];
    const dp1 = lre.dataProvider("badLeftCol", () => left);
    const dp2 = lre.dataProvider("badRightCol", () => right);
    const eachSpy = vi.spyOn(dp1, "each");
    const errorSpy = vi.spyOn(lre, "error").mockImplementation(() => {});
    const joined = dp1.innerJoin(dp2, "ref", "id");

    expect(joined.providedValue()).toBeUndefined();
    expect(eachSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
    eachSpy.mockRestore();
  });

  test("innerJoin mergeRows when right row is not an object", () => {
    const left = { a: { mark: "hit", v: 1 } };
    const right = { b: "scalar-right" };
    const dp1 = lre.dataProvider("mergeL", () => left);
    const dp2 = lre.dataProvider("mergeR", () => right);

    const joined = dp1.innerJoin(
      dp2,
      (rowLeft, rowRight) =>
        lre.isObject(rowLeft) && rowRight === "scalar-right",
    );

    expect(joined.providedValue()).toStrictEqual({
      a: { mark: "hit", v: 1 },
    });
  });
});

describe("DirectDataProvider", () => {
  test("id returns constructor id and refresh triggers event", () => {
    const onRefresh = vi.fn();
    const dp = new DirectDataProvider("direct-id", context, () => 1);
    dp.on("refresh", onRefresh);

    dp.refresh();

    expect(dp.id()).toBe("direct-id");
    expect(onRefresh).toHaveBeenCalled();
  });

  test("constructor with only id and context skips optional callback slots", () => {
    const dp = new DirectDataProvider("id-context-only", context);

    expect(dp.id()).toBe("id-context-only");
    expect(dp.provider).toBe(true);
  });

  test("constructor with original value only omits source refresh arg", () => {
    const dp = new DirectDataProvider(
      "original-only",
      context,
      () => ({ live: 1 }),
      () => ({ live: 0 }),
    );

    expect(dp.getData("live")).toBe(0);
    expect(dp.providedValue()).toStrictEqual({ live: 1 });
  });

  test("event target getter binds to the provider instance", () => {
    const handler = vi.fn(function (this: IDataProvider) {
      expect(this).toBe(dp);
    });
    const dp = new DirectDataProvider("target-getter", context, () => 1);
    dp.on("refresh", handler);

    dp.refresh();

    expect(handler).toHaveBeenCalled();
  });

  test("constructor wires original value and source refresh callbacks", () => {
    const sourceRefresh = vi.fn();
    const dp = new DirectDataProvider(
      "ctor-full",
      context,
      () => ({ live: 1 }),
      () => ({ live: 0 }),
      sourceRefresh,
    );

    expect(dp.id()).toBe("ctor-full");
    expect(dp.getData("live")).toBe(0);

    dp.refresh();

    expect(sourceRefresh).toHaveBeenCalled();
  });

  test("providedValue read triggers refresh event", () => {
    const onRefresh = vi.fn();
    const dp = new DirectDataProvider("read-refresh", context, () => 7);
    dp.on("refresh", onRefresh);

    expect(dp.providedValue()).toBe(7);
    expect(onRefresh).toHaveBeenCalled();
  });
});

describe("DataProvider sort array DESC", () => {
  test("sort array descending", () => {
    const dp = lre.dataProvider("sortDesc", () => [3, 1, 2]);
    const sorted = dp.sort(undefined, "DESC");

    expect(sorted.providedValue()).toStrictEqual([3, 2, 1]);
  });
});

describe("DataProvider toString", () => {
  test("toString shows dataprovider info with single value", () => {
    const data = "42";
    const dataGetter = vi.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);
    const result = dp.toString();

    expect(result).toBe("DataProvider<test>(1 items)");
  });

  test("toString shows dataprovider info with array", () => {
    const data = ["a", "b", "c"];
    const dataGetter = vi.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);
    const result = dp.toString();

    expect(result).toBe("DataProvider<test>(3 items)");
  });

  test("toString shows dataprovider info with object", () => {
    const data = { a: 1, b: 2, c: 3, d: 4 };
    const dataGetter = vi.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);
    const result = dp.toString();

    expect(result).toBe("DataProvider<test>(4 items)");
  });

  test("toString shows dataprovider info with empty object", () => {
    const data = {};
    const dataGetter = vi.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);
    const result = dp.toString();

    expect(result).toBe("DataProvider<test>(0 items)");
  });
});

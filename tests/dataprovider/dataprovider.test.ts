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
    const dataGetter = jest.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);

    expect(dp.providedValue()).toBe(data);
    expect(dataGetter).toHaveBeenCalled();
  });
});

describe("Data provider sort", () => {
  test("Sort single value", () => {
    const data = "42";
    const dataGetter = jest.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);
    const sorted = dp.sort();

    expect(sorted.provider).toBeTruthy();
    expect(sorted.providedValue()).toBe(data);
  });

  test("Sort array", () => {
    const data = ["42", "4", "24", "24"];
    const dataGetter = jest.fn((_a: any) => data as any);
    const dp = lre.dataProvider("test", dataGetter);
    const sorted = dp.sort();

    expect(sorted.provider).toBeTruthy();
    expect(sorted.providedValue()).toStrictEqual(["24", "24", "4", "42"]);
  });

  test("Sort array of object", () => {
    const data = [{ a: "42" }, { a: "4" }, { a: "24" }, { a: "24" }];
    const dataGetter = jest.fn((_a: any) => data as any);
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
    const dataGetter = jest.fn((_a: any) => {
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
    const dataGetter = jest.fn((_a: any) => {
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
    const dataGetter = jest.fn((_a: any) => data as any);
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
    const dataGetter = jest.fn((_a: any) => data as any);
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
    const dataGetter = jest.fn((_a: any) => data as any);
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
    const dataGetter = jest.fn((_a: any) => data as any);
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
});

describe("DataProvider each", () => {
  test("empty each", () => {
    const dataGetter = jest.fn((_a: any) => {
      return undefined;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const fn = jest.fn();

    dp.each(fn);

    expect(fn).not.toHaveBeenCalled();
  });

  test("each single value", () => {
    const data = "42";
    const dataGetter = jest.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const fn = jest.fn();

    dp.each(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toStrictEqual("42");
  });

  test("each array", () => {
    const data = ["42", "13", "24"];
    const dataGetter = jest.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const fn = jest.fn();

    dp.each(fn);

    expect(fn).toHaveBeenCalledTimes(data.length);
    expect(fn.mock.calls[0][0]).toStrictEqual("42");
    expect(fn.mock.calls[1][0]).toStrictEqual("13");
    expect(fn.mock.calls[2][0]).toStrictEqual("24");
  });

  test("each", () => {
    const data = { a: "42", b: "13", c: "24" };
    const dataGetter = jest.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const fn = jest.fn();

    dp.each(fn);

    expect(fn).toHaveBeenCalledTimes(Object.keys(data).length);
    expect(fn.mock.calls[0][0]).toStrictEqual("42");
    expect(fn.mock.calls[1][0]).toStrictEqual("13");
    expect(fn.mock.calls[2][0]).toStrictEqual("24");
  });

  test("each stops when cb returns false", () => {
    const data = { a: "42", b: "13", c: "24" };

    const dataGetter = jest.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);
    let cnt = 0;
    const MAX = 2;
    const fn = jest.fn(() => ++cnt < MAX);

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
    const dataGetter = jest.fn((_a: any) => {
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
});

describe("Dataprovider getData", () => {
  test("getData", () => {
    let data: any = 42;
    const dataGetter = jest.fn((_a: any) => {
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
    const dataGetter = jest.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    const result = dp.select("a");

    expect(result.provider).toBeTruthy();
    expect(result.getData("1")).toStrictEqual({ a: "42", b: "13", c: "24" });
    expect(result.getData("2")).toStrictEqual({ a: "1", b: "2", c: "3" });
    expect(result.getData("3")).toStrictEqual({ a: "4", b: "5", c: "6" });
  });
});

describe("DataProvider filter and where", () => {
  test("Filter data", () => {
    const data: Record<string, LetsRole.TableRow> = {
      "1": { id: "1", a: "42", b: "13", c: "24" },
      "2": { id: "2", a: "1", b: "2", c: "3" },
      "3": { id: "3", a: "4", b: "5", c: "6" },
    };
    const dataGetter = jest.fn((_a: any) => {
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
      "2": { id: "2", a: "1", b: "2", c: "3" },
      "3": { id: "3", a: "4", b: "5", c: "6" },
    };
    const dataGetter = jest.fn((_a: any) => {
      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);
    let result = dp.select("a").where("1");

    expect(result.provider).toBeTruthy();
    expect(result.providedValue()).toStrictEqual({
      2: "1",
    });

    result = dp.where((v: any) => {
      return v.b === "2";
    });

    expect(result.providedValue()).toStrictEqual({
      "2": { id: "2", a: "1", b: "2", c: "3" },
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
    const dataGetter = jest.fn((_a: any) => {
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
    const dataGetter = jest.fn((_a: any) => {
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
    const dataGetter = jest.fn((_a: any) => {
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
    const dataGetter = jest.fn((_a: any) => {
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
    const fn = jest.fn(() => {
      return {
        one: txt1.value(),
        two: txt2.value(),
      };
    });
    const derived = jest.fn(() => {
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

    jest.spyOn(txt1, "value");

    rawSheet.componentChangedManually("txt1", "Hello");

    expect(fn).toHaveBeenCalledTimes(2);
    expect(derived).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();

    expect(dp.providedValue()).toStrictEqual({
      one: "Hello",
      two: "WorldTwo",
    });

    expect(txt1.value).toHaveBeenCalledTimes(0);
    expect(fn).toHaveBeenCalledTimes(0);
    expect(derived).toHaveBeenCalledTimes(0);
  });
});

describe("Dataprovider search", () => {
  test("Search", () => {
    const data = { a: "42", b: "13", c: "24" };
    const dataGetter = jest.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    // @ts-expect-error not yet implemented
    const search = dp.search("a", "42");

    expect(search.provider).toBeTruthy();
  });
});

describe("Dataprovider toArray", () => {
  test("toArray", () => {
    const data = { a: "42", b: "13", c: "24" };
    const dataGetter = jest.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }

      return data as any;
    });
    const dp = lre.dataProvider("test", dataGetter);

    // @ts-expect-error not yet implemented
    expect(dp.toArray()).toStrictEqual([data]);
  });
});

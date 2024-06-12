import { DirectDataProvider } from "../../src/dataprovider";
import { LRE } from "../../src/lre";
import { initLetsRole } from "../mock/letsrole/letsrole.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

beforeEach(() => {
  initLetsRole();
  global.lre = new LRE(modeHandlerMock);
});

describe("Data provider basics", () => {
  test("Get value", () => {
    const data = "42";
    const dataGetter = jest.fn((_a: any) => data as any);
    const dp = new DirectDataProvider(dataGetter);
    expect(dp.providedValue()).toBe(data);
    expect(dataGetter).toHaveBeenCalled();
  });
});

describe("Data provider sort", () => {
  test("Sort single value", () => {
    const data = "42";
    const dataGetter = jest.fn((_a: any) => data as any);
    const dp = new DirectDataProvider(dataGetter);
    const sorted = dp.sort();
    expect(sorted.provider).toBeTruthy();
    expect(sorted.providedValue()).toBe(data);
  });

  test("Sort array", () => {
    const data = ["42", "4", "24", "24"];
    const dataGetter = jest.fn((_a: any) => data as any);
    const dp = new DirectDataProvider(dataGetter);
    const sorted = dp.sort();
    expect(sorted.provider).toBeTruthy();
    expect(sorted.providedValue()).toStrictEqual(["24", "24", "4", "42"]);
  });

  test("Sort array of object", () => {
    const data = [{ a: "42" }, { a: "4" }, { a: "24" }, { a: "24" }];
    const dataGetter = jest.fn((_a: any) => data as any);
    const dp = new DirectDataProvider(dataGetter);
    const sorted = dp.sort("a");
    expect(sorted.provider).toBeTruthy();
    expect(sorted.providedValue()).toStrictEqual([
      { a: "24" },
      { a: "24" },
      { a: "4" },
      { a: "42" },
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
    const dp = new DirectDataProvider(dataGetter);
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

  test("Sort object of object", () => {
    const data = { a: "42", b: "13", c: "24" };
    const dataGetter = jest.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }
      return data as any;
    });
    const dp = new DirectDataProvider(dataGetter);
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
});

describe("DataProvider each", () => {
  test("empty each", () => {
    const dataGetter = jest.fn((_a: any) => {
      return undefined;
    });
    const dp = new DirectDataProvider(dataGetter);

    const fn = jest.fn();

    dp.each(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  test("each single value", () => {
    const data = "42";
    const dataGetter = jest.fn((_a: any) => {
      return data as any;
    });
    const dp = new DirectDataProvider(dataGetter);

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
    const dp = new DirectDataProvider(dataGetter);

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
    const dp = new DirectDataProvider(dataGetter);

    const fn = jest.fn();

    dp.each(fn);
    expect(fn).toHaveBeenCalledTimes(Object.keys(data).length);
    expect(fn.mock.calls[0][0]).toStrictEqual("42");
    expect(fn.mock.calls[1][0]).toStrictEqual("13");
    expect(fn.mock.calls[2][0]).toStrictEqual("24");
  });
});

describe("DataProvider select a column", () => {
  test("Select", () => {
    let data: any = {
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
    const dp = new DirectDataProvider(dataGetter);

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
    const dp = new DirectDataProvider(dataGetter);

    expect(dp.getData("1")).toBe(data);

    data = [42, "13", 24];
    expect(dp.getData(1)).toStrictEqual("13");
    expect(dp.getData("2")).toStrictEqual(24);
    expect(dp.getData([0, "2"])).toStrictEqual({ 0: 42, 2: 24 });

    data = { a: "42", b: "13", c: "24" };
    expect(dp.getData("a")).toStrictEqual("42");
    expect(dp.getData("b")).toStrictEqual("13");
    expect(dp.getData(["a", "b"])).toStrictEqual({ a: "42", b: "13" });
  });

  test("getData through select", () => {
    let data: any = {
      "1": { a: "42", b: "13", c: "24" },
      "2": { a: "1", b: "2", c: "3" },
      "3": { a: "4", b: "5", c: "6" },
    };
    const dataGetter = jest.fn((_a: any) => {
      return data as any;
    });
    const dp = new DirectDataProvider(dataGetter);

    const result = dp.select("a");
    expect(result.provider).toBeTruthy();
    expect(result.getData("1")).toStrictEqual({ a: "42", b: "13", c: "24" });
    expect(result.getData("2")).toStrictEqual({ a: "1", b: "2", c: "3" });
    expect(result.getData("3")).toStrictEqual({ a: "4", b: "5", c: "6" });
  });
});

describe("DataProvider filter and where", () => {
  test("Filter data", () => {
    let data: Record<string, LetsRole.TableRow> = {
      "1": { a: "42", b: "13", c: "24" },
      "2": { a: "1", b: "2", c: "3" },
      "3": { a: "4", b: "5", c: "6" },
    };
    const dataGetter = jest.fn((_a: any) => {
      return data as any;
    });
    const dp = new DirectDataProvider(dataGetter);
    const filtered = dp.filter((v: any, _k) => {
      return 1 * v?.b < 10;
    });
    expect(filtered.provider).toBeTruthy();
    expect(filtered.providedValue()).toStrictEqual({
      "2": { a: "1", b: "2", c: "3" },
      "3": { a: "4", b: "5", c: "6" },
    });
  });

  test("Where", () => {
    let data: Record<string, LetsRole.TableRow> = {
      "1": { a: "42", b: "13", c: "24" },
      "2": { a: "1", b: "2", c: "3" },
      "3": { a: "4", b: "5", c: "6" },
    };
    const dataGetter = jest.fn((_a: any) => {
      return data as any;
    });
    const dp = new DirectDataProvider(dataGetter);
    let result = dp.select("a").where("1");
    expect(result.provider).toBeTruthy();
    expect(result.providedValue()).toStrictEqual({
      2: "1",
    });
    result = dp.where((v: any) => {
      return v.b === "2";
    });
    expect(result.providedValue()).toStrictEqual({
      "2": { a: "1", b: "2", c: "3" },
    });
  });
});

describe("DataProvider get single value", () => {
  test("Single value", () => {
    let data: any = {
      "1": { a: "42", b: "13", c: "24" },
      "2": { a: "1", b: "2", c: "3" },
      "3": { a: "4", b: "5", c: "6" },
    };
    const dataGetter = jest.fn((_a: any) => {
      return data as any;
    });
    const dp = new DirectDataProvider(dataGetter);
    const result = dp.select("a").where((_v, _k, data: any) => {
      return data.b === "2";
    });
    expect(result.provider).toBeTruthy();
    expect(result.getData()).toStrictEqual({ a: "1", b: "2", c: "3" });
    expect(result.singleValue()).toBe("1");
    expect(result.singleId()).toBe("2");
    data["2"]["a"] = "42";
    expect(result.singleValue()).toBe("42");
  });
});

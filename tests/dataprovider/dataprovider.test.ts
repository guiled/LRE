import { DataProvider } from "../../src/dataprovider";

describe("Data provider basics", () => {
  test("Get value", () => {
    const data = "42";
    const dataGetter = jest.fn((_a: any) => data as any);
    const dp = new (class extends DataProvider() {})(dataGetter);
    expect(dp.value()).toBe(data);
    expect(dataGetter).toBeCalled();
  });
});

describe("Data provider sort", () => {
  test("Sort single value", () => {
    const data = "42";
    const dataGetter = jest.fn((_a: any) => data as any);
    const C = DataProvider();
    const dp = new (class extends C {})(dataGetter);
    const sorted = dp.sort();
    expect(sorted.provider).toBeTruthy();
    expect(sorted.value()).toBe(data);
  });

  test("Sort array", () => {
    const data = ["42", "4", "24", "24"];
    const dataGetter = jest.fn((_a: any) => data as any);
    const C = DataProvider();
    const dp = new (class extends C {})(dataGetter);
    const sorted = dp.sort();
    expect(sorted.provider).toBeTruthy();
    expect(sorted.value()).toStrictEqual(["24", "24", "4", "42"]);
  });

  test("Sort object", () => {
    const data = { a: "42", b: "13", c: "24" };
    const dataGetter = jest.fn((_a: any) => {
      if (_a) {
        Object.assign(data, _a);
      }
      return data as any;
    });
    const C = DataProvider();
    const dp = new (class extends C {})(dataGetter);
    const sorted = dp.sort();
    expect(sorted.provider).toBeTruthy();
    sorted.value({
      a: "43",
    });
    expect(data.a).toBe("43");
    expect(sorted.value()).toStrictEqual({
      b: "13",
      c: "24",
      a: "43",
    });
  });
});

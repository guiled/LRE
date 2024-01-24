import { DataProvider } from "../../src/dataprovider";


describe("Data provider basics", () => {
  test("Get value", () => {
    const data = '42';
    const dataGetter = jest.fn(() => data)
    const dp = new DataProvider(dataGetter);
    expect(dp.value()).toBe(data);
    expect(dataGetter).toBeCalled();
  })
});

describe("Data provider sort", () => {
  test("Sort single value", () => {
    const data = '42';
    const dataGetter = jest.fn(() => data)
    const dp = new DataProvider(dataGetter);
    const sorted = dp.sort();
    expect(sorted).toBeInstanceOf(DataProvider);
    expect(sorted.value()).toBe(data);
  });

  test("Sort array", () => {
    const data = ['42', '4', '24', '24'];
    const dataGetter = jest.fn(() => data)
    const dp = new DataProvider(dataGetter);
    const sorted = dp.sort();
    expect(sorted).toBeInstanceOf(DataProvider);
    expect(sorted.value()).toStrictEqual(['24', '24', '4', '42']);
  });
  test("Sort object", () => {
    const data = {a: '42', b: '13', c: '24'};
    const dataGetter = jest.fn(() => data)
    const dp = new DataProvider(dataGetter);
    const sorted = dp.sort();
    expect(sorted).toBeInstanceOf(DataProvider);
    expect(sorted.value()).toStrictEqual({
      b: '13',
      c: '24',
      a: '42',
    });
  });
})
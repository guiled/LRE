import { MockSheet, MockedSheet } from "../mock/letsrole/sheet.mock";
import { DataBatcher } from "../../src/sheet/databatcher";
import { handleError } from "../../src/log/errorhandler";
import { LRE } from "../../src/lre";

jest.mock("../../src/log/errorhandler");
let waitedCallback: ((...args: any[]) => any) | null;
global.lre = new LRE();
global.wait = jest.fn((delay, cb) => (waitedCallback = cb));

const itHasWaitedEnough = () => {
  const toCall = waitedCallback;
  waitedCallback = null;
  toCall?.();
};

describe("DataBatcher instantiation", () => {
  let dataBatcher: DataBatcher;
  let sheet: MockedSheet;

  beforeEach(() => {
    sheet = MockSheet({ id: "123" });
    dataBatcher = new DataBatcher(sheet);
  });

  it("has raw method", () => {
    expect(dataBatcher.raw()).toStrictEqual(dataBatcher);
  });
});

describe("DataBatcher async send data", () => {
  let dataBatcher: DataBatcher;
  let sheet: MockedSheet;

  beforeEach(() => {
    sheet = MockSheet({ id: "123" });
    dataBatcher = new DataBatcher(sheet);
  });

  it("delayed data send and getPendingData", () => {
    const data = {
      fortyTwo: 42,
      fortyThree: 43,
    };
    dataBatcher.setData(data);
    expect(sheet.setData).not.toBeCalled();
    expect(dataBatcher.getPendingData("fortyTwo")).toStrictEqual(42);
    expect(dataBatcher.getPendingData("fortyTour")).toBeUndefined();
    expect(dataBatcher.getPendingData()).toEqual(data);
    itHasWaitedEnough();
    expect(sheet.setData).toBeCalled();
    expect((sheet.setData as jest.Mock).mock.calls[0][0]).toEqual(data);
  });

  it("setData triggers event", () => {
    const data = {
      fortyTwo: 42,
      fortyThree: 43,
    };
    const processedCallback = jest.fn();
    dataBatcher.on("processed", processedCallback);
    dataBatcher.setData(data);
    expect(processedCallback).not.toBeCalled();
    itHasWaitedEnough();
    expect(processedCallback).toBeCalledTimes(1);
  });

  it("batch multiple setData in one send", () => {
    dataBatcher.setData({
      fortyTwo: 42,
    });
    expect(sheet.setData).not.toBeCalled();
    dataBatcher.setData({
      fortyThree: 43,
    });
    expect(sheet.setData).not.toBeCalled();
    itHasWaitedEnough();
    expect(sheet.setData).toBeCalled();
    expect((sheet.setData as jest.Mock).mock.calls[0][0]).toEqual({
      fortyTwo: 42,
      fortyThree: 43,
    });
  });

  it("multiple send when too much values", () => {
    const max = 20;
    const data1: LetsRole.ViewData = {};
    for (let i = 0; i < max; i++) {
      data1["d" + i] = i;
    }
    const data2: LetsRole.ViewData = {};
    for (let i = max; i < max + max / 2; i++) {
      data2["d" + i] = i;
    }
    const data = { ...data1, ...data2 };
    dataBatcher.setData(data);
    expect(sheet.setData).toBeCalledTimes(0);
    itHasWaitedEnough();
    expect(sheet.setData).toBeCalledTimes(1);
    itHasWaitedEnough();
    expect(sheet.setData).toBeCalledTimes(2);
    expect(
      Object.keys((sheet.setData as jest.Mock).mock.calls[0][0])
    ).toHaveLength(max);
    expect(
      Object.keys((sheet.setData as jest.Mock).mock.calls[1][0])
    ).toHaveLength(max / 2);
  });

  it("delayed data send", () => {
    const data = {
      fortyTwo: 42,
      fortyThree: 43,
    };
    dataBatcher.setData(data);
    expect(sheet.setData).not.toBeCalled();
    dataBatcher.sendPendingDataFor("fortyFour");
    expect(sheet.setData).toBeCalledTimes(0);
    dataBatcher.sendPendingDataFor("fortyTwo");
    expect(sheet.setData).toBeCalledTimes(1);
    itHasWaitedEnough();
    expect(sheet.setData).toBeCalledTimes(1);
    expect((sheet.setData as jest.Mock).mock.calls[0][0]).toEqual(data);
  });

  it("delayed data send with last value", () => {
    const data = {
      fortyTwo: 42,
      fortyThree: 43,
    };
    dataBatcher.setData(data);
    expect(sheet.setData).not.toBeCalled();
    expect(sheet.setData).toBeCalledTimes(0);
    dataBatcher.setData({
      fortyTwo: 44,
    });
    itHasWaitedEnough();
    expect(sheet.setData).toBeCalledTimes(1);
    expect((sheet.setData as jest.Mock).mock.calls[0][0]).toEqual({
      fortyTwo: 44,
      fortyThree: 43,
    });
  });

  test("Databatcher raise and log an error when data processed failed", () => {
    dataBatcher.on("processed", () => {
      /* @ts-ignore */
      no();
    });
    dataBatcher.setData({
      a: "any",
    });
    itHasWaitedEnough();
    expect(handleError).toBeCalled();
  });
});

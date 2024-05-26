import { MockSheet, MockedSheet } from "../mock/letsrole/sheet.mock";
import { DataBatcher } from "../../src/sheet/databatcher";
import { LRE } from "../../src/lre";
import { SheetProxy } from "../../src/proxy/sheet";
import { modeHandlerMock } from "../mock/modeHandler.mock";
import { initLetsRole, itHasWaitedEnough, itHasWaitedEverything } from "../mock/letsrole/letsrole.mock";

initLetsRole();
global.lre = new LRE(modeHandlerMock);
lre.wait = global.wait;

beforeEach(() => {
  modeHandlerMock.setMode("real");
});

describe("DataBatcher instantiation", () => {
  let dataBatcher: DataBatcher;
  let sheet: MockedSheet;

  beforeEach(() => {
    sheet = MockSheet({ id: "123" });
    dataBatcher = new DataBatcher(modeHandlerMock, sheet);
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
    dataBatcher = new DataBatcher(modeHandlerMock, sheet);
  });

  it("delayed data send and getPendingData", () => {
    const data = {
      fortyTwo: 42,
      fortyThree: 43,
    };
    dataBatcher.setData(data);
    expect(sheet.setData).not.toHaveBeenCalled();
    expect(dataBatcher.getPendingData("fortyTwo")).toStrictEqual(42);
    expect(dataBatcher.getPendingData("fortyTour")).toBeUndefined();
    expect(dataBatcher.getPendingData()).toEqual(data);
    itHasWaitedEverything();
    expect(sheet.setData).toHaveBeenCalled();
    expect((sheet.setData as jest.Mock).mock.calls[0][0]).toEqual(data);
  });

  it("setData triggers event", () => {
    const data = {
      fortyTwo: 42,
      fortyThree: 43,
    };
    const pendingCallback = jest.fn();
    const processedCallback = jest.fn();
    dataBatcher.on("pending", pendingCallback);
    dataBatcher.on("processed", processedCallback);
    expect(pendingCallback).not.toHaveBeenCalled();
    dataBatcher.setData(data);
    expect(pendingCallback).toHaveBeenCalledTimes(1);
    expect(processedCallback).not.toHaveBeenCalled();
    itHasWaitedEverything();
    expect(processedCallback).toHaveBeenCalledTimes(1);
  });

  it("batch multiple setData in one send", () => {
    dataBatcher.setData({
      fortyTwo: 42,
    });
    expect(sheet.setData).not.toHaveBeenCalled();
    dataBatcher.setData({
      fortyThree: 43,
    });
    expect(sheet.setData).not.toHaveBeenCalled();
    itHasWaitedEverything();
    expect(sheet.setData).toHaveBeenCalled();
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
    expect(sheet.setData).toHaveBeenCalledTimes(0);
    itHasWaitedEnough();
    expect(sheet.setData).toHaveBeenCalledTimes(1);
    itHasWaitedEnough();
    expect(sheet.setData).toHaveBeenCalledTimes(2);
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
    expect(sheet.setData).not.toHaveBeenCalled();
    dataBatcher.sendPendingDataFor("fortyFour");
    expect(sheet.setData).toHaveBeenCalledTimes(0);
    dataBatcher.sendPendingDataFor("fortyTwo");
    expect(sheet.setData).toHaveBeenCalledTimes(1);
    itHasWaitedEverything();
    expect(sheet.setData).toHaveBeenCalledTimes(1);
    expect((sheet.setData as jest.Mock).mock.calls[0][0]).toEqual(data);
  });

  it("delayed data send with last value", () => {
    const data = {
      fortyTwo: 42,
      fortyThree: 43,
    };
    dataBatcher.setData(data);
    expect(sheet.setData).not.toHaveBeenCalled();
    expect(sheet.setData).toHaveBeenCalledTimes(0);
    dataBatcher.setData({
      fortyTwo: 44,
    });
    itHasWaitedEverything();
    expect(sheet.setData).toHaveBeenCalledTimes(1);
    expect((sheet.setData as jest.Mock).mock.calls[0][0]).toEqual({
      fortyTwo: 44,
      fortyThree: 43,
    });
  });

  test("Databatcher raise and log an error when data pending failed", () => {
    jest.spyOn(lre, "error");
    dataBatcher.on("pending", () => {
      /* @ts-expect-error */
      no();
    });
    dataBatcher.setData({
      a: "any",
    });
    expect(lre.error).toHaveBeenCalled();
  });

  test("Databatcher raise and log an error when data processed failed", () => {
    jest.spyOn(lre, "error");
    dataBatcher.on("processed", () => {
      /* @ts-expect-error */
      no();
    });
    dataBatcher.setData({
      a: "any",
    });
    expect(lre.error).not.toHaveBeenCalled();
    itHasWaitedEverything();
    expect(lre.error).toHaveBeenCalled();
  });
});

describe("Handle virtual and real modes", () => {
  let dataBatcher: DataBatcher;
  let sheet: LetsRole.Sheet;
  let sheetProxy: LetsRole.Sheet;

  beforeEach(() => {
    sheet = MockSheet({ id: "123" });
    sheetProxy = new SheetProxy(modeHandlerMock, sheet);
    jest.spyOn(sheetProxy, "setData");
    dataBatcher = new DataBatcher(modeHandlerMock, sheetProxy);
    (sheet.setData as jest.Mock).mockClear();
  });

  test("Virtual mode", () => {
    modeHandlerMock.setMode("virtual");
    const pendingCallback = jest.fn();
    const processedCallback = jest.fn();
    dataBatcher.on("pending", pendingCallback);
    dataBatcher.on("processed", processedCallback);
    const data = {
      cmp1: 42,
      cmp2: 43,
    };
    dataBatcher.setData(data);
    expect(pendingCallback).toHaveBeenCalled();
    expect(processedCallback).toHaveBeenCalled();
    expect(sheetProxy.setData).toHaveBeenCalled();
    expect(sheet.setData).not.toHaveBeenCalled();
    expect(dataBatcher.getPendingData()).toMatchObject({});
    expect(dataBatcher.getPendingData("cmp1")).toBeUndefined();
  });
});

describe("Data sent for repeaters", () => {
  let dataBatcher: DataBatcher;
  let sheet: LetsRole.Sheet;

  beforeEach(() => {
    sheet = MockSheet({
      id: "123"
    });
    dataBatcher = new DataBatcher(modeHandlerMock, sheet);
    (sheet.setData as jest.Mock).mockClear();
  });

  test("Component value in repeater are sent as repeater data", () => {
    dataBatcher.setData({ 'rep.a.test': 42 });
    itHasWaitedEverything();
    expect(sheet.getData().rep).toEqual({ a: { test: 42 } });
    dataBatcher.setData({ 'rep.a.input': "Input" });
    itHasWaitedEverything();
    expect(sheet.getData().rep).toEqual({ a: { test: 42, input: "Input" } });
    dataBatcher.setData({ 'rep.b.input': "InputB" });
    itHasWaitedEverything();
    expect(sheet.getData().rep).toEqual({
      a: { test: 42, input: "Input" },
      b: { input: "InputB" }
    });
    dataBatcher.setData({ 'rep.c': { input: "InputC" } });
    itHasWaitedEverything();
    expect(sheet.getData().rep).toEqual({
      a: { test: 42, input: "Input" },
      b: { input: "InputB" },
      c: { input: "InputC" }
    });
  });

  test("Optimize data send for repeaters", () => {
    dataBatcher.setData({ 'rep.a.test': 42 });
    itHasWaitedEverything();
    dataBatcher.setData({ 'rep.a.input': 43 });
    const data: Record<string, LetsRole.ComponentValue> = {};
    for (let i = 0; i < 30; i++) {
      data['d' + i] = i;
    }
    data['rep.b.input'] = 44;
    for (let i = 0; i < 30; i++) {
      data['d' + (50 + i)] = i;
    }
    data['rep.b.input2'] = 46;
    data['rep.b'] = {
      input2: 48,
      input3: 49,
    };
    dataBatcher.setData(data);
    itHasWaitedEnough();
    expect(sheet.getData().rep).toEqual({
      a: { test: 42, input: 43 },
      b: { input: 44, input2: 48, input3: 49 }
    });
  });
});
import { DataBatcher } from "../../src/sheet/databatcher";
import { LRE } from "../../src/lre";
import { SheetProxy } from "../../src/proxy/sheet";
import {
  initLetsRole,
  itHasWaitedEnough,
  itHasWaitedEverything,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { ViewMock } from "../../src/mock/letsrole/view.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

let server: ServerMock;
const context = modeHandlerMock();

beforeEach(() => {
  context.setMode("real");
  server = new ServerMock({
    views: [
      {
        id: "main",
        children: [],
        className: "View",
      },
    ],
  });
  initLetsRole(server);
  global.lre = new LRE(context);
  lre.wait = global.wait;
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

describe("DataBatcher instantiation", () => {
  let dataBatcher: DataBatcher;
  let sheet: ViewMock;

  beforeEach(() => {
    sheet = server.openView("main", "123");
    dataBatcher = new DataBatcher(context, sheet);
  });

  it("has raw method", () => {
    expect(dataBatcher.raw()).toStrictEqual(dataBatcher);
  });
});

describe("DataBatcher async send data", () => {
  let dataBatcher: DataBatcher;
  let sheet: ViewMock;

  beforeEach(() => {
    sheet = server.openView("main", "123");
    jest.spyOn(sheet, "setData");
    dataBatcher = new DataBatcher(context, sheet);
  });

  it("delayed data send and getPendingData", () => {
    jest.spyOn(sheet, "setData");
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
      Object.keys((sheet.setData as jest.Mock).mock.calls[0][0]),
    ).toHaveLength(max);
    expect(
      Object.keys((sheet.setData as jest.Mock).mock.calls[1][0]),
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
      /* @ts-expect-error this error is desired */
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
      /* @ts-expect-error this error is desired */
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
    sheet = server.openView("main", "123");
    sheetProxy = new SheetProxy(context, sheet);
    jest.spyOn(sheetProxy, "setData");
    dataBatcher = new DataBatcher(context, sheetProxy);
    jest.spyOn(sheet, "setData");
  });

  test("Virtual mode", () => {
    context.setMode("virtual");
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

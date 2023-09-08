import { Logger } from "../log";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { Sheet } from "./index";

global.lre = new Logger();
let waitedCallback: ((...args: any[]) => any) | null;
global.wait = jest.fn((delay, cb) => (waitedCallback = cb));

const itHasWaitedEnough = () => {
  const toCall = waitedCallback;
  waitedCallback = null;
  toCall?.();
};

describe("Sheet basics", () => {
  const sheetId = "testedSheet";
  let raw: LetsRole.Sheet, sheet: Sheet;
  beforeEach(() => {
    raw = MockSheet({
      id: sheetId,
      realId: "4242",
    });
    sheet = new Sheet(raw);
  });
  test("Create from raw", () => {
    expect(sheet.lreType()).toEqual("sheet");

    expect(sheet.raw()).toStrictEqual(raw);

    expect(sheet.id()).toEqual(sheetId);

    expect(sheet.sheet()).toStrictEqual(sheet);
  });

  test("pure constructor", () => {
    expect(raw.getData).not.toBeCalled();
    expect(raw.getVariable).not.toBeCalled();
  });

  test("has initialization information", () => {
    expect(sheet.isInitialized()).toBeFalsy();

    expect(raw.getData).toBeCalled();
  });

  test("getVariable calls raw method", () => {
    sheet.getVariable("foo");
    expect(raw.getVariable).toBeCalledTimes(1);
  });

  test("getSheetId calls raw method", () => {
    (raw.getSheetId as jest.Mock).mockClear();
    const res = sheet.getSheetId();
    expect(res).toEqual("4242");
    expect(raw.getSheetId).toBeCalledTimes(1);
  });

  test("name and properName call raw methods", () => {
    (raw.name as jest.Mock).mockClear();
    (raw.properName as jest.Mock).mockClear();
    sheet.name();
    sheet.properName();
    expect(raw.name).toBeCalledTimes(1);
    expect(raw.properName).toBeCalledTimes(1);
  });

  test("prompt calls raw method", () => {
    sheet.prompt(
      "title",
      "viewId",
      () => {},
      () => {}
    );
    expect(raw.prompt).toBeCalledTimes(1);
  });

  test("id() and readId() calls", () => {
    (raw.id as jest.Mock).mockClear();
    expect(sheet.id()).toEqual(sheetId);
    expect(sheet.realId()).toEqual(sheetId);
    expect(raw.id).toBeCalledTimes(2);
  });
});

describe("Sheet data handling", () => {
  const sheetId = "testedSheet";
  let raw: LetsRole.Sheet, sheet: Sheet;
  beforeEach(() => {
    raw = MockSheet({
      id: sheetId,
      realId: "4242",
    });
    sheet = new Sheet(raw);
  });

  test("setData and getData are batched", () => {
    const processedCb = jest.fn((...args: any[]) => {});
    sheet.on("data:processed", processedCb);
    const data: LetsRole.ViewData = {
      a: 1,
      b: 2,
      c: 3,
    };
    raw.getData = jest.fn(() => {
      return data;
    });
    raw.setData = jest.fn((d: LetsRole.ViewData) => {
      for (let i in d) {
        data[i] = d[i];
      }
    });
    sheet.setData({
      a: 11,
      d: 4,
    });
    expect(raw.setData).not.toBeCalled();
    expect(processedCb).not.toBeCalled();
    expect(sheet.getData()).toMatchObject({
      a: 11,
      b: 2,
      c: 3,
      d: 4,
    });
    expect(raw.getData).toBeCalled();
    itHasWaitedEnough();
    expect(raw.setData).toBeCalled();
    expect(processedCb).toBeCalled();
  });
});

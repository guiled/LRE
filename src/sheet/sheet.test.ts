import { Logger } from "../log";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { Sheet } from "./sheet";

global.lre = new Logger();

jest.mock('../eventholder');

describe("Sheet basics", () => {
  const sheetId = "testedSheet";
  let raw: LetsRole.Sheet, sheet: Sheet;
  beforeEach(() => {
    raw = MockSheet({
      id: sheetId,
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

  test("ComponentContainer dummy methods", () => {
    expect(sheet.repeater()).toBeUndefined();
    expect(sheet.entry()).toBeUndefined();
  });
});

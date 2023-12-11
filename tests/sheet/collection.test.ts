import { LRE } from "../../src/lre";
import { Sheet } from "../../src/sheet";
import { SheetCollection } from "../../src/sheet/collection";
import { DataBatcher } from "../../src/sheet/databatcher";
import { MockServer } from "../mock/letsrole/server.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";

jest.mock("../../src/lre");

global.lre = new LRE();

describe("Sheet collection", () => {
  let sheet1: Sheet, sheet2: Sheet;
  let server: MockServer;
  let subject: SheetCollection;

  const initSheet = function (sheetId: string, realId: string) {
    const raw = MockSheet({
      id: sheetId,
      realId: realId,
    });
    server.registerMockedSheet(raw);
    return new Sheet(raw, new DataBatcher(
      {
        getMode: () => "real",
        setMode: () => {},
      },
      raw
    ));
  };

  beforeEach(() => {
    server = new MockServer();
    sheet1 = initSheet("ahah", "4242");
    sheet2 = initSheet("ahah", "4243");
    subject = new SheetCollection();
  });

  test("Add, get, lists", () => {
    expect(subject.get("4242")).toBeUndefined();
    subject.add(sheet1);
    expect(subject.get("4242")).toEqual(sheet1);
    subject.add(sheet2);
    expect(subject.get("4243")).toEqual(sheet2);
    const cb = jest.fn();
    expect(cb).toBeCalledTimes(0);
    subject.each(cb);
    expect(cb).toBeCalledTimes(2);
  });
});

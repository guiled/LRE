import { LRE } from "../../src/lre";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { Sheet } from "../../src/sheet";
import { SheetCollection } from "../../src/sheet/collection";
import { DataBatcher } from "../../src/sheet/databatcher";
import { modeHandlerMock } from "../mock/modeHandler.mock";

jest.mock("../../src/lre");

const context = modeHandlerMock();
global.lre = new LRE(context);

describe("Sheet collection", () => {
  let sheet1: Sheet, sheet2: Sheet;
  let server: ServerMock;
  let subject: SheetCollection;

  const initSheet = function (sheetId: string, realId: string): Sheet {
    const raw = server.openView(sheetId, realId);
    return new Sheet(raw, new DataBatcher(context, raw), context);
  };

  beforeEach(() => {
    server = new ServerMock({
      views: [
        {
          id: "main",
          children: [],
          className: "View",
        },
      ],
    });
    sheet1 = initSheet("main", "4242");
    sheet2 = initSheet("main", "4243");
    subject = new SheetCollection();
  });

  test("Add, get, lists", () => {
    expect(subject.get("4242")).toBeUndefined();

    subject.add(sheet1);

    expect(subject.get("4242")).toEqual(sheet1);

    subject.add(sheet2);

    expect(subject.get("4243")).toEqual(sheet2);

    const cb = jest.fn();

    expect(cb).toHaveBeenCalledTimes(0);

    subject.each(cb);

    expect(cb).toHaveBeenCalledTimes(2);
  });
});

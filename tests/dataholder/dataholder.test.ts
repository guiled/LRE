import { DataHolder } from "../../src/dataholder/index";
import { Sheet } from "../../src/sheet";
import { LRE } from "../../src/lre";
import { newMockedWait } from "../../src/mock/letsrole/wait.mock";
import { DataBatcher } from "../../src/sheet/databatcher";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

const { wait, itHasWaitedEverything } = newMockedWait();
global.wait = wait;
const context = modeHandlerMock();
global.lre = new LRE(context);

describe("Dataholder", () => {
  let sheet1: Sheet;
  let server: ServerMock;
  let subject: IDataHolder;
  let C: Newable;

  const initSheet = function (sheetId: string, realId: string): Sheet {
    const raw = server.openView(sheetId, realId, {});
    return new Sheet(raw, new DataBatcher(context, raw), context);
  };

  beforeEach(() => {
    server = new ServerMock({
      views: [
        {
          id: "main",
          className: "View",
          children: [
            {
              id: "a",
              className: "Repeater",
              viewId: "vw1",
              readViewId: "vw2",
            },
            {
              id: "b",
              className: "Label",
              text: "test",
            },
          ],
        },
        {
          id: "testedSheet",
          className: "View",
          children: [],
        },
      ],
    });
    sheet1 = initSheet("main", "4242");
    C = class extends DataHolder() {};
    subject = new C(sheet1, "a.b.c");
  });

  test("Volatile data", () => {
    expect(subject.hasData("d1")).toBeFalsy();
    expect(subject.data("d1")).toBeUndefined();
    const val = 42;
    expect(subject.data("d1", val)).toBe(subject);
    expect(subject.hasData("d1")).toBeTruthy();
    expect(subject.data("d1")).toBe(val);
    expect(subject.data("d1", val + 1)).toBe(subject);
    expect(subject.data("d1")).toBe(val + 1);
    expect(subject.deleteData("d1")).toBe(subject);
    expect(subject.hasData("d1")).toBeFalsy();
    expect(subject.hasData("d2")).toBeFalsy();
    expect(subject.deleteData("d2")).toBe(subject);
    expect(subject.hasData("d2")).toBeFalsy();
    expect(subject.data("d1", val + 1)).toBe(subject);
    expect(subject.hasData("d1")).toBeTruthy();

    const subject2 = new C(sheet1, "a.b.c");
    expect(subject2.hasData("d1")).toBeFalsy();
  });

  test("Persistent data", () => {
    expect(subject.hasData("d1")).toBeFalsy();
    const val = 42;
    expect(subject.data("d1", val, true)).toBe(subject);
    expect(subject.hasData("d1")).toBeTruthy();
    expect(subject.data("d1")).toBe(val);
    expect(subject.data("d1", val + 1, true)).toBe(subject);
    expect(subject.data("d1")).toBe(val + 1);
    expect(subject.deleteData("d1", true)).toBe(subject);
    expect(subject.hasData("d1")).toBeFalsy();
    expect(subject.hasData("d2")).toBeFalsy();
    expect(subject.deleteData("d2", true)).toBe(subject);
    expect(subject.hasData("d2")).toBeFalsy();
    expect(subject.data("d1", val + 1)).toBe(subject);
    expect(subject.hasData("d1")).toBeTruthy();

    const subject2 = new C(sheet1, "a.b.c");
    expect(subject2.hasData("d1")).toBeFalsy();
    itHasWaitedEverything();
    subject2.loadPersistent();
    expect(subject2.hasData("d1")).toBeFalsy();
    expect(subject.data("d1", val + 1, true)).toBe(subject);
    expect(subject.hasData("d1")).toBeTruthy();
    expect(subject2.hasData("d1")).toBeTruthy();
  });

  test.todo("Handle moving data from volatile to persistent");
});

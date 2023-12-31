import { DataHolder } from "../../src/dataholder/index";
import { Sheet } from "../../src/sheet";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { LRE } from "../../src/lre";
import { newMockedWait } from "../mock/letsrole/wait.mock";
import { MockServer } from "../mock/letsrole/server.mock";
import { DataBatcher } from "../../src/sheet/databatcher";
import { modeHandlerMock } from "../mock/modeHandler.mock";

const { wait, itHasWaitedEverything } = newMockedWait();
global.wait = wait;
global.lre = new LRE(modeHandlerMock);

describe("Dataholder", () => {
  let sheet1: Sheet;
  let server: MockServer;
  let subject: DataHolder;

  const initSheet = function (sheetId: string, realId: string) {
    const raw = MockSheet({
      id: sheetId,
      realId: realId,
    });
    server.registerMockedSheet(raw);
    return new Sheet(raw, new DataBatcher(modeHandlerMock, raw), modeHandlerMock);
  };

  beforeEach(() => {
    server = new MockServer();
    sheet1 = initSheet("main", "4242");
    subject = new DataHolder(sheet1, "a.b.c");
  });

  test("Volatile data", () => {
    expect(subject.hasData("d1")).toBeFalsy();
    expect(subject.data("d1")).toBeUndefined();
    let val = 42;
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

    const subject2 = new DataHolder(sheet1, "a.b.c");
    expect(subject2.hasData("d1")).toBeFalsy();
  });

  test("Persistent data", () => {
    expect(subject.hasData("d1")).toBeFalsy();
    let val = 42;
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

    const subject2 = new DataHolder(sheet1, "a.b.c");
    expect(subject2.hasData("d1")).toBeFalsy();
    itHasWaitedEverything();
    subject2.loadPersistent();
    expect(subject2.hasData("d1")).toBeFalsy();
    expect(subject.data("d1", val + 1, true)).toBe(subject);
    expect(subject.hasData("d1")).toBeTruthy();
    expect(subject2.hasData("d1")).toBeTruthy();
  });

  test("Handle moving data from volatile to persistent", () => {});
});

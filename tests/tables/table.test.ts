import { LRE } from "../../src/lre";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { Table } from "../../src/tables/table";
import { initLetsRole } from "../../src/mock/letsrole/letsrole.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

beforeEach(() => {
  initLetsRole(
    new ServerMock({
      tables: {
        theTable: [
          { id: "123", a: "42", b: "13", c: "24" },
          { id: "124", a: "1", b: "2", c: "3" },
          { id: "125", a: "4", b: "5", c: "6" },
        ],
        a: [
          { id: "1", a: "42", b: "13", c: "24" },
          { id: "2", a: "1", b: "2", c: "3" },
          { id: "3", a: "4", b: "5", c: "6" },
        ],
      },
    }),
  );
  global.lre = new LRE(modeHandlerMock);
});

describe("Table test", () => {
  test("Get, each, random", () => {
    const rawTable = Tables.get("theTable")!;
    jest.spyOn(rawTable, "get");
    jest.spyOn(rawTable, "each");
    jest.spyOn(rawTable, "random");
    const table = new Table(rawTable);
    table.get("123");
    expect(rawTable.get).toHaveBeenCalledTimes(1);
    table.each(() => {});
    expect(rawTable.each).toHaveBeenCalledTimes(1);
    table.random(() => {});
    expect(rawTable.random).toHaveBeenCalledTimes(1);
    table.random(3, () => {});
    expect(rawTable.random).toHaveBeenCalledTimes(2);
  });
});

describe("Table as DataProvider", () => {
  test("Table select a column", () => {
    const rawTable = Tables.get("a")!;
    const table = new Table(rawTable);
    const onlyA = table.select("a");
    expect(onlyA.providedValue()).toStrictEqual({
      "1": "42",
      "2": "1",
      "3": "4",
    });
  });
});

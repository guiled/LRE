import { LRE } from "../../src/lre";
import { Table } from "../../src/tables/table";
import { initLetsRole } from "../mock/letsrole/letsrole.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

beforeEach(() => {
  initLetsRole();
  global.lre = new LRE(modeHandlerMock);
});

const mockRawTable = (
  _name: string,
  data?: Record<string, LetsRole.TableRow>
): LetsRole.Table => {
  return {
    get: jest.fn((id: string): LetsRole.TableRow => {
      return data?.[id] || {};
    }),
    each: jest.fn((f: (val: LetsRole.TableRow, k: string) => void) => {
      for (let k in data) {
        f({ id: k, ...data[k] }, k);
      }
    }),
    random: jest.fn((): LetsRole.TableRow => {
      for (let k in data) {
        return data[k];
      }
      return {};
    }),
  };
};

describe("Table test", () => {
  test("Get, each, random", () => {
    const rawTable = mockRawTable("a");
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
    const rawTable = mockRawTable("a", {
      "1": { a: "42", b: "13", c: "24" },
      "2": { a: "1", b: "2", c: "3" },
      "3": { a: "4", b: "5", c: "6" },
    });
    const table = new Table(rawTable);
    const onlyA = table.select("a");
    expect(onlyA.providedValue()).toStrictEqual({
      "1": "42",
      "2": "1",
      "3": "4",
    });
  });
});

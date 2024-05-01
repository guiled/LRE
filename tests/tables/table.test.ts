import { Table } from "../../src/tables/table";

describe("Table test", () => {
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
          f(data[k], k);
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

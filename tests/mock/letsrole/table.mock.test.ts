import { ServerMock } from "../../../src/mock/letsrole/server.mock";
import { TableMock } from "../../../src/mock/letsrole/table.mock";

describe("Table", () => {
  let defs: LetsRoleMock.SystemDefinitions;
  let server: ServerMock;
  let table: TableMock;

  beforeEach(() => {
    defs = {
      tables: {
        table1: [
          { id: "1", a: "42", b: "13", c: "24" },
          { id: "2", a: "1", b: "2", c: "3" },
          { id: "3", a: "4", b: "5", c: "6" },
        ],
      },
    };
    server = new ServerMock(defs);
    table = server.getTable("table1")!;
  });

  test("instantiate from server", () => {
    expect(server.getTable("unknown")).toBeNull();
    expect(server.getTable("table1")).toBeInstanceOf(TableMock);
  });

  test("get a row from id", () => {
    expect(table.get("1")).toStrictEqual(defs.tables!.table1[0]);
    expect(table.get("123123123")).toBeNull();
  });

  test("each executes a callback", () => {
    const fn = jest.fn();
    table.each(fn);

    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn.mock.calls[0][0]).toStrictEqual(defs.tables!.table1[0]);
    expect(fn.mock.calls[1][0]).toStrictEqual(defs.tables!.table1[1]);
    expect(fn.mock.calls[2][0]).toStrictEqual(defs.tables!.table1[2]);
  });

  test("random executes a callback", () => {
    jest.spyOn(global.Math, "random").mockReturnValue(0);
    const fn = jest.fn();
    table.random(fn);

    expect(fn).toHaveBeenCalledTimes(1);

    expect(
      defs.tables!.table1.find((r) => r.id === fn.mock.calls[0][0].id),
    ).toBeTruthy();

    const fn2 = jest.fn();
    table.random(2, fn2);

    expect(fn2).toHaveBeenCalledTimes(2);
    expect(fn2.mock.calls[0][0]).toStrictEqual(defs.tables!.table1[0]);
    expect(fn2.mock.calls[1][0]).toStrictEqual(defs.tables!.table1[1]);

    jest.clearAllMocks();
    jest.spyOn(global.Math, "random").mockReturnValue(0.9999);
    table.random(2, fn2);

    expect(fn2).toHaveBeenCalledTimes(2);
    expect(fn2.mock.calls[0][0]).toStrictEqual(defs.tables!.table1[2]);
    expect(fn2.mock.calls[1][0]).toStrictEqual(defs.tables!.table1[1]);

    jest.spyOn(global.Math, "random").mockRestore();
  });
});

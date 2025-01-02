import { LRE } from "../../src/lre";
import {
  initLetsRole,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { LreTables, overloadTables } from "../../src/tables";

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
  global.lre = new LRE(context);
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

describe("Tables overload", () => {
  test("Overload", () => {
    const get: jest.Mock = jest.fn();
    global.Tables = {
      get,
    } as LetsRole.Tables;

    expect(get).toHaveBeenCalledTimes(0);

    overloadTables(global.Tables, context);
    Tables.get("123");

    expect(get).toHaveBeenCalledTimes(1);
  });

  test("Tables get table", () => {
    const tables = new LreTables(
      {
        get: (_id: LetsRole.TableID): LetsRole.Table => {
          return {
            get: jest.fn() as LetsRole.Table["get"],
            each: jest.fn() as LetsRole.Table["each"],
            random: jest.fn() as LetsRole.Table["random"],
          };
        },
      },
      context,
    );

    const table = tables.get("theTable");

    expect(table).not.toBeNull();
    expect(table!.id()).toBe("theTable");
  });
});

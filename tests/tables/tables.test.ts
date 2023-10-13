import { overloadTables } from "../../src/tables";

describe("Tables overload", () => {

    test("Overload", () => {
        const get: jest.Mock  = jest.fn(() => {
            
        });
        global.Tables = {
            get,
        } as LetsRole.Tables
        expect(get).toBeCalledTimes(0);
        overloadTables(global.Tables);
        Tables.get("123");
        expect(get).toBeCalledTimes(1);
    })
});

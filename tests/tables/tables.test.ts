import { overloadTables } from "../../src/tables";

describe("Tables overload", () => {

    test("Overload", () => {
        const get: jest.Mock  = jest.fn(() => {
            
        });
        global.Tables = {
            get,
        } as LetsRole.Tables
        expect(get).toHaveBeenCalledTimes(0);
        overloadTables(global.Tables);
        Tables.get("123");
        expect(get).toHaveBeenCalledTimes(1);
    })
});

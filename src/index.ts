import LRE from "./lre";
import overloadTables from "./tables";

// @ts-ignore Define isNaN because it is missing in Let's Role
isNaN = function (val: any):boolean {
    return Number.isNaN(Number(val));
};

// @ts-ignore Define structuredClone because it is missing in Let's Role
structuredClone = function (val): any {
    if (typeof val === 'object' || Array.isArray(val)) {
        let result: any = Array.isArray(val) ? [] : {};
        each(val, function (v, k) {
            result[k] = structuredClone(v);
        });
        return result;
    } else {
        return val;
    }
};

overloadTables(Tables);
lre = new LRE;
// @ts-ignore Overload console for some edge cases like throw new Error changed into console.error
console = {
    log: lre.log,
    error: lre.error,
    trace: lre.log,
    warn: lre.warn,
};

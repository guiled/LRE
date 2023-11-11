import { stringify } from "../../src/globals/stringify";

describe("stringify test", () => {
  test("stringify scalar or basics values", () => {
    expect(stringify(1)).toStrictEqual("1");
    expect(stringify("a")).toStrictEqual('"a"');
    expect(stringify(undefined)).toBeUndefined();
    expect(stringify(null)).toStrictEqual("null");
    expect(stringify("a\\b")).toStrictEqual('"a\\\\b"');
    expect(
      stringify(`a
b`)
    ).toStrictEqual('"a\\nb"');
    expect(stringify(8 / 10)).toStrictEqual("0.8");
    const d = new Date();
    expect(stringify(d)).toStrictEqual(`"${d.toISOString()}"`);
    expect(stringify(() => {})).toStrictEqual('"function(){}"');
  });

  test("arrays", () => {
    expect(stringify([], true)).toStrictEqual(`[
  
]`);
    expect(stringify([])).toStrictEqual(`[
  
]`);
    expect(stringify([], false)).toStrictEqual(`[]`);
    expect(stringify([1, 2, 3], false)).toStrictEqual(`[1,2,3]`);
    expect(stringify(["1", "2", "3"], false)).toStrictEqual(`["1","2","3"]`);
    expect(stringify([undefined], false)).toStrictEqual(`[null]`);
    const a: any[] = [1];
    a.push(a);
    expect(stringify(a, false)).toStrictEqual(`[1,"[recursive…]"]`);
  });

  test("objects", () => {
    expect(stringify({})).toStrictEqual(`{

}`);
    expect(stringify({}, false)).toStrictEqual(`{}`);
    expect(stringify({ a: 1, b: "2" }, false)).toStrictEqual(`{"a":1,"b":"2"}`);
    expect(stringify({ a: 1, b: "2" })).toStrictEqual(`{
  "a": 1,
  "b": "2"
}`);
    const obj: any = { a: 1, b: "2" };
    obj.c = obj;
    expect(stringify(obj, false)).toStrictEqual(
      `{"a":1,"b":"2","c":"{recursive…}"}`
    );
  });
});

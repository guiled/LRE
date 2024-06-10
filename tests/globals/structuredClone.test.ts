import { structuredClone as lreStructuredClone } from "../../src/globals/structuredClone";

global.each = jest.fn((obj: any, cb) => {
  for (let k in obj) {
    cb(obj[k], k);
  }
});
describe("structuredClone polyfill test", () => {
  test("structuredClone polyfill test", () => {
    [{}, [], [1, 2, 3], [1, 2, [3, 4, 5]]].forEach((v) => {
      const c = lreStructuredClone(v);
      expect(c).toMatchObject(v);
      expect(c).toEqual(v);
      expect(c === v).toBeFalsy();
    });
  });

  test("structuredClone is recursive", () => {
    const obj = {
      a: [1, 2],
      b: "b",
      c: {
        d: "cols",
        e: {
          e: 42,
        },
      },
    };
    const c = lreStructuredClone(obj);
    expect(c).toMatchObject(obj);
    expect(c).toEqual(obj);
    expect(c === obj).toBeFalsy();
    expect(c.a === obj.a).toBeFalsy();
    expect(c.c.e === obj.c.e).toBeFalsy();
  });
});

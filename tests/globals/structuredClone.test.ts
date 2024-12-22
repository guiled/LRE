import { structuredClone as lreStructuredClone } from "../../src/globals/structuredClone";

global.each = jest.fn(
  <T extends Array<unknown> | Record<string, unknown>>(
    obj: T,
    cb: LetsRole.EachCallback<T>,
  ) => {
    for (const k in obj) {
      /* @ts-expect-error For the mock the cb is badly typed */
      cb(obj[k], k);
    }
  },
);

describe("structuredClone polyfill test", () => {
  test("structuredClone polyfill test", () => {
    [{}, [], [1, 2, 3], [1, 2, [3, 4, 5]]].forEach((v) => {
      const c = lreStructuredClone(v);

      expect(c).toMatchObject(v);
      expect(c).toEqual(v);
      expect(c === v).toBeFalsy();
    });
  });

  test("structuredClone handles null and undefined", () => {
    expect(lreStructuredClone(null)).toBeNull();
    expect(lreStructuredClone(undefined)).toBeUndefined();
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

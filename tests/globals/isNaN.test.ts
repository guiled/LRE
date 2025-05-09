import { isNaN as LreIsNaN } from "../../src/globals/isNaN";

describe("isNaN polyfill implementation", () => {
  test("Complete tests", () => {
    [
      0,
      1,
      0x123,
      Number.MAX_SAFE_INTEGER,
      "123",
      "a",
      {},
      [],
      null,
      undefined,
      NaN,
      "",
    ].forEach((v: any) => {
      expect(LreIsNaN(v)).toStrictEqual(isNaN(v));
    });
  });
});

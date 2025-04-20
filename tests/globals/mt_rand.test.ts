import { mt_rand } from "../../src/globals/mt_rand";

describe("mt_rand", () => {
  test("mt_rand min value", () => {
    Math.random = jest.fn().mockReturnValue(0);

    expect(mt_rand(12, 23)).toBe(12);
  });

  test("mt_rand max value", () => {
    Math.random = jest.fn().mockReturnValue(1);

    expect(mt_rand(12, 23)).toBe(23);
  });

  test("mt_rand values", () => {
    Math.random = jest.fn().mockReturnValue(0.5);

    expect(mt_rand(12, 23)).toBe(18);
  });
});

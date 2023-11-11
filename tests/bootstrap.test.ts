import { bootstrap } from "../src/bootstrap";
import { LRE } from "../src/lre";

beforeAll(() => {
  /* @ts-ignore */
  global.lre = null; 
  global.lastException = null;
  global.isNaN = null as unknown as (c: any) => any;
  global.structuredClone = null as unknown as (c: any) => any;
  global.Tables = {
    get: jest.fn((_id: string) => ({
      each: jest.fn(),
      get: jest.fn(),
      random: jest.fn(),
    })),
  };
  global.each = jest.fn((o, f) => {
    for (let k in o) {
      f(o[k], k);
    }
  });
});

describe("LRE bootstrap", () => {
  test("Launch correctly", () => {
    expect(global.isNaN).toBeNull();
    expect(global.lre).not.toBeInstanceOf(LRE);
    expect(global.structuredClone).toBeNull();
    bootstrap();
    expect(global.lre).toBeInstanceOf(LRE);
    expect(global.isNaN).not.toBeNull();
    expect(global.structuredClone).not.toBeNull();
    expect(global.isNaN(123)).toBeFalsy();
    expect(global.isNaN(global as unknown as number)).toBeTruthy();
    const c = {
      a: 1,
      b: "2",
      c: {
        a: 1,
        b: "2",
      },
      d: ["a", 2],
    };
    const d = structuredClone(c);
    expect(d).not.toBe(c)
    expect(d).toEqual(c);
  });
});

import { bootstrap } from "../src/bootstrap";
import { LRE } from "../src/lre";

let saveConsole: any;
beforeAll(() => {
  saveConsole = console;
  global.lre = null;
  global.isNaN = null as unknown as (c: any) => any;
  global.structuredClone = null as unknown as (c: any) => any;
  global.Tables = {
    get: jest.fn((id: string) => ({
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
    saveConsole.log("🚀 ~ file: bootstrap.test.ts:44 ~ test ~ d", d)
    expect(d).not.toBe(c)
    expect(d).toEqual(c);
  });
});

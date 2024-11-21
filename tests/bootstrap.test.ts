import { bootstrap } from "../src/bootstrap";
import { LRE } from "../src/lre";
import { ServerMock } from "../src/mock/letsrole/server.mock";
import { initLetsRole } from "../src/mock/letsrole/letsrole.mock";

beforeEach(() => {
  initLetsRole(new ServerMock({}));
  global.lre = null as unknown as LRE;
  global.lastException = null;
  global.isNaN = null as unknown as (c: unknown) => boolean;
  global.structuredClone = null as unknown as typeof structuredClone;
  global.Tables = {
    get: jest.fn((_id: string) => ({
      each: jest.fn(),
      get: jest.fn(),
      random: jest.fn(),
    })),
  };
  // global.each = jest.fn((o, f) => {
  //   for (let k in o) {
  //     f(o[k], k);
  //   }
  // });
  // global.wait = jest.fn();
  // global.Bindings = {
  //   add: jest.fn(),
  //   clear: jest.fn(),
  //   remove: jest.fn(),
  //   send: jest.fn(),
  // };
  // global.RollBuilder = {

  // }
});

describe("LRE bootstrap", () => {
  test("Launch correctly", () => {
    expect(global.isNaN).toBeNull();
    expect(global.lre).not.toBeInstanceOf(LRE);
    expect(global.structuredClone).toBeNull();
    const oldWait = global.wait;
    //const realConsole = console;
    bootstrap();
    expect(global.lre).toBeInstanceOf(LRE);
    expect(global.isNaN).not.toBeNull();
    expect(global.structuredClone).not.toBeNull();
    expect(global.isNaN(123)).toBeFalsy();
    expect(global.isNaN(global as unknown as number)).toBeTruthy();

    expect(global.wait).toBe(oldWait);
    global.lre!.apply(global.lre, [() => {}]);
    expect(global.wait).not.toBe(oldWait);

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
    expect(d).not.toBe(c);
    expect(d).toEqual(c);
  });
});

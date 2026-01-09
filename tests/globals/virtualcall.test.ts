import { virtualCall } from "../../src/globals/virtualcall";
import { LRE } from "../../src/lre";
import { modeHandlerMock } from "../mock/modeHandler.mock";

global.context = modeHandlerMock();
vi.mock("../../src/lre");

describe("Virtual call", () => {
  const env: any = {};

  beforeEach(() => {
    global.init = env.init = vi.fn();
    global.initRoll = env.initRoll = vi.fn();
    global.getReferences = env.getReferences = vi.fn();
    global.getBarAttributes = env.getBarAttributes = vi.fn();
    global.getCriticalHits = env.getCriticalHits = vi.fn();
    global.dropDice = env.dropDice = vi.fn();
    global.drop = env.drop = vi.fn();
    global.Dice = env.Dice = {
      roll: vi.fn(),
      create: vi.fn(),
    };
  });

  test("runs the callback", () => {
    const result = Math.random();
    const cb = vi.fn(() => {
      Dice.roll(Dice.create("1d2"));
      global.init = vi.fn();
      global.initRoll = vi.fn();
      global.getReferences = vi.fn();
      global.getBarAttributes = vi.fn();
      global.getCriticalHits = vi.fn();
      global.dropDice = vi.fn();
      global.drop = vi.fn();
      global.Dice.roll = vi.fn();
      return result;
    });

    expect(virtualCall(cb)).toBe(result);
    expect(global.Dice.roll).not.toHaveBeenCalled();
    expect(global.init).toBe(env.init);
    expect(global.initRoll).toBe(env.initRoll);
    expect(global.getReferences).toBe(env.getReferences);
    expect(global.getBarAttributes).toBe(env.getBarAttributes);
    expect(global.getCriticalHits).toBe(env.getCriticalHits);
    expect(global.dropDice).toBe(env.dropDice);
    expect(global.drop).toBe(env.drop);
    expect(global.Dice.roll).toBe(env.Dice.roll);
  });

  test("catches errors", () => {
    global.lre = new LRE(context);
    let modeDuringVirtualCall = "";
    const cb = vi.fn(() => {
      modeDuringVirtualCall = context.getMode();
      /* @ts-expect-error Intended error */
      null();
    });

    expect(context.getMode()).toBe("real");
    expect(lre.error).not.toHaveBeenCalled();
    expect(() => virtualCall(cb)).not.toThrow();
    expect(lre.error).toHaveBeenCalled();
    expect(context.getMode()).toBe("real");
    expect(modeDuringVirtualCall).not.toBe("real");
  });
});

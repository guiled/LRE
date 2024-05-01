import { loggedCall, virtualCall } from "../../src/globals/virtualcall";
import { LRE } from "../../src/lre";
import { modeHandlerMock } from "../mock/modeHandler.mock";

global.context = modeHandlerMock;
jest.mock("../../src/lre");

describe("Logged call", () => {
  test("logged call runs the callback with clean logs", () => {
    const cb = jest.fn();
    expect(context.resetAccessLog).not.toHaveBeenCalled();
    expect(cb).not.toHaveBeenCalled();
    loggedCall(cb);
    expect(context.resetAccessLog).toHaveBeenCalled();
    expect(cb).toHaveBeenCalled();
  });

  test("logged call runs the callback with clean logs", () => {
    const result = Math.random();
    const cb = jest.fn(() => result);
    expect(loggedCall(cb)).toBe(result);
  });
});

describe("Virtual call", () => {
  let env: any = {};
  beforeEach(() => {
    global.init = env.init = jest.fn();
    global.initRoll = env.initRoll = jest.fn();
    global.getReferences = env.getReferences = jest.fn();
    global.getBarAttributes = env.getBarAttributes = jest.fn();
    global.getCriticalHits = env.getCriticalHits = jest.fn();
    global.dropDice = env.dropDice = jest.fn();
    global.drop = env.drop = jest.fn();
    global.Dice = env.Dice = {
      roll: jest.fn(),
      create: jest.fn(),
    };
  });
  test("runs the callback", () => {
    const result = Math.random();
    const cb = jest.fn(() => {
      Dice.roll(Dice.create("1d2"));
      global.init = jest.fn();
      global.initRoll = jest.fn();
      global.getReferences = jest.fn();
      global.getBarAttributes = jest.fn();
      global.getCriticalHits = jest.fn();
      global.dropDice = jest.fn();
      global.drop = jest.fn();
      global.Dice.roll = jest.fn();
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
    global.lre = new LRE(modeHandlerMock);
    let modeDuringVirtualCall = "";
    const cb = jest.fn(() => {
      modeDuringVirtualCall = modeHandlerMock.getMode();
      /* @ts-expect-error */
      null();
    });
    expect(modeHandlerMock.getMode()).toBe("real");
    expect(lre.error).not.toHaveBeenCalled();
    expect(() => virtualCall(cb)).not.toThrowError();
    expect(lre.error).toHaveBeenCalled();
    expect(modeHandlerMock.getMode()).toBe("real");
    expect(modeDuringVirtualCall).not.toBe("real");
  });
});

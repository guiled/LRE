import type { Mock } from "vitest";
import { DiceBuilder } from "../../src/dice/dicebuilder";
import { registerLreDiceAPI } from "../../src/dice/dice";
import { LRE } from "../../src/lre";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import {
  initLetsRole,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";

type RawDiceAPIMock = {
  create: Mock<LetsRole.DiceAPI["create"]>;
  roll: Mock<LetsRole.DiceAPI["roll"]>;
};

const createRawDiceAPI = (): RawDiceAPIMock => {
  const rawBuilder = {} as LetsRole.DiceBuilder;

  return {
    create: vi.fn<LetsRole.DiceAPI["create"]>((_formula) => rawBuilder),
    roll: vi.fn<LetsRole.DiceAPI["roll"]>(),
  };
};

describe("registerLreDiceAPI", () => {
  let rawDice: ReturnType<typeof createRawDiceAPI>;
  let dice: LetsRole.DiceAPI<DiceBuilder>;
  let rawSheet: LetsRole.Sheet;

  beforeEach(() => {
    const server = new ServerMock({
      views: [
        {
          id: "main",
          children: [],
          className: "View",
        },
      ],
    });
    initLetsRole(server);
    context.setMode("real");
    global.lre = new LRE(context);
    rawSheet = server.openView("main", "123");
    rawDice = createRawDiceAPI();
    dice = registerLreDiceAPI(context, rawDice);
  });

  afterEach(() => {
    // @ts-expect-error intentional deletion
    delete global.lre;
    terminateLetsRole();
  });

  describe("create", () => {
    test("wraps the native DiceBuilder in an LRE DiceBuilder", () => {
      const nativeBuilder = { add: vi.fn() } as unknown as LetsRole.DiceBuilder;
      rawDice.create.mockReturnValueOnce(nativeBuilder);

      const builder = dice.create("2d6+1");

      expect(rawDice.create).toHaveBeenCalledWith("2d6+1");
      expect(builder).toBeInstanceOf(DiceBuilder);
      expect(builder.diceBuilder).toBe(true);
      expect(builder.raw()).toBe(nativeBuilder);
    });
  });

  describe("roll", () => {
    test("forwards to the native API in real mode", () => {
      dice.roll(rawSheet, "1d20", "Attack", "visible");

      expect(rawDice.roll).toHaveBeenCalledTimes(1);
      expect(rawDice.roll).toHaveBeenCalledWith(
        rawSheet,
        "1d20",
        "Attack",
        "visible",
      );
    });

    test("does not call the native API in virtual mode", () => {
      context.setMode("virtual");

      dice.roll(rawSheet, "1d20", "Attack", "visible");

      expect(rawDice.roll).not.toHaveBeenCalled();
    });

    test("unwraps an LRE sheet before forwarding", () => {
      const lreSheet = {
        lre: true,
        raw: vi.fn(() => rawSheet),
      } as unknown as ISheet;

      dice.roll(lreSheet as unknown as LetsRole.Sheet, "1d20", "Attack", "visible");

      expect(lreSheet.raw).toHaveBeenCalled();
      expect(rawDice.roll).toHaveBeenCalledWith(
        rawSheet,
        "1d20",
        "Attack",
        "visible",
      );
    });

    test("unwraps an LRE DiceBuilder expression before forwarding", () => {
      const nativeBuilder = { tag: vi.fn() } as unknown as LetsRole.DiceBuilder;
      rawDice.create.mockReturnValueOnce(nativeBuilder);
      const expression = dice.create("3d6");

      dice.roll(rawSheet, expression, "Damage", "visible");

      expect(rawDice.roll).toHaveBeenCalledWith(
        rawSheet,
        nativeBuilder,
        "Damage",
        "visible",
      );
    });

    test("passes a plain string expression through unchanged", () => {
      dice.roll(rawSheet, "4d6", "Damage", "visible");

      expect(rawDice.roll).toHaveBeenCalledWith(
        rawSheet,
        "4d6",
        "Damage",
        "visible",
      );
    });

    test("passes a native DiceBuilder through when it is not an LRE wrapper", () => {
      const nativeOnly = {} as LetsRole.DiceBuilder;

      dice.roll(rawSheet, nativeOnly, "Roll", "visible");

      expect(rawDice.roll).toHaveBeenCalledWith(
        rawSheet,
        nativeOnly,
        "Roll",
        "visible",
      );
    });

    describe("roll actions", () => {
      test("rewrites action titles with lre.value when actions are provided", () => {
        lre.autoNum(true);
        const callback = vi.fn();

        dice.roll(rawSheet, "1d20", "Attack", "visible", {
          "12": callback,
        });

        expect(rawDice.roll).toHaveBeenCalledTimes(1);
        const actions = rawDice.roll.mock.calls[0][4] as LetsRole.DiceRollActions;
        expect(actions[12]).toBe(callback);
        expect(Object.keys(actions)).toEqual(["12"]);
      });

      test("does not rewrite actions when fewer than five arguments are passed", () => {
        const callback = vi.fn();
        const actions = { keep: callback };

        dice.roll(rawSheet, "1d20", "Attack", "visible");

        expect(rawDice.roll).toHaveBeenCalledWith(
          rawSheet,
          "1d20",
          "Attack",
          "visible",
        );
        expect(rawDice.roll.mock.calls[0]).toHaveLength(4);
        expect(actions.keep).toBe(callback);
      });

      test("does not rewrite actions when the fifth argument is not an object", () => {
        const notActions = "actions" as unknown as LetsRole.DiceRollActions;

        dice.roll(rawSheet, "1d20", "Attack", "visible", notActions);

        expect(rawDice.roll).toHaveBeenCalledWith(
          rawSheet,
          "1d20",
          "Attack",
          "visible",
          notActions,
        );
      });
    });
  });
});

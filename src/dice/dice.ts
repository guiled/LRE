import { DiceBuilder } from "./dicebuilder";

export const registerLreDiceAPI = (
  modeHandler: ProxyModeHandler,
  initialDiceAPI: LetsRole.DiceAPI,
): LetsRole.DiceAPI<DiceBuilder> =>
  new (class implements LetsRole.DiceAPI<DiceBuilder> {
    #raw: LetsRole.DiceAPI;

    constructor(raw: LetsRole.DiceAPI) {
      this.#raw = raw;
    }

    create(formula: string): DiceBuilder {
      const diceBuilder = new DiceBuilder(this.#raw.create(formula));
      return diceBuilder;
    }

    roll(...args: Parameters<LetsRole.DiceAPI["roll"]>): void {
      if (modeHandler.getMode() === "virtual") {
        return;
      }

      return this.#roll.apply(this, args);
    }

    #roll(...args: Parameters<LetsRole.DiceAPI["roll"]>): void {
      if (lre.isSheet(args[0])) {
        args[0] = args[0].raw();
      }

      if (this.#isLREDiceBuilder(args[1])) {
        args[1] = args[1].raw();
      }

      return this.#raw.roll.apply(this.#raw, args);
    }

    #isLREDiceBuilder(expression: unknown): expression is DiceBuilder {
      return !!(expression as DiceBuilder).diceBuilder;
    }
  })(initialDiceAPI);

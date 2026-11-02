import { FluentFromRaw } from "../annotations/fluentFromRaw";

class LreRollBuilder {
  #raw: LetsRole.RollBuilderInstance;
  readonly #modeHandler: ProxyModeHandler;

  constructor(
    raw: LetsRole.RollBuilderInstance,
    modeHandler: ProxyModeHandler,
  ) {
    this.#raw = raw;
    this.#modeHandler = modeHandler;
  }

  raw(): LetsRole.RollBuilderInstance {
    return this.#raw;
  }

  roll(): void {
    if (this.#modeHandler.getMode() !== "virtual") {
      this.#raw.roll();
    }
  }

  @FluentFromRaw
  expression!: (expr: string) => LreRollBuilder;

  @FluentFromRaw
  title!: (title: string) => LreRollBuilder;

  @FluentFromRaw
  visibility!: (visibility: LetsRole.RollVisibility) => LreRollBuilder;

  @FluentFromRaw
  addAction!: (title: string, callback: Callback) => LreRollBuilder;

  @FluentFromRaw
  removeAction!: (title: string) => LreRollBuilder;

  @FluentFromRaw
  onRoll!: (callback: (...args: unknown[]) => void) => LreRollBuilder;
}

export const registerLreRollBuilder = (
  modeHandler: ProxyModeHandler,
  initialRollBuilder: LetsRole.RollBuilder,
): typeof RollBuilder =>
  class extends LreRollBuilder {
    constructor(sheet: unknown) {
      super(new initialRollBuilder(sheet), modeHandler);
    }
  };

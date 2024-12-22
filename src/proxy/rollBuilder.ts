export const registerLreRollBuilder = (
  modeHandler: ProxyModeHandler,
  initialRollBuilder: LetsRole.RollBuilder,
): typeof RollBuilder =>
  class {
    #raw: LetsRole.RollBuilderInstance;

    constructor(sheet: unknown) {
      this.#raw = new initialRollBuilder(sheet);
    }

    public roll(): void {
      if (modeHandler.getMode() !== "virtual") {
        this.#raw.roll();
      }
    }

    public expression(expr: string): this {
      this.#raw.expression(expr);

      return this;
    }

    public title(title: string): this {
      this.#raw.title(title);

      return this;
    }

    public visibility(visibility: LetsRole.RollVisibility): this {
      this.#raw.visibility(visibility);

      return this;
    }

    public addAction(title: string, callback: Callback): this {
      this.#raw.addAction(title, callback);

      return this;
    }

    public removeAction(title: string): this {
      this.#raw.removeAction(title);

      return this;
    }

    public onRoll(callback: (...args: unknown[]) => void): this {
      this.#raw.onRoll(callback);

      return this;
    }
  };

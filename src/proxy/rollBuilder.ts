export const registerLreRollBuilder = (
  modeHandler: ProxyModeHandler,
  initialRollBuilder: LetsRole.RollBuilder
): typeof RollBuilder =>
  class {
    #raw: LetsRole.RollBuilderInstance;
    constructor(sheet: LetsRole.Sheet) {
      this.#raw = new initialRollBuilder(sheet);
    }

    public roll() {
      if (modeHandler.getMode() !== "virtual") {
        this.#raw.roll();
      }
    }

    public expression(expr: string) {
      this.#raw.expression(expr);

      return this;
    }

    public title(title: string) {
      this.#raw.title(title);

      return this;
    }

    public visibility(visibility: LetsRole.RollVisibility) {
      this.#raw.visibility(visibility);

      return this;
    }

    public addAction(title: string, callback: (...args: any[]) => void) {
      this.#raw.addAction(title, callback);

      return this;
    }

    public removeAction(title: string) {
      this.#raw.removeAction(title);

      return this;
    }

    public onRoll(callback: (...args: any[]) => void) {
      this.#raw.onRoll(callback);

      return this;
    }
  };

export class DiceResult {
  #result: LetsRole.DiceResult;

  constructor(result: LetsRole.DiceResult) {
    this.#result = result;
  }

  log(): void {
    lre.log(this.#result);
  }
}

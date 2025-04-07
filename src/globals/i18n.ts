export class LREi18n implements ILREi18n {
  #original: LetsRole.i18n;
  #unknown: string[] = [];

  constructor(original: LetsRole.i18n) {
    this.#original = original;
  }

  _(text: string): string {
    const res = this.#original(text);

    if (res === text && !this.#unknown.includes(text)) {
      this.#unknown.push(text);
    }

    return res;
  }

  getUntranslated(): string[] {
    return this.#unknown;
  }
}

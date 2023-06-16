export class HasRaw<T = LetsRole.Sheet | LetsRole.Component> {
  #raw: T;

  constructor(raw: T) {
    this.#raw = raw;
  }

  raw(): T {
    return this.#raw;
  }
}

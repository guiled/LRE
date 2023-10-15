type HasRawConstructorParams<T> = {
  getRaw: () => T;
  onRefresh?: (newRaw: T) => void;
};

export class HasRaw<T = LetsRole.Sheet | LetsRole.Component> {
  #raw: T | undefined;
  #getRaw: HasRawConstructorParams<T>["getRaw"];
  #onRefresh: HasRawConstructorParams<T>["onRefresh"];

  constructor({ getRaw, onRefresh }: HasRawConstructorParams<T>) {
    this.#getRaw = getRaw;
    this.#onRefresh = onRefresh;
  }

  raw(): T {
    this.#raw ??= this.#getRaw();
    return this.#raw;
  }

  refreshRaw(newRaw?: T): T {
    this.#raw = newRaw ?? this.#getRaw();
    this.#onRefresh?.(this.#raw);
    return this.#raw;
  }
}

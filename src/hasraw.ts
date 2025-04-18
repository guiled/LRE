type HasRawConstructorParams<T> = {
  raw?: T;
  getRaw: () => T;
  onRefresh?: (newRaw: T) => void;
};

export const HasRaw = <T = LetsRole.Sheet | LetsRole.Component>(
  superclass: Newable = class {},
  // defining a type here will break its implementation
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) =>
  class HasRaw extends superclass implements IHasRaw<T> {
    #raw: T | undefined;
    #getRaw: HasRawConstructorParams<T>["getRaw"];
    #onRefresh: HasRawConstructorParams<T>["onRefresh"];

    constructor({ raw, getRaw, onRefresh }: HasRawConstructorParams<T>) {
      super();
      this.#raw = raw;
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
  };

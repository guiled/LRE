const FROM_RAW_WARN_MSG =
  "The use of this property is unsure and can be broken in a future version of Let's Role";

const rawFields = (obj: IHasRaw): Record<string, unknown> =>
  obj.raw() as unknown as Record<string, unknown>;

export const directToRaw = (
  obj: IHasRaw,
  props: Array<string>,
  logWarning: boolean,
): void => {
  for (const prop of props) {
    Object.defineProperty(obj, prop, {
      configurable: true,
      enumerable: true,
      get(): unknown {
        logWarning && lre.warn(FROM_RAW_WARN_MSG);
        return rawFields(obj)[prop];
      },
      set(val: unknown): void {
        logWarning && lre.warn(FROM_RAW_WARN_MSG);
        rawFields(obj)[prop] = val;
      },
    });
  }
};

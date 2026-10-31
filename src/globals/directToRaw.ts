const FROM_RAW_WARN_MSG =
  "The %s is unsure and can be broken in a future version of Let's Role";

let fromRawWarningsSuppressedDepth = 0;

export const withoutFromRawWarnings = <T>(callback: () => T): T => {
  fromRawWarningsSuppressedDepth++;

  try {
    return callback();
  } finally {
    fromRawWarningsSuppressedDepth--;
  }
};

const shouldWarnFromRaw = (logWarning: boolean): boolean =>
  logWarning && fromRawWarningsSuppressedDepth === 0;

const rawFields = (obj: IHasRaw): Record<string, unknown> =>
  obj.raw() as unknown as Record<string, unknown>;

export const directToRaw = (
  obj: IHasRaw,
  props: Array<string>,
  logWarning: boolean,
): void => {
  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    Object.defineProperty(obj, prop, {
      configurable: true,
      enumerable: !logWarning,
      get(): unknown {
        shouldWarnFromRaw(logWarning) &&
          lre.warn(FROM_RAW_WARN_MSG.replace("%s", "get of " + prop));
        const field = rawFields(obj)[prop];

        if (typeof field === "function") {
          return field.bind(obj.raw());
        }

        return field;
      },
      set(val: unknown): void {
        shouldWarnFromRaw(logWarning) &&
          lre.warn(FROM_RAW_WARN_MSG.replace("%s", "set of " + prop));
        rawFields(obj)[prop] = val;
      },
    });
  }
};

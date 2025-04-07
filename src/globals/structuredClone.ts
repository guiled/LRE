const isObj = (val: unknown): val is Record<string, unknown> => {
  return val !== null && typeof val === "object" && !Array.isArray(val);
};

export const structuredClone = function <T>(val: T): T {
  if (val === null || typeof val === "undefined") {
    return val;
  }

  if (isObj(val) || Array.isArray(val)) {
    const result: T = (Array.isArray(val) ? [] : {}) as T;
    each(val, (v: T[keyof T], k: keyof T) => {
      result[k] = structuredClone(v);
    });
    return result;
  }

  return val;
};

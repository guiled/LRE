const isObj = (val: unknown): val is Record<string, unknown> => {
  if (typeof val !== "object") return false;

  if (Array.isArray(val)) return false;

  if (Object.getOwnPropertySymbols(val).length > 0) return false;

  return true;
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

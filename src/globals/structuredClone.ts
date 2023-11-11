export const structuredClone = function (val: any): any {
  if (typeof val === "object" || Array.isArray(val)) {
    let result: any = Array.isArray(val) ? [] : {};
    each(val, function (v, k) {
      result[k] = structuredClone(v);
    });
    return result;
  } else {
    return val;
  }
};

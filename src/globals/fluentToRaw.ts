export const fluentToRaw = <T extends { raw(): object }>(
  obj: T,
  methods: string[],
): T => {
  for (let i = 0; i < methods.length; i++) {
    const method = methods[i];
    Object.defineProperty(obj, method, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function (...args: unknown[]): T {
        const target = obj.raw() as Record<string, unknown>;
        const fn = target[method];

        if (typeof fn === "function") {
          fn.apply(target, args);
        }

        return obj;
      },
    });
  }

  return obj;
};

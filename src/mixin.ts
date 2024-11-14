// Thanks to https://github.com/jcalz  https://stackoverflow.com/a/76585028/762461
class _ {}

export type MixinFunction = {
  <A1 extends any[], R1>(ctor1: Mixable<A1, R1>): new (...args: any) => R1;
  <A1 extends any[], R1, A2 extends any[], R2>(
    ctor1: Mixable<A1, R1>,
    ctor2: Mixable<A2, R2>,
  ): new (...args: any) => R1 & R2;
  <A1 extends any[], R1, A2 extends any[], R2, A3 extends any[], R3>(
    ctor1: Mixable<A1, R1>,
    ctor2: Mixable<A2, R2>,
    ctor3: Mixable<A3, R3>,
  ): new (...args: any) => R1 & R2 & R3;
  <
    A1 extends any[],
    R1,
    A2 extends any[],
    R2,
    A3 extends any[],
    R3,
    A4 extends any[],
    R4,
  >(
    ctor1: Mixable<A1, R1>,
    ctor2: Mixable<A2, R2>,
    ctor3: Mixable<A3, R3>,
    ctor4: Mixable<A4, R4>,
  ): new (...args: any) => R1 & R2 & R3 & R4;

  // fall back to variadic
  <R extends any[]>(
    ...ctors: { [I in keyof R]: Mixable<any[], new (...args: any) => R[I]> }
  ): new (...args: any) => {
    [I in keyof R]: (x: R[I]) => void;
  }[number] extends (x: infer I) => void
    ? I
    : never;
};

type InstantiationArgs = {
  memberIndex: number;
  allArgs: Array<any>;
};

export const Mixin: MixinFunction = (...mixins: Array<Mixable<any[], any>>) => {
  let currentArgs: InstantiationArgs | undefined;
  return class extends mixins.reduce((c, mixin) => {
    return class extends mixin(c) {
      constructor() {
        const args = currentArgs!.allArgs?.[currentArgs!.memberIndex--] || [];
        super(...args);
      }
    };
  }, _) {
    constructor(args?: any) {
      const saveArgs = currentArgs;
      currentArgs = {
        memberIndex: mixins.length - 1,
        allArgs: args || [],
      };
      super();
      currentArgs = saveArgs;
    }
  };
};

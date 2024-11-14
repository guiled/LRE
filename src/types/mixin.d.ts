declare type MixableParams = any[];

declare type Newable = { new (...args: MixableParams): any };

declare type Mixable<A extends MixableParams = MixableParams, R = any> = (
  ctor?: Newable,
) => abstract new (...args: A) => R;

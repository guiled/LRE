declare type C<A extends any[], R> = abstract new (...args: A) => R;

declare type Mixable<A extends any[] = any[], R = any> = (
  ctor?: Newable
) => abstract new (...args: A) => R;

declare type Newable = { new (...args: any[]): any };

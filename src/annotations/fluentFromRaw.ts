import { fluentToRaw } from "../globals/fluentToRaw";

const forwardToRawMethod = <This extends { raw(): object }>(
  obj: This,
  methodName: string,
  args: unknown[],
): This => {
  const target = obj.raw() as Record<string, unknown>;
  const fn = target[methodName];

  if (typeof fn === "function") {
    fn.apply(target, args);
  }

  return obj;
};

const registerFluentFromRawField = (
  context: ClassFieldDecoratorContext<{ raw(): object }, unknown>,
): void => {
  const methodName = String(context.name);
  context.addInitializer(function (this: { raw(): object }) {
    fluentToRaw(this, [methodName]);
  });
};

export function FluentFromRaw<
  This extends { raw(): object },
  Args extends unknown[],
>(
  target: (this: This, ...args: Args) => This,
  context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => This
  >,
): (this: This, ...args: Args) => This;
export function FluentFromRaw(
  target: undefined,
  context: ClassFieldDecoratorContext<{ raw(): object }, unknown>,
): void;
export function FluentFromRaw<
  This extends { raw(): object },
  Args extends unknown[],
>(
  _target: undefined | ((this: This, ...args: Args) => This),
  context:
    | ClassFieldDecoratorContext<{ raw(): object }, unknown>
    | ClassMethodDecoratorContext<This, (this: This, ...args: Args) => This>,
): void | ((this: This, ...args: Args) => This) {
  if (context.kind === "field") {
    registerFluentFromRawField(
      context as ClassFieldDecoratorContext<{ raw(): object }, unknown>,
    );
    return;
  }

  const methodName = String(context.name);

  return function (this: This, ...args: Args): This {
    return forwardToRawMethod(this, methodName, args);
  };
}

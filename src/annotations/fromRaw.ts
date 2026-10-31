import { directToRaw } from "../globals/directToRaw";
const resolveLogWarning = (value: unknown): boolean => value === true;

const registerFromRaw = (
  context: ClassFieldDecoratorContext<IHasRaw, unknown>,
  logWarning: boolean,
): void => {
  const propName = String(context.name);
  context.addInitializer(function (this: IHasRaw) {
    directToRaw(this, [propName], logWarning);
  });
};

export function FromRaw(
  target: undefined,
  context: ClassFieldDecoratorContext<IHasRaw, unknown>,
): void;
export function FromRaw(
  logWarning?: boolean,
): (
  target: undefined,
  context: ClassFieldDecoratorContext<IHasRaw, unknown>,
) => void;
export function FromRaw(
  logWarningOrContext:
    boolean | ClassFieldDecoratorContext<IHasRaw, unknown> = false,
):
  | void
  | ((
      target: undefined,
      context: ClassFieldDecoratorContext<IHasRaw, unknown>,
    ) => void) {
  if (typeof logWarningOrContext === "object") {
    registerFromRaw(logWarningOrContext, false);
    return;
  }

  return (_target, context) => {
    registerFromRaw(context, resolveLogWarning(logWarningOrContext));
  };
}

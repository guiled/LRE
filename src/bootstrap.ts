import { Context } from "./context";
import { globals } from "./globals";
import { LRE } from "./lre";
import { registerLreBindings } from "./proxy/bindings";
import { registerLreRollBuilder } from "./proxy/rollBuilder";
import { registerLreWait } from "./proxy/wait";
import { overloadTables } from "./tables";

export const bootstrap = (): ProxyModeHandler => {
  const context = new Context();
  // @ts-ignore Define isNaN because it is missing in Let's Role
  isNaN = globals.isNaN;

  // @ts-ignore Define structuredClone because it is missing in Let's Role
  structuredClone = globals.structuredClone;

  lastException = null;
  throwError = globals.throwError;
  newError = globals.newError;
  stringify = globals.stringify;

  overloadTables(Tables);
  lre = new LRE(context);
  wait = registerLreWait(context, wait);
  Bindings = registerLreBindings(context, Bindings);
  /* @ts-ignore-error */
  RollBuilder = registerLreRollBuilder(context, RollBuilder);

  // @ts-ignore Overload console for some edge cases like throw new Error changed into console.error
  console = {
    log: lre.log,
    error: lre.error,
    trace: lre.log,
    warn: lre.warn,
  };

  return context;
};

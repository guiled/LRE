import { Context } from "./context";
import { Error as LreError } from "./error";
import { globals } from "./globals";
import { LRE } from "./lre";
import { registerLreBindings } from "./proxy/bindings";
import { registerLreRollBuilder } from "./proxy/rollBuilder";
import { registerLreWait } from "./proxy/wait";
import { overloadTables } from "./tables";

export const bootstrap = (): ProxyModeHandler => {
  const ctx = new Context();
  /* eslint-disable no-global-assign */
  // @ts-expect-error Define isNaN because it is missing in Let's Role
  isNaN = globals.isNaN;
  /* @ts-expect-error Overwrite Error because it is missing in LR */
  Error = LreError;
  /* eslint-enable no-global-assign */

  structuredClone = globals.structuredClone;

  lastException = null;
  throwError = globals.throwError;
  newError = globals.newError;
  stringify = globals.stringify;
  virtualCall = globals.virtualCall;
  loggedCall = globals.loggedCall;

  const firstLaunch = (ctx: ProxyModeHandler): void => {
    LRE_DEBUG && lre.trace("LRE first launch bootstrap");
    overloadTables(Tables);
    wait = registerLreWait(ctx, wait);
    Bindings = registerLreBindings(ctx, Bindings);
    RollBuilder = registerLreRollBuilder(ctx, RollBuilder);
  };

  lre = new LRE(ctx, firstLaunch);

  if (LRE_DEBUG) {
    // @ts-expect-error Overload console for some edge cases like throw new Error changed into console.error
    console = {
      log: lre.log,
      error: lre.error,
      trace: lre.log,
      warn: lre.warn,
    };
  }

  return ctx;
};

import { globals } from "./globals";
import { LRE } from "./lre";
import { registerLreWait } from "./proxy/wait";
import { overloadTables } from "./tables";

export const bootstrap = () => {
  // @ts-ignore Define isNaN because it is missing in Let's Role
  isNaN = globals.isNaN;

  // @ts-ignore Define structuredClone because it is missing in Let's Role
  structuredClone = globals.structuredClone;

  lastException = null;
  throwError = globals.throwError;
  newError = globals.newError;
  stringify = globals.stringify;

  overloadTables(Tables);
  lre = new LRE();
  wait = registerLreWait(lre, wait);

  // @ts-ignore Overload console for some edge cases like throw new Error changed into console.error
  console = {
    log: lre.log,
    error: lre.error,
    trace: lre.log,
    warn: lre.warn,
  };
};

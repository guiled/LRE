import { tester } from "../tests/transpiler/tester";
import { errorHandler } from "./globals";
import { testClasses } from "../tests/transpiler/class.lre";
import { Error as LreError } from "./error";
import { testMixins } from "../tests/transpiler/mixin.lre";
import { testGlobals } from "../tests/transpiler/globals.lre";
import { findTestTraceLocation } from "../tests/transpiler/traceFinder";

LreError.traceFinder = findTestTraceLocation;

lastException = null;
// @ts-expect-error trick to avoid error
lre = {
  __debug: true,
};
throwError = errorHandler.throwError;
newError = errorHandler.newError;
/* @ts-expect-error Overwrite Error because it is missing in LR */
// eslint-disable-next-line no-global-assign
Error = LreError;

[testClasses, testMixins, testGlobals].forEach(({ name, run }) => {
  const testRunner = tester(name, run);
  const logs = testRunner().logs;
  logs.forEach(log);
});

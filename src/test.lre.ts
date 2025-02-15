import { tester } from "../tests/transpiler/tester";
import { errorHandler } from "./globals";
import { testClasses } from "../tests/transpiler/class.lre";
import { Error as LreError } from "./error";
import { testMixins } from "../tests/transpiler/mixin.lre";

LreError.tracerFinder = (
  trace: LetsRole.Error["trace"],
): LetsRole.ErrorTrace | undefined => {
  const runIdx =
    trace?.findIndex(function (tr) {
      return tr.type === "CallExpression" && tr.callee!.name === "run";
    }) || -1;

  if (runIdx > 0) {
    const location = trace![runIdx - 1].loc;
    const start: number = location!.start.line;
    const end: number = location!.end.line;
    return trace!.find(
      (tr) => tr.loc?.start.line >= start && tr.loc?.end.line <= end,
    );
  }
};

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

[testClasses, testMixins].forEach(({ name, run }) => {
  const testRunner = tester(name, run);
  const logs = testRunner().logs;
  logs.forEach(log);
});

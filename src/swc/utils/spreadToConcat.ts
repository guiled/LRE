import { Argument, Span } from "@swc/core";
import { arrayexpression } from "../node/expression/arrayexpression";
import { arrayfromarguments } from "../node/expression/arrayfromarguments";

type ArrayConcatArgs = {
  arrayInit: Argument[];
  concatArgs: Argument[];
};

export const spreadToConcat = (
  span: Span,
  args: Argument[],
): ArrayConcatArgs => {
  const arrayInit: Argument[] = [];
  const concatArgs: Argument[] = [];

  let unspreadArgs: Argument[] = [];
  args.forEach((arg) => {
    if (!arg.spread) {
      unspreadArgs.push(arg);
    } else {
      if (unspreadArgs.length > 0) {
        if (arrayInit.length === 0) {
          arrayInit.push(...unspreadArgs);
        } else {
          concatArgs.push({
            expression: arrayexpression({
              span,
              elements: unspreadArgs,
            }),
          });
        }

        unspreadArgs = [];
      }

      let expression = arg.expression;

      if (
        arg.expression.type === "Identifier" &&
        arg.expression.value === "arguments"
      ) {
        expression = arrayfromarguments(arg.expression.span);
      }

      concatArgs.push({
        expression,
      });
    }
  });

  if (unspreadArgs.length > 0) {
    concatArgs.push({
      expression: arrayexpression({
        span,
        elements: unspreadArgs,
      }),
    });
  }

  return {
    arrayInit,
    concatArgs,
  };
};

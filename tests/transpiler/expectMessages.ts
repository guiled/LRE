export const buildExpectFailureArgs = (
  value: unknown,
  expectArgs: Array<unknown>,
): Array<unknown> => [...expectArgs, value];

export const formatExpectFailureMessage = (
  template: string,
  value: unknown,
  expectArgs: Array<unknown>,
): string => {
  const args = buildExpectFailureArgs(value, expectArgs);

  return template.replace(/\$(\d+)/g, (_, index) => {
    return String(args[Number(index) - 1]);
  });
};

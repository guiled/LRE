export const hasArgv = (name: string): boolean => {
  return process.argv.includes(name);
};

export const getArgv = (name: string, defaultValue: string): string => {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return defaultValue;
  }

  return process.argv[index + 1];
};

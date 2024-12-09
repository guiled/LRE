export const modeHandlerMock = (): ProxyModeHandler => {
  let mode: ProxyMode = "real";

  let logs: Partial<ContextLog> = {};
  let prevLogs: Partial<ContextLog> = {};
  const contexts: Array<Partial<ContextLog>> = [];

  const result: ProxyModeHandler = {
    getMode: () => {
      return mode;
    },
    setMode: (newMode: ProxyMode) => {
      mode = newMode;
      return result;
    },
    disableAccessLog: () => result,
    enableAccessLog: () => result,
    getAccessLog: <T extends keyof ContextLog>(type: T) => (logs[type] ??= []),
    getPreviousAccessLog: <T extends keyof ContextLog>(type: T) =>
      prevLogs[type] ?? [],
    logAccess: (_type, _value) => {
      logs[_type] ??= [];
      if (!logs[_type]!.includes(_value as IDataProvider & ContextLogRecord))
        logs[_type]!.push(_value as IDataProvider & ContextLogRecord);
      return result;
    },

    setContext: (_id: string, _context: any) => result,
    getContext: (_id: string) => ({}) as any,
    pushLogContext(): ProxyModeHandler {
      contexts.push(logs);
      logs = {};

      return this;
    },

    popLogContext(): ProxyModeHandler {
      prevLogs = logs;
      logs = contexts.pop() || {};

      return this;
    },
  };

  return result;
};

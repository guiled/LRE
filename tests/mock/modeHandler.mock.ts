export const modeHandlerMock = (): ProxyModeHandler => {
  let mode: ProxyMode = "real";

  let logs: Partial<ContextLog> = {};
  let prevLogs: Partial<ContextLog> = {};
  const contexts: Array<Partial<ContextLog>> = [];
  let enabled: boolean = false;

  const result: ProxyModeHandler = {
    getMode: () => {
      return mode;
    },
    setMode: (newMode: ProxyMode) => {
      mode = newMode;
      return result;
    },
    disableAccessLog: () => ((enabled = false), result),
    enableAccessLog: () => ((enabled = true), result),
    getLogEnabled: () => enabled,
    setLogEnabled: (newVal: boolean) => {
      enabled = newVal;
      return result;
    },
    getAccessLog: <T extends keyof ContextLog>(type: T) => (logs[type] ??= []),
    getPreviousAccessLog: <T extends keyof ContextLog>(type: T) =>
      prevLogs[type] ?? [],
    logAccess: (type, value) => {
      if (!enabled) return result;
      logs[type] ??= [];
      let found = false;

      if (Array.isArray(value)) {
        found = logs[type]!.some(
          (v: any) => v[0] === value[0] && v[1] === value[1],
        );
      } else {
        found = logs[type]!.includes(value as IDataProvider & ContextLogRecord);
      }

      if (!found) {
        logs[type]!.push(value as IDataProvider & ContextLogRecord);
      }

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
    getLastLog(): Partial<ContextLog> {
      return prevLogs;
    },
    call<T>(newEnabled: boolean, callback: () => T): [T, Partial<ContextLog>] {
      const saveEnabled = enabled;
      enabled = newEnabled;
      result.pushLogContext();

      const res = callback();
      enabled = saveEnabled;
      result.popLogContext();

      return [res, prevLogs];
    },
  };

  return result;
};

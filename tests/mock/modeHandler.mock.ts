let mode: ProxyMode = "real";

let logs: ContextLog = {};
let prevLogs: ContextLog = {};

export const modeHandlerMock: ProxyModeHandler = {
  getMode: () => {
    return mode;
  },
  setMode: (newMode: ProxyMode) => {
    mode = newMode;
    return modeHandlerMock;
  },
  disableAccessLog: () => modeHandlerMock,
  enableAccessLog: () => modeHandlerMock,
  getAccessLog: (_type) => (logs[_type] ??= []),
  getPreviousAccessLog: (_type) => prevLogs[_type] ?? [],
  logAccess: (_type, _value) => {
    logs[_type] ??= [];
    if (!logs[_type]!.includes(_value)) logs[_type]!.push(_value);
    return modeHandlerMock;
  },
  resetAccessLog: () => {
    prevLogs = logs;
    logs = {};
    return modeHandlerMock;
  },

  setContext: (_id: string, _context: any) => modeHandlerMock,
  getContext: (_id: string) => ({} as any),
};

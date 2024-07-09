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
  disableAccessLog: jest.fn(() => modeHandlerMock),
  enableAccessLog: jest.fn(() => modeHandlerMock),
  getAccessLog: jest.fn((_type) => (logs[_type] ??= [])),
  getPreviousAccessLog: jest.fn((_type) => prevLogs[_type] ?? []),
  logAccess: jest.fn((_type, _value) => {
    logs[_type] ??= [];
    if (!logs[_type]!.includes(_value)) logs[_type]!.push(_value);
    return modeHandlerMock;
  }),
  resetAccessLog: jest.fn(() => {
    prevLogs = logs;
    logs = {};
    return modeHandlerMock;
  }),

  setContext: jest.fn((_id: string, _context: any) => modeHandlerMock),
  getContext: jest.fn((_id: string) => ({} as any)),
};

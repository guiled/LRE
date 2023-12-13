let mode: ProxyMode = "real";

export const modeHandlerMock: ProxyModeHandler = {
  getMode: () => {
    return mode;
  },
  setMode: (newMode: ProxyMode) => {
    mode = newMode;
    return modeHandlerMock;
  },
  getAccessLog: (_type) => [],
  logAccess: (_type, _value) => modeHandlerMock,
  resetAccessLog: () => modeHandlerMock,

  setContext: (_id: string, _context: any) => modeHandlerMock,
  getContext: (_id: string) => modeHandlerMock,
};

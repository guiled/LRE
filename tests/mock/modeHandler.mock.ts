let mode: ProxyMode = "real";

export const modeHandlerMock: ProxyModeHandler = {
  getMode: () => {
    return mode;
  },
  setMode: (newMode: ProxyMode) => {
    mode = newMode;
    return modeHandlerMock;
  },
  getAccessLog: jest.fn((_type) => []),
  logAccess: jest.fn((_type, _value) => modeHandlerMock),
  resetAccessLog: jest.fn(() => modeHandlerMock),

  setContext: jest.fn((_id: string, _context: any) => modeHandlerMock),
  getContext: jest.fn((_id: string) => ({} as any)),
};

let mode: ProxyMode = "real";

export const modeHandlerMock: ProxyModeHandler = {
  getMode() {
    return mode;
  },
  setMode(newMode: ProxyMode) {
    mode = newMode;
  },
};

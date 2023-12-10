import { ProxyMode } from "./proxy";

export * from "./proxy";

export interface ProxyModeHandler {
  setMode: (newMode: ProxyMode) => void;
  getMode: () => ProxyMode;
}

export const disabledMethod = (..._args: any[]) => {};

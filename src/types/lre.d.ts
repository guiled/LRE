declare interface ILRE {
  deepMerge(target: any, ...sources: any[]): any;
  deepEqual(x: any, y: any): boolean;
  numToAlpha(n: number): string;
  alphaToNum(s: string): number;
  wait(delay: number, cb: () => void, name: string = "");
  __debug: boolean = false;
}

declare type ProxyModeHandlerLogType =
  | "value"
  | "rawValue"
  | "virtualValue"
  | "text"
  | "class"
  | "visible"
  | "data"
  | "cmp";

declare interface ProxyModeHandler {
  setMode: (newMode: ProxyMode) => this;
  getMode: () => ProxyMode;
  resetAccessLog: () => this;
  logAccess: (
    type: ProxyModeHandlerLogType,
    value: LetsRole.ComponentID
  ) => this;
  getAccessLog: (type: ProxyModeHandlerLogType) => Array<LetsRole.ComponentID>;
  setContext: (id: string, context: any) => this;
  getContext: <T = any>(id: string) => T;
}
declare type ProxyMode = "real" | "virtual";

declare var context: ProxyModeHandler;
declare var isNaN = (n: any) => boolean;
declare var structuredClone = (val: any) => any;
declare var lastException: any;
declare var throwError = (err: any) => undefined;
declare var newError = (err: message) => any;
declare var stringify = (obj: any, indent: string = "") => string;
declare var virtualCall = <T extends any>(cb: () => T) => T;
declare var loggedCall = <T extends any>(cb: () => T) => T;

declare interface Logger {
  error(...args: any[]): void;
  warn(...args: any[]): void;
  trace(...args: any[]): void;
  log(...args: any[]): void;
  setLogLevel(level: keyof typeof LogLevel): void;
}

type cb = (thisArg: any, argArray?: any) => (rawSheet: LetsRole.Sheet) => void;

declare var lre: ILRE & Logger & cb;
declare var firstInit: undefined | ((sheet: Sheet) => boolean);
declare var errExclFirstLine: number, errExclLastLine: number;

declare type ComponentType =
  | "component"
  | "sheet"
  | "label"
  | "container"
  | "repeater"
  | "choice"
  | "multichoice"
  | "entry"
  | "icon";

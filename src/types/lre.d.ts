declare interface ILRE {
  deepMerge(target: any, ...sources: any[]): any;
  deepEqual(x: any, y: any): boolean;
  numToAlpha(n: number): string;
  alphaToNum(s: string): number;
  __debug: boolean = false;
}

declare var isNaN = (n: any) => boolean;
declare var structuredClone = (val: any) => any;
declare var lastException: any;
declare var throwError = (err: any) => undefined;
declare var newError = (err: message) => any;
declare var stringify = (obj: any, indent: string = "") => string;

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

declare interface ILRE {
  error(...args: any[]): void;
  warn(...args: any[]): void;
  trace(...args: any[]): void;
  __debug: boolean = false;
}

declare var lre: ILRE & Logger;
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

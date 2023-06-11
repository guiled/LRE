declare interface ILRE {
  error(...args: any[]): void;
  warn(...args: any[]): void;
  trace(...args: any[]): void;
}

declare var lre: ILRE & Logger;
declare var firstInit: undefined | ((sheet: Sheet) => boolean);

declare type ComponentType =
  | "component"
  | "sheet"
  | "repeater"
  | "choice"
  | "multichoice"
  | "entry"
  | "icon";

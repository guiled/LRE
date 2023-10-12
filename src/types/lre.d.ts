declare interface ILRE {
  deepMerge(target: any, ...sources: any[]): any;
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

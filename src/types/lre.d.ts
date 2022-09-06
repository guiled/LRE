declare interface ILRE  {
    error(...args: any[]): void;
    warn(...args: any[]): void;
    trace(...args: any[]): void;

}

declare var lre: ILRE & Logger;
declare var firstInit: (sheet: Sheet) => boolean;
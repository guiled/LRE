import { Logger } from "./log";
import { handleError } from "./log/errorhandler";
import { Sheet } from "./sheet";
import { SheetCollection } from "./sheet/collection";

firstInit = undefined;

type cb = (thisArg: any, argArray?: any) => (rawSheet: LetsRole.Sheet) => void;

export interface LRE extends ILRE, Logger, cb {}

export class LRE extends Logger implements ILRE {
  sheets: SheetCollection;
  public __debug: boolean = false;

  apply(_thisArg: any, argArray?: any) {
    this.log("prepare init");
    const [callback] = argArray;
    return (rawSheet: LetsRole.Sheet): void => {
      // The wait may allow a faster display
      wait(0, () => {
        const sheetId = rawSheet.getSheetId();
        const _sheet = new Sheet(rawSheet);
        this.sheets.add(_sheet);
        if (!_sheet.isInitialized() && firstInit !== void 0) {
          this.log(`sheet first initialization`);
          try {
            _sheet.persistingData("initialized", firstInit(_sheet));
          } catch (e) {
            handleError(e as LetsRole.Error);
          }
        }
        this.log(
          `init sheet ${rawSheet.id()} (${rawSheet.name()} ${
            rawSheet.properName() || ""
          } ${sheetId ? "#" + sheetId : ""})`
        );
        try {
          callback.call(this, _sheet);
        } catch (e) {
          handleError(e as LetsRole.Error);
        }
      });
    };
  }

  constructor() {
    super();
    //Object.assign(this, new Logger());
    this.log(`init`);
    this.sheets = new SheetCollection();
  }

  // convert a number to a string of letters
  numToAlpha(n: number): string {
    let s = "";
    const k = 26,
      K = k * 2;
    const charBase = [65, 97];
    while (n >= K) {
      const m = Math.floor(n / K);
      const r = n - m * K;
      s = String.fromCharCode(charBase[Math.floor(r / k)] + (r % k)) + s;
      n = m;
    }
    s = String.fromCharCode(charBase[Math.floor(n / k)] + (n % k)) + s;
    return s;
  }

  // convert a string of letters to a number
  alphaToNum(s: string): number {
    let n = 0;
    let c;
    let K = 1;
    let length = s.split("").length;
    for (let i = 0; i < length; i++) {
      c = s.charCodeAt(length - 1 - i);
      n += (c - ((c & 96) === 96 ? 97 - 26 : 65)) * K;
      K = K * 52;
    }
    return n;
  }

  getRandomId(): string {
    const rnd = Math.ceil(Math.random() * Number.MAX_SAFE_INTEGER);

    return this.numToAlpha(rnd);
  }

  isObject(object: any): boolean {
    return (
      object != null && typeof object === "object" && !Array.isArray(object)
    );
  }

  deepMerge(target: any, ...sources: any[]): any {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) target = Object.assign({}, target, { [key]: {} });
          target[key] = this.deepMerge(target[key], source[key]);
        } else {
          target = Object.assign({}, target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge.apply(this, [target, ...sources]);
  }
}

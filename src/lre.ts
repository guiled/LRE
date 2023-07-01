import { Logger } from "./log";
import { handleError } from "./log/errorhandler";
import { Sheet } from "./sheet";
import { SheetCollection } from "./sheet/collection";

enum LogLevel {
  none = 0,
  error,
  warning,
  all,
}

firstInit = undefined;

export interface LRE extends ILRE, Logger {}

export class LRE implements ILRE {
  sheets: SheetCollection;
  public __debug: boolean = false;

  apply(thisArg: any, argArray?: any) {
    this.log("prepare init");
    const [callback] = argArray;
    return (rawSheet: LetsRole.Sheet) => {
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
    Object.assign(this, new Logger());
    this.log(`init`);
    this.sheets = new SheetCollection();
  }
}

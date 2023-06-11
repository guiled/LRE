import Logger from "./log";
import Sheet from "./sheet";
import SheetCollection from "./sheet/collection";
import applyMixins from "./swc/utils/applyMixins";

enum LogLevel {
  none = 0,
  error,
  warning,
  all,
}

export default interface LRE extends ILRE, Logger {}

export default class LRE implements ILRE {
  sheets: SheetCollection;

  apply(thisArg: any, argArray?: any) {
    this.log("prepare init");
    const [callback] = argArray;
    return (rawSheet: LetsRole.Sheet) => {
      this.log(`init sheet ${rawSheet.getSheetId()}`);
      const _sheet = new Sheet(rawSheet);
      this.sheets.add(_sheet);
      if (!_sheet.isInitialized() && firstInit !== void 0) {
        this.log(`sheet first initialization`);
        _sheet.persistingData("initialized", firstInit(_sheet));
      }
      wait(0, () => {
        const sheetId = _sheet.getSheetId();
        this.log(
          `sheet init ${_sheet.id()} (${_sheet.name()} ${
            sheetId ?? "#" + sheetId
          })`
        );
        callback.call(this, _sheet);
      });
    };
  }

  constructor() {
    Object.assign(this, new Logger());
    this.log(`init`);
    this.sheets = new SheetCollection();
  }
}
/*#__PURE__*/ //applyMixins(LRE, [Logger]);

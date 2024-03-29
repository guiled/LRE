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
    return (rawsheet: LetsRole.Sheet) => {
      this.log(`init sheet ${rawsheet.getSheetId()}`);
      const _sheet = new Sheet(rawsheet);
      this.sheets.add(_sheet);

      const id = _sheet.id();
      const sheetId = _sheet.getSheetId();
      this.log(`INIT on ${id} (${_sheet.name()} ${sheetId ?? "#" + sheetId})`);
      if (!_sheet.isInitialised && firstInit !== void 0) {
        _sheet.persinstingData("initialised", firstInit(_sheet));
      }
      wait(0, () => {
        callback.call(this, _sheet);
      });
    };
  }

  constructor() {
    //super();
    Object.assign(this, new Logger());
    this.log(`init`);
    this.sheets = new SheetCollection();
  }
}
/*#__PURE__*/ applyMixins(LRE, [Logger]);

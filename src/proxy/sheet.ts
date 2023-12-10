import { ProxyModeHandler } from ".";
import { ComponentProxy } from "./component";
import { LreProxy } from "./proxy";

export type SheetContext = {
  cmpClasses: Record<string, LetsRole.ClassName[]>;
  sheetData: LetsRole.ViewData;
  virtualValues: LetsRole.ViewData;
  cmpTexts: Record<string, string>;
};

const sheetContexts: Record<LetsRole.SheetRealID, SheetContext> = {};

export class SheetProxy
  extends LreProxy<LetsRole.Sheet>
  implements LetsRole.Sheet
{
  #id!: LetsRole.SheetRealID;
  constructor(proxyModeHandler: ProxyModeHandler, sheet: LetsRole.Sheet) {
    super(proxyModeHandler, sheet);

    this.setModeDest("virtual", (sheet: LetsRole.Sheet) => {
      this.#id = sheet.getSheetId();
      const newData = sheet.getData();
      sheetContexts[this.#id] = {
        sheetData: newData,
        cmpClasses: {},
        cmpTexts: {},
        virtualValues: {},
      };
      return {
        ...sheet,
        getData: () => sheetContexts[this.#id].sheetData,
        setData: (d: LetsRole.ViewData) => {
          sheetContexts[this.#id].sheetData = {
            ...sheetContexts[this.#id].sheetData,
            ...d,
          };
        },
        get: this.get,
        prompt: (
          _title: string,
          _view: string,
          _callback: (
            result: Partial<{ [key: string]: LetsRole.ComponentValue }>
          ) => void,
          _callbackInit: (promptView: LetsRole.Sheet) => void
        ): void => {},
      };
    });
  }

  id() {
    return this.getDest().id();
  }

  getSheetId(): string {
    return this.getDest().getSheetId();
  }

  name() {
    return this.getDest().name();
  }

  properName(): string {
    return this.getDest().properName();
  }

  get(id: LetsRole.ComponentID) {
    return new ComponentProxy(
      this._proxyModeHandler,
      this._realDest.get(id),
      this,
      () => {
        this.getDest();
        return sheetContexts[this.#id];
      }
    );
  }

  getVariable(id: string): number | null {
    return this.getDest().getVariable(id);
  }

  prompt(
    _title: string,
    _view: string,
    _callback: (
      result: Partial<{ [key: string]: LetsRole.ComponentValue }>
    ) => void,
    _callbackInit: (promptView: LetsRole.Sheet) => void
  ): void {
    const proxy = this.getDest();
    proxy.prompt.apply(proxy, Array.from(arguments) as any);
  }

  setData(data: Partial<{ [key: string]: LetsRole.ComponentValue }>): void {
    this.getDest().setData(data);
  }

  getData(): Partial<{ [key: string]: LetsRole.ComponentValue }> {
    return this.getDest().getData();
  }
}

import { ComponentProxy } from "./component";
import { LreProxy } from "./proxy";

export type SheetContext = {
  cmpClasses: Record<string, LetsRole.ClassName[]>;
  sheetData: LetsRole.ViewData;
  virtualValues: LetsRole.ViewData;
  cmpTexts: Record<string, string | null>;
  visible: Record<string, boolean>;
};

export class SheetProxy
  extends LreProxy<LetsRole.Sheet>
  implements LetsRole.Sheet
{
  constructor(proxyModeHandler: ProxyModeHandler, sheet: LetsRole.Sheet) {
    super(proxyModeHandler, sheet);
    this.setModeDest("virtual", (sheet: LetsRole.Sheet) => {
      const contextId: string = `sheet-${sheet.getSheetId()}`;

      const newData = sheet.getData();
      this._proxyModeHandler.setContext(contextId, {
        sheetData: newData,
        cmpClasses: {},
        cmpTexts: {},
        virtualValues: {},
        visible: {},
      });

      const getContext = (): SheetContext => {
        return this._proxyModeHandler.getContext<SheetContext>(contextId);
      };

      return {
        ...sheet,
        id: () => sheet.id(),
        name: () => sheet.name(),
        properName: () => sheet.properName(),
        getSheetId: () => sheet.getSheetId(),
        getData: () => {
          return getContext().sheetData;
        },
        setData: (d: LetsRole.ViewData) => {
          const ctx = getContext();
          this._proxyModeHandler.setContext(contextId, {
            ...ctx,
            sheetData: {
              ...ctx.sheetData,
              ...d,
            },
          });
        },
        get: this.get,
        prompt: (
          _title: string,
          _view: string,
          _callback: (
            result: Partial<{ [key: string]: LetsRole.ComponentValue }>,
          ) => void,
          _callbackInit: (promptView: LetsRole.Sheet) => void,
        ): void => {},
      };
    });
  }

  id(): LetsRole.SheetID {
    return this.getDest().id();
  }

  getSheetId(): LetsRole.SheetRealID {
    return this.getDest().getSheetId();
  }

  name(): LetsRole.Name {
    return this.getDest().name();
  }

  properName(): string {
    return this.getDest().properName();
  }

  get(id: LetsRole.ComponentID): LetsRole.Component {
    this._proxyModeHandler.logAccess("cmp", [this.getSheetId(), id]);
    return new ComponentProxy(
      this._proxyModeHandler,
      this._realDest.get(id),
      this,
      () => {
        this.getDest();
        return this._proxyModeHandler.getContext<SheetContext>(
          "sheet-" + this.getSheetId(),
        );
      },
    );
  }

  getVariable(id: string): number | null {
    return this.getDest().getVariable(id);
  }

  prompt(
    _title: string,
    _view: string,
    _callback: (
      result: Partial<{ [key: string]: LetsRole.ComponentValue }>,
    ) => void,
    _callbackInit: (promptView: LetsRole.Sheet) => void,
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

import Component from "../component";
import EventHolder from "../eventholder";
import HasRaw from "../hasraw";
import DataBatcher from "./databatcher";

type SheetStoredState = Record<string, any> & {
  initialised: boolean;
  cmpData: Record<LetsRole.ComponentID, any>;
  cmpClasses: Record<LetsRole.ComponentID, Array<LetsRole.ClassName>>;
};

type StoredState = keyof SheetStoredState;

export default interface Sheet extends HasRaw<LetsRole.Sheet>, EventHolder {}

export default class Sheet implements LetsRole.Sheet {
  #batcher: DataBatcher;
  #storedState: SheetStoredState;
  constructor(rawsheet: LetsRole.Sheet) {
    lre.log(`new sheet ${rawsheet.getSheetId()}`);
    Object.assign(this, new HasRaw(rawsheet), new EventHolder(this));
    this.#batcher = new DataBatcher(rawsheet);
    this.#storedState = this.#loadState();
  }
  getVariable(id: string): number | null {
    return this.raw().getVariable(id);
  }
  prompt(
    title: string,
    view: string,
    callback: (result: LetsRole.ViewData) => void,
    callbackInit: (promptView: LetsRole.View) => void
  ): void {
    return this.raw().prompt(title, view, callback, callbackInit);
  }
  id(): string {
    return this.raw().id();
  }
  getSheetId(): string {
    return this.raw().getSheetId();
  }
  name(): string {
    return this.raw().name();
  }
  get(id: string): LetsRole.Component {
    let cmp = this.raw().get(id);
    return new Component(cmp) as unknown as LetsRole.Component;
  }
  setData(data: LetsRole.ViewData): void {}
  getData(): LetsRole.ViewData {
    return this.raw().getData();
  }

  #loadState(): SheetStoredState {
    const data = this.raw().getData();
    const pers: SheetStoredState | undefined = data?.[
      this.raw().id()
    ] as unknown as SheetStoredState | undefined;
    return {
      initialised: false,
      cmpData: {},
      cmpClasses: {},
      ...pers,
    };
  }

  persinstingData(dataName: StoredState, value?: any): void {
    if (value !== void 0) {
      this.#storedState[dataName] = value;
      const newData: LetsRole.ViewData = {};
      newData[this.id()] = this.#storedState;
      this.setData(newData);
    }
    return this.#storedState?.[dataName];
  }

  isInitialised(): boolean {
    return !!this.#storedState["initialised"];
  }
}

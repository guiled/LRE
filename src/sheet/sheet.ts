import { Component, REP_ID_SEP } from "../component";
import { EventHolder } from "../eventholder";
import { HasRaw } from "../hasraw";
import { ComponentCache } from "../component/cache";
import {
  ComponentContainer,
  ComponentFinder,
  ComponentSearchResult,
} from "../component/container";
import { DataBatcher } from "./databatcher";
import { ComponentFactory } from "../component/factory";
import { ComponentCommon } from "../component/common";
import { Entry } from "../component/entry";
import { Repeater } from "../component/repeater";

type SheetStoredState = Record<string, any> & {
  initialized: boolean;
  cmpData: Record<LetsRole.ComponentID, any>;
  cmpClasses: Record<LetsRole.ComponentID, Array<LetsRole.ClassName>>;
};

type StoredState = keyof SheetStoredState;

export interface Sheet
  extends ComponentContainer<LetsRole.Sheet>,
    ComponentCommon,
    EventHolder {}

export class Sheet
  implements
    Omit<LetsRole.Sheet, "get" | "find">,
    ComponentContainer<LetsRole.Sheet>,
    ComponentCommon
{
  #silentFind: ComponentFinder;
  #batcher: DataBatcher;
  #storedState: SheetStoredState;
  #componentCache: ComponentCache;
  constructor(rawSheet: LetsRole.Sheet) {
    lre.log(`new sheet ${rawSheet.getSheetId()}`);
    Object.assign(this, new HasRaw(rawSheet), new EventHolder(this));
    this.#batcher = new DataBatcher(rawSheet);
    this.#componentCache = new ComponentCache(this);
    this.#storedState = this.#loadState();
    this.#silentFind = rawSheet.get(rawSheet.id())
      .find as unknown as ComponentFinder;
  }

  lreType(): ComponentType {
    return "sheet";
  }

  sheet(): Sheet {
    return this;
  }

  getVariable(id: string): number | null {
    return this.raw().getVariable(id);
  }
  prompt(
    title: string,
    view: string,
    callback: (result: LetsRole.ViewData) => void,
    callbackInit: (promptView: LetsRole.Sheet) => void
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
  properName(): string {
    return this.raw().properName();
  }
  get(id: string, silent = false): ComponentSearchResult {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore id instance of is for live checks
    if (typeof id !== "string" && !(id instanceof String) && !isNaN(id)) {
      return null;
    }
    id = "" + id;

    const cmpInCache = this.#componentCache.inCache(id);

    if (cmpInCache) {
      return cmpInCache;
    }

    let container: ComponentContainer<LetsRole.Sheet | LetsRole.Component> =
        this,
      finder: LetsRole.ComponentFinder | undefined = this.raw().get,
      tabId = id.split(REP_ID_SEP),
      finalId = id;

    if (tabId.length > 1) {
      finalId = tabId.pop()!;
      let containerId = tabId.join(REP_ID_SEP);
      container = this.get(containerId);
      finder = this.get(tabId.join(REP_ID_SEP))?.raw()?.find;
      if (!finder) return null;
    }

    const rawCmp = finder("" + finalId);
    const cmp = ComponentFactory.create(rawCmp, container);
    this.#componentCache.set(cmp.realId(), cmp);
    return cmp;
  }

  find(id: string): ComponentSearchResult {
    return this.get(id);
  }
  setData(data: LetsRole.ViewData): void {
    this.#batcher.setData(data);
  }
  getData(): LetsRole.ViewData {
    return this.raw().getData();
  }

  #loadState(): SheetStoredState {
    const data = this.raw().getData();
    const persist: SheetStoredState | undefined = data?.[
      this.raw().id()
    ] as unknown as SheetStoredState | undefined;
    return {
      initialized: false,
      cmpData: {},
      cmpClasses: {},
      ...persist,
    };
  }

  persistingData(dataName: StoredState, value?: any): void {
    if (value !== void 0) {
      this.#storedState[dataName] = value;
      const newData: LetsRole.ViewData = {};
      newData[this.id()] = this.#storedState;
      this.setData(newData);
    }
    return this.#storedState?.[dataName];
  }

  isInitialized(): boolean {
    return !!this.#storedState["initialized"];
  }

  getPendingData(id: LetsRole.ComponentID): LetsRole.ComponentValue {
    return this.#batcher.getPendingData(id);
  }

  repeater(repeater?: Repeater): Repeater | undefined {
    return undefined;
  }

  entry(entry?: Entry): Repeater | undefined {
    return undefined;
  }
}

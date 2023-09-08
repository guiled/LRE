import { REP_ID_SEP } from "../component";
import { EventDef, EventHolder } from "../eventholder";
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
import { Mixin } from "../mixin";

type PendingData = {
  k: LetsRole.ComponentID;
  v: LetsRole.ComponentValue;
};

type PersistingData = {
  cmpData: LetsRole.ViewData;
  cmpClasses: Record<LetsRole.ComponentID, string>;
};

type SheetStoredState = Record<string, any> & {
  initialized: boolean;
  cmpData: Record<LetsRole.ComponentID, any>;
  cmpClasses: Record<LetsRole.ComponentID, Array<LetsRole.ClassName>>;
};

type StoredState = keyof SheetStoredState;

type SheetEvents = "data:processed"

export class Sheet
  extends Mixin(EventHolder, HasRaw<LetsRole.Sheet>)<LetsRole.Sheet, SheetEvents>
  implements
    Omit<LetsRole.Sheet, "get" | "find">,
    ComponentContainer,
    ComponentCommon
{
  #silentFind: ComponentFinder;
  #batcher: DataBatcher;
  #storedState: SheetStoredState | undefined;
  #componentCache: ComponentCache;
  #persistingData: PersistingData = {
    cmpData: {},
    cmpClasses: {},
  };

  constructor(rawSheet: LetsRole.Sheet) {
    lre.log(`new sheet ${rawSheet.getSheetId()}`);
    super([
      [
        rawSheet.name()
      ],
      [rawSheet],
    ]);
    this.#batcher = new DataBatcher(rawSheet);
    this.#batcher.linkEventTo("processed:sheet", this, "data:processed");
    this.#componentCache = new ComponentCache(this);
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
  realId(): string {
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

    let container: ComponentContainer = this,
      finder: LetsRole.ComponentFinder | undefined = this.raw().get,
      tabId = id.split(REP_ID_SEP),
      finalId = id;

    if (tabId.length > 1) {
      finalId = tabId.pop()!;
      let containerId = tabId.join(REP_ID_SEP);
      container = this.get(containerId)!;
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
    return {...this.raw().getData(), ...(this.#batcher.getPendingData() as LetsRole.ViewData)};
  }

  #loadState(): SheetStoredState {
    if (!this.#storedState) {
      const data = this.raw().getData();
      const persist: SheetStoredState | undefined = data?.[
        this.raw().id()
      ] as unknown as SheetStoredState | undefined;
      this.#storedState = {
        initialized: false,
        cmpData: {},
        cmpClasses: {},
        ...persist,
      };
    }
    return this.#storedState;
  }

  persistingData(dataName: StoredState, value?: any): void {
    this.#loadState();
    if (value !== void 0) {
      this.#storedState![dataName] = value;
      const newData: LetsRole.ViewData = {};
      newData[this.id()] = this.#storedState;
      this.setData(newData);
    }
    return this.#storedState?.[dataName];
  }

  isInitialized(): boolean {
    this.#loadState();
    return !!this.#storedState!["initialized"];
  }

  getPendingData(id: LetsRole.ComponentID): LetsRole.ComponentValue {
    return this.#batcher.getPendingData(id);
  }

  #persistingDataOperation<T extends keyof PersistingData>(
    type: T,
    componentId: LetsRole.ComponentID,
    newData?: (T extends "cmpData" ? LetsRole.ViewData : string)
  ): undefined | (T extends "cmpData" ? LetsRole.ComponentValue : string) {
    if (newData !== void 0) {
      this.#persistingData[type][componentId] = newData;
    }
    return this.#persistingData[type][componentId] as undefined | (T extends "cmpData" ? LetsRole.ComponentValue : string);
  }

  persistingCmpData(
    componentId: LetsRole.ComponentID,
    newData?: LetsRole.ViewData
  ): LetsRole.ComponentValue {
    if (arguments.length > 1) {
      return this.#persistingDataOperation("cmpData", componentId) || {};
    } else {
      return this.#persistingDataOperation("cmpData", componentId) || {};
    }
  }

  persistingCmpClasses(
    componentId: LetsRole.ComponentID,
    newClasses?: string
  ): string {
    if (arguments.length > 1) {
      return this.#persistingDataOperation("cmpClasses", componentId) || "";
    } else {
      return this.#persistingDataOperation("cmpClasses", componentId) || "";
    }
  }

}

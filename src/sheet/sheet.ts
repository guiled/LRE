import { REP_ID_SEP } from "../component";
import { EventHolder } from "../eventholder";
import { HasRaw } from "../hasraw";
import { ComponentCache } from "../component/cache";
import {
  ComponentContainer,
  ComponentSearchResult,
} from "../component/container";
import { DataBatcher } from "./databatcher";
import { ComponentFactory } from "../component/factory";
import { ComponentCommon } from "../component/ICommon";
import { Mixin } from "../mixin";

type SheetProtectedStoredState = {
  initialized: boolean;
  cmpData: Record<LetsRole.ComponentID, any>;
  cmpClasses: Record<LetsRole.ComponentID, Array<LetsRole.ClassName>>;
};

type SheetStoredState = SheetProtectedStoredState & Record<string, any>;

type ProtectedStoredState = keyof SheetProtectedStoredState;
type StoredState = ProtectedStoredState | string;

type SheetEvents = "data:processed";

export class Sheet
  extends Mixin(EventHolder, HasRaw<LetsRole.Sheet>)<
    LetsRole.Sheet,
    SheetEvents
  >
  implements
    Omit<LetsRole.Sheet, "get" | "find">,
    ComponentContainer,
    ComponentCommon
{
  //#silentFind: ComponentFinder;
  #batcher: DataBatcher;
  #storedState: SheetStoredState | undefined;
  #storedStateReceivedKeys: Array<string> = [];
  #componentCache: ComponentCache;
  #cmp: LetsRole.Component;
  rand: number;

  constructor(rawSheet: LetsRole.Sheet) {
    lre.log(`new sheet ${rawSheet.getSheetId()}`);
    super([[rawSheet.name()], [rawSheet]]);
    this.rand = Math.floor(Math.random() * 100);
    this.#batcher = new DataBatcher(rawSheet);
    this.#batcher.linkEventTo("processed:sheet", this, "data:processed");
    this.#componentCache = new ComponentCache();
    this.#cmp = rawSheet.get(rawSheet.id())!;
    this.#cmp.on("update", this.#handleDataUpdate.bind(this));
    //this.#silentFind = rawSheet.get(rawSheet.id())
    //  .find as unknown as ComponentFinder;
  }

  #persistingDataOperation<
    T extends keyof Omit<SheetStoredState, "initialized">,
    R extends SheetStoredState[T][keyof SheetStoredState[T]]
  >(type: T, componentId: LetsRole.ComponentID, newData?: R): R {
    this.#loadState(this.#storedState);
    if (newData !== void 0) {
      this.#storedState[type][componentId] = newData;
      this.#saveStoredState();
    }
    return this.#storedState![type][componentId];
  }

  #handleDataUpdate(): void {
    lre.trace("data updated from server…");
    this.#loadState(this.#storedState);
    const data = this.raw().getData();

    const newSheetStoredState: SheetStoredState =
      (data[this.id()] as SheetStoredState) || {};
    const hasPendingData = !!this.getPendingData(this.id());

    const newStoreStateKeys = Object.keys(newSheetStoredState);

    const keysToDelete = this.#storedStateReceivedKeys.filter(
      (k) => !newStoreStateKeys.includes(k)
    );
    keysToDelete.forEach((k) => {
      if (this.#storedState!.hasOwnProperty(k)) {
        delete this.#storedState![k];
      }
    });

    this.#storedState = lre.deepMerge(this.#storedState, newSheetStoredState);
    this.#storedStateReceivedKeys = Object.keys(this.#storedState!);
    if (hasPendingData) {
      lre.trace("pending data update");
      this.#saveStoredState();
    }
  }

  #loadState(
    _state: SheetStoredState | undefined
  ): asserts _state is SheetStoredState {
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
      this.#storedStateReceivedKeys = Object.keys(this.#storedState);
    }
  }

  #saveStoredState(): void {
    const newData: LetsRole.ViewData = {};
    newData[this.id()] = this.#storedState;
    this.setData(newData);
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
  get(id: string, _silent = false): ComponentSearchResult {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore id instance of is for live checks
    if (!((typeof id === "string" || id instanceof String) && isNaN(id))) {
      lre.error(`Invalid component id for sheet.get, ${id} given`);
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
    return {
      ...this.raw().getData(),
      ...(this.#batcher.getPendingData() as LetsRole.ViewData),
    };
  }

  persistingData<T extends StoredState>(
    dataName: T,
    value?: any
  ): SheetStoredState[T] {
    this.#loadState(this.#storedState);
    if (value !== void 0) {
      this.#storedState[dataName] = value;
      this.#saveStoredState();
    }
    return this.#storedState![dataName];
  }

  deletePersistingData(dataName: Exclude<string, ProtectedStoredState>): void {
    if (["initialized", "cmpData", "cmpClasses"].includes(dataName)) {
      lre.warn("Unauthorized persisting data deletion " + dataName);
      return;
    }
    this.#loadState(this.#storedState);
    if (this.#storedState.hasOwnProperty(dataName)) {
      delete this.#storedState[dataName];
      this.#saveStoredState();
    }
  }

  isInitialized(): boolean {
    this.#loadState(this.#storedState);
    return !!this.#storedState["initialized"];
  }

  getPendingData(id: LetsRole.ComponentID): LetsRole.ComponentValue {
    return this.#batcher.getPendingData(id);
  }

  persistingCmpData(
    componentId: LetsRole.ComponentID,
    newData?: LetsRole.ViewData
  ): LetsRole.ViewData {
    if (arguments.length > 1) {
      return this.#persistingDataOperation("cmpData", componentId, newData);
    } else {
      return this.#persistingDataOperation("cmpData", componentId);
    }
  }

  persistingCmpClasses(
    componentId: LetsRole.ComponentID,
    newClasses?: Array<LetsRole.ClassName>
  ): Array<LetsRole.ClassName> {
    if (arguments.length > 1) {
      return this.#persistingDataOperation(
        "cmpClasses",
        componentId,
        newClasses!
      );
    } else {
      return this.#persistingDataOperation("cmpClasses", componentId) || [];
    }
  }
}

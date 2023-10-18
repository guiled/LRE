import { Component, REP_ID_SEP } from "../component";
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
  #silentFind: LetsRole.Component["find"];
  #batcher: DataBatcher;
  #storedState: SheetStoredState | undefined;
  #storedStateReceivedKeys: Array<string> = [];
  #componentCache: ComponentCache;
  #cmp: LetsRole.Component;
  #alphaId: string | undefined = undefined;
  rand: number;

  constructor(rawSheet: LetsRole.Sheet) {
    lre.log(`new sheet ${rawSheet.getSheetId()}`);
    super([
      [/* EventHolder params */ rawSheet.name()],
      [
        /* HasRaw params */ {
          getRaw: () => rawSheet,
          onRefresh: (newRaw: LetsRole.Sheet) => {
            this.#cmp = newRaw.get(newRaw.id());
            this.#silentFind = this.#cmp.find;
            this.transferEvents(this.#cmp);
            this.#batcher.transferEvents(this.#cmp);
          },
        },
      ],
    ]);
    this.rand = Math.floor(Math.random() * 100);
    this.#batcher = new DataBatcher(rawSheet);
    this.#batcher.linkEventTo("processed:sheet", this, "data:processed");
    this.#componentCache = new ComponentCache();
    this.#cmp = rawSheet.get(rawSheet.id())!;
    this.#silentFind = this.#cmp.find;
    this.#cmp.on("update", this.#handleDataUpdate.bind(this));
  }

  cleanCmpData(): void {
    this.#loadState(this.#storedState);

    const cmpIdsInCmpData: Array<string> = Object.keys(
      this.#storedState.cmpData
    );
    const cmpIdsInCmpClasses: Array<string> = Object.keys(
      this.#storedState.cmpClasses
    );
    const realIdToChecked: Array<string> = [
      ...cmpIdsInCmpData,
      ...cmpIdsInCmpClasses,
    ];
    const realIdToForget: Array<string> = [];

    const analyzeRealId = () => {
      const checking = realIdToChecked.splice(0, 20);
      checking.forEach((realId: string) => {
        const parts = realId.split(REP_ID_SEP);
        const length = parts.length;
        const base = parts.pop();
        if (length === 1 && !this.componentExists(base!)) {
          // forget data for non-existing components
          realIdToForget.push(realId);
        } else if (
          length === 3 &&
          !this.componentExists(parts.join(REP_ID_SEP))
        ) {
          // forget data for components in non-existing repeater entries
          realIdToForget.push(realId);
        }
      });
      if (realIdToChecked.length > 0) {
        wait(200, analyzeRealId);
      } else {
        realIdToForget.forEach((realId) => {
          delete this.#storedState!.cmpData[realId];
          delete this.#storedState!.cmpClasses[realId];
        });
        this.#saveStoredState();
      }
    };
    wait(200, analyzeRealId);
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
  getSheetAlphaId(): string {
    this.#alphaId ??= lre.numToAlpha(Number(this.getSheetId()));
    return this.#alphaId!;
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
    if (!((typeof id === "string" || id instanceof String) && isNaN(id))) {
      lre.error(`Invalid component id for sheet.get, ${id} given`);
      return null;
    }
    id = "" + id;

    const cmpInCache = this.#componentCache.inCache(id);

    if (cmpInCache) {
      return cmpInCache;
    }

    let rawCmp: LetsRole.Component | LetsRole.Sheet,
      container: Component | Sheet | null,
      tabId = id.split(REP_ID_SEP);

    if (tabId.length === 1) {
      container = this;
      rawCmp = this.raw().get(id);
    } else {
      let finalId = tabId.pop()!;
      let containerId = tabId.join(REP_ID_SEP);
      container = this.get(containerId, silent);
      if (!container || !container.id()) {
        !silent &&
          lre.error("Sheet.get returns null container for " + containerId);
        return null;
      }
      rawCmp = (container as Component).raw()?.find?.(finalId);
    }

    if (!rawCmp) {
      !silent && lre.error("Sheet.get returns null object for " + id);
      return null;
    } else if (!rawCmp.id()) {
      !silent && lre.error("Unable to find " + id);
      return null;
    }

    const cmp = ComponentFactory.create(rawCmp, container);
    this.#componentCache.set(cmp.realId(), cmp);
    return cmp;
  }

  find(id: string): ComponentSearchResult {
    return this.get(id);
  }

  componentExists(realId: string): boolean {
    const parts = realId.split(REP_ID_SEP);
    const cmp = this.#silentFind(parts[0]);
    if (!cmp || !cmp.id()) {
      return false;
    }
    if (parts.length > 1) {
      const val = this.raw().getData()[parts[0]];
      if (!val || !val.hasOwnProperty(parts[1])) {
        return false;
      }
      if (parts.length > 2) {
        let tmp = this.#silentFind(realId);
        if (!tmp || !tmp.id()) {
          return false;
        }
        tmp = this.raw().get(realId);
        let result = true;
        try {
          tmp.addClass("__lre_dummy");
          tmp.removeClass("__lre_dummy");
        } catch (e) {
          result = false;
        }
        if (!result) {
          return false;
        }
      }
    }
    return true;
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

  group(): any {
    // todo
  }
}

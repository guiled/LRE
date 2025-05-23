import { Component, REP_ID_SEP } from "../component";
import { EventHolder } from "../eventholder";
import { HasRaw } from "../hasraw";
import { ComponentCache } from "../component/cache";
import { DataBatcher } from "./databatcher";
import { ComponentFactory } from "../component/factory";
import { Mixin } from "../mixin";
import { Group } from "../component/group";

export type ClassChanges = Record<LetsRole.ClassName, 1 | -1>;

type SheetProtectedStoredState = {
  initialized: boolean;
  cmpData: Record<LetsRole.ComponentID, unknown>;
  cmpClasses: Record<LetsRole.ComponentID, ClassChanges>;
};

type SheetStoredState = SheetProtectedStoredState & Record<string, any>;

type ProtectedStoredState = keyof SheetProtectedStoredState;
type StoredState = ProtectedStoredState | string;

type SheetEvents = "data-pending" | "data-processed" | "data-updated";

export class Sheet
  extends (Mixin(EventHolder, HasRaw<LetsRole.Sheet>) as new <
    SubTypeEventHolder extends string,
  >(
    ...args: unknown[]
  ) => IEventHolder<SubTypeEventHolder> &
    InstanceType<ReturnType<typeof HasRaw<LetsRole.Sheet>>>)<SheetEvents>
  implements
    Omit<LetsRole.Sheet, "get" | "find" | "getData" | "prompt">,
    ISheet,
    ComponentContainer<ComponentSearchResult | IGroup>,
    ComponentCommon
{
  #silentFind: LetsRole.Component["find"];
  #batcher: DataBatcher;
  #storedState: SheetStoredState | undefined;
  #storedStateReceivedKeys: Array<string> = [];
  #componentCache: ComponentCache;
  #cmp: LetsRole.Component;
  #alphaId: string | undefined = undefined;
  #context: ProxyModeHandler;
  rand: number;

  constructor(
    rawSheet: LetsRole.Sheet,
    dataBatcher: DataBatcher,
    context: ProxyModeHandler,
  ) {
    LRE_DEBUG && lre.log(`new sheet ${rawSheet.getSheetId()}`);
    super([
      [/* EventHolder params */ rawSheet.name()],
      [
        /* HasRaw params */ {
          getRaw: () => rawSheet,
          onRefresh: (newRaw: LetsRole.Sheet) => {
            this.#cmp = newRaw.get(newRaw.id());
            this.#silentFind = this.#cmp.find.bind(this.#cmp);
            this.transferEvents(this.#cmp);
            this.#batcher.transferEvents(this.#cmp);
          },
        },
      ],
    ]);
    this.#context = context;
    this.rand = Math.floor(Math.random() * 100);
    this.#batcher = dataBatcher;
    this.#batcher.linkEventTo("processed:sheet", this, "data-processed");
    this.#batcher.linkEventTo("pending:sheet", this, "data-pending");
    this.#componentCache = new ComponentCache(
      this.#context,
      this.#componentGetter.bind(this),
    );
    this.#cmp = rawSheet.get(rawSheet.id())!;
    this.#silentFind = this.#cmp.find.bind(this.#cmp);
    this.#cmp.on("update", this.#handleDataUpdate.bind(this));
  }

  #componentGetter(id: string, silent = false): ComponentSearchResult {
    let rawCmp: LetsRole.Component | LetsRole.Sheet,
      container: IGroup | ComponentSearchResult | ISheet;
    const tabId = id.split(REP_ID_SEP);

    if (tabId.length === 1) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      container = this;
      rawCmp = this.raw().get(id);
    } else {
      const finalId = tabId.pop()!;
      const containerId = tabId.join(REP_ID_SEP);
      container = this.get(containerId, silent);

      if (!container || !container.id()) {
        if (!silent) {
          lre.error(`Sheet.get returns null container for ${containerId}`);
        }

        return null;
      }

      rawCmp = (container as Component).raw()?.find?.(finalId);
    }

    if (!rawCmp) {
      !silent && lre.error(`Sheet.get returns null object for ${id}`);
      return null;
    } else if (!rawCmp.id()) {
      !silent && lre.error(`Unable to find ${id}`);
      return null;
    }

    const cmp = ComponentFactory.create(
      rawCmp,
      container as ComponentContainer,
    );

    return cmp;
  }

  #persistingDataOperation<
    T extends keyof Omit<SheetStoredState, "initialized">,
    R extends SheetStoredState[T][keyof SheetStoredState[T]],
  >(type: T, componentId: LetsRole.ComponentID, newData?: R): R {
    this.#loadState(this.#storedState);

    if (!this.#storedState[type]) {
      this.#storedState[type] = {};
    }

    if (newData !== void 0) {
      this.#storedState[type][componentId] = newData;
      this.#saveStoredState();
    }

    return this.#storedState![type][componentId];
  }

  #handleDataUpdate(): void {
    LRE_DEBUG && lre.trace("data updated from server…");
    this.#loadState(this.#storedState);
    const data = this.raw().getData();

    const newSheetStoredState: SheetStoredState =
      (data[this.id()] as SheetStoredState) || {};
    const hasPendingData = !!this.getPendingData(this.id());

    const newStoreStateKeys = Object.keys(newSheetStoredState);

    const keysToDelete = this.#storedStateReceivedKeys.filter(
      (k) => !newStoreStateKeys.includes(k),
    );
    keysToDelete.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(this.#storedState, k)) {
        delete this.#storedState![k];
      }
    });
    const cmpWithChangedData = this.#getCmpWithChanges(
      newSheetStoredState.cmpData,
      this.#storedState.cmpData,
    );
    const cmpWithChangedClasses = this.#getCmpWithChanges(
      newSheetStoredState.cmpClasses,
      this.#storedState.cmpClasses,
    );
    this.#storedState = lre.deepMerge(this.#storedState, newSheetStoredState);
    this.#storedStateReceivedKeys = Object.keys(this.#storedState!);
    this.trigger("data-updated");
    cmpWithChangedData.forEach((c) => c.trigger("data-updated"));
    cmpWithChangedClasses.forEach((c) => c.trigger("class-updated"));

    if (hasPendingData) {
      LRE_DEBUG && lre.trace("pending data update");
      this.#saveStoredState();
    }
  }

  #getCmpWithChanges(
    newData: SheetProtectedStoredState["cmpData"],
    oldData: SheetProtectedStoredState["cmpData"],
  ): Array<Component> {
    const cmps: Array<Component> = [];
    Object.keys(newData || {}).forEach((cmpId) => {
      const cmpFromCache = this.#componentCache.inCache(cmpId) as Component;

      if (!!cmpFromCache && !lre.deepEqual(newData[cmpId], oldData[cmpId])) {
        cmps.push(cmpFromCache);
      }
    });
    return cmps;
  }

  #loadState(
    _state: SheetStoredState | undefined,
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

  cleanCmpData(): void {
    this.#loadState(this.#storedState);

    const cmpIdsInCmpData: Array<string> = Object.keys(
      this.#storedState.cmpData,
    );
    const cmpIdsInCmpClasses: Array<string> = Object.keys(
      this.#storedState.cmpClasses,
    );
    const realIdToChecked: Array<string> = [
      ...cmpIdsInCmpData,
      ...cmpIdsInCmpClasses,
    ];
    const realIdToForget: Array<string> = [];

    const analyzeRealId = (): void => {
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
        lre.wait(200, analyzeRealId, "analyzeRealId");
      } else {
        realIdToForget.forEach((realId) => {
          delete this.#storedState!.cmpData[realId];
          delete this.#storedState!.cmpClasses[realId];
        });
        this.#saveStoredState();
      }
    };

    lre.wait(200, analyzeRealId, "analyzeRealId");
  }

  lreType(): ComponentType {
    return "sheet";
  }

  sheet(): ISheet {
    return this;
  }

  getSheetType(): LetsRole.SheetType {
    return this.raw().getSheetType();
  }

  getVariable(id: string): number | null {
    return this.raw().getVariable(id);
  }

  prompt(
    title: string,
    view: string,
    callback: PromptResultCallback = () => {},
    callbackInit: PromptInitCallback = () => {},
  ): void {
    return this.raw().prompt(
      title,
      view,
      (result) => callback(result, this),
      (promptSheet: LetsRole.Sheet) =>
        callbackInit(lre.getSheet(promptSheet), this),
    );
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

  getSheetId(): LetsRole.SheetRealID {
    return this.raw().getSheetId();
  }

  name(): string {
    return this.raw().name();
  }

  properName(): string {
    return this.raw().properName();
  }

  get(id: string, silent = false): ComponentSearchResult | IGroup {
    // @ts-expect-error "id instanceof" on purpose for live checks in LR
    if (!((typeof id === "string" || id instanceof String) && isNaN(id))) {
      lre.error(`Invalid component id for sheet.get, ${id} given`);
      return null;
    }

    id = "" + id;

    return this.#componentCache.get(id, silent);
  }

  find(id: string): ComponentSearchResult {
    return this.get(id) as IComponent;
  }

  componentExists(realId: string): boolean {
    const parts = realId.split(REP_ID_SEP);
    const cmp = this.#silentFind(parts[0]);

    if (!cmp || !cmp.id()) {
      return false;
    }

    if (parts.length > 1) {
      const val = this.raw().getData()[parts[0]];

      if (!val || !Object.prototype.hasOwnProperty.call(val, parts[1])) {
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
    if (lre.__enableGroupedSetValue) {
      this.#batcher.setData(data);
    } else {
      this.raw().setData(data);
    }
  }

  getData(
    realId?: LetsRole.ComponentID,
  ): LetsRole.ViewData | LetsRole.ComponentValue {
    const data = {
      ...this.raw().getData(),
      ...(this.#batcher.getPendingData() as LetsRole.ViewData),
    };

    if (arguments.length === 0 || typeof realId === "undefined") {
      return data;
    }

    const realIdParts: Array<LetsRole.ComponentID | LetsRole.Index> =
      realId.split(REP_ID_SEP);

    if (realIdParts.length === 1) {
      return data[realId] as LetsRole.ComponentValue;
    }

    let result: LetsRole.ComponentValue | LetsRole.ViewData | undefined =
      data[realIdParts[0]];

    for (let i = 1; i < realIdParts.length; i++) {
      if (
        !result ||
        !lre.isRepeaterValue(result) ||
        !Object.prototype.hasOwnProperty.call(result, realIdParts[i])
      ) {
        return null;
      }

      result = result[realIdParts[i]];
    }

    return result;
  }

  sendPendingDataFor(id: LetsRole.ComponentID): void {
    this.#batcher.sendPendingDataFor(id);
  }

  persistingData<T extends StoredState>(
    dataName: T,
    value?: any,
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
      LRE_DEBUG &&
        lre.warn("Unauthorized persisting data deletion " + dataName);
      return;
    }

    this.#loadState(this.#storedState);

    if (Object.prototype.hasOwnProperty.call(this.#storedState, dataName)) {
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
    newData?: LetsRole.ViewData,
  ): LetsRole.ViewData {
    if (arguments.length > 1) {
      return this.#persistingDataOperation("cmpData", componentId, newData);
    } else {
      return this.#persistingDataOperation("cmpData", componentId);
    }
  }

  persistingCmpClasses(
    componentId: LetsRole.ComponentID,
    classChanges?: ClassChanges,
  ): ClassChanges {
    if (arguments.length > 1) {
      return this.#persistingDataOperation(
        "cmpClasses",
        componentId,
        classChanges,
      );
    } else {
      return this.#persistingDataOperation("cmpClasses", componentId) || {};
    }
  }

  forget(realId: LetsRole.ComponentID): void {
    this.#componentCache.forget(realId);
  }

  remember(realId: LetsRole.ComponentID): void {
    this.#componentCache.remember(realId);
  }

  knownChildren(cmp: IComponent): Array<IComponent> {
    return this.#componentCache
      .children(cmp.realId())
      .map((id) => this.get(id))
      .filter((c) => !!c) as Array<IComponent>;
  }

  group(
    groupId: string,
    componentIds: Array<LetsRole.ComponentID> = [],
  ): IGroup {
    if (this.#componentCache.inCache(groupId)) {
      const found = this.#componentCache.get(groupId)!;

      if (found.lreType() !== "group") {
        throw new Error(
          `Unable to get group ${groupId}, a component already exists with this id as a ${found.lreType()}.`,
        );
      }

      return found as IGroup;
    }

    if (this.componentExists(groupId)) {
      throw new Error(
        `Unable to create group ${groupId}, a component already exists with this id.`,
      );
    }

    const grp = new Group(this.#context, groupId, this, componentIds);
    this.#componentCache.set(groupId, grp);

    return grp;
  }
}

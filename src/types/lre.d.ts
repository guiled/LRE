declare type BasicObject<T = any> = { [key: string]: T };

declare interface ISheetCollection {
  add(s: Sheet): void;
  each(f: (v: Sheet, k?: LetsRole.SheetID) => any): void;
  get(sheetId: LetsRole.SheetID): Sheet | undefined;
}

declare interface ILRE {
  sheets: ISheetCollection;
  deepMerge(target: any, ...sources: any[]): any;
  deepEqual(x: any, y: any): boolean;
  numToAlpha(n: number): string;
  alphaToNum(s: string): number;
  getRandomId(): string;
  wait(delay: number, cb: () => void, name: string = "");
  autoNum(v: boolean = true): void;
  isIterableByEach(
    object: LetsRole.ComponentValue,
  ): object is LetsRole.EachValue;
  isObject<T extends BasicObject = BasicObject>(object: any): object is T;
  isAvatarValue(
    object: LetsRole.ComposedComponentValue,
  ): object is LetsRole.AvatarValue;
  isRepeaterValue(
    object: LetsRole.ComponentValue,
  ): object is LetsRole.RepeaterValue;
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  isObjectEmpty<T extends BasicObject = BasicObject>(object: T): object is {};
  isUseableAsIndex(value: any): value is number | string | bigint;
  __debug: boolean;
  __enableGroupedSetValue: boolean;
  dataProvider(
    id: string,
    valueCb: ValueGetterSetter,
    originalValueCb: ValueGetterSetter = valueCb,
    sourceRefresh?: () => void,
  ): IDataProvider;
  each<T extends LetsRole.EachValue = LetsRole.EachValue>(
    value: T,
    cb: LetsRole.EachCallback<T, T>,
  ): T;
}

declare interface ISheet extends LetsRole.Sheet, ComponentContainer<IGroup> {
  cleanCmpData(): void;
  lreType(): ComponentType;
  sheet(): ISheet;
  raw(): LetsRole.Sheet;
  getSheetAlphaId(): string;
  realId(): string;
  get(id: string, silent = false): ComponentSearchResult | IGroup;
  getData(
    realId?: LetsRole.ComponentID,
  ): LetsRole.ViewData | LetsRole.ComponentValue;
  find(id: string): ComponentSearchResult | IGroup;
  componentExists(realId: string): boolean;
  persistingData<T extends StoredState>(
    dataName: T,
    value?: any,
  ): SheetStoredState[T];
  deletePersistingData(dataName: Exclude<string, ProtectedStoredState>): void;
  sendPendingDataFor(id: LetsRole.ComponentID): void;
  isInitialized(): boolean;
  getPendingData(id: LetsRole.ComponentID): LetsRole.ComponentValue;
  persistingCmpData(
    componentId: LetsRole.ComponentID,
    newData?: LetsRole.ViewData,
  ): LetsRole.ViewData;
  persistingCmpClasses(
    componentId: LetsRole.ComponentID,
    classChanges?: ClassChanges,
  ): ClassChanges;
  forget(realId: LetsRole.ComponentID): void;
  remember(realId: LetsRole.ComponentID): void;
  knownChildren(cmp: IComponent): Array<IComponent>;
  group(groupId: string, componentIds: Array<LetsRole.ComponentID> = []): Group;
}

declare type ProxyModeHandlerLogType =
  | "value"
  | "rawValue"
  | "virtualValue"
  | "text"
  | "class"
  | "visible"
  | "data"
  | "cmp";

declare type ContextLogRecord =
  | [LetsRole.SheetRealIdDefined, LetsRole.ComponentID]
  | IEventHolder; // these could be removed when sheet can e identified as DiceResult, prompt, craft…
//  | IGroup; // these could be removed when sheet can e identified as DiceResult, prompt, craft…
declare type ContextLogByType = Array<ContextLogRecord>;
declare type ContextLog = Record<ProxyModeHandlerLogType, ContextLogByType> & {
  provider: Array<IDataProvider>;
};

declare interface ProxyModeHandler {
  setMode: (newMode: ProxyMode) => ProxyModeHandler;
  getMode: () => ProxyMode;
  disableAccessLog: () => ProxyModeHandler;
  enableAccessLog: () => ProxyModeHandler;
  logAccess: <T extends keyof ContextLog>(
    type: T,
    value: ContextLog[T][number],
  ) => ProxyModeHandler;
  getAccessLog: <T extends keyof ContextLog>(type: T) => ContextLog[T];
  getPreviousAccessLog: <T extends keyof ContextLog>(type: T) => ContextLog[T];
  setContext: (id: string, context: any) => ProxyModeHandler;
  getContext: <T = any>(id: string) => T;
  pushLogContext: () => ProxyModeHandler;
  popLogContext: () => ProxyModeHandler;
}
declare type ProxyMode = "real" | "virtual";

declare interface Logger {
  error(...args: any[]): void;
  warn(...args: any[]): void;
  trace(...args: any[]): void;
  log(...args: any[]): void;
  setLogLevel(level: keyof typeof LogLevel): void;
}

type cb = (thisArg?: any, argArray?: any) => (rawSheet: LetsRole.Sheet) => void;

declare module "lre" {
  global {
    /* eslint-disable no-var */
    var lre: ILRE & Logger & cb;
    var firstInit: undefined | ((sheet: ISheet) => boolean);
    var errExclFirstLine: number, errExclLastLine: number;
    var structuredClone: <T>(val: T) => T;
    var context: ProxyModeHandler;
    var isNaN: (n: unknown) => boolean;
    var lastException: unknown;
    var throwError: (err: unknown) => undefined;
    var newError: (err: message) => unknown;
    var stringify: (obj: unknown, indent?: boolean) => string | undefined;
    var virtualCall: <T>(cb: () => T) => T;
    var loggedCall: <T>(cb: () => T) => T;
    /* eslint-enable no-var */
  }
}

declare type ComponentType =
  | "component"
  | "sheet"
  | "label"
  | "container"
  | "repeater"
  | "choice"
  | "multichoice"
  | "entry"
  | "icon"
  | "group"
  | "checkbox";

declare interface ComponentCommon {
  lreType: (newType?: ComponentType) => ComponentType;
  sheet: () => ISheet;
  realId: () => string;
  //entry: (entry?: Entry) => Entry | undefined;
  //repeater: (repeater?: Repeater) => Repeater | undefined;
}

declare type EventHolderEvents =
  | "eventhandler-added"
  | "eventhandler-updated"
  | "eventhandler-removed"
  | "eventhandler-disabled"
  | "eventhandler-enabled"
  | "eventhandler-created"
  | "eventhandler-destroyed";

declare type EventHandler<Holder = any> = (
  cmp: Holder,
  ...rest: Array<any>
) => void;

declare type EventSubComponent =
  | LetsRole.ComponentID
  | EventHandler
  | undefined;

declare const EVENT_SEP = ":";

declare type EventHolderDefaultEvents = EventHolderEvents;
declare type EventType<T extends string = string> =
  | EventHolderDefaultEvents
  | EventHolderDefaultEvents
  | T
  | `${
      | EventHolderDefaultEvents
      | EventHolderDefaultEvents
      | T}${EVENT_SEP}${string}`;

declare type WithValue = {
  value: LetsRole.Component["value"];
};

declare type LREEventTarget = object &
  Pick<LetsRole.Component, "id"> &
  Partial<WithValue>;

declare type LREEventTargetWithValue = object &
  Pick<LetsRole.Component, "id"> &
  WithValue;

declare interface IEventHolder<
  AdditionalEvents extends string = EventHolderDefaultEvents,
> {
  id(): string | null;

  on(
    event: EventType<AdditionalEvents>,
    subComponent: LetsRole.ComponentID | EventHandler | undefined,
    handler?: EventHandler,
  ): void;

  once(
    event: EventType<AdditionalEvents>,
    handlerOrId: LetsRole.ComponentID | EventHandler,
    handler?: EventHandler,
  ): void;

  // Cancel the next callbacks of an event
  // Cancel happens only "once" per trigger
  cancelEvent(event: EventType<AdditionalEvents>): void;

  disableEvent(event: EventType<AdditionalEvents>): void;

  enableEvent(event: EventType<AdditionalEvents>): void;

  isEventEnabled(event: EventType<AdditionalEvents>): boolean;

  off(
    event: EventType<AdditionalEvents>,
    delegateId?: LetsRole.ComponentID,
  ): void;

  trigger(event: EventType<AdditionalEvents>, ...args: unknown[]): void;

  transferEvents(rawCmp: LetsRole.Component): void;

  linkEventTo(
    event: EventType<AdditionalEvents>,
    destination: EventHolder<any, any>,
    triggeredEvent: string = event,
  ): void;
  unlinkEventTo(
    event: EventType<AdditionalEvents>,
    destination: EventHolder<any, any>,
    triggeredEvent: string = event,
  ): void;

  propagateEventTo(
    destination: IEventHolder<any>,
    events?: Array<EventType<any>>,
  );
  unpropagateEventTo(destination: IEventHolder<any>);
}

declare type DataId = string;

declare type DataType = unknown;

declare type DataStorage = Record<DataId, DataType>;

declare interface IDataHolder {
  hasData(name: DataId): boolean;
  data(name: DataId): DataType;
  data(name: DataId, value: DataType = "", persistent = false): this | DataType;
  deleteData(name: DataId, persistent: boolean = false): this;
  loadPersistent(): DataStorage;
}

declare type DataProviderDataId =
  | LetsRole.ComponentID
  | keyof LetsRole.RepeaterValue
  | LetsRole.ColumnId
  | number;

declare type DataProviderDataValue =
  | LetsRole.TableRow
  | LetsRole.ComponentValue;

declare type DataProviderCallback<ReturnType> = (
  value: DataProviderDataValue,
  key?: DataProviderDataId,
  data?: DataProviderDataValue,
) => ReturnType;
declare type DataProviderWhereConditioner = DataProviderCallback<boolean>;
declare type DataProviderComputer = DataProviderCallback<string | number>;

declare interface IDataProvider {
  provider: boolean;
  providedValue<T extends DataProviderDataValue = DataProviderDataValue>(
    _newValue?: T,
  ): T extends undefined ? DataProviderDataValue : void;
  refresh(): void;
  sort(sorterOrString?: Sorter | string): IDataProvider;
  sortBy(sorterWithData: DataProviderComputer): IDataProvider;
  each(mapper: (val: DataProviderDataValue) => void): void;
  select(column: LetsRole.ComponentID): IDataProvider;
  getData(
    id: DataProviderDataId | Array<number | string>,
  ): DataProviderDataValue;
  filter(condition: DataProviderWhereConditioner);
  where(condition: DataProviderDataValue | DataProviderWhereConditioner);
  singleValue(): DataProviderDataValue;
  singleId(): DataProviderDataId;
  count(): number;
  length(): number;
  realId(): string;
  subscribeRefresh(id: string, refresh: () => void): void;
  unsubscribeRefresh(id: string): void;
}

declare interface ComponentBase {
  lreType(newValue?: ComponentType): ComponentType;
  realId(): string;
  sheet(): ISheet;
  raw(): LetsRole.Component | LetsRole.Sheet;
}

declare type ComponentFinder<T = ComponentSearchResult> = (
  id: string,
) => ComponentSearchResult | T;
declare type ComponentSearchResult = IComponent | null;

declare interface ComponentContainer<T = ComponentSearchResult>
  extends ComponentBase {
  get: ComponentFinder<T>;
  find: ComponentFinder<T>;
}

declare interface IHasRaw<T = LetsRole.Sheet | LetsRole.Component> {
  raw(): T;
  refreshRaw(newRaw?: T): T;
}

declare interface IComponent
  extends ComponentContainer,
    IEventHolder,
    IDataHolder,
    IHasRaw {
  init(): this;
  repeater(repeater?: Repeater): Repeater | undefined;
  entry(entry?: Entry): Entry | undefined;
  autoLoadSaveClasses(): this;
  toggle(): void;
  exists(): boolean;
  knownChildren(): Array<IComponent>;
  id(): LetsRole.ComponentID | null;
  index(): string | null;
  name(): string;
  setToolTip(text: string, placement?: LetsRole.TooltipPlacement): void;
  parent(newParent?: ComponentContainer): ComponentContainer | undefined;
  hide(): void;
  show(): void;
  addClass(className: LetsRole.ClassName): this;
  removeClass(className: LetsRole.ClassName): this;
  hasClass(className: LetsRole.ClassName): boolean;
  getClasses(): LetsRole.ClassName[];
  toggleClass(className: LetsRole.ClassName): this;
  value(): LetsRole.ComponentValue;
  value(newValue: unknown): void;
  value(newValue?: unknown): void | LetsRole.ComponentValue;
  virtualValue(): TypeValue | null;
  virtualValue(newValue: TypeValue): void;
  virtualValue(newValue?: TypeValue): TypeValue | null | void;
  rawValue(): TypeValue;
  text(replacement?: string): string | null | void;
  visible(): boolean;
  visible(
    newValue: boolean | ((...args: LetsRole.ComponentValue[]) => boolean),
  ): void;
  visible(
    newValue?: boolean | ((...args: LetsRole.ComponentValue[]) => boolean),
  ): boolean | void;
  setChoices(choices: LetsRole.Choices): void;
  valueData(): LetsRole.TableRow | LetsRole.ComponentValue | null;
}

declare interface IGroup extends IComponent, IDataProvider, IEventHolder {
  add(cmp: LetsRole.ComponentID | IComponent): this;
  remove(cmp: LetsRole.ComponentID | IComponent): this;
  includes(cmp: LetsRole.ComponentID | IComponent): boolean;
  contains(cmp: LetsRole.ComponentID | IComponent): boolean;
  has(cmp: LetsRole.ComponentID | IComponent): boolean;
  text(_replacement?: LetsRole.ViewData | undefined): void | LetsRole.ViewData;
}

declare type ComponentValueWithData<T = LetsRole.ComponentValue> = {
  value: T;
  data: LetsRole.ViewData;
};

declare type DynamicSetValue<T> =
  | T
  | IDataProvider
  | IComponent
  | IGroup
  | ((...args: any[]) => T);

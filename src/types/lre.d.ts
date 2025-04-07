declare type BasicObject<T = any> = { [key: string]: T };

declare interface ISheetCollection {
  add(s: Sheet): void;
  each(f: (v: Sheet, k?: LetsRole.SheetID) => any): void;
  get(sheetId: LetsRole.SheetID): Sheet | undefined;
}

declare interface ILREi18n {
  _(text: string): string;
  getUntranslated(): string[];
}

declare type LREInitRollCallback = (
  result: DiceResult,
  callback: (
    viewId: LetsRole.SheetID,
    onRender: (sheet: ISheet) => void,
  ) => void,
) => void;

declare interface ILRE {
  sheets: ISheetCollection;
  getSheet(sheet: LetsRole.Sheet): ISheet;
  init(
    callback: LetsRole.InitCallback<LetsRole.Sheet | Sheet>,
  ): LetsRole.InitCallback;
  initRoll: LREInitRollCallback;
  deepMerge(target: any, ...sources: any[]): any;
  deepEqual(x: any, y: any): boolean;
  numToAlpha(n: number): string;
  alphaToNum(s: string): number;
  getRandomId(length?: number): string;
  wait(delay: number, cb: () => void, name: string = "");
  autoNum(v: boolean = true): void;
  autoTransl(v: boolean = true): void;
  value<T = any>(n: T): T;
  isComponent(value: any): value is IComponent;
  isDataProvider(value: any): value is IDataProvider;
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
  isIndex(value: any): value is number | string | bigint;
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
  i18n: ILREi18n;
  tables(_Tables: LetsRole.Tables): void;
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
  prompt(
    title: string,
    view: string,
    callback: (result: LetsRole.ViewData) => void = () => {},
    callbackInit: (promptView: ISheet) => void = () => {},
  ): void;
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
  | [NonNullable<LetsRole.SheetRealID>, LetsRole.ComponentID]
  | (IEventHolder & { realId: () => string }); // these could be removed when sheet can e identified as DiceResult, prompt, craft…
//  | IGroup; // these could be removed when sheet can e identified as DiceResult, prompt, craft…
declare type ContextLogByType = Array<ContextLogRecord>;
declare type ContextLog = Record<ProxyModeHandlerLogType, ContextLogByType> & {
  provider: Array<IDataProviderAsSource>;
};

declare interface ProxyModeHandler {
  setMode: (newMode: ProxyMode) => ProxyModeHandler;
  getMode: () => ProxyMode;
  disableAccessLog: () => ProxyModeHandler;
  enableAccessLog: () => ProxyModeHandler;
  getLogEnabled(): boolean;
  setLogEnabled(enabled: boolean): this;
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
  getLastLog(): Partial<ContextLog>;
  call<T>(enabled: boolean, callback: () => T): [T, Partial<ContextLog>];
}
declare type ProxyMode = "real" | "virtual";

declare interface Logger {
  error(...args: any[]): void;
  warn(...args: any[]): void;
  info(...args: any[]): void;
  trace(...args: any[]): void;
  profile(...args: any[]): void;
  log(...args: any[]): void;
  push(...args: any[]): void;
  pop(): void;
  setLogLevel(level: keyof typeof LogLevel): void;
}

type cb = (thisArg?: any, argArray?: any) => (rawSheet: LetsRole.Sheet) => void;

declare module "lre" {
  global {
    /* eslint-disable no-var */
    var LRE_DEBUG: boolean;
    // This optimization is disabled because it naturally triggers repeater update event on every change
    // Just kept in case Let's Role changed its behavior one day
    var REPEATER_OPTIMIZATION_ENABLED: boolean;
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
  | T
  | `${EventHolderDefaultEvents | T}${EVENT_SEP}${string}`;

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

declare type SortDirection = "ASC" | "DESC";

declare type DataProviderGetValue =
  DataProviderCallback<LetsRole.ComponentValue>;

declare type DataProviderValueComparator = (
  a: DataProviderDataValue,
  b: DataProviderDataValue,
) => boolean;

declare interface IDataProvider {
  provider: boolean;
  providedValue<T extends DataProviderDataValue = DataProviderDataValue>(
    _newValue?: T,
  ): T extends undefined ? DataProviderDataValue : void;
  refresh(): void;
  sort(
    sorterOrString?: Sorter | string,
    direction: SortDirection = "ASC",
  ): IDataProvider;
  sortBy(
    sorterWithData: DataProviderComputer,
    direction: SortDirection = "ASC",
  ): IDataProvider;
  each(
    mapper: (val: DataProviderDataValue, key: DataProviderDataId) => void,
  ): void;
  select(column: DynamicSetValue<LetsRole.ComponentID>): IDataProvider;
  getData(
    id?: DataProviderDataId | Array<number | string>,
  ): DataProviderDataValue;
  filter(condition: DataProviderWhereConditioner, name?: string): IDataProvider;
  where(
    column:
      | string
      | LetsRole.ComponentValue
      | DataProviderWhereConditioner
      | IComponent,
    condition?:
      | LetsRole.ComponentValue
      | DataProviderWhereConditioner
      | IComponent,
  ): IDataProvider;
  singleValue(): DataProviderDataValue;
  singleId(): DataProviderDataId;
  count(): number;
  countDistinct(column?: string): number;
  length(): number;
  id(): string;
  realId(): string;
  subscribeRefresh(id: string, refresh: () => void): void;
  unsubscribeRefresh(id: string): void;
  min(criteria?: string | DataProviderGetValue): IDataProvider;
  max(criteria?: string | DataProviderGetValue): IDataProvider;
  sum(column?: string): number;
  limit(nb: number): IDataProvider;
  getBy(
    dataValueOrColumn: string | DataProviderGetValue,
    value: LetsRole.ComponentValue,
  ): DataProviderDataValue;
  transform(
    map:
      | Record<string | number, string | number | DataProviderCallback>
      | string
      | DataProviderCallback<Record<string | number, string | number> | string>,
  ): IDataProvider;
  toArray(transform?: DataProviderCallback): Array<unknown>;
  search(column: string, value: LetsRole.ComponentValue): IDataProvider;
  union(dataProvider: IDataProvider): IDataProvider;
}

declare type IDataProviderAsSource = Pick<
  IDataProvider,
  | "provider"
  | "providedValue"
  | "realId"
  | "subscribeRefresh"
  | "unsubscribeRefresh"
>;

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
  valueProvider(): IDataProvider | undefined;
  dataProvider(): IDataProvider | undefined;
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

declare type TableRow = LetsRole.TableRow<LetsRole.TableValue | number>;

declare interface ITable extends LetsRole.Table, IDataProvider {
  id(): LetsRole.TableID;
  get(id: DynamicSetValue<LetsRole.ColumnId>): TableRow | null;
  each(callback: (row: TableRow, key: string | number) => void): void;
}

declare interface ITables extends LetsRole.Tables {
  get(id: LetsRole.TableID, arg?: unknown): ITable | null;
  register(id: LetsRole.TableID, data: ScriptTableSource): void;
}

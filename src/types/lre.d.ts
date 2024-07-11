declare type BasicObject<T = any> = { [key: string]: T };

declare interface ILRE {
  deepMerge(target: any, ...sources: any[]): any;
  deepEqual(x: any, y: any): boolean;
  numToAlpha(n: number): string;
  alphaToNum(s: string): number;
  wait(delay: number, cb: () => void, name: string = "");
  autoNum(v: boolean = true): void;
  value<T = any>(n: T): number | T;
  isObject<T extends BasicObject = BasicObject>(object: any): object is T;
  isAvatarValue(
    object: LetsRole.ComposedComponentValue
  ): object is LetsRole.AvatarValue;
  isRepeaterValue(
    object: LetsRole.ComponentValue
  ): object is LetsRole.RepeaterValue;
  isObjectEmpty<T extends BasicObject = BasicObject>(object: any): object is {};
  isUseableAsIndex(value: any): value is number | string | bigint;
  __debug: boolean = false;
  __enableGroupedSetValue: boolean = true;
}

declare interface ISheet extends LetsRole.Sheet, ComponentContainer<IGroup> {
  cleanCmpData(): void;
  lreType(): ComponentType;
  sheet(): ISheet;
  raw(): LetsRole.Sheet;
  getSheetAlphaId(): string;
  realId(): string;
  get(id: string, silent = false): ComponentSearchResult | IGroup;
  find(id: string): ComponentSearchResult | IGroup;
  componentExists(realId: string): boolean;
  persistingData<T extends StoredState>(
    dataName: T,
    value?: any
  ): SheetStoredState[T];
  deletePersistingData(dataName: Exclude<string, ProtectedStoredState>): void;
  sendPendingDataFor(id: LetsRole.ComponentID): void;
  isInitialized(): boolean;
  getPendingData(id: LetsRole.ComponentID): LetsRole.ComponentValue;
  persistingCmpData(
    componentId: LetsRole.ComponentID,
    newData?: LetsRole.ViewData
  ): LetsRole.ViewData;
  persistingCmpClasses(
    componentId: LetsRole.ComponentID,
    classChanges?: ClassChanges
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

declare type ContextLog = Partial<
  Record<ProxyModeHandlerLogType, Array<LetsRole.ComponentID>>
>;

declare interface ProxyModeHandler {
  setMode: (newMode: ProxyMode) => this;
  getMode: () => ProxyMode;
  resetAccessLog: () => this;
  disableAccessLog: () => this;
  enableAccessLog: () => this;
  logAccess: (
    type: ProxyModeHandlerLogType,
    value: LetsRole.ComponentID
  ) => this;
  getAccessLog: (type: ProxyModeHandlerLogType) => Array<LetsRole.ComponentID>;
  getPreviousAccessLog: (
    type: ProxyModeHandlerLogType
  ) => Array<LetsRole.ComponentID>;
  setContext: (id: string, context: any) => this;
  getContext: <T = any>(id: string) => T;
}
declare type ProxyMode = "real" | "virtual";

declare var context: ProxyModeHandler;
declare var isNaN = (n: any) => boolean;
declare var structuredClone = <T = any>(val: T) => T;
declare var lastException: any;
declare var throwError = (err: any) => undefined;
declare var newError = (err: message) => any;
declare var stringify = (obj: any, indent: string = "") => string;
declare var virtualCall = <T extends any>(cb: () => T) => T;
declare var loggedCall = <T extends any>(cb: () => T) => T;

declare interface Logger {
  error(...args: any[]): void;
  warn(...args: any[]): void;
  trace(...args: any[]): void;
  log(...args: any[]): void;
  setLogLevel(level: keyof typeof LogLevel): void;
}

type cb = (thisArg: any, argArray?: any) => (rawSheet: LetsRole.Sheet) => void;

declare var lre: ILRE & Logger & cb;
declare var firstInit: undefined | ((sheet: ISheet) => boolean);
declare var errExclFirstLine: number, errExclLastLine: number;

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

declare type LREEventTarget = Object &
  Pick<LetsRole.Component, "id"> &
  Partial<WithValue>;

declare type LREEventTargetWithValue = Object &
  Pick<LetsRole.Component, "id"> &
  WithValue;

declare interface IEventHolder<
  AdditionalEvents extends string = EventHolderDefaultEvents
> {
  id(): string;

  on(
    event: EventType<AdditionalEvents>,
    subComponent: LetsRole.ComponentID | EventHandler | undefined,
    handler?: EventHandler
  ): void;

  once(
    event: EventType<AdditionalEvents>,
    handlerOrId: LetsRole.ComponentID | EventHandler,
    handler?: EventHandler
  ): void;

  // Cancel the next callbacks of an event
  // Cancel happens only "once" per trigger
  cancelEvent(event: EventType<AdditionalEvents>): void;

  disableEvent(event: EventType<AdditionalEvents>): void;

  enableEvent(event: EventType<AdditionalEvents>): void;

  isEventEnabled(event: EventType<AdditionalEvents>): boolean;

  off(
    event: EventType<AdditionalEvents>,
    delegateId?: LetsRole.ComponentID
  ): void;

  trigger(event: EventType<AdditionalEvents>, ...args: unknown[]): void;

  transferEvents(rawCmp: LetsRole.Component): void;

  linkEventTo(
    event: EventType<AdditionalEvents>,
    destination: EventHolder<any, any>,
    triggeredEvent: string = event
  ): void;
  unlinkEventTo(
    event: EventType<AdditionalEvents>,
    destination: EventHolder<any, any>,
    triggeredEvent: string = event
  ): void;

  propagateEventTo(
    destination: IEventHolder<any>,
    events?: Array<EventType<any>>
  );
  unpropagateEventTo(destination: IEventHolder<any>);
}

declare interface IDataHolder {
  hasData(name: DataId): boolean;
  data(name: DataId, value: any = "", persistent = false): this;
  deleteData(name: DataId, persistent: boolean = false): this;
  loadPersistent(): LetsRole.ViewData;
}

declare type DataProviderDataId =
  | LetsRole.ComponentID
  | keyof LetsRole.RepeaterValue
  | LetsRole.ColumnId
  | number;

declare type DataProviderDataValue =
  | LetsRole.TableRow
  | LetsRole.ComponentValue;

declare type DataProviderWhereConditioner = (
  value: LetsRole.ComponentValue | LetsRole.TableRow,
  key: DataProviderDataId,
  data: DataProviderDataValue
) => boolean;

declare interface IDataProvider {
  provider: boolean;
  providedValue<T extends DataProviderDataValue = DataProviderDataValue>(
    _newValue?: T
  ): T extends undefined ? DataProviderDataValue : void;
  sort(): IDataProvider;
  each(mapper: (val: DataProviderDataValue) => void): void;
  select(column: LetsRole.ComponentID): IDataProvider;
  getData(id: DataProviderDataId): DataProviderDataValue;
  filter(condition: DataProviderWhereConditioner);
  where(condition: DataProviderDataValue | DataProviderWhereConditioner);
  singleValue(): DataProviderDataValue;
  singleId(): DataProviderDataId;
  count(): number;
  length(): number;
}

declare interface ComponentBase {
  lreType(newValue?: ComponentType): ComponentType;
  realId(): string;
  sheet(): ISheet;
  raw(): LetsRole.Component | LetsRole.Sheet;
}

declare type ComponentFinder<T = ComponentSearchResult> = (
  id: string
) => ComponentSearchResult | T;
declare type ComponentSearchResult = IComponent | null;

declare interface ComponentContainer<T = ComponentSearchResult>
  extends ComponentBase {
  get: ComponentFinder<T>;
  find: ComponentFinder<T>;
}

declare interface IComponent
  extends ComponentContainer,
    IEventHolder<any>,
    IDataHolder {
  init(): this;
  repeater(repeater?: Repeater): Repeater | undefined;
  entry(entry?: Entry): Entry | undefined;
  autoLoadSaveClasses(): this;
  toggle(): void;
  exists(): boolean;
  knownChildren(): Array<IComponent>;
  id(): LetsRole.ComponentID;
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
  value(newValue?: unknown): void | LetsRole.ComponentValue;
  virtualValue(newValue?: TypeValue): void | TypeValue;
  rawValue(): TypeValue;
  text(replacement?: string): string | null | void;
  visible(newValue?: boolean | ((...args: any[]) => any)): boolean;
  setChoices(choices: LetsRole.Choices): void;
  valueData(): LetsRole.TableRow | LetsRole.ComponentValue | null;
}

declare interface IGroup extends IComponent, IDataProvider, IEventHolder {
  text(_replacement?: LetsRole.ViewData | undefined): void | LetsRole.ViewData;
}

declare type ComponentValueWithData<T = LetsRole.ComponentValue> = {
  value: T;
  data: LetsRole.ViewData;
};

declare type DynamicSetValue<T> = T | IDataProvider | ((...args: any[]) => T);

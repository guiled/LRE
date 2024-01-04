declare interface ILRE {
  deepMerge(target: any, ...sources: any[]): any;
  deepEqual(x: any, y: any): boolean;
  numToAlpha(n: number): string;
  alphaToNum(s: string): number;
  wait(delay: number, cb: () => void, name: string = "");
  autoNum(v: boolean = true): void;
  value<T = any>(n: T): number | T;
  __debug: boolean = false;
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
declare var structuredClone = (val: any) => any;
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
declare var firstInit: undefined | ((sheet: Sheet) => boolean);
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
  | "icon";

declare interface ComponentCommon {
  lreType: (newType?: ComponentType) => ComponentType;
  sheet: () => Sheet;
  realId: () => string;
  //entry: (entry?: Entry) => Entry | undefined;
  //repeater: (repeater?: Repeater) => Repeater | undefined;
}

declare const EVENT_SEP = ":";

declare type EventHolderEvents =
  | "eventhandler-added"
  | "eventhandler-updated"
  | "eventhandler-removed"
  | "eventhandler-disabled"
  | "eventhandler-enabled"
  | "eventhandler-created"
  | "eventhandler-destroyed";


declare type EventHolderDefaultEvents = EventHolderEvents;
declare type EventType<T extends string> =
  | EventHolderDefaultEvents
  | T
  | `${EventHolderDefaultEvents | T}${typeof EVENT_SEP}${string}`;

declare type LREEventTarget = Object &
  Pick<LetsRole.Component, "id"> &
  Partial<{
    value: LetsRole.Component["value"];
  }>;

declare interface IEventHolder<
  AdditionalEvents extends string = EventHolderDefaultEvents
> {
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
}

declare interface ComponentBase {
  lreType(): ComponentType;
  realId(): string;
  sheet(): Sheet;
  raw(): LetsRole.Component | LetsRole.Sheet;
}

declare type ComponentFinder = (id: string) => ComponentSearchResult;
declare type ComponentSearchResult = Component | null;

declare interface ComponentContainer extends ComponentBase {
  get: ComponentFinder;
  find: ComponentFinder;
}

declare interface IComponent extends ComponentContainer {
  init(): this;
  repeater(repeater?: Repeater): Repeater | undefined;
  entry(entry?: Entry): Entry | undefined;
  autoLoadSaveClasses(): this;
  toggle(): void;
  exists(): boolean;
  knownChildren(): Array<Component>;
  id(): LetsRole.ComponentID;
  index(): string | null;
  name(): string;
  setTooltip(text: string, placement?: LetsRole.TooltipPlacement): void;
  parent(newParent?: ComponentContainer): ComponentContainer | undefined;
  hide(): void;
  show(): void;
  addClass(className: LetsRole.ClassName): this;
  removeClass(className: LetsRole.ClassName): this;
  hasClass(className: LetsRole.ClassName): boolean;
  getClasses(): LetsRole.ClassName[];
  toggleClass(className: LetsRole.ClassName): this;
  value(newValue?: unknown): void | LetsRole.ComponentValue
  virtualValue(
    newValue?: TypeValue
  ): void | TypeValue
  rawValue(): TypeValue;
  text(replacement?: string): string | void;
  visible(newValue?: boolean | ((...args: any[]) => any)): boolean;
  setChoices(choices: LetsRole.Choices): void;
}
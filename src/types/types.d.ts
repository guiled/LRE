declare namespace LetsRole {
  export type Name = string;
  export type ViewData = Partial<{
    [key: LetsRole.ComponentID]: LetsRole.ComponentValue;
  }>;
  export type Index = string;

  const RAW_EVENTS = [
    "click",
    "update",
    "mouseenter",
    "mouseleave",
    "keyup",
  ] as const;
  export type EventType = (typeof RAW_EVENTS)[number];
  export type EventCallback<T = Component> = (
    cmp: T,
    ...args: unknown[]
  ) => void;
  export type ClassName = string;
  export type ClassSelector = `.${ClassName}`;

  export type BaseComponentValue = undefined | null | number | string | boolean;
  export type RepeaterValue = {
    [key: Index]: LetsRole.ViewData;
  };
  export type MultiChoiceValue = Array<string>;
  export type ComponentValue =
    | LetsRole.BaseComponentValue
    | LetsRole.RepeaterValue
    | LetsRole.MultiChoiceValue
    | LetsRole.ViewData;
  export type Choices = Record<string, string>;

  export type Selector = LetsRole.ComponentID | LetsRole.ClassSelector;

  export type ViewID = string;
  export type SheetID = string;
  export type SheetRealID = string;
  export type ComponentID = string;
  export type VariableID = string;
  export type TooltipPlacement = "top" | "right" | "bottom" | "left";
  export type RollVisibility = "visible" | "gm" | "gmonly";

  export interface Sheet extends Object {
    /** get the id of the sheet */
    id(): LetsRole.SheetID;

    getSheetId(): LetsRole.SheetRealID;

    name(): Name;
    properName(): Name;

    get: ComponentFinder;
    getVariable(id: LetsRole.VariableID): number | null;

    prompt(
      title: string,
      view: LetsRole.ViewID,
      callback: (result: ViewData) => void,
      callbackInit: (promptView: Sheet) => void
    ): void;

    setData(data: ViewData): void;

    getData(): ViewData;
  }

  export interface Component<ValueType = ComponentValue> extends Object {
    id(): LetsRole.ComponentID;

    index(): Index | null;

    name(): Name;

    sheet(): Sheet;

    parent(): Component;

    find: ComponentFinder;

    on(event: EventType, callback: EventCallback): void;
    on(event: EventType, delegate: Selector, callback: EventCallback): void;

    off(event: EventType): void;
    off(event: EventType, delegate: Selector): void;

    hide(): void;
    show(): void;

    addClass(className: ClassName): void;
    removeClass(className: ClassName): void;
    getClasses(): ClassName[];
    hasClass(className: ClassName): boolean;
    toggleClass(className: ClassName): void;

    value(): ValueType;
    value(newValue: ValueType): void;
    virtualValue(): ValueType;
    virtualValue(newValue: ValueType): void;

    rawValue(): ValueType;

    text(): string;
    text(replacement: string): void;

    visible(): boolean;

    setChoices(choices: LetsRole.Choices): void;

    setTooltip(text: string, placement?: TooltipPlacement): void;
  }

  export type Variable = {};

  export type TableID = string;
  export type TableColumn = string;
  export type TableValue = string;
  export type TableRow = Record<TableColumn, TableValue>;
  export type ColumnId = string;

  export type Tables = {
    get: (id: TableID) => Table;
  };

  export type Table = {
    get: (id: ColumnId) => TableRow;
    each: (callback: (row: TableRow) => void) => void;
    random: (callback: (row: TableRow) => void) => void;
    random: (count: number, callback: (row: TableRow) => void) => void;
  };

  export type InitCallback<T = LetsRole.Sheet> = (sheet: T) => void;
  export type ComponentFinder<T = Component> = (id: ComponentID) => Component;

  type ErrorTraceLocation = {
    column: number;
    line: number;
  };
  type ErrorTraceLoc = {
    start: ErrorTraceLocation;
    end: ErrorTraceLocation;
  };
  type ErrorTrace = {
    type: string;
    loc: ErrorTraceLoc;
    callee?: {
      name: string;
    };
  };
  export type Error = {
    name: string;
    message: string;
    trace?: ErrorTrace[];
  };

  export type Bindings = {
    add: (
      name: string,
      componentId: LetsRole.ComponentID,
      viewId: LetsRole.ViewID,
      dataCallback: (...args: any[]) => LetsRole.ViewData
    ) => void;
    send: (sheet: LetsRole.Sheet, name: string) => void;
    remove: (name: string) => void;
    clear: (componentId: LetsRole.ComponentID) => void;
  };
}
declare function log(input: any): void;
declare var wait: (delay: number, callback: (...args: any[]) => void) => void;
declare function each(
  data: Array | Object,
  callback: (d: any, k?: any) => void
);
declare var init: LetsRole.InitCallback;
declare var Tables: LetsRole.Tables;

declare var Bindings: LetsRole.Bindings;

declare class RollBuilder {
  constructor(sheet: LetsRole.Sheet);
  roll();
  expression(expr: string);
  title(title: string);
  visibility(visibility: LetsRole.RollVisibility);
  addAction(title: string, callback: (...args: any[]) => void);
  removeAction(title: string);
  onRoll(callback: (...args: any[]) => void);
}
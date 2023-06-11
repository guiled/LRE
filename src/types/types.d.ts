declare namespace LetsRole {
  export type Name = string;
  export type ViewData = {
    [key: LetsRole.ComponentID]: LetsRole.ComponentValue;
  };
  export type Index = string;

  const RAW_EVENTS = ['click', 'update', 'mouseenter', 'mouseleave', 'keyup'] as const;
  export type EventType = typeof RAW_EVENTS[number];
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
    | LetsRole.MultiChoiceValue;
  export type Choices = Record<string, string>;

  export type Selector = LetsRole.ComponentID | LetsRole.ClassSelector;

  export type ViewID = string;
  export type SheetID = string;
  export type ComponentID = string;
  export type VariableID = string;

  export interface Sheet {
    /** get the id of the sheet */
    id(): LetsRole.SheetID;

    getSheetId(): string;

    name(): Name;

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

  export interface Component<ValueType = ComponentValue> {
    id(): LetsRole.ComponentID;

    index(): Index;

    name(): Name;

    sheet(): Sheet;

    parent(): Component;

    find: ComponentFinder;

    on(event: EventType, callback: (cmp: Component) => void): void;
    on(
      event: EventType,
      delegate: Selector,
      callback: (cmp: Component) => void
    ): void;

    off(event: EventType): void;
    off(event: EventType, delegate: Selector): void;

    hide(): void;
    show(): void;

    addClass(className: ClassName): void;
    removeClass(className: ClassName): void;

    value(): ValueType;
    value(newValue: ValueType): void;
    virtualValue(): ValueType;
    virtualValue(newValue: ValueType): void;

    rawValue(): ValueType;

    text(): string;
    text(replacement: string): void;

    visible(): boolean;

    setChoices(choices: LetsRole.Choices): void;
  }

  export type Variable = {};

  export type TableID = string;
  export type TableColumn = string;
  export type TableValue = string;
  export type TableRow = Record<TableColumn, TableValue>;

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
}
declare function log(input: any): void;
declare function wait(delay: number, callback: (...args: any[]) => void);
declare function each(
  data: Array | Object,
  callback: (d: any, k?: any) => void
);
declare var init: LetsRole.InitCallback;
declare var Tables: LetsRole.Tables;

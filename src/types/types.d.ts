type Callback<ReturnType = void> = (...args: any[]) => ReturnType;

declare namespace LetsRole {
  export type Name = string;
  export type ViewData = Partial<{
    [key: string]: ComponentValue;
  }>;
  export type Index = string;

  const RAW_EVENTS = [
    "click",
    "update",
    "mouseenter",
    "mouseleave",
    "keyup",
    "change",
  ] as const;
  export type EventType = (typeof RAW_EVENTS)[number];
  export type EventCallback<T = Component> = (
    cmp: T,
    ...args: unknown[]
  ) => void;
  export type ClassName = string;
  export type ClassSelector = `.${ClassName}`;

  export type BaseComponentValue = undefined | null | number | string | boolean;
  export type RepeaterValue =
    | {
        [key: Index]: ViewData;
      }
    | undefined;
  export type ChoiceValue = string;
  export type ChoiceValues = Array<string>;
  export type MultiChoiceValue = Array<ChoiceValue>;
  export type AvatarValue =
    | {
        avatar: string;
        token: string;
        frame: {
          avatar: string | null;
          token: string | null;
        };
      }
    | undefined;
  export type ComposedComponentValue =
    | RepeaterValue
    | MultiChoiceValue
    | ViewData
    | AvatarValue;
  export type ComponentValue =
    | BaseComponentValue
    | ChoiceValue
    | ComposedComponentValue;
  export type ValueAsObject =
    | Exclude<RepeaterValue, undefined>
    | ViewData
    | AvatarValue;
  export type Choices = Record<ChoiceValue, string>;

  export type Selector = ComponentID | ClassSelector;

  export type ViewID = string;
  export type SheetID = string;
  export type SheetRealID = string | undefined; // undefined is for prompt view
  export type ComponentID = string;
  export type ComponentInRepeaterID = `${string}.${string}`;
  export type VariableID = string;
  export type TooltipPlacement = "top" | "right" | "bottom" | "left";
  export type RollVisibility = "visible" | "gm" | "gmonly";
  export type SheetType = "character" | "craft" | "prompt";

  export interface Sheet extends object {
    /** get the id of the sheet */
    id(): SheetID;

    getSheetId(): SheetRealID;

    name(): Name;
    properName(): Name;

    get: ComponentFinder;
    getVariable(id: VariableID): number | null;

    prompt(
      title: string,
      view: ViewID,
      callback: (result: ViewData) => void,
      callbackInit: (promptView: Sheet) => void,
    ): void;

    setData(data: ViewData): void;

    getData(): ViewData;

    getSheetType(): SheetType;
  }

  export interface Component<ValueType = ComponentValue> extends object {
    id(): ComponentID | null;

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

    value(): ValueType | undefined;
    value(newValue: ValueType): void;
    virtualValue(): ValueType | null;
    virtualValue(newValue: ValueType): void;

    rawValue(): ValueType;

    text(): string | null; // null is for choice expanded multiple
    text(replacement: string): void;

    visible(): boolean;

    setChoices(choices: Choices): void;

    setToolTip(text: string, placement?: TooltipPlacement): void;
  }

  export type Variable = Record<VariableID, number>;

  export type TableID = string;
  export type TableColumn = string;
  export type TableValue = string;
  export type TableRow<T = TableValue> = { id: T } & Record<TableColumn, T>;
  export type ColumnId = string;

  export type Tables = {
    get: (id: TableID) => Table | null;
  };

  export type Table = {
    get: (id: TableValue) => TableRow | null;
    each: (callback: (row: TableRow) => void) => void;
    random: (callback: (row: TableRow) => void) => void;
    random: (count: number, callback: (row: TableRow) => void) => void;
  };

  export type InitCallback<T = Sheet> = (sheet: T) => void;
  export type ComponentFinder<T = Component> = (id: ComponentID) => T;

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
    name?: string;
    message?: string;
    trace?: ErrorTrace[];
  };

  export type Bindings = {
    add: (
      name: string,
      componentId: ComponentID,
      viewId: ViewID,
      dataCallback: Callback<ViewData>,
    ) => void;
    send: (sheet: Sheet, name: string) => void;
    remove: (name: string) => void;
    clear: (componentId: ComponentID) => void;
  };

  export type DiceResult = unknown; // todo

  export type InitRollCallback = (
    result: DiceResult,
    callback: (view: ViewID, onRender: (sheet: Sheet) => void) => void,
  ) => void;

  export type GetReferenceCallback = (sheet: Sheet) => ViewData;

  export type BarAttributes = Record<
    ComponentID,
    [ComponentID, ComponentID | number]
  >;

  export type GetBarAttributesCallback = (sheet: Sheet) => BarAttributes;

  type NumericalString = `${number}` | number;

  export type CriticalHits = Record<
    NumericalString,
    Record<CriticalHitColors, Array<number>>
  >;

  export type CriticalHitColors =
    | "critical"
    | "fumble"
    | "red"
    | "orange"
    | "yellow"
    | "green"
    | "cyan"
    | "magenta"
    | "pink";

  export type GetCriticalHitsCallback = (result: DiceResult) => CriticalHits;

  export type DropDiceCallback = (result: DiceResult, to: Sheet) => void;

  export type DropCallback = (from: Sheet, to: Sheet) => void | string;

  export type DiceCompare = "<" | ">" | "<=" | ">=";

  export type DiceCreated = {
    add: (value: number) => DiceCreated;
    minus: (value: number) => DiceCreated;
    multiply: (value: number) => DiceCreated;
    divide: (value: number) => DiceCreated;
    tag: (...tags: string[]) => DiceCreated;
    compare: (
      type: DiceCompare,
      right: number,
      weights?: unknown,
    ) => DiceCreated;
    round: () => DiceCreated;
    ceil: () => DiceCreated;
    floor: () => DiceCreated;
    keeph: (max: number) => DiceCreated;
    keepl: (max: number) => DiceCreated;
    remh: (max: number) => DiceCreated;
    reml: (max: number) => DiceCreated;
    expl: (...explodes: number[]) => DiceCreated;
    expladd: (...explodes: number[]) => DiceCreated;
    mul: (multiplier: number) => DiceCreated;
    reroll: (...reroll: number[]) => DiceCreated;
    rerolln: (...reroll: number[], max) => DiceCreated;
    ternary: (then: string, _else: string) => DiceCreated;
  };

  export type DiceAPI = {
    create: (formula: string) => DiceCreated;
    roll: (dice: DiceCreated) => void;
  };

  export type RollBuilderInstance = {
    roll();
    expression(expr: string);
    title(title: string);
    visibility(visibility: RollVisibility);
    addAction(title: string, callback: Callback);
    removeAction(title: string);
    onRoll(callback: Callback);
  };

  export type RollBuilder = new (...args: unknown[]) => RollBuilderInstance;

  export type EachValue<T = any> = Array<T> | Record<string, T> | string;
  export type EachCallback<
    T extends Array<any> | Record<string, any> | string,
    U = void,
  > = T extends string
    ? (d: string, i?: number) => U
    : T extends Array<infer V>
      ? (d: V, i?: number) => void
      : (
          d: T extends undefined ? unknown : T[keyof T],
          k?: T extends undefined ? unknown : keyof T,
        ) => U;
}
declare module "letsrole" {
  global {
    /* eslint-disable no-var */
    var enableLog: boolean;
    var log: (input: unknown) => void;
    var wait: (delay: number, callback: Callback) => void;
    var each: <T extends EachValue>(data: T, callback: EachCallback<T>) => void;
    var init: InitCallback;
    var Tables: Tables;

    var Bindings: Bindings;

    var RollBuilder: RollBuilder;

    var initRoll: InitRollCallback;
    var getReferences: GetReferenceCallback;
    var getBarAttributes: GetBarAttributesCallback;
    var getCriticalHits: GetCriticalHitsCallback;
    var dropDice: DropDiceCallback;
    var drop: DropCallback;
    var Dice: DiceAPI;
    /* eslint-enable no-var */
  }
}

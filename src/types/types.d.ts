declare namespace LetsRole {
  export type Name = string;
  export type ViewData = {
    [key: LetsRole.ComponentID]: LetsRole.ComponentValue;
  };
  export type Index = string;

  export type EventType =
    | "click"
    | "update"
    | "mouseenter"
    | "mouseleave"
    | "keyup";
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
  export type ComponentID = string;
  export type VariableID = string;

  export interface View {
    /** get the id of the sheet */
    id(): LetsRole.ViewID;

    getSheetId(): string;

    name(): Name;

    get(id: LetsRole.ComponentID): LetsRole.Component;

    setData(data: ViewData): void;

    getData(): ViewData;
  }

  export interface Sheet extends View {
    getVariable(id: LetsRole.VariableID): number | null;

    prompt(
      title: string,
      view: LetsRole.ViewID,
      callback: (result: ViewData) => void,
      callbackInit: (promptView: View) => void
    ): void;
  }

  export interface Component<ValueType = ComponentValue> {
    id(): LetsRole.ComponentID;

    index(): Index;

    name(): Name;

    sheet(): Sheet;

    parent(): Component;

    find(id: LetsRole.ComponentID): Component;

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

  export type InitCallback = (sheet: LetsRole.Sheet) => void;
  export function log(input: any): void;
}

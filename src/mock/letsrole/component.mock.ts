import { ViewMock } from "./view.mock";

export class ComponentMock<
  T extends LetsRole.ComponentValue = LetsRole.ComponentValue,
> implements LetsRole.Component<T>
{
  #sheet: ViewMock;
  #realId: LetsRole.ComponentID;
  #definitions: LetsRoleMock.ComponentDefinitions;
  #currentText: string | null = null;

  constructor(
    sheet: ViewMock,
    realId: LetsRole.ComponentID,
    definitions: LetsRoleMock.ComponentDefinitions,
    _defaultValue: T,
  ) {
    this.#sheet = sheet;
    this.#realId = realId;
    this.#definitions = definitions;

    if (definitions.className === "Label") {
      this.#currentText = definitions.text || "";
    } else if (definitions.className === "NumberInput") {
      this.#currentText = definitions.defaultValue?.toString() || "";
    } else if (
      definitions.className === "TextInput" ||
      definitions.className === "Textarea"
    ) {
      this.#currentText = definitions.defaultValue || "";
    }
  }

  id(): LetsRole.ComponentID | null {
    return this.#realId.substring(this.#realId.lastIndexOf(".") + 1);
  }

  index(): LetsRole.Index | null {
    return null;
  }

  name(): LetsRole.Name {
    return this.#definitions.name || "";
  }

  sheet(): ViewMock {
    return this.#sheet;
  }

  parent(): ComponentMock | FailingComponent {
    return this.#sheet.findParent(this.#realId);
  }

  find(id: LetsRole.ComponentID): LetsRole.Component {
    const type = this.getType();

    if (type === "Repeater" || type === "RepeaterElement") {
      return this.#sheet.get(this.#realId + "." + id);
    }

    if (id === this.#realId) {
      return new FailingExistingComponent(this.#sheet, id);
    }

    const foundInSheet = this.#sheet.get(id);

    if (this.#definitions.className !== "_CmpFromSheet_") {
      const childDefs = ViewMock.findIdInDefinition(
        this.#definitions.children || [],
        id,
      );

      if (!childDefs) {
        return new FailingOuterExistingComponent(this.#sheet, id);
      }
    }

    return foundInSheet;
  }

  on(event: LetsRole.EventType, callback: LetsRole.EventCallback): void;
  on(
    event: LetsRole.EventType,
    delegate: LetsRole.Selector,
    callback?: LetsRole.EventCallback,
  ): void;
  on(
    event: LetsRole.EventType,
    delegate: LetsRole.Selector | LetsRole.EventCallback,
    callback?: LetsRole.EventCallback,
  ): void {
    let delegation: string | false = false;

    if (!callback) {
      callback = delegate as LetsRole.EventCallback;
    } else {
      delegation = delegate as LetsRole.Selector;
    }

    this.#sheet.setEventToComponent(this.#realId, event, callback, delegation);
  }

  off(event: LetsRole.EventType, delegate?: LetsRole.Selector): void {
    this.#sheet.unsetEventToComponent(this.#realId, event, delegate || false);
  }

  hide(): void {
    this.#addClass("d-none");
  }

  show(): void {
    this.#removeClass("d-none");
  }

  #addClass(className: LetsRole.ClassName): void {
    this.#sheet.addComponentClass(this.realId(), className);
  }

  addClass(className: LetsRole.ClassName): void {
    this.#addClass(className);
  }

  #removeClass(className: LetsRole.ClassName): void {
    this.#sheet.removeComponentClass(this.realId(), className);
  }

  removeClass(className: LetsRole.ClassName): void {
    this.#removeClass(className);
  }

  getClasses(): LetsRole.ClassName[] {
    return this.#sheet.getComponentClass(this.realId());
  }

  #hasClass(className: LetsRole.ClassName): boolean {
    return this.#sheet.componentHasClass(this.realId(), className);
  }

  hasClass(className: LetsRole.ClassName): boolean {
    return this.#hasClass(className);
  }

  toggleClass(className: LetsRole.ClassName): void {
    if (this.#hasClass(className)) {
      this.#removeClass(className);
    } else {
      this.#addClass(className);
    }
  }

  value(): T;
  value(newValue: T): void;
  value(newValue?: T): T | undefined | void {
    if (newValue === void 0) {
      let defaultValue: T | undefined = undefined;

      if (this.#definitions.className === "Label") {
        defaultValue = (this.#definitions.text || "") as T;
      } else if (this.#definitions.className === "NumberInput") {
        defaultValue = (this.#definitions.defaultValue || 0) as T;
      } else if (
        this.#definitions.className === "TextInput" ||
        this.#definitions.className === "Textarea"
      ) {
        defaultValue = (this.#definitions.defaultValue || "") as T;
      } else if (this.#definitions.className === "Checkbox") {
        defaultValue = false as T;
      }

      return this.#sheet.loadComponentValue(this.#realId, defaultValue) as T;
    }

    this.#sheet.saveComponentValue(this.#realId, newValue);
  }

  virtualValue(): T;
  virtualValue(newValue: T): void;
  virtualValue(newValue?: T): T | null | void {
    if (newValue !== void 0) {
      this.#sheet.setComponentVirtualValue(this.#realId, newValue);
    }

    return this.#sheet.getComponentVirtualValue(this.#realId) as T;
  }

  rawValue(): T {
    return this.value();
  }

  text(): string | null; // null is for choice expanded multiple
  text(_replacement: string): void;
  text(replacement?: string): void | string | null {
    if (replacement === void 0) {
      if (this.#definitions.className === "Choice") {
        if (this.#definitions.multiple) {
          return null;
        }

        if (!this.#definitions.tableId || !this.#definitions.label) {
          return undefined;
        }

        const table = this.#sheet.getTableData(this.#definitions.tableId);

        if (!table) {
          return undefined;
        }

        const row = table.get(this.value() as string);

        if (!row) {
          return undefined;
        }

        return row[this.#definitions.label];
      }

      return this.#currentText;
    } else {
      this.#currentText = replacement;
    }
  }

  visible(): boolean {
    return !this.#hasClass("d-none");
  }

  setChoices(_choices: LetsRole.Choices): void {
    return;
  }

  setToolTip(_text: string, _placement?: LetsRole.TooltipPlacement): void {
    return;
  }

  trigger(event: LetsRole.EventType): void {
    this.#sheet.triggerComponentEvent(this.realId(), event);
  }

  realId(): LetsRole.ComponentID {
    return this.#realId;
  }

  getType(): LetsRoleMock.ComponentClassName {
    return this.#definitions.className;
  }
}

export class FailingComponent implements LetsRole.Component<any> {
  #sheet: ViewMock;
  #realId: LetsRole.ComponentID;

  constructor(sheet: ViewMock, realId: LetsRole.ComponentID) {
    this.#realId = realId;
    this.#sheet = sheet;
  }

  id(): LetsRole.ComponentID | null {
    if (this.#realId === "") {
      throw new Error("Component not found");
    }

    return null;
  }

  parent(): ComponentMock {
    throw new Error("Not implemented");
  }

  find(_id: LetsRole.ComponentID): FailingComponent {
    return new FailingComponent(this.#sheet, "");
  }

  on(event: LetsRole.EventType, callback: LetsRole.EventCallback): void;
  on(
    event: LetsRole.EventType,
    delegate: LetsRole.Selector,
    callback: LetsRole.EventCallback,
  ): void;
  on(_event: unknown, _delegate: unknown, _callback?: unknown): void {
    throw new Error("Not implemented");
  }

  off(event: LetsRole.EventType): void;
  off(event: LetsRole.EventType, delegate: LetsRole.Selector): void;
  off(_event: unknown, _delegate?: unknown): void {}

  hide(): void {
    throw new Error("Not implemented");
  }

  show(): void {
    throw new Error("Not implemented");
  }

  addClass(_className: LetsRole.ClassName): void {
    throw new Error("Not implemented");
  }

  removeClass(_className: LetsRole.ClassName): void {
    throw new Error("Not implemented");
  }

  toggleClass(_className: LetsRole.ClassName): void {
    throw new Error("Not implemented");
  }

  hasClass(_className: LetsRole.ClassName): boolean {
    throw new Error("Not implemented");
  }

  getClasses(): LetsRole.ClassName[] {
    throw new Error("Not implemented");
  }

  value(newValue?: LetsRole.ComponentValue): any {
    if (arguments.length === 0) {
      return this.#sheet.loadComponentValue(this.#realId);
    }

    this.#sheet.saveComponentValue(this.#realId, newValue);
  }

  virtualValue(_newValue?: unknown): any {
    return null;
  }

  rawValue(): any {
    return this.#sheet.loadComponentValue(this.#realId);
  }

  text(): string | null;
  text(replacement: string): void;
  text(_replacement?: string): string | null | void {
    throw new Error("Not implemented");
  }

  visible(): boolean {
    throw new Error("Not implemented");
  }

  sheet(): LetsRole.Sheet {
    return this.#sheet;
  }

  setToolTip(_text: string, _placement?: LetsRole.TooltipPlacement): void {
    throw new Error("Not implemented");
  }

  setChoices(_choices: LetsRole.Choices): void {
    /* @ts-expect-error do nothing */
    return false;
  }

  name(): LetsRole.Name {
    /* @ts-expect-error do nothing */
    return null;
  }

  index(): LetsRole.Index | null {
    throw new Error("Not implemented");
  }

  getType(): LetsRoleMock.ComponentClassName {
    return "_Unknown_";
  }

  realId(): string {
    return "";
  }
}

export class FailingExistingComponent extends FailingComponent {
  #id;

  constructor(sheet: ViewMock, realId: LetsRole.ComponentID) {
    super(sheet, realId);
    this.#id = realId;
  }

  id(): LetsRole.ComponentID | null {
    return this.#id.substring(this.#id.lastIndexOf(".") + 1);
  }
}

// ts-unused-exports:disable-next-line
export class FailingOuterExistingComponent extends FailingExistingComponent {
  constructor(sheet: ViewMock, realId: LetsRole.ComponentID) {
    super(sheet, realId);
  }

  id(): LetsRole.ComponentID | null {
    return null;
  }

  value(): any {
    throw new Error("This call must throw an error");
  }
}

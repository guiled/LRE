import { DataHolder } from "../dataholder";
import { DataProvider } from "../dataprovider";
import { EventHolder } from "../eventholder";
import { dynamicSetter } from "../globals/decorators/dynamicSetter";
import { Mixin } from "../mixin";

const groupEventsForComponent = ["update", "click"] as const;
type GroupEventsForComponent = (typeof groupEventsForComponent)[number];

const groupSpecificEvent = ["add", "remove"] as const;
type GroupSpecificEvent = (typeof groupSpecificEvent)[number];

type GroupEvents = GroupEventsForComponent | GroupSpecificEvent;

export class Group
  extends (Mixin(EventHolder, DataHolder, DataProvider) as new <
    SubTypeEventHolder extends string
  >(
    ...args: any
  ) => IEventHolder<SubTypeEventHolder> &
    InstanceType<ReturnType<typeof DataHolder>> &
    InstanceType<ReturnType<typeof DataProvider>>)<GroupEvents>
  implements IGroup
{
  #id: string;
  #sheet: ISheet;
  #components: Array<IComponent> = [];
  #context: ProxyModeHandler;

  constructor(
    context: ProxyModeHandler,
    id: string,
    sheet: ISheet,
    componentIds: Array<LetsRole.ComponentID> = []
  ) {
    super([[id], [sheet, id], [(...args: any[]) => this.#value(...args)]]);
    this.#id = id;
    this.#sheet = sheet;
    this.#context = context;
    componentIds.forEach(this.add.bind(this));
  }

  init(): this {
    return this;
  }

  id(): LetsRole.ComponentID {
    return this.#id;
  }

  sheet() {
    return this.#sheet;
  }

  parent(_newParent?: any) {
    return this.#sheet as ComponentContainer;
  }

  realId() {
    return this.#id;
  }

  index(): string | null {
    return null;
  }

  name(): string {
    return this.#id;
  }

  lreType(): ComponentType {
    return "group";
  }

  raw(): LetsRole.Component {
    return this as unknown as LetsRole.Component;
  }

  add(cmp: LetsRole.ComponentID | IComponent): this {
    let cmpIndex: number;
    let component: ComponentSearchResult | IGroup = null;

    try {
      cmpIndex = this.#getCmpIndex(cmp);
      if (cmpIndex === -1) {
        component = this.#getComponent(cmp);
        if (component?.lreType() === "group") {
          throw new Error(`A group cannot be added to a group`);
        }
      }
    } catch (e) {
      lre.error(e);
    }

    if (component?.exists?.()) {
      component.propagateEventTo(this, ["update", "click"]);
      this.#components.push(component as IComponent);
      lre.trace(`Add a component to group ${this.#id}`);
      this.trigger("add", component);
      this.trigger("update");
    } else {
      lre.warn(`Unable to add component to group ${this.#id}`);
    }

    return this;
  }

  remove(cmp: LetsRole.ComponentID | IComponent): this {
    let cmpIndex: number = -1;

    try {
      cmpIndex = this.#getCmpIndex(cmp);
    } catch (e) {
      lre.error(e);
    }

    if (cmpIndex !== -1) {
      const removed = this.#components.splice(cmpIndex, 1);
      removed[0].unpropagateEventTo(this);
      lre.trace(`Remove a component from group ${this.#id}`);
      this.trigger("remove", removed[0]);
      this.trigger("update");
    } else {
      lre.warn(`Unable to remove component from group ${this.#id}`);
    }

    return this;
  }

  count(): number {
    return this.#components.length;
  }

  includes(cmp: LetsRole.ComponentID | IComponent): boolean {
    let result: number = -1;
    try {
      result = this.#getCmpIndex(cmp);
    } catch (e) {
      lre.error(e);
    }
    return result !== -1;
  }

  contains(cmp: LetsRole.ComponentID | IComponent): boolean {
    return this.includes(cmp);
  }

  has(cmp: LetsRole.ComponentID | IComponent): boolean {
    return this.includes(cmp);
  }

  repeater(_repeater?: unknown): undefined {
    return undefined;
  }
  entry(_entry?: unknown): undefined {
    return undefined;
  }
  autoLoadSaveClasses(): this {
    this.#components.forEach((cmp) => cmp.autoLoadSaveClasses());
    return this;
  }
  toggle(): void {
    this.#components.forEach((cmp) => cmp.toggle());
  }
  exists(): boolean {
    return true;
  }
  knownChildren(): Array<IComponent> {
    return this.#components;
  }

  setTooltip(
    text: string,
    placement?: LetsRole.TooltipPlacement | undefined
  ): void {
    if (arguments.length < 2) {
      this.#components.forEach((cmp) => cmp.setTooltip(text));
    } else {
      this.#components.forEach((cmp) => cmp.setTooltip(text, placement));
    }
  }

  find(completeId: string): ComponentSearchResult {
    return this.#components.find((cmp) => cmp.realId() === completeId) || null;
  }

  get(completeId: string): ComponentSearchResult {
    return this.find(completeId);
  }

  hide(): void {
    this.#components.forEach((cmp) => cmp.hide());
  }
  show(): void {
    this.#components.forEach((cmp) => cmp.show());
  }

  addClass(className: string): this {
    this.#components.forEach((cmp) => cmp.addClass(className));

    return this;
  }

  removeClass(className: string): this {
    this.#components.forEach((cmp) => cmp.removeClass(className));

    return this;
  }

  hasClass(className: string): boolean {
    return this.#components.every((cmp) => cmp.hasClass(className));
  }

  getClasses(): LetsRole.ClassName[] {
    const classNumber: { [key: LetsRole.ClassName]: number } = {};

    this.#components.forEach((cmp) => {
      const classes = cmp.getClasses();
      classes.forEach((cl) => (classNumber[cl] = (classNumber[cl] || 0) + 1));
    });

    return Object.keys(classNumber).filter(
      (k) => classNumber[k] === this.#components.length
    );
  }

  toggleClass(className: string): this {
    this.#components.forEach((cmp) => cmp.toggleClass(className));

    return this;
  }

  #value(_newValue?: LetsRole.ComponentValue): void | LetsRole.ViewData {
    this.#context.logAccess("value", this.#id);
    this.#context.disableAccessLog();
    const result = this.#getSet.apply(
      this,
      ["value"].concat(Array.from(arguments)) as any
    );
    this.#context.enableAccessLog();

    return result;
  }

  virtualValue(_newValue?: any): void | LetsRole.ViewData {
    return this.#getSet.apply(
      this,
      ["virtualValue"].concat(Array.from(arguments)) as any
    );
  }

  rawValue() {
    return this.#getSet("rawValue");
  }

  text(_replacement?: LetsRole.ViewData | undefined): void | LetsRole.ViewData {
    return this.#getSet.apply(
      this,
      ["text"].concat(Array.from(arguments)) as any
    );
  }

  @dynamicSetter
  visible(
    _newValue?:
      | Record<LetsRole.ComponentID, boolean>
      | boolean
      | ((...args: any[]) => any)
      | undefined
  ): boolean {
    if (arguments.length > 0) {
      this.#getSet.apply(
        this,
        ["visible"].concat(Array.from(arguments)) as any
      );
    }
    return this.#components.every((c) => c.visible());
  }

  setChoices(_choices: LetsRole.Choices): void {}

  #getSet(
    type: "value" | "virtualValue" | "text" | "rawValue",
    newValue?: Record<string, any>
  ) {
    if (arguments.length === 1) {
      const result: LetsRole.ViewData = {};
      this.#components.forEach((cmp) => (result[cmp.realId()] = cmp[type]()!));
      return result;
    }
    if (typeof newValue === "object") {
      Object.keys(newValue!).forEach((cmpId) => {
        const cmp = this.find(cmpId);
        cmp?.[type](newValue![cmpId] as any);
      });
    } else {
      this.#components.forEach((cmp) => cmp?.[type](newValue as any));
    }
  }

  #getComponent(
    cmp: LetsRole.ComponentID | IComponent
  ): ComponentSearchResult | IGroup {
    let component: ComponentSearchResult | IGroup;

    if (typeof cmp === "string") {
      component = this.#sheet.get(cmp);
    } else if (typeof cmp === "object" && (cmp as any).lreType) {
      component = cmp;
    } else {
      throw new Error(`Invalid given component for group ${this.#id}`);
    }

    return component;
  }

  #getCmpIndex(cmp: LetsRole.ComponentID | IComponent): number {
    let id: string;
    if (typeof cmp === "string") {
      id = cmp;
    } else if (!cmp || typeof cmp.exists !== "function") {
      throw new Error("Invalid component to find in group");
    } else if (!cmp.exists?.()) {
      return -1;
    } else {
      id = cmp.realId();
    }

    return this.#components.findIndex((c) => c.realId() === id);
  }
}

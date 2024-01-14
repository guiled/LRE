import { EventHolder } from "../eventholder";
import { dynamicSetter } from "../globals/virtualcall";
import { Sheet } from "../sheet";
import { Component } from "./component";

const groupEventsForComponent = ["update", "click"] as const;
type GroupEventsForComponent = (typeof groupEventsForComponent)[number];

const groupSpecificEvent = ["add", "remove"] as const;
type GroupSpecificEvent = (typeof groupSpecificEvent)[number];

type GroupEvents = GroupEventsForComponent | GroupSpecificEvent;

export class Group
  extends EventHolder<GroupEvents>
  implements IComponent, IEventHolder
{
  #id: string;
  #eventSuffix: string;
  #sheet: Sheet;
  #components: Array<Component> = [];

  constructor(
    id: string,
    sheet: Sheet,
    componentIds: Array<LetsRole.ComponentID> = []
  ) {
    super(id);
    this.#id = id;
    this.#eventSuffix = `:${id}`;
    this.#sheet = sheet;
    componentIds.forEach(this.add.bind(this));
    this.on("eventhandler-added:__lre", this.#addEventToEveryMember.bind(this));
    this.on(
      "eventhandler-updated:__lre",
      this.#addEventToEveryMember.bind(this)
    );
    this.on(
      "eventhandler-removed:__lre",
      this.#removeEventToEveryMember.bind(this)
    );
    this.on(
      "eventhandler-disabled",
      this.#disableEventToEveryMember.bind(this)
    );
    this.on("eventhandler-enabled", this.#enableEventToEveryMember.bind(this));
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
    return this.#sheet;
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

  add(cmp: LetsRole.ComponentID | Component): this {
    let cmpIndex: number;
    let component: Component | null = null;

    try {
      cmpIndex = this.#getCmpIndex(cmp);
      if (cmpIndex === -1) {
        component = this.#getComponent(cmp);
      }
    } catch (e) {
      lre.error(e);
    }

    if (component?.exists?.()) {
      component.linkEventTo("update", this);
      this.copyAllEventsTo(component, this.#eventSuffix);
      this.#components.push(component);
      lre.trace(`Add a component to group ${this.#id}`);
      this.trigger("add", component);
    } else {
      lre.warn(`Unable to add component to group ${this.#id}`);
    }

    return this;
  }

  remove(cmp: LetsRole.ComponentID | Component): this {
    let cmpIndex: number = -1;
    let component: Component | null = null;

    try {
      cmpIndex = this.#getCmpIndex(cmp);
      if (cmpIndex !== -1) {
        component = this.#getComponent(cmp);
      }
    } catch (e) {
      lre.error(e);
    }

    if (cmpIndex !== -1) {
      this.uncopyAllEventsFrom(component!, this.#eventSuffix);
      const removed = this.#components.splice(cmpIndex, 1);
      lre.trace(`Remove a component from group ${this.#id}`);
      this.trigger("remove", removed[0]);
    } else {
      lre.warn(`Unable to remove component from group ${this.#id}`);
    }

    return this;
  }

  count(): number {
    return this.#components.length;
  }

  includes(cmp: LetsRole.ComponentID | Component): boolean {
    let result: number = -1;
    try {
      result = this.#getCmpIndex(cmp);
    } catch (e) {
      lre.error(e);
    }
    return result !== -1;
  }

  contains(cmp: LetsRole.ComponentID | Component): boolean {
    return this.includes(cmp);
  }

  has(cmp: LetsRole.ComponentID | Component): boolean {
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
  knownChildren(): Array<Component> {
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

  find(completeId: string) {
    return this.#components.find((cmp) => cmp.realId() === completeId);
  }

  get(completeId: string) {
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

  value(_newValue?: LetsRole.ComponentValue): void | LetsRole.ViewData {
    return this.#getSet.apply(
      this,
      ["value"].concat(Array.from(arguments)) as any
    );
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

  /* @ts-ignore */
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
      if (typeof newValue === "function") {
        //valueToSet = loggedCall(newValue as () => any);
      }
      this.#components.forEach((cmp) => cmp?.[type](newValue as any));
    }
  }

  #getComponent(cmp: LetsRole.ComponentID | Component): Component {
    let component: Component;

    if (typeof cmp === "string") {
      component = this.#sheet.get(cmp);
    } else if (typeof cmp === "object" && (cmp as any).lreType) {
      component = cmp;
    } else {
      throw new Error(`Invalid given component for group ${this.#id}`);
    }

    return component;
  }

  #getCmpIndex(cmp: LetsRole.ComponentID | Component): number {
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

  #addEventToEveryMember(
    _thisGroup: Group,
    ...onArgs: [EventType<GroupEventsForComponent>, any, any?]
  ) {
    onArgs[0] += this.#eventSuffix;
    this.#components.forEach((cmp) => cmp.on.apply(cmp, onArgs));
  }
  #removeEventToEveryMember(
    _thisGroup: Group,
    ...offArgs: [EventType<GroupEventsForComponent>, any?]
  ) {
    offArgs[0] += this.#eventSuffix;
    this.#components.forEach((cmp) => cmp.off.apply(cmp, offArgs));
  }

  #disableEventToEveryMember(
    _thisGroup: Group,
    eventId: EventType<GroupEventsForComponent>
  ) {
    this.#components.forEach((cmp) => cmp.disableEvent(eventId));
  }
  #enableEventToEveryMember(
    _thisGroup: Group,
    eventId: EventType<GroupEventsForComponent>
  ) {
    this.#components.forEach((cmp) => cmp.enableEvent(eventId));
  }
}

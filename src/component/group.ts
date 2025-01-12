import { DataHolder } from "../dataholder";
import { DataProvider } from "../dataprovider";
import { EventHolder } from "../eventholder";
import { ChangeTracker } from "../globals/changetracker";
import { Mixin } from "../mixin";

type GroupEventsForComponent = ["update", "click"][number];

type GroupSpecificEvent = ["add", "remove"][number];

type GroupEvents = GroupEventsForComponent | GroupSpecificEvent;

export class Group
  extends (Mixin(EventHolder, DataHolder, DataProvider) as new <
    SubTypeEventHolder extends string,
  >(
    ...args: unknown[]
  ) => IEventHolder<SubTypeEventHolder> &
    InstanceType<ReturnType<typeof DataHolder>> &
    InstanceType<ReturnType<typeof DataProvider>>)<GroupEvents>
  implements IGroup
{
  #id: string;
  #tracker: ChangeTracker;
  #sheet: ISheet;
  #components: Array<IComponent> = [];
  #context: ProxyModeHandler;

  constructor(
    context: ProxyModeHandler,
    id: string,
    sheet: ISheet,
    componentIds: Array<LetsRole.ComponentID> = [],
  ) {
    super([
      /* EventHolder */ [id],
      /* DataHolder */ [sheet, id],
      /* DataProvider */ [
        context,
        (...args: unknown[]) =>
          this.value(...(args as [LetsRole.ComponentValue?])),
      ],
    ]);
    this.#id = id;
    this.#sheet = sheet;
    this.#context = context;
    this.#tracker = new ChangeTracker(this, context);
    componentIds.forEach(this.add.bind(this));
  }

  getChangeTracker(): ChangeTracker {
    return this.#tracker;
  }

  init(): this {
    return this;
  }

  id(): LetsRole.ComponentID {
    return this.#id;
  }

  sheet(): ISheet {
    return this.#sheet;
  }

  parent(_newParent?: unknown): ComponentContainer {
    return this.#sheet as ComponentContainer;
  }

  realId(): string {
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

  refreshRaw(): LetsRole.Component {
    return this as unknown as LetsRole.Component;
  }

  add(cmp: LetsRole.ComponentID | IComponent): this {
    const cmpIndex: number = this.#getCmpIndex(cmp);
    let component: ComponentSearchResult | IGroup = null;

    if (cmpIndex === -1) {
      component = this.#getComponent(cmp);

      if (component?.lreType() === "group") {
        throw new Error(`A group cannot be added to a group`);
      }
    }

    if (component?.exists?.()) {
      component.propagateEventTo(this, ["update", "click"]);
      this.#components.push(component as IComponent);
      LRE_DEBUG && lre.trace(`Add a component to group ${this.#id}`);
      this.trigger("add", component);
      this.trigger("update");
    } else {
      LRE_DEBUG && lre.warn(`Unable to add component to group ${this.#id}`);
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
      LRE_DEBUG && lre.trace(`Remove a component from group ${this.#id}`);
      this.trigger("remove", removed[0]);
      this.trigger("update");
    } else {
      LRE_DEBUG &&
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

  setToolTip(
    text: string,
    placement?: LetsRole.TooltipPlacement | undefined,
  ): void {
    if (arguments.length < 2) {
      this.#components.forEach((cmp) => cmp.setToolTip(text));
    } else {
      this.#components.forEach((cmp) => cmp.setToolTip(text, placement));
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
      (k) => classNumber[k] === this.#components.length,
    );
  }

  toggleClass(className: string): this {
    this.#components.forEach((cmp) => cmp.toggleClass(className));

    return this;
  }

  value(): LetsRole.ViewData;
  value(_newValue: LetsRole.ComponentValue): void;
  value(_newValue?: LetsRole.ComponentValue): void | LetsRole.ViewData {
    const sheetId = this.#sheet.getSheetId();

    if (sheetId) {
      this.#context.logAccess("value", [sheetId, this.#id]);
    } else {
      this.#context.logAccess("value", this);
    }

    const logEnabled = this.#context.getLogEnabled();
    this.#context.disableAccessLog();
    const result = this.#getSet.apply(
      this,
      ["value"].concat(Array.from(arguments)) as [
        "value",
        Record<string, unknown>,
      ],
    );
    this.#context.setLogEnabled(logEnabled);

    return result;
  }

  valueData(): LetsRole.TableRow | LetsRole.ComponentValue | null {
    return null;
  }

  virtualValue(_newValue?: unknown): void | LetsRole.ViewData {
    return this.#getSet.apply(
      this,
      ["virtualValue"].concat(Array.from(arguments)) as [
        "virtualValue",
        Record<string, unknown>,
      ],
    );
  }

  rawValue(): LetsRole.ViewData | void {
    return this.#getSet("rawValue");
  }

  text(_replacement?: LetsRole.ViewData | undefined): void | LetsRole.ViewData {
    return this.#getSet.apply(
      this,
      ["text"].concat(Array.from(arguments)) as [
        "text",
        Record<string, unknown>,
      ],
    );
  }

  @ChangeTracker.linkParams()
  visible(
    _newValue?: DynamicSetValue<
      Record<LetsRole.ComponentID, boolean> | boolean | undefined
    >,
  ): boolean {
    if (arguments.length > 0) {
      this.#getSet.apply(
        this,
        ["visible"].concat(Array.from(arguments)) as [
          "visible",
          Record<string, unknown>,
        ],
      );
    }

    return this.#components.every((c) => c.visible());
  }

  setChoices(_choices: LetsRole.Choices): void {}

  #getSet(
    type: "value" | "virtualValue" | "text" | "rawValue" | "visible",
    newValue?: Record<string, unknown>,
  ): LetsRole.ViewData | void {
    if (arguments.length === 1) {
      const result: LetsRole.ViewData = {};
      this.#components.forEach((cmp) => (result[cmp.realId()] = cmp[type]()));
      return result;
    }

    if (lre.isObject(newValue)) {
      Object.keys(newValue!).forEach((cmpId) => {
        const cmp = this.find(cmpId);
        cmp?.[type](newValue![cmpId] as string);
      });
    } else {
      this.#components.forEach((cmp) => cmp?.[type](newValue));
    }
  }

  #getComponent(
    cmp: LetsRole.ComponentID | IComponent,
  ): ComponentSearchResult | IGroup {
    let component: ComponentSearchResult | IGroup;

    if (typeof cmp === "string") {
      component = this.#sheet.get(cmp);
    } else if (this.#hasLreType(cmp)) {
      component = cmp;
    } else {
      throw new Error(`Invalid given component for group ${this.#id}`);
    }

    return component;
  }

  #hasLreType(cmp: unknown): cmp is IComponent | IGroup {
    return (
      typeof cmp === "object" &&
      !!cmp &&
      typeof (cmp as IComponent).lreType === "function"
    );
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

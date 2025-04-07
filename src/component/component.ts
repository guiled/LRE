import { EventDef, EventHolder } from "../eventholder";
import { HasRaw } from "../hasraw";
import { ClassChanges } from "../sheet";
import { Mixin } from "../mixin";
import { Repeater } from "./repeater";
import { Entry } from "./entry";
import { DataHolder } from "../dataholder";
import { ComponentProxy } from "../proxy/component";
import { ChangeTracker } from "../globals/changetracker";

export const REP_ID_SEP = ".";

const RAW_EVENTS = [
  "click",
  "update",
  "mouseenter",
  "mouseleave",
  "keyup",
  "change",
] as const;

// abstract class ComponentEventHolder<T extends string> extends EventHolder<
//   LetsRole.Component,
//   T
// > {}

type ComponentLREEventTypes = string & ("data-updated" | "class-updated");

type ThisComponentEventTypes<T> =
  | LetsRole.EventType
  | T
  | ComponentLREEventTypes;

type ClassChangeApply = {
  loaded: () => void;
  added: Callback;
  removed: Callback;
};

export class Component<
    TypeValue extends LetsRole.ComponentValue = LetsRole.ComponentValue,
    AdditionalEvents extends string = LetsRole.EventType,
  >
  extends (Mixin(EventHolder, HasRaw<LetsRole.Component>, DataHolder) as new <
    SubTypeEventHolder extends string,
  >(
    ...args: unknown[]
  ) => IEventHolder<SubTypeEventHolder> &
    InstanceType<ReturnType<typeof HasRaw<LetsRole.Component>>> &
    InstanceType<ReturnType<typeof DataHolder>>)<
    ThisComponentEventTypes<AdditionalEvents>
  >
  implements
    Omit<
      LetsRole.Component<TypeValue>,
      | "on"
      | "off"
      | "find"
      | "value"
      | "sheet"
      | "parent"
      | "virtualValue"
      | "rawValue"
      | "text"
    >,
    IComponent,
    ComponentContainer,
    ComponentCommon
{
  component: boolean = true;
  #realId: string;
  #tracker: ChangeTracker;
  #sheet: ISheet;
  #lreType: ComponentType = "component";
  #parent: ComponentContainer | undefined;
  #repeater: Repeater | undefined;
  #entry: Entry | undefined;
  #mustSaveClasses: boolean = false;
  #classChanges: ClassChanges = {};
  #classChangesApply: ClassChangeApply | undefined = undefined;
  #valueDataProvider: IDataProvider | undefined;

  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super([
      [
        /* eventHolder */
        realId,
        (
          rawCmp: LetsRole.Component,
          event: EventDef,
        ): IEventHolder | undefined => {
          let idToFind: string | null = "";

          if (event.delegated && rawCmp.index()) {
            idToFind = rawCmp.index() + REP_ID_SEP + rawCmp.id();
          } else if (event.delegated) {
            idToFind = rawCmp.id();
          }

          if (idToFind !== "" && idToFind !== null) {
            return this.find(idToFind) as unknown as IEventHolder;
          }
        },
        (
          event: EventDef,
          operation: "on" | "off",
          rawDest?: LetsRole.Component,
        ) => {
          if (RAW_EVENTS.includes(event.eventId)) {
            const currentRaw = rawDest ?? this.raw();

            if (
              currentRaw &&
              operation in currentRaw &&
              !!currentRaw[operation] &&
              typeof currentRaw[operation] === "function"
            ) {
              const args: [
                ThisComponentEventTypes<AdditionalEvents>,
                ...unknown[],
              ] = [event.eventId];

              if (event.delegated && !!event.subComponent) {
                args.push(event.subComponent);
              }

              if (operation === "on") {
                args.push(event.rawHandler);
              }

              /* @ts-expect-error Dynamic coding */
              currentRaw[operation].apply(currentRaw, args);
            }
          }
        },
        (() => {
          let lastUpdateValue: TypeValue;

          return (
            eventName: ThisComponentEventTypes<AdditionalEvents>,
            manuallyTriggered: boolean = false,
          ): boolean => {
            if (eventName === "update") {
              const newValue = this.value();
              const isUnchanged =
                lastUpdateValue === newValue ||
                lre.deepEqual(newValue, lastUpdateValue);

              lastUpdateValue = newValue;
              return !isUnchanged || manuallyTriggered;
            }

            return true;
          };
        })(),
      ],
      [
        /* HasRaw */ {
          raw,
          getRaw: () => this.#sheet.raw().get(this.#realId),
          onRefresh: (newRaw: LetsRole.Component) => {
            this.transferEvents(newRaw);
          },
        },
      ],
      [/* DataHolder*/ sheet, realId],
    ]);

    this.#tracker = new ChangeTracker(this, context);

    if (Object.prototype.hasOwnProperty.call(raw, "setDestGetter")) {
      (raw as ComponentProxy).setDestGetter(() => this);
    }

    this.#realId = realId;
    this.#sheet = sheet;
    this.on(
      "data-updated:__lre__:loadPersistent",
      this.loadPersistent.bind(this),
    );
    this.on("class-updated:__lre__:apply", this.#applyClassChanges.bind(this));
  }

  getChangeTracker(): ChangeTracker {
    return this.#tracker;
  }

  init(): this {
    return this;
  }

  lreType(newType?: ComponentType): ComponentType {
    if (newType !== void 0) {
      this.#lreType = newType;
    }

    return this.#lreType;
  }

  id(): LetsRole.ComponentID | null {
    return this.raw().id();
  }

  realId(): string {
    return this.#realId;
  }

  index(): string | null {
    return this.raw().index();
  }

  name(): string {
    return this.raw().name();
  }

  setToolTip(text: string, placement?: LetsRole.TooltipPlacement): void {
    if (arguments.length > 1) {
      return this.raw().setToolTip(text, placement);
    }

    return this.raw().setToolTip(text);
  }

  sheet(): ISheet {
    return this.#sheet;
  }

  parent(): ComponentContainer;
  parent(newParent: ComponentContainer): void;
  parent(newParent?: ComponentContainer): ComponentContainer | undefined {
    if (newParent) {
      this.#parent = newParent;
    }

    return this.#parent;
  }

  repeater(repeater?: Repeater): Repeater | undefined {
    if (repeater !== void 0) {
      this.#repeater = repeater;
    }

    return this.#repeater;
  }

  entry(entry?: Entry): Entry | undefined {
    if (entry !== void 0) {
      this.#entry = entry;
    }

    return this.#entry;
  }

  find(completeId: string): ComponentSearchResult {
    const tabId = completeId.split(REP_ID_SEP);
    const id = tabId.pop();
    const sRealId =
      tabId.join(REP_ID_SEP) + (tabId.length > 0 ? REP_ID_SEP : "") + id;
    return this.sheet().get(sRealId) as ComponentSearchResult;
  }

  get(completeId: string): ComponentSearchResult {
    return this.find(completeId);
  }

  hide(): void {
    this.trigger("class-updated", "d-none", "added");
    this.raw().hide();
  }

  show(): void {
    this.trigger("class-updated", "d-none", "removed");
    this.raw().show();
  }

  autoLoadSaveClasses(): this {
    this.#mustSaveClasses = true;
    this.#classChanges = this.#sheet.persistingCmpClasses(this.#realId);
    this.trigger("class-updated", "", "loaded");
    return this;
  }

  addClass(className: LetsRole.ClassName): this {
    this.#checkClassName(className);

    if (!this.raw().hasClass(className)) {
      this.#classChanges[className] = 1;
      this.#saveClassChanges();
      this.trigger("class-updated", className, "added");
    }

    return this;
  }

  removeClass(className: LetsRole.ClassName): this {
    this.#checkClassName(className);

    if (this.raw().hasClass(className)) {
      this.#classChanges[className] = -1;
      this.#saveClassChanges();
      this.trigger("class-updated", className, "removed");
    } else {
      LRE_DEBUG && lre.info(`${this.realId()} Class not found: ${className}`);
    }

    return this;
  }

  hasClass(className: LetsRole.ClassName): boolean {
    this.#checkClassName(className);
    return this.raw().hasClass(className);
  }

  #checkClassName(className: LetsRole.ClassName): boolean {
    const valid = !!className?.match?.(/^[_a-zA-Z][_a-zA-Z0-9-]*$/);

    if (!valid) {
      LRE_DEBUG &&
        lre.warn(`${this.realId()} Invalid class name: ${className}`);
    }

    return valid;
  }

  getClasses(): LetsRole.ClassName[] {
    return this.raw().getClasses();
  }

  toggleClass(className: LetsRole.ClassName): this {
    this.#classChanges[className] = this.raw().hasClass(className) ? -1 : 1;
    this.#saveClassChanges();
    this.trigger(
      "class-updated",
      className,
      this.#classChanges[className] === 1 ? "added" : "removed",
    );

    return this;
  }

  value(): TypeValue;
  value(newValue: DynamicSetValue<unknown>): void;
  @ChangeTracker.linkParams(undefined, [
    function (this: Component, dataProvider: IDataProvider | undefined) {
      this.#valueDataProvider = dataProvider;
    },
  ])
  value(newValue?: DynamicSetValue<unknown>): void | TypeValue {
    if (arguments.length > 0) {
      const oldValue = this.#getValue();

      if (lre.__enableGroupedSetValue) {
        const data: LetsRole.ViewData = {
          [this.realId()]: newValue as LetsRole.ComponentValue,
        };
        this.#sheet.setData(data);
      } else {
        this.raw().value(newValue as LetsRole.ComponentValue);
      }

      if (!lre.deepEqual(oldValue, newValue)) {
        this.trigger("update");
      }
    } else {
      return this.#getValue();
    }
  }

  #getValue(): TypeValue {
    let val = this.#sheet.getPendingData(this.realId()) as TypeValue;

    if (typeof val === "undefined") {
      try {
        val = this.raw().value() as TypeValue;
      } catch (e) {
        LRE_DEBUG &&
          lre.trace("Unknown error. Please communicate about it. " + e);
      }
      //} else if (this.#lreType === "repeater") {
      // a repeater with a pending value set, we must set it immediately when we need it because it has impact on existing elements
      //sheet.sendPendingDataFor(this.realId());
    } else {
      const sheetId = this.#sheet.getSheetId();

      if (!sheetId) {
        context.logAccess("value", this);
      } else {
        context.logAccess("value", [sheetId, this.realId()]);
      }
    }

    return lre.value(val) as TypeValue;
  }

  valueProvider(): IDataProvider | undefined {
    return this.#valueDataProvider;
  }

  valueData(): LetsRole.TableRow | LetsRole.ComponentValue | null {
    const val = this.value();

    if (lre.isObject(val)) {
      return;
    }

    return this.#valueDataProvider?.getData(val as DataProviderDataId) || null;
  }

  virtualValue(newValue?: TypeValue): void | null | TypeValue {
    if (arguments.length > 0) {
      this.raw().virtualValue(newValue!);
      return;
    }

    return lre.value(this.raw().virtualValue()) as TypeValue;
  }

  rawValue(): TypeValue {
    return lre.value(this.raw().rawValue()) as TypeValue;
  }

  text(): string;
  text(replacement: string): void;
  @ChangeTracker.linkParams()
  text(replacement?: string): string | null | void {
    if (arguments.length > 0) {
      this.raw().text(replacement!);
      return;
    }

    return this.raw().text();
  }

  @ChangeTracker.linkParams()
  visible(newValue?: DynamicSetValue<boolean>): boolean {
    if (arguments.length > 0) {
      if (newValue) {
        this.show();
      } else {
        this.hide();
      }
    }

    return this.raw().visible();
  }

  setChoices(choices: LetsRole.Choices): void {
    return this.raw().setChoices(choices);
  }

  toggle(): void {
    if (this.visible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  exists(): boolean {
    return this.#sheet.componentExists(this.realId());
  }

  knownChildren(): Array<IComponent> {
    return this.#sheet.knownChildren(this as IComponent);
  }

  dataProvider(): IDataProvider | undefined {
    return lre.dataProvider(
      this.realId(),
      function (this: Component<TypeValue>, newValue?: TypeValue) {
        if (arguments.length === 0) {
          return this.value() as TypeValue;
        }

        this.value(newValue);
      }.bind(this),
    );
  }

  #saveClassChanges(): void {
    if (this.#mustSaveClasses) {
      this.#sheet.persistingCmpClasses(this.#realId, this.#classChanges);
    }
  }

  #applyClassChanges(
    _cmp: this,
    className: LetsRole.ClassName,
    action: "added" | "removed" | "loaded",
  ): void {
    this.#classChangesApply ??= {
      loaded: () => {
        Object.keys(this.#classChanges).forEach(
          (className: LetsRole.ClassName) => {
            this.#classChangesApply![
              this.#classChanges[className] === 1 ? "added" : "removed"
            ](className);
          },
        );
      },
      added: this.raw().addClass.bind(this.raw()),
      removed: this.raw().removeClass.bind(this.raw()),
    };
    this.#classChangesApply[action](className);
  }
}

import { EventDef, EventHolder } from "../eventholder";
import { HasRaw } from "../hasraw";
import { ClassChanges } from "../sheet";
import { Mixin } from "../mixin";
import { Repeater } from "./repeater";
import { Entry } from "./entry";
import { DataHolder } from "../dataholder";
import { dynamicSetter } from "../globals/decorators/dynamicSetter";

export const REP_ID_SEP = ".";

const RAW_EVENTS = [
  "click",
  "update",
  "mouseenter",
  "mouseleave",
  "keyup",
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
  added: (...args: any[]) => any;
  removed: (...args: any[]) => any;
};


export class Component<
    TypeValue extends LetsRole.ComponentValue = LetsRole.ComponentValue,
    AdditionalEvents extends string = LetsRole.EventType
  >
  extends Mixin(EventHolder, HasRaw, DataHolder)<
    ThisComponentEventTypes<AdditionalEvents>,
    LetsRole.Component
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
  #realId: string;
  #sheet: ISheet;
  #lreType: ComponentType = "component";
  #parent: ComponentContainer | undefined;
  #repeater: Repeater | undefined;
  #entry: Entry | undefined;
  #mustSaveClasses: boolean = false;
  #classChanges: ClassChanges = {};
  #classChangesApply: ClassChangeApply | undefined = undefined;

  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super([
      [
        /* eventHolder */ realId,
        (rawCmp: LetsRole.Component, event: EventDef): EventHolder => {
          let idToFind: string = "";

          if (event.delegated && rawCmp.index()) {
            idToFind = rawCmp.index() + REP_ID_SEP + rawCmp.id();
          } else if (event.delegated) {
            idToFind = rawCmp.id();
          }

          if (idToFind !== "") {
            return this.find(idToFind) as unknown as EventHolder;
          }
          return this as EventHolder;
        },
        (
          event: EventDef,
          operation: "on" | "off",
          rawDest?: LetsRole.Component
        ) => {
          if (RAW_EVENTS.includes(event.eventId)) {
            const currentRaw = rawDest ?? this.raw();
            if (
              currentRaw &&
              operation in currentRaw &&
              !!currentRaw[operation] &&
              typeof currentRaw[operation] === "function"
            ) {
              const args: any[] = [event.eventId];
              if (event.delegated && !!event.subComponent) {
                args.push(event.subComponent);
              }
              if (operation === "on") {
                args.push(event.rawHandler);
              }
              currentRaw[operation].apply(currentRaw, args as any);
            }
          }
        },
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
    this.#realId = realId;
    this.#sheet = sheet;
    this.on("data-updated:__lre__", this.loadPersistent.bind(this));
    this.on("class-updated:__lre__", this.#applyClassChanges.bind(this));
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

  id(): string {
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
  setTooltip(text: string, placement?: LetsRole.TooltipPlacement): void {
    if (arguments.length > 1) {
      return this.raw().setTooltip(text, placement);
    }
    return this.raw().setTooltip(text);
  }
  sheet(): ISheet {
    return this.#sheet;
  }
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
    return this.sheet().get(sRealId);
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
    if (!this.raw().hasClass(className)) {
      this.#classChanges[className] = 1;
      this.#saveClassChanges();
      this.trigger("class-updated", className, "added");
    }

    return this;
  }
  removeClass(className: LetsRole.ClassName): this {
    if (this.raw().hasClass(className)) {
      this.#classChanges[className] = -1;
      this.#saveClassChanges();
      this.trigger("class-updated", className, "removed");
    }

    return this;
  }
  hasClass(className: LetsRole.ClassName): boolean {
    return this.raw().hasClass(className);
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
      this.#classChanges[className] === 1 ? "added" : "removed"
    );

    return this;
  }

  @dynamicSetter
  value(newValue?: unknown): void | TypeValue {
    if (arguments.length > 0) {
      const oldValue = this.value();
      let data: LetsRole.ViewData = {
        [this.realId()]: newValue as LetsRole.ComponentValue,
      };
      this.#sheet.setData(data);
      if (oldValue !== newValue) {
        this.trigger("update");
      }
    } else {
      let val = this.#sheet.getPendingData(this.realId()) as TypeValue;
      if (typeof val === "undefined") {
        try {
          // this.raw().value();
          val = this.raw().value() as TypeValue;
        } catch (e) {
          lre.trace("Unknown error. Please communicate about it" + e);
        }
        //} else if (this.#lreType === "repeater") {
        // a repeater with a pending value set, we must set it immediately when we need it because it has impact on existing elements
        //sheet.sendPendingDataFor(this.realId());
      } else {
        context.logAccess("value", this.realId());
      }
      return lre.value(val) as TypeValue;
    }
  }

  virtualValue(newValue?: TypeValue): void | TypeValue {
    if (arguments.length > 0) {
      this.raw().virtualValue(newValue!);
      return;
    }
    return lre.value(this.raw().virtualValue()) as TypeValue;
  }
  rawValue(): TypeValue {
    return lre.value(this.raw().rawValue()) as TypeValue;
  }
  text(replacement?: string): string | void {
    if (arguments.length > 0) {
      this.raw().text(replacement!);
      return;
    }
    return this.raw().text();
  }

  @dynamicSetter
  visible(newValue?: boolean | ((...args: any[]) => any)): boolean {
    if (arguments.length > 0) {
      if (!!newValue) {
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

  #saveClassChanges() {
    if (this.#mustSaveClasses) {
      this.#sheet.persistingCmpClasses(this.#realId, this.#classChanges);
    }
  }

  #applyClassChanges(
    _cmp: this,
    className: LetsRole.ClassName,
    action: "added" | "removed" | "loaded"
  ) {
    this.#classChangesApply ??= {
      loaded: () => {
        Object.keys(this.#classChanges).forEach(
          (className: LetsRole.ClassName) => {
            this.#classChangesApply![
              this.#classChanges[className] === 1 ? "added" : "removed"
            ](className);
          }
        );
      },
      added: this.raw().addClass.bind(this.raw()),
      removed: this.raw().removeClass.bind(this.raw()),
    };
    this.#classChangesApply[action](className);
  }

}

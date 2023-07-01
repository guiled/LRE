import { EventDef, EventHolder } from "../eventholder";
import { HasRaw } from "../hasraw";
import { ComponentContainer, ComponentSearchResult } from "./container";
import { Sheet } from "../sheet";
import { ComponentCommon } from "./common";
import { Mixin } from "../mixin";
import { Repeater } from "./repeater";
import { Entry } from "./entry";

export const REP_ID_SEP = ".";

abstract class ComponentEventHolder<T extends string> extends EventHolder<
  LetsRole.Component,
  T
> {}

export class Component<
    TypeValue extends LetsRole.ComponentValue = LetsRole.ComponentValue,
    AdditionalEvents extends string = LetsRole.EventType
  >
  extends Mixin(ComponentEventHolder, HasRaw)<
    AdditionalEvents,
    Component<TypeValue>
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
    ComponentContainer,
    ComponentCommon
{
  #realId: string;
  #sheet: Sheet;
  #lreType: ComponentType = "component";
  #parent: ComponentContainer | undefined;
  #repeater: Repeater | undefined;
  #entry: Repeater | undefined;

  constructor(raw: LetsRole.Component, sheet: Sheet, realId: string) {
    super([
      [
        /* eventHolder */ realId,
        (
          rawCmp: LetsRole.Component,
          event: EventDef
        ): EventHolder<LetsRole.Component> => {
          let idToFind: string = "";

          if (event.delegated && rawCmp.index()) {
            idToFind = rawCmp.index() + REP_ID_SEP + rawCmp.id();
          } else if (event.delegated) {
            idToFind = rawCmp.id();
          }

          if (idToFind !== "") {
            return this.sheet().find(
              idToFind
            ) as EventHolder<LetsRole.Component>;
          }
          return this as EventHolder<LetsRole.Component>;
        },
      ],
      [/* HasRaw */ raw],
    ]);
    this.#realId = realId;
    this.#sheet = sheet;
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
  index(): string {
    throw new Error("Method not implemented.");
  }
  name(): string {
    throw new Error("Method not implemented.");
  }
  sheet(): Sheet {
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
    throw new Error("Method not implemented.");
  }
  show(): void {
    throw new Error("Method not implemented.");
  }
  addClass(className: LetsRole.ClassName): void {
    throw new Error("Method not implemented.");
  }
  removeClass(className: LetsRole.ClassName): void {
    throw new Error("Method not implemented.");
  }
  hasClass(className: LetsRole.ClassName): boolean {
    throw new Error("Method not implemented.");
  }
  getClasses(): LetsRole.ClassName[] {
    throw new Error("Method not implemented.");
  }
  value(newValue?: unknown): void | LetsRole.ComponentValue {
    throw new Error("Method not implemented.");
  }
  virtualValue(
    newValue?: LetsRole.ComponentValue
  ): void | LetsRole.ComponentValue {
    throw new Error("Method not implemented.");
  }
  rawValue(): LetsRole.ComponentValue {
    throw new Error("Method not implemented.");
  }
  text(replacement?: unknown): string | void {
    throw new Error("Method not implemented.");
  }
  visible(): boolean {
    throw new Error("Method not implemented.");
  }
  setChoices(choices: LetsRole.Choices): void {
    throw new Error("Method not implemented.");
  }

  actionOnRawEvent({
    action,
    delegated,
    event,
    handler,
    subComponent,
  }: {
    action: "on" | "off";
    delegated: boolean;
    event: LetsRole.EventType;
    handler?: LetsRole.EventCallback;
    subComponent?: LetsRole.ComponentID | null;
  }): void {
    if (action !== "on" && action !== "off") return;
    const logAction = action === "on" ? "added to" : "removed from";
    let rawCmp: LetsRole.Component | undefined = void 0;
    let args: [
      LetsRole.EventType,
      (LetsRole.ComponentID | LetsRole.EventCallback)?,
      LetsRole.EventCallback?
    ] = [event];
    let logComplement: string = "";

    if (delegated && !!subComponent) {
      rawCmp = this.sheet().raw().get(this.realId());
      args.push(subComponent);
      logComplement = ">" + subComponent;
    } else if (!delegated) {
      rawCmp = this.raw() as LetsRole.Component;
    }

    if (!!rawCmp) {
      if (action === "on") args.push(handler);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore impossible to match args with argument of 'on' and 'off'
      rawCmp[action].apply(rawCmp, args);
      lre.trace(
        `Native event ${event} ${logAction} ${this.realId()}${logComplement}`
      );
    }
  }
}

import { EventHolder } from "../eventholder";
import { HasRaw } from "../hasraw";
import { ComponentContainer, ComponentSearchResult } from "./container";
import { Sheet } from "../sheet";
import { ComponentCommon } from "./common";

export const REP_ID_SEP = ".";

export interface Component
  extends ComponentContainer<LetsRole.Component>,
    ComponentCommon,
    EventHolder {}
export class Component<T = LetsRole.ComponentValue>
  implements
    Omit<
      LetsRole.Component<T>,
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
    ComponentCommon
{
  #realId: string;
  #sheet: Sheet;
  #lreType: ComponentType = "component";
  #parent: ComponentContainer | undefined;

  constructor(raw: LetsRole.Component, sheet: Sheet, realId: string) {
    Object.assign(this, new HasRaw(raw));
    Object.assign(this, new EventHolder(this));
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
  find(completeId: string): ComponentSearchResult {
    const tabId = completeId.split(REP_ID_SEP);
    const id = tabId.pop();
    const sRealId =
      tabId.join(REP_ID_SEP) + (tabId.length > 0 ? REP_ID_SEP : "") + id;
    return this.sheet().get(sRealId);
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
}
/*#__PURE__*/
/*applyMixins(Component, [
  HasRaw<LetsRole.ComponentValue>,
  EventHolder,
]);*/

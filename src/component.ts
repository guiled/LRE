import EventHolder from "./eventholder";
import HasRaw from "./hasraw";
import applyMixins from "./swc/utils/applyMixins";

export default interface Component extends HasRaw<LetsRole.ComponentValue>, EventHolder {};

export default class Component<T = LetsRole.ComponentValue>
  implements Omit<LetsRole.Component<T>, "on" | "off">
{
  constructor(raw: LetsRole.Component) {
    Object.assign(this, new HasRaw(raw));
    Object.assign(this, new EventHolder(this));
  }
  id(): string {
    throw new Error("Method not implemented.");
  }
  index(): string {
    throw new Error("Method not implemented.");
  }
  name(): string {
    throw new Error("Method not implemented.");
  }
  sheet(): LetsRole.Sheet {
    throw new Error("Method not implemented.");
  }
  parent(): LetsRole.Component<LetsRole.ComponentValue> {
    throw new Error("Method not implemented.");
  }
  find(id: string): LetsRole.Component<LetsRole.ComponentValue> {
    throw new Error("Method not implemented.");
  }
  hide(): void {
    throw new Error("Method not implemented.");
  }
  show(): void {
    throw new Error("Method not implemented.");
  }
  addClass(className: string): void {
    throw new Error("Method not implemented.");
  }
  removeClass(className: string): void {
    throw new Error("Method not implemented.");
  }
  value(): LetsRole.ComponentValue;
  value(newValue: LetsRole.ComponentValue): void;
  value(newValue?: unknown): void | LetsRole.ComponentValue {
    throw new Error("Method not implemented.");
  }
  virtualValue(): LetsRole.ComponentValue;
  virtualValue(newValue: LetsRole.ComponentValue): void;
  virtualValue(newValue?: unknown): void | LetsRole.ComponentValue {
    throw new Error("Method not implemented.");
  }
  rawValue(): LetsRole.ComponentValue {
    throw new Error("Method not implemented.");
  }
  text(): string;
  text(replacement: string): void;
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
/*#__PURE__*/applyMixins(Component, [HasRaw<LetsRole.ComponentValue>, EventHolder]);
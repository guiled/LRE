export default class Component implements LetsRole.Component {
  #raw: LetsRole.Component;

  constructor(raw: LetsRole.Component) {
    this.#raw = raw;
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
  on(
    event: LetsRole.EventType,
    callback: (cmp: LetsRole.Component<LetsRole.ComponentValue>) => void
  ): void;
  on(
    event: LetsRole.EventType,
    delegate: string,
    callback: (cmp: LetsRole.Component<LetsRole.ComponentValue>) => void
  ): void;
  on(event: unknown, delegate: unknown, callback?: unknown): void {
    throw new Error("Method not implemented.");
  }
  off(event: LetsRole.EventType): void;
  off(event: LetsRole.EventType, delegate: string): void;
  off(event: unknown, delegate?: unknown): void {
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

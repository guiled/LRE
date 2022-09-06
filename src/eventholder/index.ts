export default class EventHolder {
  #holder: any;

  constructor(holder: any) {
    this.#holder = holder;
  }

  on(
    event: LetsRole.EventType,
    handler: (com: LetsRole.Component) => void
  ): void {}

  trigger(event: LetsRole.EventType): void {}
}

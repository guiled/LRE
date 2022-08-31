import Component from "./component";

export default class Sheet implements LetsRole.Sheet {
  #raw: LetsRole.Sheet;

  constructor(rawsheet: LetsRole.Sheet) {
    this.#raw = rawsheet;

    console.log("new LreSheet from " + this.#raw.id());
  }
  getVariable(id: string): number | null {
    return this.#raw.getVariable(id);
  }
  prompt(
    title: string,
    view: string,
    callback: (result: LetsRole.ViewData) => void,
    callbackInit: (promptView: LetsRole.View) => void
  ): void {
    return this.#raw.prompt(title, view, callback, callbackInit);
  }
  id(): string {
    return this.#raw.id();
  }
  getSheetId(): string {
    return this.#raw.getSheetId();
  }
  name(): string {
    return this.#raw.name();
  }
  get(id: string): LetsRole.Component<LetsRole.ComponentValue> {
    let cmp = this.#raw.get(id);
    return new Component(cmp);
  }
  setData(data: LetsRole.ViewData): void {
    throw new Error("Method not implemented.");
  }
  getData(): LetsRole.ViewData {
    throw new Error("Method not implemented.");
  }
}

import { Component } from "./component";

export class Checkbox extends Component {
  #disabled: boolean = false;

  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("checkbox");
  }

  not(): boolean {
    return !this.value();
  }

  isEnabled(): boolean {
    return !this.#disabled;
  }

  isDisabled(): boolean {
    return this.#disabled;
  }
}

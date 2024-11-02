import { Component } from "./component";

export class Checkbox extends Component {
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("checkbox");
  }

  not(): boolean {
    return !this.value();
  }
}

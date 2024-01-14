import { Component } from "./component";

export class Label extends Component {
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("label");
  }
}

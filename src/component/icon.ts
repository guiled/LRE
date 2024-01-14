import { Component } from "./component";

export class Icon extends Component {
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("icon");
  }
}

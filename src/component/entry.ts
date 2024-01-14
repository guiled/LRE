import { Component } from "./component";

export class Entry extends Component<LetsRole.ViewData> {
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("entry");
  }
}

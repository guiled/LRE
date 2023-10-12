import { Component } from "./component";
import { Sheet } from "../sheet";

export class Label extends Component {
  constructor(raw: LetsRole.Component, sheet: Sheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("label");
  }
}
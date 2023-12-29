import { Sheet } from "../sheet";
import { Component } from "./component";

export class Container extends Component implements ComponentContainer {
  constructor(raw: LetsRole.Component, sheet: Sheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("container");
  }
}

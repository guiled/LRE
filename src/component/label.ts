import { Toggle } from "./toggle";

export class Label extends Toggle {
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("label");
  }
}

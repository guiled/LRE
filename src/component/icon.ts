import { Toggle } from "./toggle";

export class Icon extends Toggle {
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("icon");
  }
}

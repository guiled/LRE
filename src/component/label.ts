import { Toggle } from "./toggle";

export class Label extends Toggle {
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("label");
  }

  toString(): string {
    const parentStr = super.toString();

    if (parentStr) {
      return parentStr.replace("Toggle<", "Label<");
    }

    const id = this.realId();
    return `Label<${id}>(label)`;
  }
}

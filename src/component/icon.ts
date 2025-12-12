import { Toggle } from "./toggle";

export class Icon extends Toggle {
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("icon");
  }

  toString(): string {
    const parentStr = super.toString();

    if (parentStr) {
      return parentStr.replace("Toggle<", "Icon<").replace("(label", "(icon");
    }

    const id = this.realId();
    return `Icon<${id}>(icon)`;
  }
}

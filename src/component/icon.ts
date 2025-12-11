import { Toggle } from "./toggle";

export class Icon extends Toggle {
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("icon");
  }

  toString(): string {
    // Call parent toString first
    const parentStr = super.toString();

    // If parent returns non-empty string, use it (replacing "Toggle" with "Icon" and "label" with "icon")
    if (parentStr) {
      return parentStr.replace("Toggle<", "Icon<").replace("(label", "(icon");
    }

    // Otherwise, use Icon-specific output
    const id = this.realId();
    return `Icon<${id}>(icon)`;
  }
}

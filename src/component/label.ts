import { Toggle } from "./toggle";

export class Label extends Toggle {
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("label");
  }

  toString(): string {
    // Call parent toString first
    const parentStr = super.toString();

    // If parent returns non-empty string, use it (replacing "Toggle" with "Label")
    if (parentStr) {
      return parentStr.replace("Toggle<", "Label<");
    }

    // Otherwise, use Label-specific output
    const id = this.realId();
    return `Label<${id}>(label)`;
  }
}

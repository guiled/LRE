import { Component, REP_ID_SEP } from "./component";

export class Entry extends Component<LetsRole.ViewData> {
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("entry");
  }

  find(id: LetsRole.ComponentID, silent: boolean = false): Component | null {
    return this.sheet().get(
      this.realId() + REP_ID_SEP + id,
      silent,
    ) as Component | null;
  }

  moveUp(): void {
    const repeater = this.repeater();
    const index = this.index();

    if (repeater && index) {
      repeater.moveEntryUp(index);
    }
  }

  moveDown(): void {
    const repeater = this.repeater();
    const index = this.index();

    if (repeater && index) {
      repeater.moveEntryDown(index);
    }
  }

  moveTop(): void {
    const repeater = this.repeater();
    const index = this.index();

    if (repeater && index) {
      repeater.moveEntryTop(index);
    }
  }

  moveBottom(): void {
    const repeater = this.repeater();
    const index = this.index();

    if (repeater && index) {
      repeater.moveEntryBottom(index);
    }
  }

  toString(): string {
    const id = this.realId();
    const index = this.index();
    return `Entry<${id}>(${index || "no index"})`;
  }
}

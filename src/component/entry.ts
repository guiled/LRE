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
}

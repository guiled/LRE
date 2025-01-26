import { Component } from "./component";

export class Container extends Component implements ComponentContainer {
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
    this.lreType("container");

    this.on("class-updated:__lre__:d-none", this.#handleDNone);
  }

  #handleDNone(
    _cmp: this,
    className: LetsRole.ClassName,
    action: "added" | "removed",
  ): void {
    if (className === "d-none") {
      if (action === "added") {
        this.removeClass("d-flex");
      } else {
        this.addClass("d-flex");
      }
    }
  }
}

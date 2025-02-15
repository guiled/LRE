import { ChangeTracker } from "../globals/changetracker";
import { Component } from "./component";

export class Container
  extends Component<LetsRole.ViewData>
  implements ComponentContainer
{
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

  value(): LetsRole.ViewData;
  value(newValue: DynamicSetValue<unknown>): void;
  @ChangeTracker.linkParams()
  value(
    newValue?: DynamicSetValue<LetsRole.ViewData>,
  ): LetsRole.ViewData | void {
    if (typeof newValue === "undefined") {
      return undefined;
    }

    if (!lre.isObject(newValue)) {
      lre.error(
        `[Container] value() on ${this.realId()} expected object, got ${typeof newValue}`,
      );
      return;
    }

    Object.keys(newValue).forEach((key: LetsRole.ComponentID) => {
      if (this.sheet().componentExists(key)) {
        const cmp = this.sheet().get(key)!;
        cmp.value((newValue as any)[key] as LetsRole.ComponentValue);
      }
    });
  }

  find(completeId: string): ComponentSearchResult {
    const cmp = this.sheet().get(completeId) as Component | null;

    if (lre.isComponent(cmp)) {
      const rawChild = this.raw().find(completeId);

      if (rawChild.id()) {
        return cmp;
      }

      lre.error(`Invalid component id for component.find, ${completeId} given`);
    }

    return null;
  }
}

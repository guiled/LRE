import { ChangeTracker } from "../globals/changetracker";
import { Component, REP_ID_SEP } from "./component";

export class Container
  extends Component<LetsRole.ViewData>
  implements ComponentContainer
{
  #children: Record<LetsRole.ComponentID, Component> = {};

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
      const children = this.#children;
      const result: LetsRole.ViewData = {};
      Object.keys(children).forEach((childId) => {
        const child = children[childId];
        const id = child.id();

        if (id && child.exists()) {
          result[id] = child.value();
        }
      });

      return result;
    }

    if (!lre.isObject(newValue)) {
      lre.error(
        `[Container] value() on ${this.realId()} expected object, got ${typeof newValue}`,
      );
      return;
    }

    Object.keys(newValue).forEach((key: LetsRole.ComponentID) => {
      const cmp = this.#children[key] || this.find(key);

      if (!cmp) {
        lre.error(
          `[Container] value() on ${this.realId()} could not find component with id ${key}`,
        );
        return;
      } else {
        cmp.value((newValue as any)[key] as LetsRole.ComponentValue);
      }
    });
  }

  find(completeId: string): ComponentSearchResult {
    if (this.#children[completeId]) {
      return this.#children[completeId];
    }

    const idParts = this.realId().split(REP_ID_SEP);
    idParts.pop();

    const searchedId =
      idParts.length > 0
        ? idParts.join(REP_ID_SEP) + REP_ID_SEP + completeId
        : completeId;

    const cmp = this.sheet().get(searchedId) as Component | null;

    if (lre.isComponent(cmp)) {
      const rawChild = this.raw().find(completeId);

      if (rawChild.id()) {
        this.#children[completeId] = cmp;
        return cmp;
      }

      lre.error(`Invalid component id for component.find, ${completeId} given`);
    }

    return null;
  }
}

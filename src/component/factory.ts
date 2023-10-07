import { Choice } from "./choice";
import { Component, REP_ID_SEP } from "./component";
import { ComponentContainer, Container } from "./container";
import { Entry } from "./entry";
import { Icon } from "./icon";
import { Label } from "./label";
import { Repeater } from "./repeater";
import { MultiChoice } from "./multichoice";

export class ComponentFactory {
  static create(
    rawComponent: LetsRole.Component,
    container: ComponentContainer
  ): Component {
    let realId = "";
    if (container.lreType() === "entry" || container.lreType() === "repeater") {
      realId = container.realId() + REP_ID_SEP;
    }
    let cmp: Component;
    realId += rawComponent.id();

    cmp = ComponentFactory.#createCmp(rawComponent, container, realId);
    cmp.parent(container);
    const containerLreType = container.lreType();
    if (containerLreType === "entry") {
      cmp.entry(container as Entry);
      cmp.repeater((container as Entry).repeater());
    } else if (containerLreType === "repeater") {
      cmp.repeater(container as Repeater);
    }
    cmp.init();

    return cmp;
  }

  static #createCmp(
    raw: LetsRole.Component,
    container: ComponentContainer,
    realId: string
  ): Component {
    const classes = raw.getClasses();

    const flags = {
      isRepeater: false,
      isMultiChoice: false,
      isChoice: false,
      isIcon: false,
      isLabel: false,
      isContainer: false,
    };

    classes.forEach((c) => {
      if (c === "repeater") {
        flags.isRepeater = true;
      } else if (c === "choice") {
        flags.isChoice = true;
      } else if (c === "multiple") {
        flags.isMultiChoice = true;
      } else if (c === "icon") {
        flags.isIcon = true;
      } else if (c === "label") {
        flags.isLabel = true;
      } else if (
        c === "widget-container" ||
        c === "view" ||
        c === "row" ||
        c === "col"
      ) {
        flags.isContainer = true;
      }
    });

    if (flags.isRepeater) {
      return new Repeater(raw, container.sheet(), realId);
    } else if (flags.isChoice && flags.isMultiChoice) {
      return new MultiChoice(raw, container.sheet(), realId);
    } else if (flags.isChoice) {
      return new Choice(raw, container.sheet(), realId);
    } else if (flags.isIcon) {
      return new Icon(raw, container.sheet(), realId);
    } else if (flags.isLabel) {
      return new Label(raw, container.sheet(), realId);
    } else if (flags.isContainer) {
      return new Container(raw, container.sheet(), realId);
    } else if (container.lreType() === "repeater") {
      return new Entry(raw, container.sheet(), realId);
    }

    return new Component(raw, container.sheet(), realId);
  }
}

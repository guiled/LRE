import Component, { REP_ID_SEP } from ".";
import { ComponentContainer } from "./container";
import Entry from "./entry";
import Repeater from "./repeater";

export default class ComponentFactory {
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
    const containerLreType = container.lreType();
    if (containerLreType === "repeater") {
      cmp = new Entry(rawComponent, container.sheet(), realId);
      cmp.parent(container);
      cmp.repeater(container as Repeater);
    } else {
      cmp = new Component(rawComponent, container.sheet(), realId);
      cmp.parent(container);
      if (containerLreType === "entry") {
        cmp.entry(container as Entry);
        cmp.repeater(container.repeater());
        //} else if (isRepeater(rawComponent)) {
        // it is impossible to be 100% sure that a component is a repeater
        // it is a repeater
        // cmp = Object.assign(cmp, new lreRepeater);
      }
    }
    cmp.init();

    return cmp;
  }
}

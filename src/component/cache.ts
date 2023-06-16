import { Sheet } from "../sheet";
import { Component, REP_ID_SEP } from "./component";

export class ComponentCache {
  #sheet: Sheet;
  #components: Record<LetsRole.ComponentID, Component> = {};
  constructor(sheet: Sheet) {
    this.#sheet = sheet;
  }

  inCache(realId: LetsRole.ComponentID): Component | false {
    // Why * at 0 ? Because it is quite slow to test realId[strlen(realId)] as realId.length doesn't work
    if (realId.charAt(0) === "*") {
      for (let k in this.#components) {
        if (k.indexOf(realId.substring(1) + REP_ID_SEP) === 0) {
          return this.#components[k];
        }
      }
    }
    return this.#components.hasOwnProperty(realId)
      ? this.#components[realId]
      : false;
  }

  set(realId: LetsRole.ComponentID, cmp: Component): this {
    if (this.#components.hasOwnProperty(realId)) {
      lre.log(`Component overwritten in cache ${realId}`);
    } else {
      lre.log(`Component added to cache ${realId}`);
    }
    this.#components[realId] = cmp;
    return this;
  }

  unset(realId: LetsRole.ComponentID): this {
    delete this.#components[realId];
    return this;
  }

  get(realId: LetsRole.ComponentID): Component | null {
    if (!this.inCache(realId)) {
      return null;
    }
    return this.#components[realId];
  }

  children(realId: LetsRole.ComponentID) {
    let realIds = [];
    for (let k in this.#components) {
      if (k.indexOf(realId + REP_ID_SEP) === 0) {
        realIds.push(k);
      }
    }
    return realIds;
  }
}

import { Component, REP_ID_SEP } from "./component";
import { ComponentSearchResult } from "./container";

type ComponentGetter = (
  realId: LetsRole.ComponentID,
  silent?: boolean
) => ComponentSearchResult;

export class ComponentCache {
  readonly #DEFERRED_DELAY = 20;
  #components: Record<LetsRole.ComponentID, Component> = {};
  #getter: ComponentGetter;
  #toDelete: Array<LetsRole.ComponentID> = [];
  #toAdd: Array<LetsRole.ComponentID> = [];
  #isWaitingForget: boolean = false;
  #isWaitingRemember: boolean = false;

  constructor(componentGetter: ComponentGetter) {
    this.#getter = componentGetter;
  }

  #deferredForget(): void {
    this.#isWaitingForget = false;
    if (this.#toDelete.length === 0) return;

    const cmp = this.inCache("*" + this.#toDelete[0]);
    if (cmp) {
      this.unset(cmp.realId());
    } else {
      this.unset(this.#toDelete.shift()!);
    }

    if (this.#toDelete.length > 0) {
      wait(this.#DEFERRED_DELAY, this.#deferredForget.bind(this));
      this.#isWaitingForget = true;
    }
  }

  #deferredRemember(): void {
    this.#isWaitingRemember = false;
    if (this.#toAdd.length === 0) return;

    let realId = this.#toAdd.shift()!;
    this.get(realId, true);

    if (this.#toAdd.length > 0) {
      wait(this.#DEFERRED_DELAY, this.#deferredRemember.bind(this));
      this.#isWaitingRemember = true;
    }
  }

  #deleteFromToDelete(realId: LetsRole.ComponentID): void {
    const posInToDelete = this.#toDelete.indexOf(realId);
    if (posInToDelete !== -1) {
      this.#toDelete.splice(posInToDelete, 1);
    }
  }

  #deleteFromToAdd(realId: LetsRole.ComponentID): void {
    const posInToAdd = this.#toAdd.indexOf(realId);
    if (posInToAdd !== -1) {
      this.#toAdd.splice(posInToAdd, 1);
    }
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
      lre.trace(`Component overwritten in cache ${realId}`);
    } else {
      lre.trace(`Component added to cache ${realId}`);
    }
    this.#components[realId] = cmp;
    return this;
  }

  unset(realId: LetsRole.ComponentID): this {
    delete this.#components[realId];
    return this;
  }

  get(
    realId: LetsRole.ComponentID,
    silent: boolean = false
  ): ComponentSearchResult {
    if (this.inCache(realId)) {
      return this.#components[realId];
    }

    const cmp = this.#getter(realId, silent);
    if (cmp) {
      this.set(realId, cmp);
    }
    return cmp;
  }

  children(realId: LetsRole.ComponentID): Array<string> {
    let realIds: Array<string> = [];
    for (let k in this.#components) {
      if (k.indexOf(realId + REP_ID_SEP) === 0) {
        realIds.push(k);
      }
    }
    return realIds;
  }

  forget(realId: LetsRole.ComponentID): void {
    if (
      this.#components.hasOwnProperty(realId) &&
      !this.#toDelete.includes(realId)
    ) {
      this.#toDelete.push(realId);
    }
    this.#deleteFromToAdd(realId);
    if (!this.#isWaitingForget) {
      wait(this.#DEFERRED_DELAY, this.#deferredForget.bind(this));
      this.#isWaitingRemember = false;
    }
  }

  remember(realId: LetsRole.ComponentID): void {
    if (
      !this.#components.hasOwnProperty(realId) &&
      !this.#toAdd.includes(realId)
    ) {
      this.#toAdd.push(realId);
    }
    this.#deleteFromToDelete(realId);
    if (!this.#isWaitingRemember) {
      wait(this.#DEFERRED_DELAY, this.#deferredRemember.bind(this));
      this.#isWaitingRemember = true;
    }
  }
}

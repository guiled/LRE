import { REP_ID_SEP } from "./component";

type ComponentGetter = (
  realId: LetsRole.ComponentID,
  silent?: boolean,
) => ComponentSearchResult;

type CacheableTypes = IComponent | IGroup;

export class ComponentCache {
  readonly #DEFERRED_DELAY = 20;
  #components: Record<LetsRole.ComponentID, CacheableTypes> = {};
  #getter: ComponentGetter;
  #toDelete: Array<LetsRole.ComponentID> = [];
  #toAdd: Array<LetsRole.ComponentID> = [];
  #isWaitingForget: boolean = false;
  #isWaitingRemember: boolean = false;
  #context: ProxyModeHandler;

  constructor(context: ProxyModeHandler, componentGetter: ComponentGetter) {
    this.#context = context;
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
      lre.wait(
        this.#DEFERRED_DELAY,
        this.#deferredForget.bind(this),
        "deferredForget",
      );
      this.#isWaitingForget = true;
    }
  }

  #deferredRemember(): void {
    this.#isWaitingRemember = false;
    if (this.#toAdd.length === 0) return;

    const realId = this.#toAdd.shift()!;
    this.get(realId, true);

    if (this.#toAdd.length > 0) {
      lre.wait(
        this.#DEFERRED_DELAY,
        this.#deferredRemember.bind(this),
        "deferredRemember",
      );
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

  inCache(realId: LetsRole.ComponentID): CacheableTypes | false {
    // Why * at 0 ? Because it is quite slow to test realId[strlen(realId)] as realId.length doesn't work
    if (realId.charAt(0) === "*") {
      for (const k in this.#components) {
        if (k.indexOf(realId.substring(1) + REP_ID_SEP) === 0) {
          return this.#components[k];
        }
      }
    }

    return Object.prototype.hasOwnProperty.call(this.#components, realId)
      ? this.#components[realId]
      : false;
  }

  set(realId: LetsRole.ComponentID, cmp: CacheableTypes): this {
    if (Object.prototype.hasOwnProperty.call(this.#components, realId)) {
      LRE_DEBUG && lre.trace(`Component overwritten in cache ${realId}`);
    } else {
      LRE_DEBUG && lre.trace(`Component added to cache ${realId}`);
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
    silent: boolean = false,
  ): CacheableTypes | null {
    if (this.inCache(realId)) {
      LRE_DEBUG && lre.trace(`Get component ${realId} from cache`);
      return this.#components[realId];
    }

    LRE_DEBUG && lre.trace(`Get component ${realId} from sheet`);
    const logEnabled = this.#context.getLogEnabled();
    this.#context.disableAccessLog();
    const cmp = this.#getter(realId, silent);
    this.#context.setLogEnabled(logEnabled);

    if (cmp) {
      this.set(realId, cmp);
    }

    return cmp;
  }

  children(realId: LetsRole.ComponentID): Array<string> {
    const realIds: Array<string> = [];

    for (const k in this.#components) {
      if (k.indexOf(realId + REP_ID_SEP) === 0) {
        realIds.push(k);
      }
    }

    return realIds;
  }

  forget(realId: LetsRole.ComponentID): void {
    if (
      Object.prototype.hasOwnProperty.call(this.#components, realId) &&
      !this.#toDelete.includes(realId)
    ) {
      this.#toDelete.push(realId);
    }

    this.#deleteFromToAdd(realId);

    if (!this.#isWaitingForget) {
      lre.wait(
        this.#DEFERRED_DELAY,
        this.#deferredForget.bind(this),
        "deferredForget",
      );
      this.#isWaitingRemember = false;
    }
  }

  remember(realId: LetsRole.ComponentID): void {
    if (
      !Object.prototype.hasOwnProperty.call(this.#components, realId) &&
      !this.#toAdd.includes(realId)
    ) {
      this.#toAdd.push(realId);
    }

    this.#deleteFromToDelete(realId);

    if (!this.#isWaitingRemember) {
      lre.wait(
        this.#DEFERRED_DELAY,
        this.#deferredRemember.bind(this),
        "deferredRemember",
      );
      this.#isWaitingRemember = true;
    }
  }
}

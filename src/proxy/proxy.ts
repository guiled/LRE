type ProxyInitiator<T> = (dest: T) => T;

export class LreProxy<T> {
  #destCtors: Partial<Record<ProxyMode, ProxyInitiator<T>>> = {};
  #currentMode: ProxyMode;
  #currentDest: T;
  _proxyModeHandler: ProxyModeHandler;
  _realDest: T;

  constructor(modeHandler: ProxyModeHandler, realDest: T) {
    this._realDest = realDest;
    this.#currentMode = "real";
    this.setModeDest("real", (r) => r);
    this.#currentDest = realDest;
    this._proxyModeHandler = modeHandler;
  }

  getDest(): T {
    const newMode = this._proxyModeHandler.getMode();

    if (newMode !== this.#currentMode) {
      this.#currentDest = this.#destCtors[newMode]!(this._realDest);
      this.#currentMode = newMode;
    }

    return this.#currentDest;
  }

  setModeDest(mode: ProxyMode, init: ProxyInitiator<T>): void {
    this.#destCtors[mode] = init;
  }
}

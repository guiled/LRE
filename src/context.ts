export class Context implements ProxyModeHandler {
  #mode: ProxyMode = "real";
  #log: ContextLog = {};
  #prevLog: ContextLog = {};
  #data: LetsRole.ViewData = {};
  #logEnabled: boolean = true;

  getMode(): ProxyMode {
    return this.#mode;
  }

  setMode(newMode: ProxyMode): this {
    if (this.#mode !== newMode) {
      this.resetAccessLog();
      this.#data = {};
    }
    this.#mode = newMode;

    return this;
  }

  disableAccessLog(): this {
    this.#logEnabled = false;

    return this;
  }
  enableAccessLog(): this {
    this.#logEnabled = true;

    return this;
  }

  logAccess(type: ProxyModeHandlerLogType, value: string): this {
    if (!this.#logEnabled) {
      return this;
    }
    if (!this.#log[type]) {
      this.#log[type] = [];
    }
    if (!this.#log[type]!.includes(value)) {
      this.#log[type]!.push(value);
    }

    return this;
  }

  getAccessLog(type: ProxyModeHandlerLogType): Array<LetsRole.ComponentID> {
    return this.#log[type] || [];
  }

  getPreviousAccessLog(
    type: ProxyModeHandlerLogType
  ): Array<LetsRole.ComponentID> {
    return this.#prevLog[type] || [];
  }

  resetAccessLog(): this {
    this.#prevLog = this.#log;
    this.#log = {};
    return this;
  }

  setContext(id: string, context: any): this {
    if (this.#mode === "virtual") {
      this.#data[id] = context;
    }
    return this;
  }

  getContext<T = any>(id: string): T {
    return this.#data[id] as T;
  }
}

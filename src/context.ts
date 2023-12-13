type ContextLog = Partial<
  Record<ProxyModeHandlerLogType, Array<LetsRole.ComponentID>>
>;

export class Context implements ProxyModeHandler {
  #mode: ProxyMode = "real";
  #log: ContextLog = {};
  #data: LetsRole.ViewData = {};

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

  logAccess(type: ProxyModeHandlerLogType, value: string): this {
    if (!this.#log[type]) {
      this.#log[type] = [];
    }
    this.#log[type]!.push(value);

    return this;
  }

  getAccessLog(type: ProxyModeHandlerLogType): Array<LetsRole.ComponentID> {
    return this.#log[type] || [];
  }

  resetAccessLog(): this {
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

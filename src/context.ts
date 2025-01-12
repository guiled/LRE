export class Context implements ProxyModeHandler {
  #mode: ProxyMode = "real";
  #contexts: Array<Partial<ContextLog>> = [];
  #log: Partial<ContextLog> = {};
  #prevLog: Partial<ContextLog> = {};
  #data: LetsRole.ViewData = {};
  #logEnabled: boolean = false;

  getMode(): ProxyMode {
    return this.#mode;
  }

  setMode(newMode: ProxyMode): this {
    if (this.#mode !== newMode) {
      this.#resetAccessLog();
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

  getLogEnabled(): boolean {
    return this.#logEnabled;
  }

  setLogEnabled(enabled: boolean): this {
    this.#logEnabled = enabled;

    return this;
  }

  logAccess<T extends keyof ContextLog>(
    type: T,
    value: ContextLog[T][number],
  ): this {
    if (!this.#logEnabled) {
      return this;
    }

    if (!this.#log[type]) {
      this.#log[type] = [];
    }

    const logs: ContextLog[T] = this.#log[type] || [];

    if (
      !logs.some((l) => {
        if (this.#isLogRecord(l) && this.#isLogRecord(value)) {
          return l[0] === value[0] && l[1] === value[1];
        }

        return l === value;
      })
    ) {
      (logs as ContextLogByType).push(value as ContextLogRecord);
    }

    return this;
  }

  #isLogRecord(log: unknown): log is Array<string> {
    return Array.isArray(log);
  }

  getAccessLog<T extends keyof ContextLog>(type: T): ContextLog[T] {
    return this.#log[type] || [];
  }

  getPreviousAccessLog<T extends keyof ContextLog>(type: T): ContextLog[T] {
    return this.#prevLog[type] || [];
  }

  pushLogContext(): this {
    this.#contexts.push(this.#log);
    this.#log = {};

    return this;
  }

  popLogContext(): this {
    this.#prevLog = this.#log;
    this.#log = this.#contexts.pop() || {};

    return this;
  }

  #resetAccessLog(): this {
    this.#prevLog = this.#log;
    this.#log = {};
    return this;
  }

  setContext(id: string, context: LetsRole.ComponentValue): this {
    if (this.#mode === "virtual") {
      this.#data[id] = context;
    }

    return this;
  }

  getContext<T = LetsRole.ComponentValue>(id: string): T {
    return this.#data[id] as T;
  }

  getLastLog(): Partial<ContextLog> {
    return this.#prevLog;
  }

  call<T>(enabled: boolean, callback: () => T): [T, Partial<ContextLog>] {
    const saveEnabled = this.#logEnabled;
    this.#logEnabled = enabled;
    this.pushLogContext();

    const result = callback();

    this.#logEnabled = saveEnabled;

    this.popLogContext();

    return [result, this.#prevLog];
  }
}

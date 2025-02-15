enum LogLevel {
  none = 0,
  error,
  warn,
  profile = 3,
  trace = 4,
  all = 5,
}

const LOG_PREFIXES: Record<keyof typeof LogLevel, string> = {
  none: "",
  error: "[ERR]",
  warn: "[WRN]",
  profile: "[TRC]",
  trace: "[TRC]",
  all: "",
};

type LogTrace = {
  title: string;
  start: number;
};

export class Logger {
  #logLevel: keyof typeof LogLevel = "none";
  #stack: LogTrace[] = [];

  #_log(level: keyof typeof LogLevel, ...args: any[]): void {
    if (LogLevel[this.#logLevel] >= LogLevel[level]) {
      const stackPrefix = "  ".repeat(this.#stack.length);
      args.forEach((a) => {
        log(`[LRE]${LOG_PREFIXES[level]}${stackPrefix} ${a?.toString?.()}`);

        if (
          typeof a !== "number" &&
          typeof a !== "string" &&
          typeof a !== "undefined"
        ) {
          log(a);
        }
      });
    }
  }

  error(...args: any[]): void {
    this.#_log.apply(this, ["error", ...args]);
  }

  warn(...args: any[]): void {
    this.#_log.apply(this, ["warn", ...args]);
  }

  trace(...args: any[]): void {
    this.#_log.apply(this, ["trace", ...args]);
  }

  profile(...args: any[]): void {
    this.#_log.apply(this, ["profile", ...args]);
  }

  log(...args: any[]): void {
    this.#_log.apply(this, ["all", ...args]);
  }

  setLogLevel(level: keyof typeof LogLevel): void {
    this.#logLevel = level;
  }

  push(title: string): void {
    this.profile(title);
    this.#stack.push({ title, start: Date.now() });
  }

  pop(): void {
    const trace = this.#stack.pop();

    if (trace) {
      const duration = Date.now() - trace.start;
      this.profile(`${trace.title} (${duration}ms)`);
    }
  }
}

export enum LogLevel {
  none = 0,
  error,
  warn,
  trace = 3,
  all = 3,
}

const LOG_PREFIXES: Record<keyof typeof LogLevel, string> = {
  none: "",
  error: "[ERR]",
  warn: "[WRN]",
  trace: "[TRC]",
  all: "",
};

export default class Logger {
  logLevel: keyof typeof LogLevel = "none";
  #_log(level: keyof typeof LogLevel, ...args: any[]): void {
    if (LogLevel[this.logLevel] <= LogLevel[level]) {
      args.forEach((a) => {
        log(`[LRE]${LOG_PREFIXES?.[level] ?? ""} ${a}`);
        typeof a !== "string" && log(a);
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
  log(...args: any[]): void {
    this.#_log.apply(this, ["all", ...args]);
  }
}

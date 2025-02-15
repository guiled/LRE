type ErrorOptions = {
  cause?: LetsRole.Error;
};

export class Error {
  public readonly type: string = "LREError";
  public readonly name: string = "Error";
  public message: string = "";
  public fileName: string = "";
  public lineNumber: number = 0;
  public columnNumber: number = 0;
  public trace: Array<LetsRole.ErrorTrace> = [];
  public stack = {};

  public static tracerFinder(
    trace: LetsRole.Error["trace"],
  ): LetsRole.ErrorTrace | undefined {
    const idx =
      trace?.findIndex(function (tr) {
        return (
          lre.__debug &&
          tr.type === "CallExpression" &&
          tr.callee!.name === "throwError"
        );
      }) || -1;

    if (idx !== -1) {
      return trace?.[idx];
    }
  }

  #handleTrace(trace: LetsRole.Error["trace"]): void {
    if (!trace) return;
    this.trace = trace;
    const throwErrorLocation = Error.tracerFinder(trace);

    if (throwErrorLocation) {
      this.lineNumber = throwErrorLocation?.loc?.start?.line;
      this.columnNumber = throwErrorLocation?.loc?.start?.column;
    } else {
      const location = trace.find(function (tr) {
        return (
          lre.__debug ||
          tr?.loc?.start?.line < errExclFirstLine ||
          tr?.loc?.start?.line > errExclLastLine
        );
      });

      if (location) {
        this.lineNumber = location.loc.start.line;
        this.columnNumber = location.loc.start.column;
      }
    }
  }

  public constructor(message: string = "", options?: ErrorOptions) {
    this.message = message;

    if (options?.cause?.trace) {
      this.#handleTrace(options?.cause?.trace);
    }
  }

  public thrownBy(err: LetsRole.Error | Error): this {
    if (Object.prototype.hasOwnProperty.call(err, "type")) {
      this.lineNumber = (err as Error).lineNumber;
      this.columnNumber = (err as Error).columnNumber;
      this.trace = (err as Error).trace;
    } else {
      this.#handleTrace((err as LetsRole.Error).trace);
    }

    return this;
  }

  public toString(): string {
    return this.message + " at line " + this.lineNumber;
  }
}

type ErrorOptions = {
  cause: any;
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

  #handleTrace(trace: LetsRole.Error["trace"]) {
    if (!trace) return;
    this.trace = trace;
    let throwErrorLocation = trace.find(function (tr) {
      return (
        lre.__debug &&
        tr.type === "CallExpression" &&
        tr.callee!.name === "throwError"
      );
    });
    if (throwErrorLocation) {
      this.lineNumber = throwErrorLocation?.loc?.start?.line;
      this.columnNumber = throwErrorLocation?.loc?.start?.column;
    } else {
      let location = trace.find(function (tr) {
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
    if (err.hasOwnProperty("type")) {
      this.lineNumber = (err as Error).lineNumber;
      this.columnNumber = (err as Error).columnNumber;
      this.trace = (err as Error).trace;
    } else {
      this.#handleTrace((err as LetsRole.Error).trace);
    }
    return this;
  }

  public toString() {
    return this.message + " at line " + this.lineNumber;
  }
}

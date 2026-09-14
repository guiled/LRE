import {
  instrumentTraceLog,
  shouldSkipTraceLine,
} from "../../builder/instrumentTraceLog";

describe("instrumentTraceLog", () => {
  it("should prepend log() at statement boundaries with source line numbers", () => {
    const code = "function test() {\n  return 1;\n}";
    const instrumented = instrumentTraceLog(code);

    expect(instrumented).toBe(
      "log(1); function test() {\n  log(2); return 1;\n}",
    );
  });

  it("should skip comments and blank lines", () => {
    expect(shouldSkipTraceLine("")).toBe(true);
    expect(shouldSkipTraceLine("  // src/context.ts")).toBe(true);
    expect(shouldSkipTraceLine("//region LRE")).toBe(true);
  });

  it("should not break object literal returns", () => {
    const code = "function ct(name) {\n  return {\n    name: name,\n  };\n}";
    const instrumented = instrumentTraceLog(code);

    expect(instrumented).toBe(
      "log(1); function ct(name) {\n  log(2); return {\n    name: name,\n  };\n}",
    );
    expect(() => new Function(instrumented)).not.toThrow();
  });

  it("should not break inline else branches", () => {
    const code = "if (a) b;\nelse throw new Error();";
    const instrumented = instrumentTraceLog(code);

    expect(instrumented).toBe(
      "log(1); if (a) b;\nelse log(2); throw new Error();",
    );
    expect(() => new Function(instrumented)).not.toThrow();
  });
});

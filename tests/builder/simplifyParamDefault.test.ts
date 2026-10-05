import { transformSync } from "@swc/core";
import { postCleanup, transformForLR } from "../../transpile.conf";

const normalize = (code: string): string =>
  code
    .replace(/\s+/g, " ")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/ ;/g, ";")
    .trim();

const postCleanupDebug = {
  ...postCleanup,
  jsc: {
    ...postCleanup.jsc,
    minify: undefined,
  },
};

const runTransform = (code: string): string => {
  const wrapped = transformSync(
    `function __fixture() { ${code} }`,
    transformForLR,
  ).code.trim();

  return normalize(
    wrapped
      .replace(/^function __fixture\(\) \{/, "")
      .replace(/\}$/, "")
      .trim(),
  );
};

const runPostCleanup = (code: string): string => {
  const wrapped = transformSync(
    `function __fixture() { ${code} }`,
    postCleanupDebug,
  ).code.trim();

  return normalize(
    wrapped
      .replace(/^function __fixture\(\) \{/, "")
      .replace(/\}$/, "")
      .trim(),
  );
};

describe("simplifyParamDefault", () => {
  test("emits def(arguments, idx) for arrow optional params", () => {
    const output = runTransform("const f = (a, b?) => b;");

    expect(output).toContain("var b = def(arguments, 1)");
    expect(output).not.toContain("Afr(arguments)");
  });

  test("emits def(arguments, idx) for function optional params", () => {
    const output = runTransform("function f(a, b?) { return b; }");

    expect(output).toContain("var b = def(arguments, 1)");
    expect(output).not.toContain("def(arguments, 1, undefined)");
  });

  test("keeps explicit non-undefined defaults", () => {
    const output = runTransform('const f = (a, b = "") => b;');

    expect(output).toContain('def(arguments, 1, "")');
  });

  test("strips superclass param from mixin arrows", () => {
    const output = runTransform(
      "const M = (superclass = class {}) => class X extends superclass {};",
    );

    expect(output).not.toContain("superclass");
    expect(output).not.toContain("Afr(arguments)");
    expect(output).not.toContain("tmp ===");
  });

  test("rewrites Afr(arguments) optional chains in postCleanup", () => {
    const input =
      "var args = Afr(arguments), obj = args[0], tmp = args[1], indent = tmp === undefined ? undefined : tmp; return indent;";

    const output = runPostCleanup(input);

    expect(output).toContain("obj = def(arguments, 0)");
    expect(output).toContain("indent = def(arguments, 1)");
    expect(output).not.toContain("Afr(arguments)");
    expect(output).not.toContain("tmp === undefined");
  });

  test("rewrites Afr(arguments) chains with non-undefined defaults", () => {
    const input =
      "var args = Afr(arguments), eventName = args[0], tmp = args[1], manuallyTriggered = tmp === undefined ? false : tmp; return manuallyTriggered;";

    const output = runPostCleanup(input);

    expect(output).toContain("eventName = def(arguments, 0)");
    expect(output).toContain("manuallyTriggered = def(arguments, 1, false)");
    expect(output).not.toContain("Afr(arguments)");
  });

  test("strips undefined third argument from def calls in postCleanup", () => {
    const input =
      "var value = def(arguments, 0, undefined), other = def(arguments, 1, \"\"); return value;";

    const output = runPostCleanup(input);

    expect(output).toContain("value = def(arguments, 0)");
    expect(output).toContain('other = def(arguments, 1, "")');
    expect(output).not.toContain("def(arguments, 0, undefined)");
  });

  test("preserves lexical this when optional arrow params are lowered", () => {
    const output = runTransform(
      "function outer() { return (event, rawDest?) => this.raw(); }",
    );

    expect(output).toContain("def(arguments, 1)");
    expect(output).toContain(".bind(this)");
    expect(output).not.toMatch(/=>/);
  });
});

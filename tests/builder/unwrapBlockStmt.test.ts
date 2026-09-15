import { transformSync } from "@swc/core";
import { postCleanup } from "../../transpile.conf";

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

describe("unwrapBlockStmt", () => {
  test("unwraps noSequence-style blocks", () => {
    const input = "{ __raw.round(); return this; }";

    const output = runPostCleanup(input);

    expect(output).toBe("__raw.round(); return this;");
  });

  test("unwraps noCallInIf blocks", () => {
    const input = "if (!lre.isObject(rowLeft)) { result[keyLeft] = rowLeft; return; }";

    const output = runPostCleanup(input);

    expect(output).toMatch(/_c = !lre\.isObject\(rowLeft\); if \(_c\)/);
    expect(output).not.toMatch(/\{\s*(const|var) _c = !lre\.isObject\(rowLeft\)/);
  });

  test("keeps blocks with local function declarations", () => {
    const input =
      "if (true) { var recursive = function recursive() { return 1; }; { var _c = false; if (_c) return 2; } }";

    const output = runPostCleanup(input);

    expect(output).toContain("var recursive = function recursive()");
    expect(output).toMatch(/var recursive = function recursive\(\) \{ return 1; \};/);
  });

  test("unwraps nested redundant blocks", () => {
    const input = "{ { __raw.floor(); return this; } }";

    const output = runPostCleanup(input);

    expect(output).toBe("__raw.floor(); return this;");
  });
});

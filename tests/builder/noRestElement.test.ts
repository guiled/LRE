import { transformSync } from "@swc/core";
import { postCleanup, transformForLR } from "../../transpile.conf";

const normalize = (code: string): string =>
  code
    .replace(/\s+/g, " ")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/ ;/g, ";")
    .trim();

const runTransform = (code: string, config = transformForLR): string => {
  const wrapped = transformSync(
    `function __fixture() { ${code} }`,
    config,
  ).code.trim();

  return normalize(
    wrapped
      .replace(/^function __fixture\(\) \{/, "")
      .replace(/\}$/, "")
      .trim(),
  );
};

describe("noRestElement", () => {
  test("uses Afr(arguments) without slice(0) for rest-only functions", () => {
    const output = runTransform("function tag(...tags) { return tags; }");

    expect(output).toMatch(/var \w+ = Afr\(arguments\)/);
    expect(output).not.toContain(".slice(0)");
  });

  test("keeps slice offset when named params precede rest", () => {
    const output = runTransform("function fn(a, b, ...rest) { return rest; }");

    expect(output).toContain("Afr(arguments).slice(2)");
  });

  test("full pipeline emits Afr(arguments) without slice(0) for rest-only", () => {
    const afterTransform = runTransform(
      "function tag(...tags) { return tags; }",
    );
    const afterPostCleanup = normalize(
      transformSync(`function __fixture() { ${afterTransform} }`, postCleanup)
        .code.trim()
        .replace(/^function __fixture\(\) \{/, "")
        .replace(/\}$/, "")
        .trim(),
    );

    expect(afterPostCleanup).toMatch(/var \w+ = Afr\(arguments\)/);
    expect(afterPostCleanup).not.toContain(".slice(0)");
  });
});

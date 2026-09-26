import { transformSync } from "@swc/core";
import { postCleanup, transformForLR } from "../../transpile.conf";

const normalize = (code: string): string =>
  code
    .replace(/\s+/g, " ")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/ ;/g, ";")
    .trim();

const transpile = (code: string): string => {
  const afterTransform = transformSync(code, transformForLR).code;
  return normalize(transformSync(afterTransform, postCleanup).code);
};

describe("noSpreadArgument", () => {
  test("acc.push(...items) preserves receiver through full pipeline", () => {
    const output = transpile(
      "function f(acc, items) { acc.push(...items); return acc; }",
    );

    expect(output).toMatch(/\.push\.apply\(\w+, \w+\)/);
    expect(output).not.toContain("apply.apply");
    expect(output).not.toMatch(/\.apply\(\s*\w+\s*,\s*\[\]\.concat\(\[\s*\w+\s*\]/);
  });

  test("fn(...args) uses null as apply receiver", () => {
    const output = transpile("function f(fn, args) { fn(...args); }");

    expect(output).toMatch(/\.apply\(null, \w+\)/);
    expect(output).not.toContain("apply.apply");
  });

  test("mixed spread args keep correct receiver", () => {
    const output = transpile(
      "function f(acc, x, items, y) { acc.push(x, ...items, y); }",
    );

    expect(output).toMatch(/\.push\.apply\(\w+, \[/);
    expect(output).not.toContain("apply.apply");
  });
});

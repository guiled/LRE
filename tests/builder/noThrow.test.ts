import { transformSync } from "@swc/core";
import { transformForLR } from "../../transpile.conf";

const normalize = (code: string): string =>
  code
    .replace(/\s+/g, " ")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/ ;/g, ";")
    .trim();

const transpile = (code: string): string =>
  normalize(transformSync(code, transformForLR).code);

describe("noThrow", () => {
  test("replaces throw with throwError call expression", () => {
    const output = transpile("function f() { throw new Error('x'); }");

    expect(output).toContain("throwError(new Error('x'));");
    expect(output).not.toMatch(/\bthrow\b/);
  });

  test("replaces throw inside if statement", () => {
    const output = transpile(
      "function f(ok) { if (!ok) throw new Error('failed'); }",
    );

    expect(output).toContain("throwError(new Error('failed'));");
    expect(output).not.toMatch(/\bthrow\b/);
  });
});

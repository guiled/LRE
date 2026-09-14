import { transformSync } from "@swc/core";
import { postCleanup } from "../../transpile.conf";

const normalize = (code: string): string =>
  code
    .replace(/\s+/g, " ")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/ ;/g, ";")
    .trim();

const removeRedundantSliceZero = (code: string): string => {
  const wrapped = transformSync(
    `function __fixture() { ${code} }`,
    postCleanup,
  ).code.trim();

  return normalize(
    wrapped
      .replace(/^function __fixture\(\) \{/, "")
      .replace(/\}$/, "")
      .trim(),
  );
};

describe("removeRedundantSliceZero", () => {
  test("removes slice(0) after Afr(arguments)", () => {
    const input = "var args = Afr(arguments).slice(0); return args;";

    const output = removeRedundantSliceZero(input);

    expect(output).toMatch(/var \w+ = Afr\(arguments\); return \w+;/);
    expect(output).not.toContain(".slice(0)");
  });

  test("removes slice(0) in vararg forwarding", () => {
    const input =
      "var tags = Afr(arguments).slice(0); return fn.apply(fn, tags);";

    const output = removeRedundantSliceZero(input);

    expect(output).toMatch(/var \w+ = Afr\(arguments\); return fn\.apply\(fn, \w+\);/);
    expect(output).not.toContain(".slice(0)");
  });

  test("removes slice(0) after Array.from.call(arguments, arguments)", () => {
    const input =
      "var args = Array.from.call(arguments, arguments).slice(0); return args;";

    const output = removeRedundantSliceZero(input);

    expect(output).toMatch(
      /var \w+ = Array\.from\.call\(arguments, arguments\); return \w+;/,
    );
    expect(output).not.toContain(".slice(0)");
  });

  test("keeps slice with a non-zero start index", () => {
    const input = "var args = Afr(arguments).slice(1); return args;";

    const output = removeRedundantSliceZero(input);

    expect(output).toContain("Afr(arguments).slice(1)");
  });

  test("keeps slice(0) on non-arguments arrays", () => {
    const input = "var args = values.slice(0); return args;";

    const output = removeRedundantSliceZero(input);

    expect(output).toContain("values.slice(0)");
  });

  test("keeps slice(0, end) with two arguments", () => {
    const input = "var args = Afr(arguments).slice(0, 2); return args;";

    const output = removeRedundantSliceZero(input);

    expect(output).toContain("Afr(arguments).slice(0, 2)");
  });
});

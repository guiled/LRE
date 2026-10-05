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

const fixSpreadApply = (code: string, cleanup = postCleanup): string => {
  const wrapped = transformSync(
    `function __fixture() { ${code} }`,
    cleanup,
  ).code.trim();

  return normalize(
    wrapped
      .replace(/^function __fixture\(\) \{/, "")
      .replace(/\}$/, "")
      .trim(),
  );
};

describe("fixSpreadApply", () => {
  test("fixes spread apply args nested in another apply call", () => {
    const input =
      "destination.trigger.apply(destination, (_concat = [triggeredEvent].concat).apply.apply(_concat, [].concat([[triggeredEvent]], args2)))";

    expect(fixSpreadApply(input)).toBe(
      normalize(
        "destination.trigger.apply(destination, [].concat([triggeredEvent], args2));",
      ),
    );
    expect(fixSpreadApply(input)).not.toContain("apply.apply");
  });

  test("fixes handler spread apply args", () => {
    const input =
      "fcn.apply(_this, (_concat = [target].concat).apply.apply(_concat, [].concat([[target]], args2)))";

    expect(fixSpreadApply(input)).toBe(
      normalize("fcn.apply(_this, [].concat([target], args2));"),
    );
  });

  test("restores standalone method calls", () => {
    const input =
      "return (__raw_tag = __raw.tag).apply.apply(__raw_tag, [].concat([__raw], tags)), this;";

    const output = fixSpreadApply(input);

    expect(output).toContain(
      normalize(
        "(__raw_tag = __raw.tag).apply(__raw_tag, [].concat([__raw], tags));",
      ),
    );
    expect(output).toContain("return this");
    expect(output).not.toContain("apply.apply");
  });

  test("fixes wrong apply this argument for call spread lowering", () => {
    const input =
      "(__checkChoiceWithValue1 = __checkChoiceWithValue).apply(__checkChoiceWithValue1, [].concat([this], args));";

    expect(fixSpreadApply(input)).toBe(
      normalize(
        "(__checkChoiceWithValue1 = __checkChoiceWithValue).apply(this, args);",
      ),
    );
  });

  test("restores standalone call spread with this binding", () => {
    const input =
      "return (__checkChoiceWithValue1 = __checkChoiceWithValue).apply.apply(__checkChoiceWithValue1, [].concat([this], args));";

    expect(fixSpreadApply(input)).toContain(
      normalize(
        "return (__checkChoiceWithValue1 = __checkChoiceWithValue).apply(this, args);",
      ),
    );
  });

  test("fixes array spread copy", () => {
    const input =
      "var newKeys = (_concat = [].concat).apply.apply(_concat, [].concat([[]], keys))";

    const output = fixSpreadApply(input);

    expect(output).toMatch(/var \w+ = \[\]\.concat\(keys\);/);
    expect(output).not.toContain("apply.apply");
  });

  test("fixes method push spread wrong this binding", () => {
    const input =
      "(_acc_push = acc.push).apply(_acc_push, [].concat([acc], currentLog));";

    expect(fixSpreadApply(input)).toBe(
      normalize("(_acc_push = acc.push).apply(acc, currentLog);"),
    );
  });

  test("fixes function call spread wrong this binding", () => {
    const input = "(_fn = fn).apply(_fn, [].concat([null], args));";

    expect(fixSpreadApply(input)).toBe(
      normalize("(_fn = fn).apply(null, args);"),
    );
  });

  test("keeps temp variable bindings in named function expressions", () => {
    const input =
      "var prot = { rerolln: function rerolln() { var __raw_rerolln, args = Afr(arguments); return (__raw_rerolln = __raw.rerolln).apply.apply(__raw_rerolln, [].concat([__raw], args)), this; } };";

    const output = fixSpreadApply(input, postCleanupDebug);

    expect(output).not.toMatch(/var _\$__raw_rerolln/);
    expect(output).toMatch(/var __raw_rerolln, args = Afr\(arguments\)/);
    expect(output).toMatch(
      /\(__raw_rerolln = __raw\.rerolln\)\.apply\(__raw_rerolln/,
    );
  });
});

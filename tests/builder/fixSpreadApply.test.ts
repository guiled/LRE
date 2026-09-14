import { transformSync } from "@swc/core";
import { postCleanup } from "../../transpile.conf";

const normalize = (code: string): string =>
  code
    .replace(/\s+/g, " ")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/ ;/g, ";")
    .trim();

const fixSpreadApply = (code: string): string => {
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
});

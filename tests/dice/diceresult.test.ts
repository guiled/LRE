import { DiceResult } from "../../src/dice/diceresult";
import { loadDiceResultFixture } from "./loadDiceResultFixture";

describe("DiceResult.getTaggedResults", () => {
  describe("fixture: single-tag-on-root", () => {
    test("returns only the root node for the tagged roll", () => {
      const result = new DiceResult(
        loadDiceResultFixture("single-tag-on-root"),
      );

      const tagged = result.getTaggedResults("a");

      expect(tagged).toHaveLength(1);
      expect(tagged[0]).toBe(result);
      expect(tagged[0].total).toBe(11);
      expect(tagged[0].tags).toEqual(["a"]);
    });

    test("reuses cached index on later calls", () => {
      const result = new DiceResult(
        loadDiceResultFixture("single-tag-on-root"),
      );

      const first = result.getTaggedResults("a");
      const second = result.getTaggedResults("a");

      expect(first[0]).toBe(second[0]);
    });

    test("returns empty array for unknown tag", () => {
      const result = new DiceResult(
        loadDiceResultFixture("single-tag-on-root"),
      );

      expect(result.getTaggedResults("missing")).toEqual([]);
    });
  });

  describe("fixture: many-different-tags", () => {
    test("returns each tagged sub-result for its own tag", () => {
      const root = new DiceResult(loadDiceResultFixture("many-different-tags"));

      const skill = root.getTaggedResults("skill");
      const damage = root.getTaggedResults("damage");
      const sheetId = root.getTaggedResults("ID_12345");

      expect(skill).toHaveLength(1);
      expect(skill[0].total).toBe(10);
      expect(skill[0].tags).toEqual(["skill"]);

      expect(damage).toHaveLength(1);
      expect(damage[0].total).toBe(8);
      expect(damage[0].values).toEqual([3, 5]);

      expect(sheetId).toHaveLength(1);
      expect(sheetId[0].total).toBe(1);
    });

    test("matches several tags using a regexp", () => {
      const root = new DiceResult(loadDiceResultFixture("many-different-tags"));

      const results = root.getTaggedResults(/^ID_\d+$/);

      expect(results.map((node) => node.total)).toEqual([1, 2]);
    });

    test("does not match partial tag strings", () => {
      const root = new DiceResult(loadDiceResultFixture("many-different-tags"));

      /* cspell:disable This is voluntary misspelling */
      expect(root.getTaggedResults("skil")).toEqual([]);
      expect(root.getTaggedResults("damag")).toEqual([]);
      /* cspell:enable This is voluntary misspelling */
    });
  });

  describe("fixture: same-tag-multiple-locations", () => {
    test("returns every node that directly carries the tag", () => {
      const root = new DiceResult(
        loadDiceResultFixture("same-tag-multiple-locations"),
      );

      const results = root.getTaggedResults("pool");

      expect(results).toHaveLength(2);
      expect(results.map((node) => node.total)).toEqual([1, 2]);
      expect(results.every((node) => node.tags.indexOf("pool") !== -1)).toBe(
        true,
      );
    });

    test("does not include the untagged root", () => {
      const root = new DiceResult(
        loadDiceResultFixture("same-tag-multiple-locations"),
      );

      const results = root.getTaggedResults("pool");

      expect(results.indexOf(root)).toBe(-1);
    });
  });

  describe("fixture: comparison-branches", () => {
    test("finds tagged left and right operands", () => {
      const root = new DiceResult(loadDiceResultFixture("comparison-branches"));

      expect(root.getTaggedResults("rolled")[0].total).toBe(42);
      expect(root.getTaggedResults("target")[0].total).toBe(50);
    });
  });
});

describe("DiceResult.getTaggedValues", () => {
  test("returns totals for tagged nodes in the same order as getTaggedResults", () => {
    const root = new DiceResult(loadDiceResultFixture("many-different-tags"));

    expect(root.getTaggedValues("skill")).toEqual([10]);
    expect(root.getTaggedValues("damage")).toEqual([8]);
    expect(root.getTaggedValues(/^ID_\d+$/)).toEqual([1, 2]);
    expect(root.getTaggedValues("pool")).toEqual([]);
  });

  test("returns empty array when nothing matches", () => {
    const result = new DiceResult(loadDiceResultFixture("single-tag-on-root"));

    expect(result.getTaggedValues("missing")).toEqual([]);
  });

  test("matches getTaggedResults totals for multi-match tags", () => {
    const root = new DiceResult(
      loadDiceResultFixture("same-tag-multiple-locations"),
    );

    expect(root.getTaggedValues("pool")).toEqual(
      root.getTaggedResults("pool").map((node) => node.total),
    );
  });
});

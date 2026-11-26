import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

type DiceResultFixtureName =
  | "single-tag-on-root"
  | "many-different-tags"
  | "same-tag-multiple-locations"
  | "comparison-branches";

export function loadDiceResultFixture(
  name: DiceResultFixtureName,
): LetsRole.DiceResult {
  const filePath = join(fixturesDir, `${name}.json`);
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as LetsRole.DiceResult;

  prepareDiceResultRaw(raw);

  return raw;
}

export function prepareDiceResultRaw(
  raw: LetsRole.DiceResult,
): LetsRole.DiceResult {
  attachContainsTagDeep(raw, []);

  return raw;
}

function attachContainsTagDeep(
  raw: LetsRole.DiceResult,
  visited: Array<LetsRole.DiceResult>,
): void {
  if (visited.indexOf(raw) !== -1) {
    return;
  }

  visited.push(raw);

  const allTags = raw.allTags ?? [];

  raw.containsTag = (tag: string) => allTags.indexOf(tag) !== -1;

  const children: LetsRole.IDiceResult[] = raw.children ?? [];

  for (let i = 0; i < children.length; i++) {
    attachContainsTagDeep(children[i] as LetsRole.DiceResult, visited);
  }

  if (raw.left) {
    attachContainsTagDeep(raw.left as LetsRole.DiceResult, visited);
  }

  if (raw.right) {
    attachContainsTagDeep(raw.right as LetsRole.DiceResult, visited);
  }
}

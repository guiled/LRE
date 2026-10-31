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

  attachContainsTag(raw);

  return raw;
}

function attachContainsTag(raw: LetsRole.DiceResult): void {
  const allTags = raw.allTags ?? [];

  raw.containsTag = (tag: string) => allTags.indexOf(tag) !== -1;
}

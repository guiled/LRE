import { FromRaw } from "../annotations/fromRaw";

// ts-unused-exports:disable-next-line
export class DiceResult implements IHasRaw<LetsRole.DiceResult>, LREDiceResult {
  #raw: LetsRole.DiceResult;
  #taggedResultsCache: BasicObject<Array<DiceResult>> | undefined;

  @FromRaw(true)
  _children: Array<any> | undefined;

  @FromRaw(true)
  _dice: Array<any> | undefined;

  @FromRaw(true)
  _expression: string | undefined;

  @FromRaw(true)
  _raw: any | undefined;

  @FromRaw(true)
  _hasExtractedChildren: boolean | undefined;

  @FromRaw(true)
  _hasExtractedDice: boolean | undefined;

  @FromRaw(true)
  _hasExtractedTags: boolean | undefined;

  @FromRaw(true)
  _tags: Array<string> | undefined;

  @FromRaw(true)
  _title: string | null | undefined;

  @FromRaw(true)
  _visibility: LetsRole.RollVisibility | undefined;

  @FromRaw()
  title!: string;

  @FromRaw()
  expression!: string;

  @FromRaw()
  visibility!: LetsRole.RollVisibility;

  @FromRaw()
  type!: LetsRole.RollType;

  @FromRaw()
  total!: number;

  @FromRaw()
  tags!: Array<string>;

  @FromRaw()
  allTags!: Array<string>;

  @FromRaw()
  all!: Array<LetsRole.SingleDiceResult>;

  children!: Array<DiceResult>;
  left!: DiceResult | null;
  right!: DiceResult | null;

  @FromRaw()
  size!: number | null;

  @FromRaw()
  dimension!: number | null;

  @FromRaw()
  values!: Array<number> | null;

  @FromRaw()
  discarded!: Array<number>;

  @FromRaw()
  success!: number | null;

  @FromRaw()
  failure!: number | null;

  constructor(raw: LetsRole.DiceResult) {
    this.#raw = raw;

    this.children = raw.children
      ? raw.children.map(
          (child) => new DiceResult(child as LetsRole.DiceResult),
        )
      : [];
    this.left = raw.left
      ? new DiceResult(raw.left as LetsRole.DiceResult)
      : null;
    this.right = raw.right
      ? new DiceResult(raw.right as LetsRole.DiceResult)
      : null;
  }

  raw(): LetsRole.DiceResult {
    return this.#raw;
  }

  refreshRaw(newRaw?: LetsRole.DiceResult): LetsRole.DiceResult {
    this.#raw = newRaw ?? this.#raw;
    return this.#raw;
  }

  containsTag(tag: string): boolean {
    return this.#raw.containsTag(tag);
  }

  getTaggedResults(tag: string): Array<DiceResult>;
  getTaggedResults(pattern: RegExp): Array<DiceResult>;
  getTaggedResults(matcher: string | RegExp): Array<DiceResult> {
    this.#ensureTaggedResultsCache();
    const index = this.#taggedResultsCache!;

    if (typeof matcher === "string") {
      const found = index[matcher];

      return found ? found.slice() : [];
    }

    const results: Array<DiceResult> = [];
    const allTagsList = this.allTags ?? [];

    for (let i = 0; i < allTagsList.length; i++) {
      const tag = allTagsList[i];

      if (!matcher.test(tag)) {
        continue;
      }

      const nodes = index[tag];

      if (!nodes) {
        continue;
      }

      for (let j = 0; j < nodes.length; j++) {
        results.push(nodes[j]);
      }
    }

    return results;
  }

  getTaggedValues(tag: string): Array<number>;
  getTaggedValues(pattern: RegExp): Array<number>;
  getTaggedValues(matcher: string | RegExp): Array<number> {
    return (
      this.getTaggedResults as (matcher: string | RegExp) => Array<DiceResult>
    )(matcher).map((node) => node.total);
  }

  #ensureTaggedResultsCache(): void {
    if (this.#taggedResultsCache !== undefined) {
      return;
    }

    const index: BasicObject<Array<DiceResult>> = {};
    const allTagsList = this.allTags ?? [];

    for (let i = 0; i < allTagsList.length; i++) {
      index[allTagsList[i]] = [];
    }

    collectTaggedNodes(this, index, []);
    this.#taggedResultsCache = index;
  }

  log(): void {
    lre.log(this.#raw);
  }
}

function directTags(tags: Array<string> | null | undefined): Array<string> {
  if (!tags || !tags.length) {
    return [];
  }

  return tags;
}

function collectTaggedNodes(
  node: DiceResult,
  index: BasicObject<Array<DiceResult>>,
  visited: Array<LetsRole.DiceResult>,
): void {
  const raw = node.raw();

  if (visited.indexOf(raw) !== -1) {
    return;
  }

  visited.push(raw);

  const tags = directTags(node.tags);

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const bucket = index[tag];

    if (bucket) {
      bucket.push(node);
    }
  }

  const childList = node.children;

  for (let i = 0; i < childList.length; i++) {
    collectTaggedNodes(childList[i], index, visited);
  }

  if (node.left) {
    collectTaggedNodes(node.left, index, visited);
  }

  if (node.right) {
    collectTaggedNodes(node.right, index, visited);
  }
}

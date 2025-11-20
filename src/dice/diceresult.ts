// ts-unused-exports:disable-next-line
export class DiceResult implements LREDiceResult {
  #raw: LetsRole.DiceResult;
  _children: Array<any> | undefined;
  _dice: Array<any> | undefined;
  _expression: string | undefined;
  _raw: any | undefined;
  _hasExtractedChildren: boolean | undefined;
  _hasExtractedDice: boolean | undefined;
  _hasExtractedTags: boolean | undefined;
  _tags: Array<string> | undefined;
  _title: string | null | undefined;
  _visibility: LetsRole.RollVisibility | undefined;

  title: string;
  expression: string;
  visibility: LetsRole.RollVisibility;
  type: LetsRole.RollType;
  total: number;
  tags: Array<string>;
  allTags: Array<string>;
  all: Array<LetsRole.SingleDiceResult>;
  children: Array<DiceResult>;
  size: number | null;
  dimension: number | null;
  values: Array<number> | null;
  discarded: Array<number>;
  left: DiceResult | null;
  right: DiceResult | null;
  success: number | null;
  failure: number | null;

  constructor(raw: LetsRole.DiceResult) {
    this.#raw = raw;
    this._children = raw._children;
    this._dice = raw._dice;
    this._expression = raw._expression;
    this._raw = raw._raw;
    this._hasExtractedChildren = raw._hasExtractedChildren;
    this._hasExtractedDice = raw._hasExtractedDice;
    this._hasExtractedTags = raw._hasExtractedTags;
    this._tags = raw._tags;
    this._title = raw._title;
    this._visibility = raw._visibility;

    this.title = raw.title;
    this.expression = raw.expression;
    this.visibility = raw.visibility;
    this.type = raw.type;
    this.total = raw.total;
    this.tags = raw.tags;
    this.allTags = raw.allTags;
    this.all = raw.all;
    this.children = raw.children
      ? raw.children.map(
          (child) => new DiceResult(child as LetsRole.DiceResult),
        )
      : [];
    this.size = raw.size;
    this.dimension = raw.dimension;
    this.values = raw.values;
    this.discarded = raw.discarded;
    this.left = raw.left
      ? new DiceResult(raw.left as LetsRole.DiceResult)
      : null;
    this.right = raw.right
      ? new DiceResult(raw.right as LetsRole.DiceResult)
      : null;
    this.success = raw.success;
    this.failure = raw.failure;
  }

  raw(): LetsRole.DiceResult {
    return this.#raw;
  }

  containsTag(tag: string): boolean {
    return this.#raw.containsTag(tag);
  }
}

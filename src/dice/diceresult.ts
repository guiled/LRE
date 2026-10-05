import { FromRaw } from "../annotations/fromRaw";

// ts-unused-exports:disable-next-line
export class DiceResult implements IHasRaw<LetsRole.DiceResult>, LREDiceResult {
  #raw: LetsRole.DiceResult;

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
}

import { FluentFromRaw } from "../annotations/fluentFromRaw";

export class DiceBuilder implements LetsRole.DiceBuilder {
  #raw: LetsRole.DiceBuilder;

  public diceBuilder: boolean = true;

  constructor(raw: LetsRole.DiceBuilder) {
    this.#raw = raw;
  }

  raw(): LetsRole.DiceBuilder {
    return this.#raw;
  }

  @FluentFromRaw
  add!: (_value: number) => DiceBuilder;

  @FluentFromRaw
  minus!: (_value: number) => DiceBuilder;

  @FluentFromRaw
  multiply!: (_value: number) => DiceBuilder;

  @FluentFromRaw
  divide!: (_value: number) => DiceBuilder;

  @FluentFromRaw
  tag!: (..._tags: string[]) => DiceBuilder;

  @FluentFromRaw
  compare!: (
    _type: LetsRole.DiceCompare,
    _right: number,
    _weights?: unknown,
  ) => DiceBuilder;

  @FluentFromRaw
  round!: () => DiceBuilder;

  @FluentFromRaw
  ceil!: () => DiceBuilder;

  @FluentFromRaw
  floor!: () => DiceBuilder;

  @FluentFromRaw
  keeph!: (_max: number) => DiceBuilder;

  @FluentFromRaw
  keepl!: (_max: number) => DiceBuilder;

  @FluentFromRaw
  remh!: (_max: number) => DiceBuilder;

  @FluentFromRaw
  reml!: (_max: number) => DiceBuilder;

  @FluentFromRaw
  expl!: (..._explodes: number[]) => DiceBuilder;

  @FluentFromRaw
  expladd!: (..._explodes: number[]) => DiceBuilder;

  @FluentFromRaw
  mul!: (_multiplier: number) => DiceBuilder;

  @FluentFromRaw
  reroll!: (..._reroll: number[]) => DiceBuilder;

  @FluentFromRaw
  rerolln!: (
    ..._args: Parameters<LetsRole.DiceBuilder["rerolln"]>
  ) => DiceBuilder;

  @FluentFromRaw
  ternary!: (_then: string, _else: string) => DiceBuilder;
}

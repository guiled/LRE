export class DiceBuilder implements LetsRole.DiceBuilder {
  #raw: LetsRole.DiceBuilder;

  public diceBuilder: boolean = true;

  constructor(raw: LetsRole.DiceBuilder) {
    this.#raw = raw;
  }

  raw(): LetsRole.DiceBuilder {
    return this.#raw;
  }

  add(value: number): DiceBuilder {
    this.#raw.add(value);
    return this;
  }

  minus(value: number): DiceBuilder {
    this.#raw.minus(value);
    return this;
  }

  multiply(value: number): DiceBuilder {
    this.#raw.multiply(value);
    return this;
  }

  divide(value: number): DiceBuilder {
    this.#raw.divide(value);
    return this;
  }

  tag(...tags: string[]): DiceBuilder {
    this.#raw.tag(...tags);
    return this;
  }

  compare(
    type: LetsRole.DiceCompare,
    right: number,
    weights?: unknown,
  ): DiceBuilder {
    this.#raw.compare(type, right, weights);
    return this;
  }

  round(): DiceBuilder {
    this.#raw.round();
    return this;
  }

  ceil(): DiceBuilder {
    this.#raw.ceil();
    return this;
  }

  floor(): DiceBuilder {
    this.#raw.floor();
    return this;
  }

  keeph(max: number): DiceBuilder {
    this.#raw.keeph(max);
    return this;
  }

  keepl(max: number): DiceBuilder {
    this.#raw.keepl(max);
    return this;
  }

  remh(max: number): DiceBuilder {
    this.#raw.remh(max);
    return this;
  }

  reml(max: number): DiceBuilder {
    this.#raw.reml(max);
    return this;
  }

  expl(...explodes: number[]): DiceBuilder {
    this.#raw.expl(...explodes);
    return this;
  }

  expladd(...explodes: number[]): DiceBuilder {
    this.#raw.expladd(...explodes);
    return this;
  }

  mul(multiplier: number): DiceBuilder {
    this.#raw.mul(multiplier);
    return this;
  }

  reroll(...reroll: number[]): DiceBuilder {
    this.#raw.reroll(...reroll);
    return this;
  }

  rerolln(...args: Parameters<LetsRole.DiceBuilder["rerolln"]>): DiceBuilder {
    this.#raw.rerolln(...args);
    return this;
  }

  ternary(then: string, _else: string): DiceBuilder {
    this.#raw.ternary(then, _else);
    return this;
  }
}

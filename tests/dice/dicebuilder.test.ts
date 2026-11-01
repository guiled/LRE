import type { Mock } from "vitest";
import { DiceBuilder } from "../../src/dice/dicebuilder";

type RawDiceBuilderMock = {
  [K in keyof LetsRole.DiceBuilder]: Mock<LetsRole.DiceBuilder[K]>;
};

const createRawDiceBuilderMock = (): RawDiceBuilderMock => ({
  add: vi.fn(),
  minus: vi.fn(),
  multiply: vi.fn(),
  divide: vi.fn(),
  tag: vi.fn(),
  compare: vi.fn(),
  round: vi.fn(),
  ceil: vi.fn(),
  floor: vi.fn(),
  keeph: vi.fn(),
  keepl: vi.fn(),
  remh: vi.fn(),
  reml: vi.fn(),
  expl: vi.fn(),
  expladd: vi.fn(),
  mul: vi.fn(),
  reroll: vi.fn(),
  rerolln: vi.fn(),
  ternary: vi.fn(),
});

describe("DiceBuilder", () => {
  let raw: RawDiceBuilderMock;
  let builder: DiceBuilder;

  beforeEach(() => {
    raw = createRawDiceBuilderMock();
    builder = new DiceBuilder(raw);
  });

  test("marks itself as an LRE dice builder and exposes the native builder", () => {
    expect(builder.diceBuilder).toBe(true);
    expect(builder.raw()).toBe(raw);
  });

  test.each([
    ["add", 3],
    ["minus", 2],
    ["multiply", 4],
    ["divide", 2],
    ["keeph", 2],
    ["keepl", 1],
    ["remh", 3],
    ["reml", 1],
    ["mul", 2],
  ] as const satisfies ReadonlyArray<[keyof RawDiceBuilderMock, number]>)(
    "%s forwards its numeric argument to the native builder",
    (method, value) => {
      expect(builder[method](value)).toBe(builder);
      expect(raw[method]).toHaveBeenCalledWith(value);
    },
  );

  test.each(["round", "ceil", "floor"] as const)(
    "%s forwards to the native builder",
    (method) => {
      expect(builder[method]()).toBe(builder);
      expect(raw[method]).toHaveBeenCalledWith();
    },
  );

  test("tag forwards all tag strings to the native builder", () => {
    expect(builder.tag("attack", "visible")).toBe(builder);
    expect(raw.tag).toHaveBeenCalledWith("attack", "visible");
  });

  test("compare forwards type, threshold, and optional weights", () => {
    const weights = { success: 1 };

    expect(builder.compare(">=", 10, weights)).toBe(builder);
    expect(raw.compare).toHaveBeenCalledWith(">=", 10, weights);
  });

  test("expl and expladd forward explode thresholds", () => {
    expect(builder.expl(6, 6)).toBe(builder);
    expect(raw.expl).toHaveBeenCalledWith(6, 6);

    expect(builder.expladd(1)).toBe(builder);
    expect(raw.expladd).toHaveBeenCalledWith(1);
  });

  test("reroll and rerolln forward reroll values", () => {
    expect(builder.reroll(1, 2)).toBe(builder);
    expect(raw.reroll).toHaveBeenCalledWith(1, 2);

    expect(builder.rerolln(1, 2, 10)).toBe(builder);
    expect(raw.rerolln).toHaveBeenCalledWith(1, 2, 10);
  });

  test("ternary forwards both branch expressions", () => {
    expect(builder.ternary("success", "failure")).toBe(builder);
    expect(raw.ternary).toHaveBeenCalledWith("success", "failure");
  });

  test("supports fluent chaining through the wrapper", () => {
    const chained = builder.add(1).minus(2).tag("damage").round().keeph(3);

    expect(chained).toBe(builder);
    expect(raw.add).toHaveBeenCalledWith(1);
    expect(raw.minus).toHaveBeenCalledWith(2);
    expect(raw.tag).toHaveBeenCalledWith("damage");
    expect(raw.round).toHaveBeenCalled();
    expect(raw.keeph).toHaveBeenCalledWith(3);
  });
});

import { FromRaw } from "../src/annotations/fromRaw";
import * as directToRawModule from "../src/globals/directToRaw";
import {
  directToRaw,
  withoutFromRawWarnings,
} from "../src/globals/directToRaw";

const createFieldDecoratorContext = (
  name: string,
): {
  context: ClassFieldDecoratorContext<IHasRaw, unknown>;
  initializers: Array<(this: IHasRaw) => void>;
} => {
  const initializers: Array<(this: IHasRaw) => void> = [];
  const context = {
    kind: "field" as const,
    name,
    static: false,
    private: false,
    access: {
      has: (): boolean => false,
      get: (): undefined => undefined,
      set: (): void => {},
    },
    addInitializer(fn: (this: IHasRaw) => void): void {
      initializers.push(fn);
    },
  };

  return {
    context: context as unknown as ClassFieldDecoratorContext<IHasRaw, unknown>,
    initializers,
  };
};

const hasRawSubject = (raw: Record<string, unknown>): IHasRaw => ({
  raw: () => raw as unknown as LetsRole.DiceResult,
  refreshRaw: () => raw as unknown as LetsRole.DiceResult,
});

describe("directToRaw", () => {
  beforeEach(() => {
    global.lre = { warn: vi.fn() } as unknown as typeof lre;
  });

  afterEach(() => {
    delete (global as { lre?: typeof lre }).lre;
  });

  test("getter returns live value from raw", () => {
    const raw = { _children: ["a"] };
    const subject = hasRawSubject(raw);
    directToRaw(subject, ["_children"], false);

    expect(
      (subject.raw() as unknown as Record<string, unknown>)._children,
    ).toEqual(["a"]);
    expect(
      (subject as unknown as { _children: Array<string> })._children,
    ).toEqual(["a"]);

    raw._children = ["b"];

    expect(
      (subject as unknown as { _children: Array<string> })._children,
    ).toEqual(["b"]);
  });

  test("setter writes through to raw object", () => {
    const raw = { _dice: [1] };
    const subject = hasRawSubject(raw);
    directToRaw(subject, ["_dice"], false);

    (subject as unknown as { _dice: Array<number> })._dice = [2, 3];

    expect(raw._dice).toEqual([2, 3]);
  });

  test("warns on get and set when logWarning is true", () => {
    const raw = { _tags: ["x"] };
    const subject = hasRawSubject(raw);
    directToRaw(subject, ["_tags"], true);

    expect(lre.warn).not.toHaveBeenCalled();

    void (subject as unknown as { _tags: Array<string> })._tags;

    expect(lre.warn).toHaveBeenCalledTimes(1);
    expect(lre.warn).toHaveBeenCalledWith(
      "The get of _tags is unsure and can be broken in a future version of Let's Role",
    );

    (subject as unknown as { _tags: Array<string> })._tags = ["y"];

    expect(lre.warn).toHaveBeenCalledTimes(2);
    expect(lre.warn).toHaveBeenLastCalledWith(
      "The set of _tags is unsure and can be broken in a future version of Let's Role",
    );
  });

  test("warned props are omitted from enumeration", () => {
    const raw = { _tags: ["x"], title: "ok" };
    const subject = hasRawSubject(raw);
    directToRaw(subject, ["_tags"], true);
    directToRaw(subject, ["title"], false);

    expect(Object.keys(subject as object)).not.toContain("_tags");
    expect(Object.keys(subject as object)).toContain("title");
    expect(Object.getOwnPropertyNames(subject as object)).toContain("_tags");
  });

  test("does not warn while withoutFromRawWarnings is active", () => {
    const raw = { _tags: ["x"] };
    const subject = hasRawSubject(raw);
    directToRaw(subject, ["_tags"], true);

    withoutFromRawWarnings(() => {
      void (subject as unknown as { _tags: Array<string> })._tags;
      (subject as unknown as { _tags: Array<string> })._tags = ["y"];
    });

    expect(lre.warn).not.toHaveBeenCalled();

    void (subject as unknown as { _tags: Array<string> })._tags;

    expect(lre.warn).toHaveBeenCalledTimes(1);
  });

  test("does not warn when logWarning is false", () => {
    const raw = { _title: "old" };
    const subject = hasRawSubject(raw);
    directToRaw(subject, ["_title"], false);

    void (subject as unknown as { _title: string })._title;
    (subject as unknown as { _title: string })._title = "new";

    expect(lre.warn).not.toHaveBeenCalled();
    expect(raw._title).toBe("new");
  });

  test("syncs public DiceResult fields from raw", () => {
    const raw = { title: "Attack", total: 15, tags: ["damage"] };
    const subject = hasRawSubject(raw);
    directToRaw(subject, ["title", "total", "tags"], false);

    expect((subject as unknown as { title: string }).title).toBe("Attack");
    expect((subject as unknown as { total: number }).total).toBe(15);

    raw.total = 20;

    expect((subject as unknown as { total: number }).total).toBe(20);
  });
});

describe("FromRaw decorator", () => {
  test("bare @FromRaw registers directToRaw without warnings", () => {
    const directToRawSpy = vi.spyOn(directToRawModule, "directToRaw");
    const { context, initializers } = createFieldDecoratorContext("_dice");

    const result = FromRaw(context);

    expect(result).toBeUndefined();
    expect(initializers).toHaveLength(1);

    const subject = hasRawSubject({ _dice: [1] });
    initializers[0]!.call(subject);

    expect(directToRawSpy).toHaveBeenCalledOnce();
    expect(directToRawSpy).toHaveBeenCalledWith(subject, ["_dice"], false);

    directToRawSpy.mockRestore();
  });

  test("FromRaw(true) factory registers directToRaw with warnings", () => {
    const directToRawSpy = vi.spyOn(directToRawModule, "directToRaw");
    const { context, initializers } = createFieldDecoratorContext("_tags");
    const decorator = FromRaw(true);

    expect(typeof decorator).toBe("function");

    decorator(undefined, context);

    expect(initializers).toHaveLength(1);

    const subject = hasRawSubject({ _tags: ["x"] });
    initializers[0]!.call(subject);

    expect(directToRawSpy).toHaveBeenCalledWith(subject, ["_tags"], true);

    directToRawSpy.mockRestore();
  });
});

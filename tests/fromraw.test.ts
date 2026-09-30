import { directToRaw } from "../src/globals/directToRaw";

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
      "The use of this property is unsure and can be broken in a future version of Let's Role",
    );

    (subject as unknown as { _tags: Array<string> })._tags = ["y"];

    expect(lre.warn).toHaveBeenCalledTimes(2);
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
});

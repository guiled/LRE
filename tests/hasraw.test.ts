import { HasRaw } from "../src/hasraw";

describe("Hasraw", () => {
  test("Hasraw construction and public methods", () => {
    let raw = {};
    const getRaw = vi.fn(() => raw);
    const onRefresh = vi.fn();
    const subject = new (HasRaw<any>())({
      getRaw,
      onRefresh,
    });

    expect(getRaw).toHaveBeenCalledTimes(0);
    expect(subject.raw()).toBe(raw);
    expect(getRaw).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledTimes(0);

    raw = {};

    expect(subject.raw()).not.toBe(raw);

    subject.refreshRaw();

    expect(getRaw).toHaveBeenCalledTimes(2);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(subject.raw()).toBe(raw);
  });
});

import { registerLreBindings } from "../../src/proxy/bindings";
import { modeHandlerMock } from "../mock/modeHandler.mock";

const context = modeHandlerMock();

const createOriginalBindings = (): LetsRole.Bindings => ({
  add: vi.fn(),
  clear: vi.fn(),
  remove: vi.fn(),
  send: vi.fn(),
});

describe("registerLreBindings", () => {
  let originalBindings: LetsRole.Bindings;

  beforeEach(() => {
    context.setMode("real");
    originalBindings = createOriginalBindings();
  });

  test("returns a bindings object with the same methods as the original", () => {
    const subject = registerLreBindings(context, originalBindings);

    expect(subject).not.toBe(originalBindings);
    expect(Object.keys(subject).sort()).toEqual(
      Object.keys(originalBindings).sort(),
    );
  });

  describe("real mode", () => {
    test("forwards add with all arguments", () => {
      const subject = registerLreBindings(context, originalBindings);
      const dataCallback = vi.fn(() => ({}));

      subject.add("bindingName", "componentId", "viewId", dataCallback);

      expect(originalBindings.add).toHaveBeenCalledOnce();
      expect(originalBindings.add).toHaveBeenCalledWith(
        "bindingName",
        "componentId",
        "viewId",
        dataCallback,
      );
    });

    test("forwards clear with component id", () => {
      const subject = registerLreBindings(context, originalBindings);

      subject.clear("componentId");

      expect(originalBindings.clear).toHaveBeenCalledOnce();
      expect(originalBindings.clear).toHaveBeenCalledWith("componentId");
    });

    test("forwards remove with binding name", () => {
      const subject = registerLreBindings(context, originalBindings);

      subject.remove("bindingName");

      expect(originalBindings.remove).toHaveBeenCalledOnce();
      expect(originalBindings.remove).toHaveBeenCalledWith("bindingName");
    });

    test("forwards send with sheet and binding name", () => {
      const subject = registerLreBindings(context, originalBindings);
      const sheet = { id: "sheet-1" } as unknown as LetsRole.Sheet;

      subject.send(sheet, "bindingName");

      expect(originalBindings.send).toHaveBeenCalledOnce();
      expect(originalBindings.send).toHaveBeenCalledWith(sheet, "bindingName");
    });
  });

  describe("virtual mode", () => {
    beforeEach(() => {
      context.setMode("virtual");
    });

    test("add does not call original and returns an callable no-op", () => {
      const subject = registerLreBindings(context, originalBindings);
      const dataCallback = vi.fn(() => ({}));

      const result = subject.add(
        "bindingName",
        "componentId",
        "viewId",
        dataCallback,
      );

      expect(originalBindings.add).not.toHaveBeenCalled();
      expect(typeof (result as unknown)).toBe("function");
      expect(() => (result as unknown as () => void)()).not.toThrow();
    });

    test("clear does not call original and returns an callable no-op", () => {
      const subject = registerLreBindings(context, originalBindings);

      const result = subject.clear("componentId");

      expect(originalBindings.clear).not.toHaveBeenCalled();
      expect(typeof (result as unknown)).toBe("function");
      expect(() => (result as unknown as () => void)()).not.toThrow();
    });

    test("remove does not call original and returns an callable no-op", () => {
      const subject = registerLreBindings(context, originalBindings);

      const result = subject.remove("bindingName");

      expect(originalBindings.remove).not.toHaveBeenCalled();
      expect(typeof (result as unknown)).toBe("function");
      expect(() => (result as unknown as () => void)()).not.toThrow();
    });

    test("send does not call original and returns an callable no-op", () => {
      const subject = registerLreBindings(context, originalBindings);
      const sheet = { id: "sheet-1" } as unknown as LetsRole.Sheet;

      const result = subject.send(sheet, "bindingName");

      expect(originalBindings.send).not.toHaveBeenCalled();
      expect(typeof (result as unknown)).toBe("function");
      expect(() => (result as unknown as () => void)()).not.toThrow();
    });
  });

  describe("mode is resolved on each call", () => {
    test("switches between delegating and no-op when mode changes", () => {
      const subject = registerLreBindings(context, originalBindings);
      const dataCallback = vi.fn(() => ({}));

      context.setMode("real");
      subject.add("a", "c1", "v1", dataCallback);

      expect(originalBindings.add).toHaveBeenCalledTimes(1);

      context.setMode("virtual");
      subject.add("b", "c2", "v2", dataCallback);

      expect(originalBindings.add).toHaveBeenCalledTimes(1);

      context.setMode("real");
      subject.remove("a");

      expect(originalBindings.remove).toHaveBeenCalledOnce();
    });
  });
});

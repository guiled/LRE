import { FluentFromRaw } from "../src/annotations/fluentFromRaw";
import { fluentToRaw } from "../src/globals/fluentToRaw";

describe("fluentToRaw", () => {
  test("installs batched methods that forward to raw", () => {
    const add = vi.fn();
    const tag = vi.fn();
    const raw = { add, tag };

    type Wrapper = {
      raw(): typeof raw;
      add(value: number): Wrapper;
      tag(...tags: string[]): Wrapper;
    };

    const wrapper = {
      raw: (): typeof raw => raw,
    } as Wrapper;

    fluentToRaw(wrapper, ["add", "tag"]);

    expect(wrapper.add(3)).toBe(wrapper);
    expect(add).toHaveBeenCalledWith(3);
    expect(wrapper.tag("x", "y")).toBe(wrapper);
    expect(tag).toHaveBeenCalledWith("x", "y");
  });
});

describe("FluentFromRaw decorator", () => {
  test("field form installs a delegate on the instance", () => {
    const add = vi.fn();
    const raw = { add };

    class Example {
      raw(): object {
        return raw;
      }

      @FluentFromRaw
      add!: (_value: number) => Example;
    }

    const subject = new Example();
    const chained = subject.add(2);

    expect(chained).toBe(subject);
    expect(add).toHaveBeenCalledWith(2);
  });

  test("replaces the method with a raw delegate that returns this", () => {
    const tag = vi.fn();
    const raw = { tag };

    class Example {
      raw(): object {
        return raw;
      }

      @FluentFromRaw
      tag(..._tags: string[]): Example {
        return this;
      }
    }

    const subject = new Example();
    const chained = subject.tag("attack", "visible");

    expect(chained).toBe(subject);
    expect(tag).toHaveBeenCalledWith("attack", "visible");
  });

  test("registers using the decorator context method name", () => {
    const multiply = vi.fn();
    const raw = { multiply };

    class Example {
      raw(): object {
        return raw;
      }

      @FluentFromRaw
      multiply(_value: number): Example {
        return this;
      }
    }

    const subject = new Example();

    expect(subject.multiply(4)).toBe(subject);
    expect(multiply).toHaveBeenCalledWith(4);
  });
});

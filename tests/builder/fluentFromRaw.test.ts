import { transformSync } from "@swc/core";
import { transformForLR } from "../../transpile.conf";

const normalize = (code: string): string =>
  code
    .replace(/\s+/g, " ")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/ ;/g, ";")
    .trim();

const runTransform = (code: string): string =>
  normalize(transformSync(code, transformForLR).code.trim());

describe("FluentFromRaw method transform", () => {
  test("injects batched fFR in constructor and omits prot methods", () => {
    const output = runTransform(`
      class Example {
        constructor(raw) {
          this.__raw = raw;
        }
        raw() {
          return this.__raw;
        }
        @FluentFromRaw
        add(value) {
          this.__raw.add(value);
          return this;
        }
      }
    `);

    expect(output).toContain('fFR(this, ["add"])');
    expect(output).not.toContain("add: function");
    /* cspell: disable-next-line */
    expect(output).not.toContain("__decoratedadd");
    expect(output).not.toContain("FluentFromRaw");
  });

  test("groups multiple fluent members in one fFR call", () => {
    const output = runTransform(`
      class Example {
        raw() {
          return this.__raw;
        }
        @FluentFromRaw
        add: (value: number) => Example;
        @FluentFromRaw()
        tag: (...tags: string[]) => Example;
      }
    `);

    expect(output).toContain('fFR(this, ["add", "tag"])');
    expect(output).not.toContain('fFR(this, ["add"],');
  });

  test("keeps other method decorators alongside FluentFromRaw", () => {
    const output = runTransform(`
      class Example {
        raw() {
          return this.__raw;
        }
        @Other
        @FluentFromRaw
        add(value) {
          return this;
        }
      }
    `);

    /* cspell: disable-next-line */
    expect(output).toContain("__decoratedadd");
    expect(output).toContain("__fluentTarget");
    expect(output).toContain(".add.apply");
    expect(output).not.toContain('fFR(this, ["add"])');
  });

  test("leaves methods without FluentFromRaw unchanged", () => {
    const output = runTransform(`
      class Example {
        raw() {
          return this.__raw;
        }
        custom() {
          return 1;
        }
      }
    `);

    expect(output).not.toContain("fFR");
    expect(output).toContain("return 1");
  });
});

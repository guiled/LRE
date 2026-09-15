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

describe("classToFunction flatten", () => {
  test("inlines __decl into ctor for top-level classes without inheritance", () => {
    const output = runTransform(`
      class Foo {
        #value = 0;
        constructor(value) {
          this.#value = value;
        }
        getValue() {
          return this.#value;
        }
      }
    `);

    expect(output).not.toContain("var __decl = function __decl");
    expect(output).not.toContain("__decl.call(this)");
    expect(output).toContain("if (!__declDone)");
    expect(output).toContain("Oba(this, prot)");
    expect(output).toContain("__declDone = true");
  });

  test("keeps __decl wrapper for classes nested in functions", () => {
    const output = runTransform(`
      function make() {
        class Foo {
          value = 0;
          getValue() {
            return this.value;
          }
        }
        return Foo;
      }
    `);

    expect(output).toContain("var __decl = function __decl");
    expect(output).toContain("__decl.call(this)");
  });

  test("keeps __decl wrapper for classes with inheritance", () => {
    const output = runTransform(`
      class Base {
        baseMethod() {
          return 1;
        }
      }
      class Child extends Base {
        childMethod() {
          return 2;
        }
      }
    `);

    expect(output).toContain("var __decl = function __decl");
    expect(output).toContain("__super = initParent.call(this, this)");
  });

  test("keeps __decl wrapper for mixin factory inner classes", () => {
    const output = runTransform(`
      const HasRaw = (superclass = class {}) => class extends superclass {
        #raw;
        constructor({ getRaw }) {
          super();
          this.#raw = getRaw();
        }
        raw() {
          return this.#raw;
        }
      };
    `);

    expect(output).toContain("var __decl = function __decl");
  });
});

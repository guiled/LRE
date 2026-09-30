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

describe("FromRaw property transform", () => {
  test("skips prot assignment and injects dTR with warnings", () => {
    const output = runTransform(`
      class Example {
        @FromRaw(true)
        _children;
        constructor(raw) {
          this.__raw = raw;
        }
        getRaw() {
          return this.__raw;
        }
      }
    `);

    expect(output).not.toContain("this._children = undefined");
    expect(output).toContain('dTR(this, ["_children"], true)');
  });

  test("emits dTR with false for default @FromRaw", () => {
    const output = runTransform(`
      class Example {
        @FromRaw
        _dice;
        constructor(raw) {
          this.__raw = raw;
        }
      }
    `);

    expect(output).toContain('dTR(this, ["_dice"], false)');
  });

  test("emits dTR with false for @FromRaw()", () => {
    const output = runTransform(`
      class Example {
        @FromRaw()
        _tags;
        constructor(raw) {}
      }
    `);

    expect(output).toContain('dTR(this, ["_tags"], false)');
  });

  test("emits dTR with false for @FromRaw(false)", () => {
    const output = runTransform(`
      class Example {
        @FromRaw(false)
        _expression;
        constructor(raw) {}
      }
    `);

    expect(output).toContain('dTR(this, ["_expression"], false)');
  });

  test("groups props by warning flag into separate calls", () => {
    const output = runTransform(`
      class Example {
        @FromRaw
        _silent;
        @FromRaw(true)
        _warned;
        constructor(raw) {}
      }
    `);

    expect(output).toContain('dTR(this, ["_silent"], false)');
    expect(output).toContain('dTR(this, ["_warned"], true)');
  });

  test("groups multiple warned props in one call", () => {
    const output = runTransform(`
      class Example {
        @FromRaw(true)
        _children;
        @FromRaw(true)
        _dice;
        constructor(raw) {}
      }
    `);

    expect(output).toContain('dTR(this, ["_children", "_dice"], true)');
  });

  test("groups multiple silent props in one call", () => {
    const output = runTransform(`
      class Example {
        @FromRaw
        _a;
        @FromRaw()
        _b;
        constructor(raw) {}
      }
    `);

    expect(output).toContain('dTR(this, ["_a", "_b"], false)');
    expect(output).not.toContain('dTR(this, ["_a"], false)');
  });

  test("does not emit dTR when no @FromRaw props exist", () => {
    const output = runTransform(`
      class Example {
        title;
        constructor(raw) {
          this.title = raw.title;
        }
      }
    `);

    expect(output).not.toContain("dTR");
  });

  test("keeps normal property initializers alongside @FromRaw props", () => {
    const output = runTransform(`
      class Example {
        @FromRaw(true)
        _children;
        title = "init";
        constructor(raw) {
          this.__raw = raw;
        }
      }
    `);

    expect(output).not.toContain("this._children");
    expect(output).toContain('this.title = "init"');
    expect(output).toContain('dTR(this, ["_children"], true)');
  });

  test("skips initializer assignment on @FromRaw property with explicit value", () => {
    const output = runTransform(`
      class Example {
        @FromRaw(true)
        _tags = [];
        constructor(raw) {}
      }
    `);

    expect(output).not.toContain("this._tags = []");
    expect(output).toContain('dTR(this, ["_tags"], true)');
  });

  test("does not put @FromRaw props on prot object", () => {
    const output = runTransform(`
      class Example {
        @FromRaw(true)
        _children;
        getValue() {
          return 1;
        }
        constructor(raw) {}
      }
    `);

    expect(output).toContain("getValue: function");
    expect(output).not.toMatch(/prot\s*=\s*\{[^}]*_children/);
    expect(output).toContain('dTR(this, ["_children"], true)');
  });

  test("appends dTR after constructor body statements", () => {
    const output = runTransform(`
      class Example {
        @FromRaw(true)
        _children;
        constructor(raw) {
          this.__raw = raw;
          this.title = raw.title;
        }
      }
    `);

    const rawAssignIndex = output.indexOf("this.__raw = raw");
    const titleAssignIndex = output.indexOf("this.title = raw.title");
    const dTRIndex = output.indexOf("dTR(this");

    expect(rawAssignIndex).toBeGreaterThan(-1);
    expect(titleAssignIndex).toBeGreaterThan(rawAssignIndex);
    expect(dTRIndex).toBeGreaterThan(titleAssignIndex);
  });

  test("injects dTR in flattened top-level class constructor", () => {
    const output = runTransform(`
      class Example {
        @FromRaw(true)
        _children;
        constructor(raw) {
          this.__raw = raw;
        }
      }
    `);

    expect(output).not.toContain("var __decl = function __decl");
    expect(output).toContain('dTR(this, ["_children"], true)');
  });

  test("injects dTR in nested class with __decl wrapper", () => {
    const output = runTransform(`
      function make() {
        class Example {
          @FromRaw(true)
          _children;
          constructor(raw) {
            this.__raw = raw;
          }
        }
        return Example;
      }
    `);

    expect(output).toContain("var __decl = function __decl");
    expect(output).toContain('dTR(this, ["_children"], true)');
  });

  test("injects dTR for class with inheritance", () => {
    const output = runTransform(`
      class Example extends Base {
        @FromRaw(true)
        _children;
        constructor(raw) {
          super();
          this.__raw = raw;
        }
      }
    `);

    expect(output).toContain('dTR(this, ["_children"], true)');
    expect(output).toContain("__super");
  });

  test("treats non-boolean @FromRaw argument as silent", () => {
    const output = runTransform(`
      class Example {
        @FromRaw(1)
        _title;
        constructor(raw) {}
      }
    `);

    expect(output).toContain('dTR(this, ["_title"], false)');
  });

  test("transpile DiceResult-like class with many @FromRaw(true) props", () => {
    const output = runTransform(`
      class DiceResult {
        #raw;
        @FromRaw(true)
        _children;
        @FromRaw(true)
        _dice;
        @FromRaw(true)
        _expression;
        @FromRaw(true)
        _raw;
        @FromRaw(true)
        _hasExtractedChildren;
        @FromRaw(true)
        _hasExtractedDice;
        @FromRaw(true)
        _hasExtractedTags;
        @FromRaw(true)
        _tags;
        @FromRaw(true)
        _title;
        @FromRaw(true)
        _visibility;
        title;
        constructor(raw) {
          this.#raw = raw;
          this.title = raw.title;
        }
        getRaw() {
          return this.#raw;
        }
      }
    `);

    expect(output).toContain(
      'dTR(this, ["_children", "_dice", "_expression", "_raw", "_hasExtractedChildren", "_hasExtractedDice", "_hasExtractedTags", "_tags", "_title", "_visibility"], true)',
    );
    expect(output).not.toContain("this._children");
    expect(output).not.toContain("this._dice");
    expect(output).toContain("this.title = raw.title");
    expect(output.indexOf("this.#raw = raw")).toBeLessThan(
      output.indexOf("dTR(this"),
    );
  });
});

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

const expectNoUndefinedPropInits = (output: string): void => {
  expect(output).not.toMatch(/this\.\w+ = undefined/);
  expect(output).not.toMatch(/this\.\w+ = void 0/);
};

describe("omit undefined prop init", () => {
  test("omits declared-only instance props without initializer", () => {
    const output = runTransform(`
      class Foo {
        title: string;
        expression: string;
        constructor(raw) {
          this.title = raw.title;
          this.expression = raw.expression;
        }
      }
    `);

    expectNoUndefinedPropInits(output);

    expect(output).toContain("this.title = raw.title");
    expect(output).toContain("this.expression = raw.expression");
  });

  test("omits explicit undefined and void 0 instance prop inits", () => {
    const output = runTransform(`
      class Foo {
        empty = undefined;
        cleared = void 0;
        name = "A";
      }
    `);

    expectNoUndefinedPropInits(output);

    expect(output).toContain('this.name = "A"');
    expect(output).not.toContain("this.empty");
    expect(output).not.toContain("this.cleared");
  });

  test("keeps instance props with real initializers in __declDone block", () => {
    const output = runTransform(`
      class Foo {
        count = 0;
        label = "default";
        flag = false;
      }
    `);

    expect(output).toContain("this.count = 0");
    expect(output).toContain('this.label = "default"');
    expect(output).toContain("this.flag = false");
  });

  test("omits multiple declared-only fields while keeping mixed initializers", () => {
    const output = runTransform(`
      class Foo {
        a: string;
        b: number;
        c = "ok";
        constructor() {
          this.a = "x";
          this.b = 2;
        }
      }
    `);

    expectNoUndefinedPropInits(output);

    expect(output).toContain('this.c = "ok"');
    expect(output).toContain('this.a = "x"');
    expect(output).toContain("this.b = 2");
  });

  test("omits declared-only static props and explicit undefined static inits", () => {
    const output = runTransform(`
      class Foo {
        static declared: number;
        static value = 1;
        static empty = undefined;
      }
    `);

    expect(output).not.toMatch(/fn\.\w+ = undefined/);
    expect(output).toContain("fn.value = 1");
    expect(output).not.toContain("fn.declared");
    expect(output).not.toContain("fn.empty");
  });

  test("omits declared-only props on base class in inheritance", () => {
    const output = runTransform(`
      class Base {
        title: string;
      }
      class Child extends Base {
        name = "A";
      }
    `);

    expectNoUndefinedPropInits(output);

    expect(output).toContain('this.name = "A"');
  });

  test("emits no prop inits when class has only declared fields and empty ctor", () => {
    const output = runTransform(`
      class Foo {
        title: string;
        expression: string;
        constructor() {}
      }
    `);

    expectNoUndefinedPropInits(output);

    expect(output).not.toMatch(/if \(!__declDone\) \{ this\./);
  });

  test("still skips @FromRaw declared props", () => {
    const output = runTransform(`
      class Example {
        @FromRaw(true)
        _children;
        @FromRaw
        _tags;
        title: string;
        constructor(raw) {
          this.__raw = raw;
        }
      }
    `);

    expect(output).not.toContain("this._children = undefined");
    expect(output).not.toContain("this._tags = undefined");
    expect(output).not.toContain("this.title = undefined");
    expect(output).toContain('dTR(this, ["_tags"], false)');
    expect(output).toContain('dTR(this, ["_children"], true)');
  });
});

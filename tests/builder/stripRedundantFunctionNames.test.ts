import { stripRedundantFunctionNames } from "../../builder/stripRedundantFunctionNames";

describe("stripRedundantFunctionNames", () => {
  test("strips redundant names from variable declarators", () => {
    const input = "var Context = function Context(__lrArgs) { return 1; };";

    expect(stripRedundantFunctionNames(input)).toBe(
      "var Context = function(__lrArgs) { return 1; };",
    );
  });

  test("strips redundant names from assignments in comma declarators", () => {
    const input =
      "var __declDone, ctor = function ctor() { return this; }, __raw;";

    expect(stripRedundantFunctionNames(input)).toBe(
      "var __declDone, ctor = function() { return this; }, __raw;",
    );
  });

  test("strips redundant names from object literal methods", () => {
    const input =
      "var prot = { getMode: function getMode() { return __mode; }, setMode: function setMode(newMode) { __mode = newMode; } };";

    expect(stripRedundantFunctionNames(input)).toBe(
      "var prot = { getMode: function() { return __mode; }, setMode: function(newMode) { __mode = newMode; } };",
    );
  });

  test("keeps function declarations", () => {
    const input = "function def(args, idx, val) { return args[idx]; }";

    expect(stripRedundantFunctionNames(input)).toBe(input);
  });

  test("keeps function expressions when the name differs from the binding", () => {
    const input = "var exported = function Internal() { return Internal(); };";

    expect(stripRedundantFunctionNames(input)).toBe(input);
  });

  test("strips many redundant names from class-to-function output", () => {
    const input =
      "var DiceBuilder = function DiceBuilder(__lrArgs) { var ctor = function ctor(raw) { return { expl: function expl() { return this; } }; }; return ctor.apply(this, __lrArgs); };";

    expect(stripRedundantFunctionNames(input)).toBe(
      "var DiceBuilder = function(__lrArgs) { var ctor = function(raw) { return { expl: function() { return this; } }; }; return ctor.apply(this, __lrArgs); };",
    );
  });

  test("keeps mismatched internal names in debug mode", () => {
    const input =
      "var exported = function Internal() { return Internal(); }; prot = { each: function each1() { return each1(); } };";

    expect(stripRedundantFunctionNames(input)).toBe(input);
  });

  test("strips mangled names from minified output in production mode", () => {
    const input =
      "var t = function t(t) { var h = function t() { return { getMode: function t() { return a; }, setMode: function t(t) { return t; } }; }; return h(); };";

    expect(
      stripRedundantFunctionNames(input, { stripAllNamedExpressions: true }),
    ).toBe(
      "var t = function(t) { var h = function() { return { getMode: function() { return a; }, setMode: function(t) { return t; } }; }; return h(); };",
    );
  });
});

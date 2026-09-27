import {
  findTestFailureLocation,
  findTestTraceLocation,
} from "./traceFinder";

const loc = (line: number): LetsRole.ErrorTrace["loc"] => ({
  start: { line, column: 0 },
  end: { line, column: 10 },
});

describe("findTestFailureLocation", () => {
  it("returns the outermost test frame instead of runTestCase", () => {
    const trace: Array<LetsRole.ErrorTrace> = [
      {
        type: "CallExpression",
        loc: loc(510),
        callee: { name: "fn1" },
      },
      {
        type: "ExpressionStatement",
        loc: loc(519),
      },
      {
        type: "ExpressionStatement",
        loc: loc(520),
      },
      {
        type: "FunctionExpression",
        loc: loc(496),
      },
      {
        type: "CallExpression",
        loc: loc(161),
        callee: { name: "runTestCase" },
      },
      {
        type: "CallExpression",
        loc: loc(84),
        callee: { name: "callback" },
      },
    ];

    const result = findTestFailureLocation(trace, 4);

    expect(result?.loc?.start.line).toBe(520);
  });

  it("ignores tester infrastructure between runTestCase and the test body", () => {
    const trace: Array<LetsRole.ErrorTrace> = [
      {
        type: "ExpressionStatement",
        loc: loc(520),
      },
      {
        type: "ExpressionStatement",
        loc: loc(158),
      },
      {
        type: "CallExpression",
        loc: loc(161),
        callee: { name: "runTestCase" },
      },
    ];

    const result = findTestFailureLocation(trace, 2);

    expect(result?.loc?.start.line).toBe(520);
  });
});

describe("findTestTraceLocation", () => {
  it("finds runTestCase automatically", () => {
    const trace: Array<LetsRole.ErrorTrace> = [
      {
        type: "CallExpression",
        loc: loc(510),
        callee: { name: "fn1" },
      },
      {
        type: "ExpressionStatement",
        loc: loc(520),
      },
      {
        type: "CallExpression",
        loc: loc(161),
        callee: { name: "runTestCase" },
      },
    ];

    expect(findTestTraceLocation(trace)?.loc?.start.line).toBe(520);
  });
});

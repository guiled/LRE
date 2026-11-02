type InstanceCase = {
  name: string;
  value: any;
  expected: boolean;
  lazy?: boolean;
};

const resolveCaseValue = ({ value, lazy }: InstanceCase): any => {
  return lazy ? value() : value;
};

const runInstanceCases = (
  suiteName: string,
  constructorFn: any,
  cases: Array<InstanceCase>,
): void => {
  lreDescribe(suiteName, () => {
    cases.forEach((testCase) => {
      lreTest(testCase.name, () => {
        lreExpect(resolveCaseValue(testCase) instanceof constructorFn).toBe(
          testCase.expected,
        );
      });
    });
  });
};

const nullishAndPrimitiveCases: Array<InstanceCase> = [
  { name: "null", value: null, expected: false },
  { name: "undefined", value: undefined, expected: false },
  { name: "boolean true", value: true, expected: false },
  { name: "boolean false", value: false, expected: false },
  { name: "number zero", value: 0, expected: false },
  { name: "number positive", value: 42, expected: false },
  { name: "number negative", value: -1, expected: false },
  { name: "NaN", value: NaN, expected: false },
  { name: "Infinity", value: Infinity, expected: false },
  { name: "string empty", value: "", expected: false },
  { name: "string non-empty", value: "hello", expected: false },
  { name: "string looking like regexp", value: "/abc/gi", expected: false },
];

const objectLikeButNotCases: Array<InstanceCase> = [
  { name: "plain object", value: {}, expected: false },
  {
    name: "object.create(null)",
    lazy: true,
    value: () => Object.create(null),
    expected: false,
  },
  {
    name: "object with regexp-like fields",
    value: {
      source: "abc",
      flags: "gi",
      test: () => true,
      exec: () => null,
    },
    expected: false,
  },
  {
    name: "object inheriting object.prototype only",
    value: { toString: () => "/abc/gi" },
    expected: false,
  },
  { name: "empty array", value: [], expected: false },
  { name: "array of strings", value: ["a", "b"], expected: false },
  { name: "function", value: () => /abc/, expected: false },
];

const boxedPrimitiveCases: Array<InstanceCase> = [
  {
    name: "string object",
    lazy: true,
    value: () => new String("hello"),
    expected: false,
  },
  {
    name: "number object",
    lazy: true,
    value: () => new Number(42),
    expected: false,
  },
  {
    name: "boolean object",
    lazy: true,
    value: () => new Boolean(true),
    expected: false,
  },
  {
    name: "object-wrapped number",
    lazy: true,
    value: () => Object(7),
    expected: false,
  },
];

const regExpPositiveCases: Array<InstanceCase> = [
  { name: "literal /abc/", value: /abc/, expected: true },
  { name: "literal /abc/gi", value: /abc/gi, expected: true },
  { name: "literal empty", value: /(?:)/, expected: true },
  {
    name: "new RegExp from string",
    lazy: true,
    value: () => new RegExp("abc"),
    expected: true,
  },
  {
    name: "new RegExp with flags",
    lazy: true,
    value: () => new RegExp("abc", "gi"),
    expected: true,
  },
  {
    name: "new RegExp empty",
    lazy: true,
    value: () => new RegExp(""),
    expected: true,
  },
  {
    name: "RegExp static call",
    lazy: true,
    value: () => RegExp("abc", "i"),
    expected: true,
  },
  {
    name: "stored regexp variable",
    lazy: true,
    value: () => {
      const pattern = "d+";
      return new RegExp(pattern);
    },
    expected: true,
  },
];

const datePositiveCases: Array<InstanceCase> = [
  { name: "new Date()", lazy: true, value: () => new Date(), expected: true },
  {
    name: "new Date from timestamp",
    lazy: true,
    value: () => new Date(0),
    expected: true,
  },
  {
    name: "new Date from string",
    lazy: true,
    value: () => new Date("2020-01-01T00:00:00.000Z"),
    expected: true,
  },
];

const dateNegativeCases: Array<InstanceCase> = [
  { name: "date string primitive", value: "2020-01-01", expected: false },
  { name: "timestamp number", value: 0, expected: false },
  { name: "invalid date string", value: "not-a-date", expected: false },
];

const stringPositiveCases: Array<InstanceCase> = [
  {
    name: "new String empty",
    lazy: true,
    value: () => new String(""),
    expected: true,
  },
  {
    name: "new String hello",
    lazy: true,
    value: () => new String("hello"),
    expected: true,
  },
  {
    name: "new String number-like",
    lazy: true,
    value: () => new String("42"),
    expected: true,
  },
];

const stringNegativeCases: Array<InstanceCase> = [
  { name: "string primitive empty", value: "", expected: false },
  { name: "string primitive hello", value: "hello", expected: false },
  { name: "template string", value: `hello`, expected: false },
];

const crossTypeCases: Array<{
  name: string;
  lazy?: boolean;
  value: any;
  constructorFn: any;
  expected: boolean;
}> = [
  {
    name: "regexp is not a Date",
    value: /abc/,
    constructorFn: Date,
    expected: false,
  },
  {
    name: "date is not a RegExp",
    lazy: true,
    value: () => new Date(),
    constructorFn: RegExp,
    expected: false,
  },
  {
    name: "plain object is not a Date",
    value: {},
    constructorFn: Date,
    expected: false,
  },
  {
    name: "plain object is not a String",
    value: {},
    constructorFn: String,
    expected: false,
  },
  {
    name: "array is not a RegExp",
    value: [],
    constructorFn: RegExp,
    expected: false,
  },
  {
    name: "array is not a Date",
    value: [],
    constructorFn: Date,
    expected: false,
  },
  {
    name: "string primitive is not a RegExp",
    value: "abc",
    constructorFn: RegExp,
    expected: false,
  },
  {
    name: "string object is not a RegExp",
    lazy: true,
    value: () => new String("/abc/"),
    constructorFn: RegExp,
    expected: false,
  },
  {
    name: "date is not a String",
    lazy: true,
    value: () => new Date(),
    constructorFn: String,
    expected: false,
  },
  {
    name: "regexp is not a String",
    value: /abc/,
    constructorFn: String,
    expected: false,
  },
];

const mapToNegativeRegExpCases = (
  cases: Array<InstanceCase>,
): Array<InstanceCase> =>
  cases.map(({ name, value, lazy }) => ({
    name,
    value,
    lazy,
    expected: false,
  }));

export const testGlobals = {
  name: "Globals (iOf / instanceof)",
  run: (): void => {
    lreDescribe("RegExp detection", () => {
      runInstanceCases("positive cases", RegExp, regExpPositiveCases);
      runInstanceCases(
        "null, undefined and primitives",
        RegExp,
        nullishAndPrimitiveCases,
      );
      runInstanceCases(
        "object-like values that are not RegExp",
        RegExp,
        objectLikeButNotCases,
      );
      runInstanceCases("boxed primitives", RegExp, boxedPrimitiveCases);
      runInstanceCases(
        "Date values are not RegExp",
        RegExp,
        mapToNegativeRegExpCases(datePositiveCases),
      );
    });

    lreDescribe("Date detection", () => {
      runInstanceCases("positive cases", Date, datePositiveCases);
      runInstanceCases("negative cases", Date, [
        ...nullishAndPrimitiveCases,
        ...objectLikeButNotCases,
        ...boxedPrimitiveCases,
      ]);
      runInstanceCases("non-date temporal values", Date, dateNegativeCases);
      runInstanceCases(
        "RegExp values are not Date",
        Date,
        mapToNegativeRegExpCases(regExpPositiveCases),
      );
    });

    lreDescribe("String object detection", () => {
      runInstanceCases("positive cases", String, stringPositiveCases);
      runInstanceCases("string primitives", String, stringNegativeCases);
      runInstanceCases(
        "null, undefined and primitives",
        String,
        nullishAndPrimitiveCases,
      );
      runInstanceCases(
        "object-like values that are not String",
        String,
        objectLikeButNotCases,
      );
      runInstanceCases(
        "RegExp values are not String",
        String,
        mapToNegativeRegExpCases(regExpPositiveCases),
      );
      runInstanceCases(
        "Date values are not String",
        String,
        mapToNegativeRegExpCases(datePositiveCases),
      );
    });

    lreDescribe("Cross-type instanceof checks", () => {
      crossTypeCases.forEach(
        ({ name, value, lazy, constructorFn, expected }) => {
          lreTest(name, () => {
            const resolved = lazy ? value() : value;
            lreExpect(resolved instanceof constructorFn).toBe(expected);
          });
        },
      );
    });

    lreDescribe("Custom constructors still use instanceof", () => {
      lreTest("instance matches its class", () => {
        const Foo = class Foo {
          tag = "foo";
        };
        const foo = new Foo();
        lreExpect(foo instanceof Foo).toBe(true);
      });

      lreTest("instance does not match unrelated class", () => {
        const Foo = class Foo {};
        const Bar = class Bar {};
        const foo = new Foo();
        lreExpect(foo instanceof Bar).toBe(false);
      });

      lreTest("instance does not match builtin constructors", () => {
        const Foo = class Foo {};
        const foo = new Foo();
        lreExpect(foo instanceof RegExp).toBe(false);
        lreExpect(foo instanceof Date).toBe(false);
        lreExpect(foo instanceof String).toBe(false);
      });

      lreTest("builtin values do not match custom class", () => {
        const Foo = class Foo {};
        const nothing: any = null;
        lreExpect(/abc/ instanceof Foo).toBe(false);
        lreExpect(new Date() instanceof Foo).toBe(false);
        lreExpect(new String("x") instanceof Foo).toBe(false);
        lreExpect({} instanceof Foo).toBe(false);
        lreExpect(nothing instanceof Foo).toBe(false);
      });
    });

    lreDescribe("typeof object but not an instance", () => {
      lreTest("null is typeof object but matches nothing", () => {
        const nothing: any = null;
        lreExpect(typeof null).toBe("object");
        lreExpect(nothing instanceof RegExp).toBe(false);
        lreExpect(nothing instanceof Date).toBe(false);
        lreExpect(nothing instanceof String).toBe(false);
        lreExpect(nothing instanceof Object).toBe(false);
      });

      lreTest("array is typeof object but not RegExp or Date", () => {
        const value: Array<number> = [1, 2, 3];
        lreExpect(typeof value).toBe("object");
        lreExpect(value instanceof RegExp).toBe(false);
        lreExpect(value instanceof Date).toBe(false);
        lreExpect(value instanceof String).toBe(false);
      });

      lreTest("function is not treated as RegExp or Date", () => {
        const fn = function (): number {
          return 1;
        };

        lreExpect(typeof fn).toBe("function");
        lreExpect(fn instanceof RegExp).toBe(false);
        lreExpect(fn instanceof Date).toBe(false);
        lreExpect(fn instanceof String).toBe(false);
      });
    });
  },
};

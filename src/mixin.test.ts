import { Mixin } from "./mixin";

export type Newable = { new (...args: any[]): any };

describe("Mixin tests", () => {
  const createDummyClass = function (
    ctorMock: jest.Mock | null,
    methods: Record<string, jest.Mock> = {}
  ): Newable {
    const c: Newable = class {
      constructor() {
        ctorMock?.apply(this, Array.from(arguments));
      }
    };
    const methodNames = Object.keys(methods);
    if (methodNames.length > 0) {
      methodNames.forEach((n) => (c.prototype[n] = methods[n]));
    }

    return c;
  };

  test("Test dummy class", () => {
    const ctor = jest.fn((a) => {});
    const methods = {
      getA: jest.fn((b, c) => {}),
      getB: jest.fn((d) => {}),
    };
    const Dummy = createDummyClass(ctor, methods);
    expect(ctor).toBeCalledTimes(0);
    expect(methods.getA).toBeCalledTimes(0);
    expect(methods.getB).toBeCalledTimes(0);
    const a = new Dummy(42);
    expect(ctor).toBeCalledTimes(1);
    expect(ctor.mock.calls[0]).toEqual([42]);
    expect(methods.getA).toBeCalledTimes(0);
    expect(methods.getB).toBeCalledTimes(0);
    a.getA(13, 1313);
    expect(methods.getA).toBeCalledTimes(1);
    expect(methods.getA.mock.calls[0]).toEqual([13, 1313]);
    a.getB("go");
    expect(methods.getB).toBeCalledTimes(1);
    expect(methods.getB.mock.calls[0]).toEqual(["go"]);
  });

  test("Single Class Mixin calls constructor", () => {
    const ctor = jest.fn(() => {});
    const Subject = Mixin(createDummyClass(ctor));
    expect(ctor).toBeCalledTimes(0);
    const a = new Subject();
    expect(ctor).toBeCalledTimes(1);
  });

  test("Many Class Mixin calls all constructors", () => {
    const classes = [];
    const mocks = [];
    const nbClasses = 5;
    for (let i = 0; i < nbClasses; i++) {
      const mock = jest.fn(() => {});
      mocks.push(mock);
      classes.push(createDummyClass(mock));
    }
    const Subject = Mixin.apply(null, classes);
    mocks.forEach((m) => expect(m).toBeCalledTimes(0));
    const a = new Subject();
    mocks.forEach((m) => expect(m).toBeCalledTimes(1));
  });
  test("Mixin calls all constructors with args", () => {
    const ctor1 = jest.fn((arg1, arg2) => {});
    const ctor2 = jest.fn((arg3) => {});
    const args1 = [42, "tooth"];
    const args2 = [{ a: 13 }];
    const Subject = Mixin(createDummyClass(ctor1), createDummyClass(ctor2));
    const a = new Subject([args1, args2]);
    expect(ctor1).toBeCalledTimes(1);
    expect(ctor1.mock.calls[0]).toHaveLength(args1.length);
    expect(ctor1.mock.calls[0]).toEqual(args1);
    expect(ctor2).toBeCalledTimes(1);
    expect(ctor2.mock.calls[0]).toHaveLength(args2.length);
    expect(ctor2.mock.calls[0]).toEqual(args2);
  });

  test("Mixin have all public attributes", () => {
    const valueA = 42,
      valueB = "B";
    const A = class {
      a: number = valueA;
    };
    const B = class {
      b: string = valueB;
    };
    const Dummy = Mixin(A, B);
    const subject = new Dummy();
    expect(subject).toHaveProperty("a");
    expect(subject.a).toEqual(valueA);
    expect(subject).toHaveProperty("b");
    expect(subject.b).toEqual(valueB);
  });

  test("Mixin have all public methods", () => {
    const methods1 = {
      getA: jest.fn(() => {}),
      getB: jest.fn(() => {}),
      getC: jest.fn(() => {}),
    };
    const methods2 = {
      getC: jest.fn(() => {}),
    };
    const class1 = createDummyClass(null, methods1);
    const class2 = createDummyClass(null, methods2);
    const Subject = Mixin(class1, class2);
    const obj = new Subject();
    expect(obj).toHaveProperty("getA");
    expect(obj).toHaveProperty("getB");
    expect(obj).toHaveProperty("getC");
    expect(methods1.getA).toBeCalledTimes(0);
    expect(methods1.getB).toBeCalledTimes(0);
    expect(methods1.getC).toBeCalledTimes(0);
    expect(methods2.getC).toBeCalledTimes(0);
    obj.getA();
    expect(methods1.getA).toBeCalledTimes(1);
    obj.getB();
    expect(methods1.getB).toBeCalledTimes(1);
    obj.getC();
    expect(methods1.getC).toBeCalledTimes(0);
    expect(methods2.getC).toBeCalledTimes(1);
  });

  test("Mixin cross access to methods", () => {
    const A = class {
      #id: number;
      constructor(id: number) {
        this.#id = id;
      }
      getId(): number {
        return this.#id;
      }
    };
    abstract class B {
      #name: string;
      constructor(name: string) {
        this.#name = name;
      }
      abstract getId(): number;
      getThroughB(): string {
        //return this.#name;
        console.log(
          "🚀 ~ file: mixin.test.ts:131 ~ B ~ getThroughB ~ this",
          this
        );
        return "" + this.getId();
      }
    }

    const C = class extends Mixin(A, B) {
      constructor(id: number, name: string) {
        super([[id], [name]]);
      }
    };
    const id = 42;
    const name = "glop";
    const subject = new C(id, name);
    expect(subject.getThroughB()).toEqual("42");
  });

  test("Getter and setter inheritance and override", () => {
    class A {
      #val: number;
      constructor(val : number) {
        this.#val = val;
      }
      get a(): number {
        return this.#val;
      }

      set a(v: number) {
        this.#val = v;
      }
    }

    class B {

    }

    class C extends Mixin(A, B) {
      constructor(id: number) {
        super([[id]]);
      }
    }

    const c = new C(42);
    expect(c.a).toStrictEqual(42);
    c.a = 43;
    expect(c.a).toStrictEqual(43);

    class D extends Mixin(A, B) {
      constructor(v: number) {
        super([[v]])
      }
      get a() {
        return 13;
      }

      getSuper() {
        return super.a;
      }
    }

    const d = new D(12);
    expect(d.a).toStrictEqual(13);
    expect(d.getSuper()).toStrictEqual(12);
  })

  test("Override a method", () => {
    class A {
      #id: number;

      constructor(id: number) {
        this.#id = id;
      }
      id() {
        return this.#id;
      }
    }

    class C extends Mixin(A) {
      constructor(val: number) {
        super([[val]]);
      }
      id() {
        return 13 + super.id();
      }
    }

    const c = new C(42);
    expect(c.id()).toStrictEqual(13+42);
  })

  test("Super overriden public property is undefined", () => {
    class A {
      a: number = 42;
    }

    class C extends Mixin(A) {
      a: number = 43;

      getA() {
        return this.a;
      }

      getSuperA() {
        return super.a;
      }
    }

    const c = new C;
    expect(c.getA()).toStrictEqual(43);
    expect(c.a).toStrictEqual(43);
    expect(c.getSuperA()).toBeUndefined();
  })
});

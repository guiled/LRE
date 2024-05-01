import { Mixin } from "../src/mixin";

describe("Mixin tests", () => {
  const createDummyMixableClass = function (
    ctorMock: jest.Mock | null,
    methods: Record<string, jest.Mock> = {}
  ): Mixable<any[], any> {
    const c: Mixable<any[], any> = (superclass: Newable = class {}) => {
      const tmpClass = class extends superclass {
        constructor() {
          super();
          ctorMock?.apply(this, Array.from(arguments));
        }
      };
      const methodNames = Object.keys(methods);
      if (methodNames.length > 0) {
        methodNames.forEach(
          (n) => ((tmpClass as any).prototype[n] = methods[n])
        );
      }
      return tmpClass;
    };

    return c;
  };

  test("Test dummy class", () => {
    const ctor = jest.fn();
    const methods = {
      getA: jest.fn(),
      getB: jest.fn(),
    };
    const Dummy = createDummyMixableClass(ctor, methods)(class {}) as Newable;
    expect(ctor).toHaveBeenCalledTimes(0);
    expect(methods.getA).toHaveBeenCalledTimes(0);
    expect(methods.getB).toHaveBeenCalledTimes(0);
    const a = new Dummy(42);
    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor.mock.calls[0]).toEqual([42]);
    expect(methods.getA).toHaveBeenCalledTimes(0);
    expect(methods.getB).toHaveBeenCalledTimes(0);
    a.getA(13, 1313);
    expect(methods.getA).toHaveBeenCalledTimes(1);
    expect(methods.getA.mock.calls[0]).toEqual([13, 1313]);
    a.getB("go");
    expect(methods.getB).toHaveBeenCalledTimes(1);
    expect(methods.getB.mock.calls[0]).toEqual(["go"]);
  });

  test("Single Class Mixin calls constructor", () => {
    const ctor = jest.fn();
    const Subject = Mixin(createDummyMixableClass(ctor));
    expect(ctor).toHaveBeenCalledTimes(0);
    new Subject();
    expect(ctor).toHaveBeenCalledTimes(1);
  });

  test("Many Class Mixin calls all constructors", () => {
    const classes: Array<Mixable<any[], any>> = [];
    const mocks = [];
    const nbClasses = 5;
    for (let i = 0; i < nbClasses; i++) {
      const mock = jest.fn();
      mocks.push(mock);
      classes.push(createDummyMixableClass(mock));
    }
    const Subject = Mixin.apply(null, classes);
    mocks.forEach((m) => expect(m).toHaveBeenCalledTimes(0));
    new Subject();
    mocks.forEach((m) => expect(m).toHaveBeenCalledTimes(1));
  });

  test("Mixin calls all constructors with args", () => {
    const ctor1 = jest.fn();
    const ctor2 = jest.fn();
    const args1 = [42, "tooth"];
    const args2 = [{ a: 13 }];
    const Subject = Mixin(
      createDummyMixableClass(ctor1),
      createDummyMixableClass(ctor2)
    );
    new Subject([args1, args2]);
    expect(ctor1).toHaveBeenCalledTimes(1);
    expect(ctor1.mock.calls[0]).toHaveLength(args1.length);
    expect(ctor1.mock.calls[0]).toEqual(args1);
    expect(ctor2).toHaveBeenCalledTimes(1);
    expect(ctor2.mock.calls[0]).toHaveLength(args2.length);
    expect(ctor2.mock.calls[0]).toEqual(args2);
  });

  test("Mixin have all public attributes", () => {
    const valueA = 42,
      valueB = "B";
    const A = (superclass: Newable = class {}) =>
      class A extends superclass {
        a: number = valueA;
      };
    const B = (superclass: Newable = class {}) =>
      class B extends superclass {
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
      getA: jest.fn(),
      getB: jest.fn(),
      getC: jest.fn(),
    };
    const methods2 = {
      getC: jest.fn(),
    };
    const class1 = createDummyMixableClass(null, methods1);
    const class2 = createDummyMixableClass(null, methods2);
    const Subject = Mixin(class1, class2);
    const obj = new Subject();
    expect(obj).toHaveProperty("getA");
    expect(obj).toHaveProperty("getB");
    expect(obj).toHaveProperty("getC");
    expect(methods1.getA).toHaveBeenCalledTimes(0);
    expect(methods1.getB).toHaveBeenCalledTimes(0);
    expect(methods1.getC).toHaveBeenCalledTimes(0);
    expect(methods2.getC).toHaveBeenCalledTimes(0);
    obj.getA();
    expect(methods1.getA).toHaveBeenCalledTimes(1);
    obj.getB();
    expect(methods1.getB).toHaveBeenCalledTimes(1);
    obj.getC();
    expect(methods1.getC).toHaveBeenCalledTimes(0);
    expect(methods2.getC).toHaveBeenCalledTimes(1);
  });

  test("mixin pass this", () => {
    const cb = jest.fn();
    const A = (superclass: Newable = class {}) =>
      class A extends superclass {
        callIt() {
          cb(this);
        }
      };
    const TestClass = Mixin(A);
    const test = new TestClass();
    test.callIt();
    expect(cb).toHaveBeenCalledWith(test);
  });

  test("Mixin cross access to methods", () => {
    const A = (superclass: Newable = class {}) => {
      return class A extends superclass {
        #id: number;
        constructor(id: number) {
          super();
          this.#id = id;
        }
        getId(): number {
          return this.#id;
        }
      };
    }
    const Bmixable = (superclass: Newable = class {}) => {
      abstract class B extends superclass {
        #name: string;
        constructor(name: string) {
          super();
          this.#name = name;
        }
        abstract getId(): number;
        getThroughB(): string {
          //return this.#name;
          return "" + this.getId() + this.#name;
        }
      }
      return B;
    };

    const C = class extends Mixin(A, Bmixable) {
      constructor(id: number, name: string) {
        super([[id], [name]]);
      }
    };
    const id = 42;
    const name = "glop";
    const subject = new C(id, name);
    expect(subject.getThroughB()).toEqual("42glop");
  });

  test("Getter and setter inheritance and override", () => {
    const A = (superclass: Newable = class {}) =>
      class A extends superclass {
        #val: number;
        constructor(val: number) {
          super();
          this.#val = val;
        }
        get a(): number {
          return this.#val;
        }

        set a(v: number) {
          this.#val = v;
        }
      };

    const B = (superclass: Newable = class {}) => class B extends superclass {};

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
        super([[v]]);
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
  });

  test("Override a method", () => {
    const A = (superclass: Newable = class {}) =>
      class extends superclass {
        #id: number;

        constructor(id: number) {
          super();
          this.#id = id;
        }
        id() {
          return this.#id;
        }
      };

    class C extends Mixin(A) {
      constructor(val: number) {
        super([[val]]);
      }
      id() {
        return 13 + super.id();
      }
    }

    const c = new C(42);
    expect(c.id()).toStrictEqual(13 + 42);
  });

  test("Super overridden public property is undefined", () => {
    const A = (superclass: Newable = class {}) =>
      class A extends superclass {
        a: number = 42;
      };

    class C extends Mixin(A) {
      a: number = 43;

      getA() {
        return this.a;
      }

      getSuperA() {
        /* @ts-ignore */
        return super.a;
      }
    }

    const c = new C();
    expect(c.getA()).toStrictEqual(43);
    expect(c.a).toStrictEqual(43);
    expect(c.getSuperA()).toBeUndefined();
  });

  test("Mixin instantiation into mixin instantiation", () => {
    const ctorCbA = jest.fn();
    const ctorCbB = jest.fn();
    const A = (superclass: Newable = class {}) =>
      class A extends superclass {
        a: number = 42;

        constructor(n: string) {
          super();
          ctorCbA(n);
        }
      };

    const B = (superclass: Newable = class {}) =>
      class B extends superclass {
        constructor(n: string) {
          if (n === "firstfirst") {
            new D(true);
          }
          super();
          ctorCbB(n);
        }
      };

    const C = (superclass: Newable = class {}) => class C extends superclass {};

    class D extends Mixin(A, B, C) {
      a: number = 43;

      constructor(a: boolean = false) {
        let val = "second";
        if (!a) {
          val = "first";
        }
        super([[val], [val + val]]);
      }
    }

    new D();
    expect(ctorCbA).toHaveBeenCalledTimes(2);
    expect(ctorCbA.mock.calls[0][0]).toBe("second");
    expect(ctorCbA.mock.calls[1][0]).toBe("first");
  });
});

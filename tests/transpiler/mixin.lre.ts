import { Mixin } from "../../src/mixin";

const ctorA = lreMock();
const ctorC = lreMock();
const fn1 = lreMock();
const fn2 = lreMock();

const A = (superclass: Newable = class {}): Newable =>
  class extends superclass {
    constructor() {
      super();
      ctorA();
    }

    fn1(): void {
      fn1();
    }
  };

const C = (superclass: Newable = class {}): Newable =>
  class extends superclass {
    constructor() {
      super();
      ctorC();
    }

    fn2(): void {
      fn2();
    }
  };

class B extends Mixin(A) {}
class D extends Mixin(A, C) {
  fnAll(): void {
    this.fn1();
    this.fn2();
  }
}

export const testMixins = {
  name: "Mixins",
  run: (): void => {
    lreBeforeEach(() => {
      lreClearAllMocks();
    });

    lreDescribe("Simple mixin", () => {
      lreTest("Parent ctor is called", () => {
        lreExpect(ctorA).not.toHaveBeenCalled();

        new B();

        lreExpect(ctorA).toHaveBeenCalledTimes(1);
      });

      lreTest("Call parent method", () => {
        const b = new B();

        lreExpect(fn1).not.toHaveBeenCalled();
        b.fn1();

        lreExpect(fn1).toHaveBeenCalledTimes(1);
      });
    });

    lreDescribe("Multiple mixins", () => {
      lreTest("All parent ctors are called", () => {
        lreExpect(ctorA).not.toHaveBeenCalled();
        lreExpect(ctorC).not.toHaveBeenCalled();

        new D();

        lreExpect(ctorA).toHaveBeenCalledTimes(1);
        lreExpect(ctorC).toHaveBeenCalledTimes(1);
      });

      lreTest("All parent methods are available", () => {
        const d = new D();

        lreExpect(fn1).not.toHaveBeenCalled();
        lreExpect(fn2).not.toHaveBeenCalled();

        d.fn1();
        d.fn2();

        lreExpect(fn1).toHaveBeenCalledTimes(1);
        lreExpect(fn2).toHaveBeenCalledTimes(1);
      });

      lreTest("All parent methods are available from inside", () => {
        const d = new D();

        lreExpect(fn1).not.toHaveBeenCalled();
        lreExpect(fn2).not.toHaveBeenCalled();

        d.fnAll();

        lreExpect(fn1).toHaveBeenCalledTimes(1);
        lreExpect(fn2).toHaveBeenCalledTimes(1);
      });
    });
  },
};

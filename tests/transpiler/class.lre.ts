export const testClasses = {
  name: "Classes",
  run: (): void => {
    lreDescribe("Class basics", () => {
      lreTest("Class with constructor", () => {
        const fn = lreMock();

        const A = class A {
          constructor() {
            fn();
          }
        };

        lreExpect(fn).not.toHaveBeenCalled();

        new A();

        lreExpect(fn).toHaveBeenCalledTimes(1);
      });

      lreTest("Public property is reachable from outside", () => {
        const A = class A {
          name = "A";
        };

        const obj = new A();

        lreExpect(obj.name).toBe("A");
      });

      lreTest("Private property is not reachable from outside", () => {
        const A = class A {
          #name = "A";

          getName(): string {
            return this.#name;
          }
        };

        const obj = new A();

        // @ts-expect-error Private property is not reachable from outside
        lreExpect(obj.name).toBe(undefined);
      });
      lreTest("props can be initiated with a method", () => {
        const A = class {
          #priv = this.fn1();

          fn1(): number {
            return 42;
          }

          fn2(): number {
            return this.#priv;
          }
        };

        const a = new A();

        lreExpect(a.fn2()).toStrictEqual(42);
      });

      lreTest("Getting props before it is initiated returns undefined", () => {
        const A = class {
          #privUndefined = this.fn1();
          #privSecond: number = 42;

          fn1(): number {
            return this.#privSecond;
          }

          fn2(): number {
            return this.#privUndefined;
          }
        };

        const obj = new A();

        lreExpect(obj.fn2()).toBeUndefined();
      });
    });

    lreDescribe("Class inheritance", () => {
      lreTest("Simple inheritance, no args", () => {
        const ctorA = lreMock();
        const A = class A {
          constructor() {
            ctorA();
          }
        };
        const B = class B extends A {};

        new B();

        lreExpect(ctorA).toHaveBeenCalledTimes(1);
      });

      lreTest("Simple inheritance, parent ctor is called with args", () => {
        let ctorAArgs: any[] = [];
        const ctorA = lreMock((...args: any[]) => (ctorAArgs = args));
        const A = class A {
          constructor(...args: any[]) {
            ctorA(args);
          }
        };
        const B = class B extends A {};

        new B(1, 2, 3);

        lreExpect(ctorA).toHaveBeenCalledTimes(1);
        lreExpect(ctorAArgs.join(",")).toStrictEqual([1, 2, 3].join(","));
      });

      lreTest("Parent public props are reachable from child", () => {
        const A = class A {
          public name = "A";
          public nameA = "A";
        };
        const B = class B extends A {
          public name = "B";
        };
        const objB = new B();

        lreExpect(objB.name).toBe("B");
        lreExpect(objB.nameA).toBe("A");
      });

      lreTest("Parent public methods are reachable from child", () => {
        const fnFromA = lreMock();
        const A = class A {
          public fn(): void {
            fnFromA();
          }
        };
        const B = class B extends A {};
        const objB = new B();

        objB.fn();
        lreExpect(fnFromA).toHaveBeenCalledTimes(1);
      });

      lreTest("Parent private props are not reachable from child", () => {
        const A = class A {
          // @ts-expect-error Properties are declared in order
          public nameABefore = "pub_" + this.#name;
          #name = "privA";
          public nameAAfter = "pub_" + this.#name;
        };
        const B = class B extends A {
          public name = "B";

          public getName(): string {
            // @ts-expect-error Private property is not reachable from child
            return this.#name;
          }
        };
        const objB = new B();

        lreExpect(objB.nameABefore).toBe("pub_undefined");
        lreExpect(objB.nameAAfter).toBe("pub_privA");
      });

      lreTest("Methods Inheritance", () => {
        const fn2FromA = lreMock();
        const fn2FromB = lreMock();
        const A = class A {
          fn1(): void {
            this.fn2();
          }

          fn2(): void {
            fn2FromA();
          }
        };

        const B = class B extends A {
          fn2(): void {
            fn2FromB();
          }
        };

        const objB = new B();
        objB.fn1();

        lreExpect(fn2FromA).not.toHaveBeenCalled();
        lreExpect(fn2FromB).toHaveBeenCalledTimes(1);
      });

      lreTest("Inheritance and cb passing through", () => {
        const fnFromB = lreMock();
        const fnFromC = lreMock();
        const A = class A {
          cb;

          constructor(cb: () => void) {
            this.cb = cb;
          }

          call(): void {
            this.cb();
          }
        };

        const B = class B extends A {
          constructor() {
            super(() => this.fn());
          }

          fn(): void {
            fnFromB();
          }
        };

        const C = class C extends B {
          fn(): void {
            fnFromC();
          }
        };

        const obj = new C();
        obj.call();

        lreExpect(fnFromB).not.toHaveBeenCalled();
        lreExpect(fnFromC).toHaveBeenCalledTimes(1);
      });

      lreTest(
        "Obj public & private props are init after super ctor call and before the rest of the ctor",
        () => {
          const firstMock = lreMock();
          const secondMock = lreMock();
          const thirdMock = lreMock();
          const fourthMock = lreMock();
          const fifthMock = lreMock();
          const lastMock = lreMock();

          const A = class {
            #n: number;

            constructor(n: number) {
              secondMock();
              this.#n = n;
              thirdMock();
            }

            fn1(): number {
              fourthMock();
              return this.#n;
            }
          };

          const B = class extends A {
            #priv: number = this.fn1();
            #priv2: number = this.fn2();

            constructor(n: number) {
              firstMock();
              super(n);
              lastMock();
            }

            fn2(): number {
              fifthMock();
              return this.#priv + this.#priv2;
            }
          };

          lreExpect(firstMock).not.toHaveBeenCalled();
          lreExpect(secondMock).not.toHaveBeenCalled();
          lreExpect(thirdMock).not.toHaveBeenCalled();
          lreExpect(fourthMock).not.toHaveBeenCalled();
          lreExpect(fifthMock).not.toHaveBeenCalled();
          lreExpect(lastMock).not.toHaveBeenCalled();

          new B(5);

          lreExpect(firstMock).toHaveBeenCalledTimes(1);
          lreExpect(secondMock).toHaveBeenCalledTimes(1);
          lreExpect(thirdMock).toHaveBeenCalledTimes(1);
          lreExpect(fourthMock).toHaveBeenCalledTimes(1);
          lreExpect(fifthMock).toHaveBeenCalledTimes(1);
          lreExpect(lastMock).toHaveBeenCalledTimes(1);

          lreExpect(firstMock).hasBeenCalledBefore(secondMock);
          lreExpect(secondMock).hasBeenCalledBefore(thirdMock);
          lreExpect(thirdMock).hasBeenCalledBefore(fourthMock);
          lreExpect(fourthMock).hasBeenCalledBefore(fifthMock);
          lreExpect(fifthMock).hasBeenCalledBefore(lastMock);
        },
      );

      lreTest("Inheritance through empty class", () => {
        const inA = lreMock();
        const inC = lreMock();
        const A = class A {
          val(): void {
            inA();
          }

          val2(): void {
            this.val();
          }
        };
        const B = class B extends A {};
        const C = class C extends B {
          val(): void {
            inC();
          }

          val3(): void {
            super.val();
          }
        };
        const c = new C();
        lreExpect(inA).not.toHaveBeenCalled();
        lreExpect(inC).not.toHaveBeenCalled();
        c.val();
        lreExpect(inA).not.toHaveBeenCalled();
        lreExpect(inC).toHaveBeenCalledTimes(1);

        lreClearAllMocks();
        c.val2();
        lreExpect(inA).not.toHaveBeenCalled();
        lreExpect(inC).toHaveBeenCalledTimes(1);

        lreClearAllMocks();
        c.val3();
        lreExpect(inA).toHaveBeenCalledTimes(1);
        lreExpect(inC).not.toHaveBeenCalled();
      });
    });
  },
};

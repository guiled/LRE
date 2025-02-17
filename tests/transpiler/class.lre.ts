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
    });

    lreDescribe("Class inheritance", () => {
      lreTest("Inheritance", () => {
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
            log("fnFromC");
            fnFromC();
          }
        };

        new C().call();

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
    });

    // lreTest("coucou", () => {
    //   log("hey");
    // });
  },
};

// const A = function (n1, n2, n3) {
//   this.name = "from A " + n1;
//   this.test = function () {
//       log("Test " + this.name)
//   }

//   this.callTest = function () {
//       log("callTest");
//       this.lreTest();
//   }

//   this.test2 = function () {
//       log("test 2 " + n2);
//   }

//   this.test4 = function () {
//       log("test4 " + n3);
//       this.test3();
//   }

//   return this;
// }

// const B = function (id) {
//   const parent = Object.assign({}, A.call(this, 1, 2, 3));
//   this.name = "from B " + id;
//   this.ok = "ahah"

//   this.test = function () {
//       log("test " + this.name);
//       parent.lreTest();
//   }

//   this.test3 = function () {
//       log("test3 " + this.name);
//   }

//   return this;
// }

// log("create B")
// const b = B.call({},"b");
// log("create C")
// const c = B.call({},"c");
// log("calls")
// b.calllreTest();
// b.test2();
// b.test3();
// b.test4();
// c.calllreTest();
// c.test2();
// c.test3();
// c.test4();
// b.calllreTest();
// b.test2();
// b.test3();
// b.test4();

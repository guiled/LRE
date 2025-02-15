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

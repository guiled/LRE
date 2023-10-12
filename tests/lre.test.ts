import { LRE } from "../src/lre";

describe("LRE tests", () => {
  let subject: LRE;
  beforeAll(() => {
    subject = new LRE();
  });

  test("LRE util Object deep merge", () => {
    const obj1 = {
      a: 1,
      c: {
        a: 10,
      }
    };
    const obj2 = {
      b: 2,
      c: {
        b: 12,
      }
    };
    expect(subject.deepMerge(obj1, obj2)).toEqual({
      a: 1,
      b: 2,
      c: {
        a: 10,
        b: 12,
      }
    });
  });
});

import { Logger } from "../../src/log";
import { handleError } from "../../src/log/errorhandler";
import {
  MockComponent,
  MockedComponent,
} from "../mock/letsrole/component.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { EventHolder } from "../../src/eventholder/index";

global.lre = new Logger();

jest.mock("../../src/log/errorhandler");

type TestedEvents = "test" | "unused" | "click" | "update";

class Dummy extends EventHolder<LetsRole.Component, TestedEvents> {
  constructor(protected _raw: LetsRole.Component, subRaw?: LetsRole.Component) {
    super(_raw.id(), (target: any, event: any): EventHolder => {
      if (subRaw && target === subRaw) {
        return new Dummy(subRaw) as EventHolder;
      } else {
        return this as EventHolder;
      }
    });
  }

  raw(): LetsRole.Component {
    return this._raw;
  }
}

describe("Test simple events", () => {
  let subject: Dummy;
  let rawCmp: MockedComponent;

  beforeEach(() => {
    rawCmp = MockComponent({
      id: "123",
      sheet: MockSheet({ id: "main" }),
    });
    subject = new Dummy(rawCmp);
  });

  test("No raw event calls for custom event", () => {
    subject.on(
      "test",
      jest.fn((cmp) => {})
    );
    subject.on(
      "test:a",
      jest.fn((cmp) => {})
    );
    subject.on(
      "test:b",
      jest.fn((cmp) => {})
    );
    expect(rawCmp.on).toBeCalledTimes(0);
    subject.off("test");
    expect(rawCmp.off).toBeCalledTimes(0);
  });

  test("Only one raw event added for custom event", () => {
    subject.on(
      "click",
      jest.fn((cmp) => {})
    );
    subject.on(
      "click:a",
      jest.fn((cmp) => {})
    );
    subject.on(
      "click:b",
      jest.fn((cmp) => {})
    );
    expect(rawCmp.on).toBeCalledTimes(1);
    subject.off("click");
    expect(rawCmp.off).toBeCalledTimes(0);
    subject.off("click:a");
    expect(rawCmp.off).toBeCalledTimes(0);
    subject.off("click:b");
    expect(rawCmp.off).toBeCalledTimes(1);
    subject.off("click");
    expect(rawCmp.off).toBeCalledTimes(1);
  });

  test("Handlers triggered from raw", () => {
    const eventHandler = jest.fn((cmp) => {});
    subject.on("click", eventHandler);
    expect(rawCmp.on).toBeCalledTimes(1);
    rawCmp._trigger("click");
    expect(eventHandler).toBeCalledTimes(1);
    const eventHandler2 = jest.fn((cmp) => {});
    subject.on("click:second", eventHandler2);
    expect(rawCmp.on).toBeCalledTimes(1);
    rawCmp._trigger("click");
    expect(eventHandler).toBeCalledTimes(2);
    expect(eventHandler2).toBeCalledTimes(1);
  });

  test("Simple trigger", () => {
    let receivedCmp;
    const eventHandler = jest.fn((cmp) => {
      receivedCmp = cmp;
    });
    subject.on("test", eventHandler);
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(1);
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(2);
    const eventFirstArg = eventHandler.mock.calls[0][0];
    expect(eventFirstArg).toBe(subject);
    expect(eventFirstArg.raw()).toBe(rawCmp);
    expect(receivedCmp).toBe(subject);
    expect(receivedCmp === subject).toBeTruthy;
  });

  test("Simple trigger with additional parameters", () => {
    const eventHandler = jest.fn((cmp, val, obj) => {});
    subject.on("test", eventHandler);
    const param = 42;
    subject.trigger("test", param);
    expect(eventHandler).toBeCalledTimes(1);
    expect(eventHandler.mock.calls[0][1]).toBe(param);
    const obj = {
      a: 1,
      b: 2,
      c: [1, 2, 3],
    };
    subject.trigger("test", param + 1, obj);
    expect(eventHandler).toBeCalledTimes(2);
    expect(eventHandler.mock.calls[1][1]).toBe(param + 1);
    expect(eventHandler.mock.calls[1][2]).toStrictEqual(obj);
  });

  test("Simple trigger with two handlers", () => {
    const eventHandler1 = jest.fn((cmp) => {});
    const eventHandler2 = jest.fn((cmp) => {});
    subject.on("test", eventHandler1);
    subject.on("test", eventHandler2);
    subject.trigger("test");
    expect(eventHandler1).toBeCalledTimes(0);
    expect(eventHandler2).toBeCalledTimes(1);
  });

  test("Trigger an non-existing event", () => {
    const eventHandler = jest.fn((cmp) => {});
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(0);
  });

  test("Off an event handler", () => {
    const eventHandler = jest.fn((cmp) => {});
    subject.on("test", eventHandler);
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(1);
    eventHandler.mockClear();
    subject.off("test");
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(0);
  });

  test("Disable events", () => {
    const eventHandler = jest.fn((cmp) => {});
    subject.on("test", eventHandler);
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(1);
    eventHandler.mockClear();
    subject.disableEvent("test");
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(0);
  });
});

describe("Many working handlers on same event", () => {
  let subject: Dummy;

  beforeEach(() => {
    subject = new Dummy(
      MockComponent({
        id: "123",
        sheet: MockSheet({ id: "main" }),
      })
    );
  });

  test("Named event trigger of named event", () => {
    const eventHandler = jest.fn((cmp) => {});
    subject.on("test:first", eventHandler);
    subject.trigger("test:first");
    expect(eventHandler).toBeCalledTimes(1);
  });

  test("Named event trigger of named event", () => {
    const eventHandler1 = jest.fn((cmp) => {});
    const eventHandler2 = jest.fn((cmp) => {});
    subject.on("test:first", eventHandler1);
    subject.on("test:second", eventHandler2);
    subject.trigger("test");
    expect(eventHandler1).toBeCalledTimes(1);
    expect(eventHandler1).toBeCalledTimes(1);
  });

  test("Named event trigger specifically of named event", () => {
    const eventHandler1 = jest.fn((cmp) => {});
    const eventHandler2 = jest.fn((cmp) => {});
    subject.on("test:first", eventHandler1);
    subject.on("test:second", eventHandler2);
    subject.trigger("test:first");
    expect(eventHandler1).toBeCalledTimes(1);
    expect(eventHandler2).toBeCalledTimes(0);
  });

  test("Named event trigger for overwritten event", () => {
    const eventHandler1 = jest.fn((cmp) => {});
    const eventHandler2 = jest.fn((cmp) => {});
    subject.on("test:first", eventHandler1);
    subject.on("test:first", eventHandler2);
    subject.trigger("test:first");
    expect(eventHandler1).toBeCalledTimes(0);
    expect(eventHandler2).toBeCalledTimes(1);
  });

  test("Switch off a named trigger", () => {
    const eventHandler1 = jest.fn((cmp) => {});
    const eventHandler2 = jest.fn((cmp) => {});
    subject.on("test:first", eventHandler1);
    subject.on("test:second", eventHandler2);
    subject.trigger("test");
    expect(eventHandler1).toBeCalledTimes(1);
    expect(eventHandler2).toBeCalledTimes(1);
    subject.off("test:first");
    subject.trigger("test");
    expect(eventHandler1).toBeCalledTimes(1);
    expect(eventHandler2).toBeCalledTimes(2);
  });

  test("Switch off unset event", () => {
    const eventHandler1 = jest.fn((cmp) => {});
    const eventHandler2 = jest.fn((cmp) => {});
    subject.on("test:first", eventHandler1);
    subject.on("test:second", eventHandler2);
    subject.trigger("test");
    expect(eventHandler1).toBeCalledTimes(1);
    expect(eventHandler2).toBeCalledTimes(1);
    subject.off("test:third");
    subject.trigger("test");
    expect(eventHandler1).toBeCalledTimes(2);
    expect(eventHandler2).toBeCalledTimes(2);
    subject.off("unused");
    subject.trigger("test");
    expect(eventHandler1).toBeCalledTimes(3);
    expect(eventHandler2).toBeCalledTimes(3);
  });
});

describe("Event executed only once", () => {
  let subject: Dummy;
  let rawCmp: MockedComponent;

  beforeEach(() => {
    rawCmp = MockComponent({
      id: "123",
      sheet: MockSheet({ id: "main" }),
    });
    subject = new Dummy(rawCmp);
  });

  test("Event executed only once", () => {
    const eventHandler = jest.fn((cmp) => {});
    subject.once("test", eventHandler);
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(1);
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(1);
  });

  test("Named event executed only once", () => {
    const eventHandler1 = jest.fn((cmp) => {});
    const eventHandler2 = jest.fn((cmp) => {});
    subject.on("test", eventHandler1);
    subject.once("test:ah", eventHandler2);
    subject.trigger("test");
    expect(eventHandler1).toBeCalledTimes(1);
    expect(eventHandler2).toBeCalledTimes(1);
    subject.trigger("test");
    expect(eventHandler1).toBeCalledTimes(2);
    expect(eventHandler2).toBeCalledTimes(1);
  });

  test("Handlers triggered once from raw", () => {
    const eventHandler = jest.fn((cmp) => {});
    const eventHandler2 = jest.fn((cmp) => {});
    subject.once("click", eventHandler);
    expect(rawCmp.on).toBeCalledTimes(1);
    rawCmp._trigger("click");
    rawCmp._trigger("click");
    expect(eventHandler).toBeCalledTimes(1);
    eventHandler.mockClear();
    (rawCmp.on as jest.Mock).mockClear();
    subject.once("click", eventHandler);
    subject.once("click:second", eventHandler2);
    expect(rawCmp.on).toBeCalledTimes(1);
    rawCmp._trigger("click");
    rawCmp._trigger("click");
    expect(eventHandler).toBeCalledTimes(1);
    expect(eventHandler2).toBeCalledTimes(1);
  });
});

describe("Delegated events", () => {
  let subject: Dummy;
  let rawCmp: MockedComponent, rawCmpSub: MockedComponent;

  beforeEach(() => {
    let sheet = MockSheet({ id: "main" });
    rawCmp = MockComponent({
      id: "123",
      sheet,
    });
    rawCmpSub = MockComponent({
      id: "hop",
      sheet,
      cntr: rawCmp,
    });
    subject = new Dummy(rawCmp, rawCmpSub);
  });
  test("Delegate an event", () => {
    const eventHandler1 = jest.fn((cmp) => {});
    subject.on("click", "hop", eventHandler1);
    rawCmpSub._trigger("click");
    expect(eventHandler1).toBeCalledTimes(1);
  });

  test("Delegate an once event", () => {
    const eventHandler1 = jest.fn((cmp) => {});
    subject.once("click", "hop", eventHandler1);
    rawCmpSub._trigger("click");
    rawCmpSub._trigger("click");
    expect(eventHandler1).toBeCalledTimes(1);
    eventHandler1.mockClear();
    subject.once("click:ah", "hop", eventHandler1);
    subject.once("click:be", "hop", eventHandler1);
    subject.on("click:be", "hop", eventHandler1);
    rawCmpSub._trigger("click");
    rawCmpSub._trigger("click");
    expect(eventHandler1).toBeCalledTimes(4);
  });

  test("Switch off a delegated event", () => {
    const eventHandler0 = jest.fn((cmp) => {});
    const eventHandler1 = jest.fn((cmp) => {});
    const eventHandler2 = jest.fn((cmp) => {});
    subject.on("click", "hop", eventHandler1);
    subject.off("click", "hop");
    rawCmpSub._trigger("click");
    rawCmpSub._trigger("click");
    expect(eventHandler1).toBeCalledTimes(0);
    eventHandler1.mockClear();
    subject.on("click", "hop", eventHandler0);
    subject.on("click:ah", "hop", eventHandler1);
    subject.on("click:be", "hop", eventHandler2);
    subject.off("click:ah", "hop");
    rawCmpSub._trigger("click");
    rawCmpSub._trigger("click");
    expect(eventHandler0).toBeCalledTimes(2);
    expect(eventHandler1).toBeCalledTimes(0);
    expect(eventHandler2).toBeCalledTimes(2);
    eventHandler0.mockClear();
    eventHandler1.mockClear();
    eventHandler2.mockClear();
    subject.off("click:be", "hop");
    subject.off("click", "hop");
    rawCmpSub._trigger("click");
    rawCmpSub._trigger("click");
    expect(eventHandler0).toBeCalledTimes(0);
    expect(eventHandler1).toBeCalledTimes(0);
    expect(eventHandler2).toBeCalledTimes(0);
  });
});

describe("Disabling event", () => {
  let subject: Dummy;
  let rawCmp: MockedComponent, rawCmpSub: MockedComponent;

  beforeEach(() => {
    let sheet = MockSheet({ id: "main" });
    rawCmp = MockComponent({
      id: "123",
      sheet,
    });
    rawCmpSub = MockComponent({
      id: "hop",
      sheet,
      cntr: rawCmp,
    });
    subject = new Dummy(rawCmp, rawCmpSub);
  });

  test("Simple test disabling", () => {
    const eventHandler = jest.fn((cmp) => {});
    const eventHandler2 = jest.fn((cmp) => {
      cmp.disableEvent("test");
    });
    const eventHandler3 = jest.fn((cmp) => {});
    subject.on("test", eventHandler);
    subject.on("test:shit", eventHandler2);
    subject.on("test:glue", eventHandler3);
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(1);
    expect(eventHandler2).toBeCalledTimes(1);
    expect(eventHandler3).toBeCalledTimes(0);
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(1);
    expect(eventHandler2).toBeCalledTimes(1);
    expect(eventHandler3).toBeCalledTimes(0);
    subject.enableEvent("test");
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(2);
    expect(eventHandler2).toBeCalledTimes(2);
    expect(eventHandler3).toBeCalledTimes(0);
  });
});

describe("Cancel event", () => {
  let subject: Dummy;
  let rawCmp: MockedComponent, rawCmpSub: MockedComponent;

  beforeEach(() => {
    let sheet = MockSheet({ id: "main" });
    rawCmp = MockComponent({
      id: "123",
      sheet,
    });
    rawCmpSub = MockComponent({
      id: "hop",
      sheet,
      cntr: rawCmp,
    });
    subject = new Dummy(rawCmp, rawCmpSub);
  });

  test("Cancel event", () => {
    const eventHandler = jest.fn((cmp) => {});
    const eventHandler2 = jest.fn((cmp) => {
      cmp.cancelEvent("test");
    });
    const eventHandler3 = jest.fn((cmp) => {});
    subject.on("test", eventHandler);
    subject.on("test:shit", eventHandler2);
    subject.on("test:glue", eventHandler3);
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(1);
    expect(eventHandler2).toBeCalledTimes(1);
    expect(eventHandler3).toBeCalledTimes(0);
    subject.trigger("test");
    expect(eventHandler).toBeCalledTimes(2);
    expect(eventHandler2).toBeCalledTimes(2);
    expect(eventHandler3).toBeCalledTimes(0);
  });
});

describe("Handle error in event", () => {
  let subject: Dummy;
  let rawCmp: MockedComponent;

  beforeEach(() => {
    let sheet = MockSheet({ id: "main" });
    rawCmp = MockComponent({
      id: "123",
      sheet,
    });
    subject = new Dummy(rawCmp);
  });

  test("Handle error", () => {
    const eventHandler = jest.fn((cmp) => {
      let a = undefined;
      /* @ts-ignore This is intended to be erroneous */
      a();
    });
    subject.on("test", eventHandler);
    subject.trigger("test");
    expect(handleError).toBeCalled();
  });
});

describe("Transfer events", () => {
  let subject: Dummy;
  let rawCmp: MockedComponent, rawCmpDest: MockedComponent;

  beforeEach(() => {
    let sheet = MockSheet({ id: "main" });
    rawCmp = MockComponent({
      id: "123",
      sheet,
    });
    rawCmpDest = MockComponent({
      id: "123",
      sheet,
    });
    subject = new Dummy(rawCmp);
  });

  test("Events are transfered", () => {
    const eventHandler = jest.fn((cmp) => {});
    subject.on("click", eventHandler);
    rawCmp._trigger("click");
    expect(eventHandler).toBeCalledTimes(1);
    let cmp = eventHandler.mock.calls[0][0];
    subject.transferEvents(rawCmpDest);
    rawCmpDest._trigger("click");
    expect(eventHandler).toBeCalledTimes(2);
  });
});

describe("Handle on change event trigger", () => {
  let subject: Dummy;
  let rawCmp: MockedComponent;

  beforeEach(() => {
    let sheet = MockSheet({ id: "main" });
    rawCmp = MockComponent({
      id: "123",
      sheet,
    });
    rawCmp.value(1);
    subject = new Dummy(rawCmp);
  });

  test("Update is triggered when value changed", () => {
    const eventHandler = jest.fn((cmp) => {});
    subject.on("update", eventHandler);
    expect(eventHandler).not.toBeCalled();
    rawCmp.value(2);
    expect(eventHandler).toBeCalledTimes(1);
    rawCmp.value(3);
    expect(eventHandler).toBeCalledTimes(2);
    rawCmp.value(3);
    expect(eventHandler).toBeCalledTimes(2);
    rawCmp.value(4);
    expect(eventHandler).toBeCalledTimes(3);
    rawCmp.value(2);
    expect(eventHandler).toBeCalledTimes(4);
    rawCmp.value(2);
    expect(eventHandler).toBeCalledTimes(4);
    subject.trigger("update");
    expect(eventHandler).toBeCalledTimes(5);
  });
});

describe("Component has not targeting", () => {
  let subject: any;
  let rawCmp: MockedComponent;

  beforeEach(() => {
    let sheet = MockSheet({ id: "main" });
    rawCmp = MockComponent({
      id: "123",
      sheet,
    });
    rawCmp.value(1);
    subject = new (class extends EventHolder<LetsRole.Component, TestedEvents> {
      constructor(
        protected _raw: LetsRole.Component,
        subRaw?: LetsRole.Component
      ) {
        super(_raw.id());
      }

      raw(): LetsRole.Component {
        return this._raw;
      }
    })(rawCmp);
  });

  test("Update is triggered when value changed", () => {
    const eventHandler = jest.fn((cmp) => {});
    subject.on("test", eventHandler);
    expect(eventHandler).not.toBeCalled();
    subject.trigger("test");
    expect(eventHandler).toBeCalled();
    expect(eventHandler.mock.calls[0][0]).toBe(subject);
  });
});

describe("Event holder triggers events", () => {
  let subject: Dummy;
  let rawCmp: MockedComponent;

  beforeEach(() => {
    rawCmp = MockComponent({
      id: "123",
      sheet: MockSheet({ id: "main" }),
    });
    subject = new Dummy(rawCmp);
  });

  test("Events triggered", () => {
    const added = jest.fn((cmp, event, subComponent, handler) => {});
    const updated = jest.fn((cmp, event, subComponent, handler) => {});
    const removed = jest.fn((cmp, event, subComponent) => {});

    subject.on("eventhandler:added", added);
    expect(added).toBeCalledTimes(1);
    subject.on("eventhandler:updated", updated);
    expect(added).toBeCalledTimes(2);
    subject.on("eventhandler:removed", removed);
    expect(added).toBeCalledTimes(3);

    const fcn1 = () => {};
    subject.on("click", fcn1);
    expect(added).toBeCalledTimes(4);
    expect(added.mock.calls[3][0]).toStrictEqual(subject);
    expect(added.mock.calls[3][1]).toEqual("click");
    expect(added.mock.calls[3][2]).toBeUndefined();
    expect(added.mock.calls[3][3]).toStrictEqual(fcn1);
    expect(updated).toBeCalledTimes(0);
    const fcn2 = () => {};
    subject.on("click", fcn2);
    expect(updated).toBeCalledTimes(1);
    expect(updated.mock.calls[0][0]).toStrictEqual(subject);
    expect(updated.mock.calls[0][1]).toEqual("click");
    expect(updated.mock.calls[0][2]).toBeUndefined();
    expect(updated.mock.calls[0][3]).toEqual(fcn2);

    expect(removed).toBeCalledTimes(0);
    subject.off("click");
    expect(removed).toBeCalledTimes(1);
    expect(removed.mock.calls[0][0]).toStrictEqual(subject);
    expect(removed.mock.calls[0][1]).toEqual("click");
    expect(removed.mock.calls[0][2]).toBeUndefined();

    subject.on("click", "bla", fcn1);
    expect(added).toBeCalledTimes(5);
    expect(added.mock.calls[4][0]).toStrictEqual(subject);
    expect(added.mock.calls[4][1]).toEqual("click");
    expect(added.mock.calls[4][2]).toEqual("bla");
    expect(added.mock.calls[4][3]).toStrictEqual(fcn1);
    subject.on("click", "bla", fcn2);
    expect(updated).toBeCalledTimes(2);
    expect(updated.mock.calls[1][0]).toStrictEqual(subject);
    expect(updated.mock.calls[1][1]).toEqual("click");
    expect(updated.mock.calls[1][2]).toEqual("bla");
    expect(updated.mock.calls[1][3]).toEqual(fcn2);

    subject.off("click", "bla");
    expect(removed).toBeCalledTimes(2);
    expect(removed.mock.calls[1][0]).toStrictEqual(subject);
    expect(removed.mock.calls[1][1]).toEqual("click");
    expect(removed.mock.calls[1][2]).toEqual("bla");
  });

  describe("Link events between holders", () => {
    let subject1: Dummy, subject2: Dummy;
    let rawCmp1: MockedComponent, rawCmp2: MockedComponent;

    beforeEach(() => {
      let sheet = MockSheet({ id: "main" });
      rawCmp1 = MockComponent({
        id: "123",
        sheet,
      });
      rawCmp2 = MockComponent({
        id: "456",
        sheet,
      });
      subject1 = new Dummy(rawCmp1);
      subject2 = new Dummy(rawCmp2);
    });

    test("Link event", () => {
      const subject1Cb = jest.fn();
      const subject2Cb = jest.fn();
      subject1.on("click", subject1Cb);
      subject2.on("test", subject2Cb);
      subject1.linkEventTo("click", subject2, "test");
      expect(subject1Cb).toBeCalledTimes(0);
      expect(subject2Cb).toBeCalledTimes(0);
      subject1.trigger("click");
      expect(subject1Cb).toBeCalledTimes(1);
      expect(subject2Cb).toBeCalledTimes(1);
    });

    test("Link event by default", () => {
      const subject1Cb = jest.fn();
      const subject2Cb = jest.fn();
      const subject2Cb2 = jest.fn();
      subject1.on("click", subject1Cb);
      subject2.on("test", subject2Cb);
      subject2.on("click", subject2Cb2);
      subject1.linkEventTo("click", subject2);
      expect(subject1Cb).toBeCalledTimes(0);
      expect(subject2Cb).toBeCalledTimes(0);
      expect(subject2Cb2).toBeCalledTimes(0);
      subject1.trigger("click");
      expect(subject1Cb).toBeCalledTimes(1);
      expect(subject2Cb).toBeCalledTimes(0);
      expect(subject2Cb2).toBeCalledTimes(1);
    });
    
    test("Test linked event params", () => {
      const subject2Cb = jest.fn((...args: any[]) => {});
      subject2.on("click", subject2Cb);
      subject1.linkEventTo("click", subject2);
      subject1.trigger("click");
      expect(subject2Cb).toBeCalledTimes(1);
      expect(subject2Cb.mock.calls[0][0]).toStrictEqual(subject2);
      expect(subject2Cb.mock.calls[0][1]).toStrictEqual(subject1);
      subject2Cb.mockClear();
      const obj = {};
      subject1.trigger("click", 42, obj);
      expect(subject2Cb).toBeCalledTimes(1);
      expect(subject2Cb.mock.calls[0][0]).toStrictEqual(subject2);
      expect(subject2Cb.mock.calls[0][1]).toStrictEqual(subject1);
      expect(subject2Cb.mock.calls[0][2]).toStrictEqual(42);
      expect(subject2Cb.mock.calls[0][3]).toStrictEqual(obj);
    });
  });
});
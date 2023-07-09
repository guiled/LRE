import { Logger } from "../log";
import { handleError } from "../log/errorhandler";
import {
  MockComponent,
  MockedComponent,
} from "../mock/letsrole/component.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { EventHolder } from "./index";

global.lre = new Logger();

jest.mock("../log/errorhandler");

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

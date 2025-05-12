import { LRE } from "../../src/lre";
import { EventDef, EventHolder } from "../../src/eventholder/index";
import { ComponentMock } from "../../src/mock/letsrole/component.mock";
import { ViewMock } from "../../src/mock/letsrole/view.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

const context = modeHandlerMock();

type TestedEvents = "test" | "unused" | "click" | "update";

class Dummy extends EventHolder<TestedEvents>() {
  __id: string;

  constructor(
    protected _raw: LetsRole.Component,
    subRaw?: LetsRole.Component,
    eventCanBeRan: (eventName: EventType<TestedEvents>) => boolean = () => true,
  ) {
    super(
      _raw.id()!,
      (target: any): IEventHolder => {
        if (subRaw && target === subRaw) {
          return new Dummy(subRaw) as IEventHolder;
        } else {
          return this as IEventHolder;
        }
      },
      (
        event: EventDef<EventType<TestedEvents>>,
        operation: "on" | "off",
        rawDest?: LetsRole.Component,
      ) => {
        if (event.eventId === "click" || event.eventId === "update") {
          if (event.delegated) {
            (rawDest ?? _raw)[operation]?.(
              event.eventId as any,
              event.subComponent!,
              event.rawHandler,
            );
          } else {
            (rawDest ?? _raw)[operation]?.(
              event.eventId as any,
              event.rawHandler,
            );
          }
        }
      },
      eventCanBeRan,
    );
    this.__id = _raw.id()!;
  }

  raw(): LetsRole.Component {
    return this._raw;
  }
}
let server: ServerMock;
let vw: ViewMock;
let rawCmp: ComponentMock;

beforeEach(() => {
  global.log = jest.fn();
  global.lre = new LRE(context);

  const cmpDef: LetsRoleMock.ComponentDefinitions = {
    className: "Label",
    text: "test",
    id: "lbl",
  };
  server = new ServerMock({
    views: [
      {
        id: "main",
        className: "View",
        children: [
          cmpDef,
          {
            className: "Container",
            id: "container",
            children: [
              {
                className: "Label",
                text: "sub",
                id: "sub",
              },
              {
                className: "Label",
                text: "sub",
                id: "lbl2",
              },
            ],
          },
        ],
      },
    ],
  });
  vw = server.openView("main", "123", {});
  rawCmp = vw.get("lbl") as ComponentMock;
  jest.spyOn(rawCmp, "on");
  jest.spyOn(rawCmp, "off");
});

describe("Test simple events", () => {
  let subject: Dummy;

  beforeEach(() => {
    subject = new Dummy(rawCmp, undefined);
  });

  test("No raw event calls for custom event", () => {
    subject.on("test", jest.fn());
    subject.on("test:a", jest.fn());
    subject.on("test:b", jest.fn());

    expect(rawCmp.on).toHaveBeenCalledTimes(0);

    subject.off("test");

    expect(rawCmp.off).toHaveBeenCalledTimes(0);
  });

  test("Only one raw event added for custom event", () => {
    subject.on("click", jest.fn());
    subject.on("click:a", jest.fn());
    subject.on("click:b", jest.fn());

    expect(rawCmp.on).toHaveBeenCalledTimes(1);

    subject.off("click");

    expect(rawCmp.off).toHaveBeenCalledTimes(0);

    subject.off("click:a");

    expect(rawCmp.off).toHaveBeenCalledTimes(0);

    subject.off("click:b");

    expect(rawCmp.off).toHaveBeenCalledTimes(1);

    subject.off("click");

    expect(rawCmp.off).toHaveBeenCalledTimes(1);
  });

  test("Handlers triggered from raw", () => {
    const eventHandler = jest.fn();
    subject.on("click", eventHandler);

    expect(rawCmp.on).toHaveBeenCalled();

    rawCmp.trigger("click");

    expect(eventHandler).toHaveBeenCalled();

    (rawCmp.on as jest.Mock).mockClear();
    eventHandler.mockClear();
    const eventHandler2 = jest.fn();
    subject.on("click:second", eventHandler2);

    expect(rawCmp.on).not.toHaveBeenCalled();

    rawCmp.trigger("click");

    expect(eventHandler).toHaveBeenCalled();
    expect(eventHandler2).toHaveBeenCalled();

    (rawCmp.on as jest.Mock).mockClear();
    eventHandler.mockClear();
    eventHandler2.mockClear();
    const eventHandler3 = jest.fn();
    subject.on("click:third", undefined, eventHandler3);

    expect(rawCmp.on).not.toHaveBeenCalled();

    rawCmp.trigger("click");

    expect(eventHandler).toHaveBeenCalled();
    expect(eventHandler2).toHaveBeenCalled();
    expect(eventHandler3).toHaveBeenCalled();

    eventHandler.mockClear();
    eventHandler2.mockClear();
    eventHandler3.mockClear();
    subject.off("click:third");

    expect(rawCmp.off).not.toHaveBeenCalled();

    rawCmp.trigger("click");

    expect(eventHandler).toHaveBeenCalled();
    expect(eventHandler2).toHaveBeenCalled();
    expect(eventHandler3).not.toHaveBeenCalled();

    eventHandler.mockClear();
    eventHandler2.mockClear();
    eventHandler3.mockClear();
    subject.off("click:second", undefined);

    expect(rawCmp.off).not.toHaveBeenCalled();

    rawCmp.trigger("click");

    expect(eventHandler).toHaveBeenCalled();
    expect(eventHandler2).not.toHaveBeenCalled();
    expect(eventHandler3).not.toHaveBeenCalled();

    eventHandler.mockClear();
    eventHandler2.mockClear();
    eventHandler3.mockClear();
    subject.off("click");

    expect(rawCmp.off).toHaveBeenCalled();

    rawCmp.trigger("click");

    expect(eventHandler).not.toHaveBeenCalled();
    expect(eventHandler2).not.toHaveBeenCalled();
    expect(eventHandler3).not.toHaveBeenCalled();
  });

  test("Simple trigger", () => {
    let receivedCmp;
    const eventHandler = jest.fn((cmp) => {
      receivedCmp = cmp;
    });
    subject.on("test", eventHandler);
    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(1);

    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(2);

    const eventFirstArg = eventHandler.mock.calls[0][0];

    expect(eventFirstArg).toBe(subject);
    expect(eventFirstArg.raw()).toBe(rawCmp);
    expect(receivedCmp).toBe(subject);
    expect(receivedCmp === subject).toBeTruthy();

    const eventholder = new (class extends EventHolder<"click">() {})(
      "123",
      undefined,
      (event: EventDef<EventType<"click">>, operation: "on" | "off") => {
        if (event.delegated) {
          rawCmp[operation]?.(
            event.eventId as any,
            event.subComponent!,
            event.rawHandler,
          );
        } else {
          rawCmp[operation]?.(event.eventId as any, event.rawHandler as any);
        }
      },
    );

    expect(eventholder.id()).toBe("123");

    const cb = jest.fn();
    eventholder.on("click", cb);

    expect(cb).not.toHaveBeenCalled();

    eventholder.trigger("click");

    expect(cb).toHaveBeenCalled();
    expect(cb.mock.calls[0][0]).toBe(eventholder);

    cb.mockClear();
    rawCmp.trigger("click");

    expect(cb).toHaveBeenCalled();
    expect(cb.mock.calls[0][0]).toBe(eventholder);
  });

  test("Simple trigger with additional parameters", () => {
    const eventHandler = jest.fn();
    subject.on("test", eventHandler);
    const param = 42;
    subject.trigger("test", param);

    expect(eventHandler).toHaveBeenCalledTimes(1);
    expect(eventHandler.mock.calls[0][1]).toBe(param);

    const obj = {
      a: 1,
      b: 2,
      c: [1, 2, 3],
    };
    subject.trigger("test", param + 1, obj);

    expect(eventHandler).toHaveBeenCalledTimes(2);
    expect(eventHandler.mock.calls[1][1]).toBe(param + 1);
    expect(eventHandler.mock.calls[1][2]).toStrictEqual(obj);
  });

  test("Simple trigger with two handlers", () => {
    const eventHandler1 = jest.fn();
    const eventHandler2 = jest.fn();
    subject.on("test", eventHandler1);
    subject.on("test", eventHandler2);
    subject.trigger("test");

    expect(eventHandler1).toHaveBeenCalledTimes(0);
    expect(eventHandler2).toHaveBeenCalledTimes(1);
  });

  test("Trigger an non-existing event", () => {
    const eventHandler = jest.fn();
    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(0);
  });

  test("Off an event handler", () => {
    const eventHandler = jest.fn();
    subject.on("test", eventHandler);
    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(1);

    eventHandler.mockClear();
    subject.off("test");
    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(0);
  });

  test("Disable events", () => {
    const eventHandler = jest.fn();
    const disableEvent = jest.fn();
    subject.on("test", eventHandler);
    subject.on("eventhandler-disabled", disableEvent);
    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(1);

    eventHandler.mockClear();

    expect(disableEvent).not.toHaveBeenCalled();

    subject.disableEvent("test");

    expect(disableEvent).toHaveBeenCalledTimes(1);

    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(0);
  });
});

describe("Many working handlers on same event", () => {
  let subject: Dummy;

  beforeEach(() => {
    subject = new Dummy(rawCmp);
  });

  test("Named event trigger of named event", () => {
    const eventHandler = jest.fn();
    subject.on("test:first", eventHandler);
    subject.trigger("test:first");

    expect(eventHandler).toHaveBeenCalledTimes(1);
  });

  test("Named events are trigger when main event triggered", () => {
    const eventHandler1 = jest.fn();
    const eventHandler2 = jest.fn();
    subject.on("test:first", eventHandler1);
    subject.on("test:second", eventHandler2);
    subject.trigger("test");

    expect(eventHandler1).toHaveBeenCalledTimes(1);
    expect(eventHandler1).toHaveBeenCalledTimes(1);
  });

  test("Named event trigger specifically of named event", () => {
    const eventHandler1 = jest.fn();
    const eventHandler2 = jest.fn();
    subject.on("test:first", eventHandler1);
    subject.on("test:second", eventHandler2);
    subject.trigger("test:first");

    expect(eventHandler1).toHaveBeenCalledTimes(1);
    expect(eventHandler2).toHaveBeenCalledTimes(0);
  });

  test("Named event trigger for overwritten event", () => {
    const eventHandler1 = jest.fn();
    const eventHandler2 = jest.fn();
    subject.on("test:first", eventHandler1);
    subject.on("test:first", eventHandler2);
    subject.trigger("test:first");

    expect(eventHandler1).toHaveBeenCalledTimes(0);
    expect(eventHandler2).toHaveBeenCalledTimes(1);
  });

  test("Switch off a named trigger", () => {
    const eventHandler1 = jest.fn();
    const eventHandler2 = jest.fn();
    subject.on("test:first", eventHandler1);
    subject.on("test:second", eventHandler2);
    subject.trigger("test");

    expect(eventHandler1).toHaveBeenCalledTimes(1);
    expect(eventHandler2).toHaveBeenCalledTimes(1);

    subject.off("test:first");
    subject.trigger("test");

    expect(eventHandler1).toHaveBeenCalledTimes(1);
    expect(eventHandler2).toHaveBeenCalledTimes(2);
  });

  test("Switch off unset event", () => {
    const eventHandler1 = jest.fn();
    const eventHandler2 = jest.fn();
    subject.on("test:first", eventHandler1);
    subject.on("test:second", eventHandler2);
    subject.trigger("test");

    expect(eventHandler1).toHaveBeenCalledTimes(1);
    expect(eventHandler2).toHaveBeenCalledTimes(1);

    subject.off("test:third");
    subject.trigger("test");

    expect(eventHandler1).toHaveBeenCalledTimes(2);
    expect(eventHandler2).toHaveBeenCalledTimes(2);

    subject.off("unused");
    subject.trigger("test");

    expect(eventHandler1).toHaveBeenCalledTimes(3);
    expect(eventHandler2).toHaveBeenCalledTimes(3);
  });
});

describe("Event executed only once", () => {
  let subject: Dummy;

  beforeEach(() => {
    subject = new Dummy(rawCmp);
  });

  test("Event executed only once", () => {
    const eventHandler = jest.fn();
    subject.once("test", eventHandler);
    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(1);

    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(1);
  });

  test("Named event executed only once", () => {
    const eventHandler1 = jest.fn();
    const eventHandler2 = jest.fn();
    subject.on("test", eventHandler1);
    subject.once("test:ah", eventHandler2);
    subject.trigger("test");

    expect(eventHandler1).toHaveBeenCalledTimes(1);
    expect(eventHandler2).toHaveBeenCalledTimes(1);

    subject.trigger("test");

    expect(eventHandler1).toHaveBeenCalledTimes(2);
    expect(eventHandler2).toHaveBeenCalledTimes(1);
  });

  test("Handlers triggered once from raw", () => {
    const eventHandler = jest.fn();
    const eventHandler2 = jest.fn();
    subject.once("click", eventHandler);

    expect(rawCmp.on).toHaveBeenCalledTimes(1);

    rawCmp.trigger("click");
    rawCmp.trigger("click");

    expect(eventHandler).toHaveBeenCalledTimes(1);

    eventHandler.mockClear();
    (rawCmp.on as jest.Mock).mockClear();
    subject.once("click", eventHandler);
    subject.once("click:second", eventHandler2);

    expect(rawCmp.on).toHaveBeenCalledTimes(1);

    rawCmp.trigger("click");
    rawCmp.trigger("click");

    expect(eventHandler).toHaveBeenCalledTimes(1);
    expect(eventHandler2).toHaveBeenCalledTimes(1);
  });
});

describe("Delegated events", () => {
  let subject: Dummy;
  let rawCmpSub: ComponentMock;
  let rawContainer: ComponentMock;

  beforeEach(() => {
    rawContainer = vw.get("container") as ComponentMock;
    rawCmpSub = vw.get("sub") as ComponentMock;
    subject = new Dummy(rawContainer, rawCmpSub);
  });

  test("Delegate an event", () => {
    const eventHandler1 = jest.fn();
    subject.on("click", rawCmpSub.id()!, eventHandler1);
    rawCmpSub.trigger("click");

    expect(eventHandler1).toHaveBeenCalledTimes(1);
  });

  test("Delegate an once event", () => {
    const eventHandler1 = jest.fn();
    subject.once("click", rawCmpSub.id()!, eventHandler1);
    rawCmpSub.trigger("click");
    rawCmpSub.trigger("click");

    expect(eventHandler1).toHaveBeenCalledTimes(1);

    eventHandler1.mockClear();
    subject.once("click:ah", rawCmpSub.id()!, eventHandler1);
    subject.once("click:be", rawCmpSub.id()!, eventHandler1);
    subject.on("click:be", rawCmpSub.id()!, eventHandler1);
    rawCmpSub.trigger("click");
    rawCmpSub.trigger("click");

    expect(eventHandler1).toHaveBeenCalledTimes(4);
  });

  test("Switch off a delegated event", () => {
    const eventHandler0 = jest.fn();
    const eventHandler1 = jest.fn();
    const eventHandler2 = jest.fn();
    subject.on("click", rawCmpSub.id()!, eventHandler1);
    subject.off("click", rawCmpSub.id()!);
    rawCmpSub.trigger("click");
    rawCmpSub.trigger("click");

    expect(eventHandler1).toHaveBeenCalledTimes(0);

    eventHandler1.mockClear();
    subject.on("click", rawCmpSub.id()!, eventHandler0);
    subject.on("click:ah", rawCmpSub.id()!, eventHandler1);
    subject.on("click:be", rawCmpSub.id()!, eventHandler2);
    subject.off("click:ah", rawCmpSub.id()!);
    rawCmpSub.trigger("click");
    rawCmpSub.trigger("click");

    expect(eventHandler0).toHaveBeenCalledTimes(2);
    expect(eventHandler1).toHaveBeenCalledTimes(0);
    expect(eventHandler2).toHaveBeenCalledTimes(2);

    eventHandler0.mockClear();
    eventHandler1.mockClear();
    eventHandler2.mockClear();
    subject.off("click:be", rawCmpSub.id()!);
    subject.off("click", rawCmpSub.id()!);
    rawCmpSub.trigger("click");
    rawCmpSub.trigger("click");

    expect(eventHandler0).toHaveBeenCalledTimes(0);
    expect(eventHandler1).toHaveBeenCalledTimes(0);
    expect(eventHandler2).toHaveBeenCalledTimes(0);
  });
});

describe("Disabling event", () => {
  let subject: Dummy;
  let rawCmp: ComponentMock, rawCmpSub: ComponentMock;

  beforeEach(() => {
    rawCmp = vw.get("container") as ComponentMock;
    rawCmpSub = vw.get("sub") as ComponentMock;
    subject = new Dummy(rawCmp, rawCmpSub);
  });

  test("Simple test disabling", () => {
    const eventHandler = jest.fn();
    const eventHandler2 = jest.fn((cmp) => {
      cmp.disableEvent("test");
    });
    const eventHandler3 = jest.fn();
    const disableEventCb = jest.fn();
    const enableEventCb = jest.fn();

    subject.on("test", eventHandler);
    subject.on("test:shit", eventHandler2);
    subject.on("test:glue", eventHandler3);
    subject.on("eventhandler-enabled", enableEventCb);
    subject.on("eventhandler-disabled", disableEventCb);

    expect(disableEventCb).not.toHaveBeenCalled();

    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(1);
    expect(eventHandler2).toHaveBeenCalledTimes(1);
    expect(disableEventCb).toHaveBeenCalledTimes(1);
    expect(eventHandler3).toHaveBeenCalledTimes(0);

    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(1);
    expect(eventHandler2).toHaveBeenCalledTimes(1);
    expect(disableEventCb).toHaveBeenCalledTimes(1);
    expect(eventHandler3).toHaveBeenCalledTimes(0);

    expect(enableEventCb).not.toHaveBeenCalled();

    subject.enableEvent("test");

    expect(enableEventCb).toHaveBeenCalledTimes(1);

    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(2);
    expect(eventHandler2).toHaveBeenCalledTimes(2);
    expect(eventHandler3).toHaveBeenCalledTimes(0);
  });

  test("Event enabled checks", () => {
    expect(subject.isEventEnabled("click")).toBeFalsy();

    subject.on("click", jest.fn());

    expect(subject.isEventEnabled("click")).toBeTruthy();

    subject.cancelEvent("click");

    expect(subject.isEventEnabled("click")).toBeFalsy();

    subject.trigger("click");

    expect(subject.isEventEnabled("click")).toBeTruthy();

    subject.disableEvent("click");

    expect(subject.isEventEnabled("click")).toBeFalsy();

    subject.trigger("click");

    expect(subject.isEventEnabled("click")).toBeFalsy();

    subject.enableEvent("click");

    expect(subject.isEventEnabled("click")).toBeTruthy();

    subject.off("click");

    expect(subject.isEventEnabled("click")).toBeFalsy();
  });
});

describe("Cancel event", () => {
  let subject: Dummy;
  let rawCmp: ComponentMock, rawCmpSub: ComponentMock;

  beforeEach(() => {
    rawCmp = vw.get("container") as ComponentMock;
    rawCmpSub = vw.get("sub") as ComponentMock;
    subject = new Dummy(rawCmp, rawCmpSub);
  });

  test("Cancel event", () => {
    const eventHandler = jest.fn();
    const eventHandler2 = jest.fn((cmp) => {
      cmp.cancelEvent("test");
    });
    const eventHandler3 = jest.fn();
    subject.on("test", eventHandler);
    subject.on("test:shit", eventHandler2);
    subject.on("test:glue", eventHandler3);
    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(1);
    expect(eventHandler2).toHaveBeenCalledTimes(1);
    expect(eventHandler3).toHaveBeenCalledTimes(0);

    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalledTimes(2);
    expect(eventHandler2).toHaveBeenCalledTimes(2);
    expect(eventHandler3).toHaveBeenCalledTimes(0);
  });
});

describe("Handle error in event", () => {
  let subject: Dummy;
  let rawCmp: ComponentMock;

  beforeEach(() => {
    rawCmp = vw.get("lbl") as ComponentMock;
    subject = new Dummy(rawCmp);
  });

  test("Handle error", () => {
    jest.spyOn(lre, "error");
    const eventHandler = jest.fn(() => {
      const a = undefined;
      /* @ts-expect-error This is intended to be erroneous */
      a();
    });
    subject.on("test", eventHandler);

    expect(lre.error).not.toHaveBeenCalled();

    subject.trigger("test");

    expect(lre.error).toHaveBeenCalled();
  });
});

describe("Transfer events", () => {
  let subject: Dummy;
  let rawCmp: ComponentMock, rawCmpDest: ComponentMock;

  beforeEach(() => {
    rawCmp = vw.get("lbl") as ComponentMock;
    rawCmpDest = vw.get("sub") as ComponentMock;
    subject = new Dummy(rawCmp);
  });

  test("Events are transferred", () => {
    const eventHandler = jest.fn();
    subject.on("click", eventHandler);
    rawCmp.trigger("click");

    expect(eventHandler).toHaveBeenCalledTimes(1);

    subject.transferEvents(rawCmpDest);
    rawCmpDest.trigger("click");

    expect(eventHandler).toHaveBeenCalledTimes(2);
  });
});

describe("Handle on change event trigger", () => {
  let subject: Dummy;
  let rawCmp: ComponentMock;

  beforeEach(() => {
    rawCmp = vw.get("lbl") as ComponentMock;
    let val: LetsRole.ComponentValue = 1;
    rawCmp.value(val);
    subject = new Dummy(
      rawCmp,
      undefined,
      (
        eventName: EventType<TestedEvents>,
        manuallyTriggered: boolean = false,
      ) => {
        if (eventName === "update") {
          const newVal = rawCmp.value();
          const result =
            manuallyTriggered ||
            (eventName === "update" &&
              JSON.stringify(val) !== JSON.stringify(newVal));
          val = newVal;
          return result;
        }

        return true;
      },
    );
  });

  test("Update is triggered only when value changed", () => {
    const eventHandler = jest.fn();
    subject.on("update", eventHandler);

    expect(eventHandler).not.toHaveBeenCalled();

    rawCmp.value(2);

    expect(eventHandler).toHaveBeenCalledTimes(1);

    rawCmp.value(3);

    expect(eventHandler).toHaveBeenCalledTimes(2);

    rawCmp.value(3);

    expect(eventHandler).toHaveBeenCalledTimes(2);

    rawCmp.value(4);

    expect(eventHandler).toHaveBeenCalledTimes(3);

    rawCmp.value(2);

    expect(eventHandler).toHaveBeenCalledTimes(4);

    rawCmp.value(2);

    expect(eventHandler).toHaveBeenCalledTimes(4);

    subject.trigger("update");

    expect(eventHandler).toHaveBeenCalledTimes(5);
  });

  test("Update is not triggered if value remains identical as object ", () => {
    rawCmp.value({ a: 42, b: { c: 13 } });
    const eventHandler = jest.fn();
    subject.on("update", eventHandler);

    expect(eventHandler).not.toHaveBeenCalled();

    rawCmp.value({ a: 42, b: { c: 13 } });

    // the first time is always triggered because there is no info of the data before change
    expect(eventHandler).toHaveBeenCalledTimes(1);

    rawCmp.value({ a: 42, b: { c: 13 } });

    expect(eventHandler).toHaveBeenCalledTimes(1);

    rawCmp.value({ a: 42, b: { c: 14 } });

    expect(eventHandler).toHaveBeenCalledTimes(2);
  });
});

describe("Component has not targeting", () => {
  let subject: any;
  let rawCmp: ComponentMock;

  beforeEach(() => {
    rawCmp = vw.get("lbl") as ComponentMock;
    rawCmp.value(1);
    subject = new (class extends EventHolder<TestedEvents>() {
      constructor(protected _raw: LetsRole.Component) {
        super(_raw.id()!);
      }

      raw(): LetsRole.Component {
        return this._raw;
      }
    })(rawCmp);
  });

  test("Update is triggered when value changed", () => {
    const eventHandler = jest.fn();
    subject.on("test", eventHandler);

    expect(eventHandler).not.toHaveBeenCalled();

    subject.trigger("test");

    expect(eventHandler).toHaveBeenCalled();
    expect(eventHandler.mock.calls[0][0]).toBe(subject);
  });
});

describe("Event holder triggers events", () => {
  let subject: Dummy;
  let rawCmp: ComponentMock;

  beforeEach(() => {
    rawCmp = vw.get("lbl") as ComponentMock;
    subject = new Dummy(rawCmp);
  });

  test("Events triggered", () => {
    const added = jest.fn();
    const added2 = jest.fn();
    const updated = jest.fn();
    const removed = jest.fn();
    const enabled = jest.fn();
    const disabled = jest.fn();
    const created = jest.fn();
    const destroyed = jest.fn();

    subject.on("eventhandler-added", added);

    expect(added).toHaveBeenCalledTimes(0);

    subject.on("eventhandler-added:test", added2);

    expect(added).toHaveBeenCalledTimes(0);

    subject.on("eventhandler-updated", updated);

    expect(added).toHaveBeenCalledTimes(0);

    subject.on("eventhandler-removed", removed);

    expect(added).toHaveBeenCalledTimes(0);

    subject.on("eventhandler-enabled", enabled);

    expect(added).toHaveBeenCalledTimes(0);

    subject.on("eventhandler-disabled", disabled);

    expect(added).toHaveBeenCalledTimes(0);

    subject.on("eventhandler-created", created);

    expect(added).toHaveBeenCalledTimes(0);

    subject.on("eventhandler-destroyed", destroyed);

    expect(added).toHaveBeenCalledTimes(0);

    const fcn1 = (): void => {};

    subject.on("click", fcn1);

    expect(added).toHaveBeenCalledTimes(1);
    expect(added2).toHaveBeenCalledTimes(1);
    expect(created).toHaveBeenCalledTimes(1);
    expect(added.mock.calls[0][0]).toStrictEqual(subject);
    expect(added.mock.calls[0][1]).toEqual("click");
    expect(added.mock.calls[0][2]).toBeUndefined();
    expect(added.mock.calls[0][3]).toStrictEqual(fcn1);

    subject.on("click:2nd", jest.fn());

    expect(added).toHaveBeenCalledTimes(2);
    expect(added2).toHaveBeenCalledTimes(2);
    expect(created).toHaveBeenCalledTimes(1);

    expect(updated).toHaveBeenCalledTimes(0);

    const fcn2 = (): void => {};

    subject.on("click", fcn2);

    expect(added).toHaveBeenCalledTimes(2);
    expect(added2).toHaveBeenCalledTimes(2);
    expect(created).toHaveBeenCalledTimes(1);
    expect(updated).toHaveBeenCalledTimes(1);
    expect(updated.mock.calls[0][0]).toStrictEqual(subject);
    expect(updated.mock.calls[0][1]).toEqual("click");
    expect(updated.mock.calls[0][2]).toBeUndefined();
    expect(updated.mock.calls[0][3]).toEqual(fcn2);

    subject.on("click:2nd", fcn2);

    expect(updated).toHaveBeenCalledTimes(2);

    expect(removed).toHaveBeenCalledTimes(0);

    subject.off("click");

    expect(removed).toHaveBeenCalledTimes(1);
    expect(destroyed).toHaveBeenCalledTimes(0);
    expect(removed.mock.calls[0][0]).toStrictEqual(subject);
    expect(removed.mock.calls[0][1]).toEqual("click");
    expect(removed.mock.calls[0][2]).toBeUndefined();

    subject.off("click");

    expect(removed).toHaveBeenCalledTimes(1);
    expect(destroyed).toHaveBeenCalledTimes(0);

    subject.off("click:2nd");

    expect(removed).toHaveBeenCalledTimes(2);
    expect(destroyed).toHaveBeenCalledTimes(1);

    (added as jest.Mock).mockClear();
    (created as jest.Mock).mockClear();
    (updated as jest.Mock).mockClear();
    (removed as jest.Mock).mockClear();
    (destroyed as jest.Mock).mockClear();
    subject.on("click", "bla", fcn1);

    expect(added).toHaveBeenCalledTimes(1);
    expect(created).toHaveBeenCalledTimes(1);
    expect(added.mock.calls[0][0]).toStrictEqual(subject);
    expect(added.mock.calls[0][1]).toEqual("click");
    expect(added.mock.calls[0][2]).toEqual("bla");
    expect(added.mock.calls[0][3]).toStrictEqual(fcn1);

    subject.on("click", "bla", fcn2);

    expect(updated).toHaveBeenCalledTimes(1);
    expect(updated.mock.calls[0][0]).toStrictEqual(subject);
    expect(updated.mock.calls[0][1]).toEqual("click");
    expect(updated.mock.calls[0][2]).toEqual("bla");
    expect(updated.mock.calls[0][3]).toEqual(fcn2);

    subject.off("click", "bla");

    expect(removed).toHaveBeenCalledTimes(1);
    expect(destroyed).toHaveBeenCalledTimes(1);
    expect(removed.mock.calls[0][0]).toStrictEqual(subject);
    expect(removed.mock.calls[0][1]).toEqual("click");
    expect(removed.mock.calls[0][2]).toEqual("bla");
  });

  describe("Link events between holders", () => {
    let subject1: Dummy, subject2: Dummy;
    let rawCmp1: ComponentMock, rawCmp2: ComponentMock;

    beforeEach(() => {
      rawCmp1 = vw.get("lbl") as ComponentMock;
      rawCmp2 = vw.get("sub") as ComponentMock;
      subject1 = new Dummy(rawCmp1);
      subject2 = new Dummy(rawCmp2);
    });

    test("Link event", () => {
      const subject1Cb = jest.fn();
      const subject2Cb = jest.fn();
      subject1.on("click", subject1Cb);
      subject2.on("test", subject2Cb);
      subject1.linkEventTo("click", subject2, "test");

      expect(subject1Cb).toHaveBeenCalledTimes(0);
      expect(subject2Cb).toHaveBeenCalledTimes(0);

      subject1.trigger("click");

      expect(subject1Cb).toHaveBeenCalledTimes(1);
      expect(subject2Cb).toHaveBeenCalledTimes(1);

      subject1.unlinkEventTo("click", subject2, "test");
      subject1.trigger("click");

      expect(subject1Cb).toHaveBeenCalledTimes(2);
      expect(subject2Cb).toHaveBeenCalledTimes(1);
    });

    test("Link event by default", () => {
      const subject1Cb = jest.fn();
      const subject2Cb = jest.fn();
      const subject2Cb2 = jest.fn();
      subject1.on("click", subject1Cb);
      subject2.on("test", subject2Cb);
      subject2.on("click", subject2Cb2);
      subject1.linkEventTo("click", subject2);

      expect(subject1Cb).toHaveBeenCalledTimes(0);
      expect(subject2Cb).toHaveBeenCalledTimes(0);
      expect(subject2Cb2).toHaveBeenCalledTimes(0);

      subject1.trigger("click");

      expect(subject1Cb).toHaveBeenCalledTimes(1);
      expect(subject2Cb).toHaveBeenCalledTimes(0);
      expect(subject2Cb2).toHaveBeenCalledTimes(1);

      subject1.unlinkEventTo("click", subject2);
      subject1.trigger("click");

      expect(subject1Cb).toHaveBeenCalledTimes(2);
      expect(subject2Cb).toHaveBeenCalledTimes(0);
      expect(subject2Cb2).toHaveBeenCalledTimes(1);
    });

    test("Test linked event params", () => {
      const subject2Cb = jest.fn();
      subject2.on("click", subject2Cb);
      subject1.linkEventTo("click", subject2);
      subject1.trigger("click");

      expect(subject2Cb).toHaveBeenCalledTimes(1);
      expect(subject2Cb.mock.calls[0][0]).toStrictEqual(subject2);
      expect(subject2Cb.mock.calls[0][1]).toStrictEqual(subject1);

      subject2Cb.mockClear();
      const obj = {};
      subject1.trigger("click", 42, obj);

      expect(subject2Cb).toHaveBeenCalledTimes(1);
      expect(subject2Cb.mock.calls[0][0]).toStrictEqual(subject2);
      expect(subject2Cb.mock.calls[0][1]).toStrictEqual(subject1);
      expect(subject2Cb.mock.calls[0][2]).toStrictEqual(42);
      expect(subject2Cb.mock.calls[0][3]).toStrictEqual(obj);
    });
  });
});

describe("Copy events from a component to an other", () => {
  let source: Dummy;
  let dest: Dummy;
  let dest2: Dummy;
  let rawSource: ComponentMock;
  let rawDest: ComponentMock;
  let rawDest2: ComponentMock;
  const clickCbs: Array<jest.Mock> = [];

  beforeEach(() => {
    rawSource = vw.get("lbl") as ComponentMock;
    source = new Dummy(rawSource, undefined);
    rawDest = vw.get("sub") as ComponentMock;
    dest = new Dummy(rawDest, undefined);
    rawDest2 = vw.get("lbl2") as ComponentMock;
    dest2 = new Dummy(rawDest2, undefined);

    for (let i = 0; i < 6; i++) {
      clickCbs[i] = jest.fn();
    }
  });

  test("Link / unlink", () => {
    const click1 = jest.fn();
    const click2 = jest.fn();
    dest.on("click", click1);
    dest.on("click:second", click2);

    rawDest.trigger("click");

    expect(click1).toHaveBeenCalledWith(dest);
    expect(click2).toHaveBeenCalledWith(dest);

    click1.mockClear();
    click2.mockClear();
    rawSource.trigger("click");

    expect(click1).not.toHaveBeenCalled();
    expect(click2).not.toHaveBeenCalled();

    source.propagateEventTo(dest, ["click"]);

    click1.mockClear();
    click2.mockClear();
    rawSource.trigger("click");

    expect(click1).toHaveBeenCalledWith(dest);
    expect(click2).toHaveBeenCalledWith(dest);

    const customCb = jest.fn();
    const customCb2 = jest.fn();
    dest.on("test", customCb);
    dest.on("test:hop", customCb2);
    source.trigger("test");

    expect(customCb).toHaveBeenCalledTimes(1);
    expect(customCb2).toHaveBeenCalledTimes(1);

    source.trigger("test:hop");

    expect(customCb).toHaveBeenCalledTimes(1);
    expect(customCb2).toHaveBeenCalledTimes(2);

    source.unpropagateEventTo(dest);

    const click3 = jest.fn();
    source.on("click", click3);

    click1.mockClear();
    click2.mockClear();
    rawSource.trigger("click");

    expect(click1).toHaveBeenCalledTimes(0);
    expect(click2).toHaveBeenCalledTimes(0);
    expect(click3).toHaveBeenCalledWith(source);

    source.propagateEventTo(dest, ["click"]);

    click3.mockClear();
    rawSource.trigger("click");

    expect(click1).toHaveBeenCalledWith(dest);
    expect(click2).toHaveBeenCalledWith(dest);
    expect(click3).toHaveBeenCalledWith(source);

    const click4 = jest.fn();
    source.on("click:test", click4);
    click1.mockClear();
    click2.mockClear();
    click3.mockClear();
    rawSource.trigger("click");

    expect(click1).toHaveBeenCalledWith(dest);
    expect(click2).toHaveBeenCalledWith(dest);
    expect(click3).toHaveBeenCalledWith(source);
    expect(click4).toHaveBeenCalledWith(source);

    const click5 = jest.fn();
    dest2.on("click", click5);

    source.propagateEventTo(dest, ["click"]);
    source.propagateEventTo(dest2, ["click"]);

    click1.mockClear();
    click2.mockClear();
    click3.mockClear();
    click4.mockClear();
    rawSource.trigger("click");

    expect(click1).toHaveBeenCalledWith(dest);
    expect(click2).toHaveBeenCalledWith(dest);
    expect(click3).toHaveBeenCalledWith(source);
    expect(click4).toHaveBeenCalledWith(source);
  });

  test("Propagate raw event to multiple dest", () => {
    dest.on("click", clickCbs[0]);
    dest.on("click:second", clickCbs[1]);
    dest2.on("click", clickCbs[2]);
    dest2.on("click:third", clickCbs[3]);
    source.on("click", clickCbs[4]);
    source.on("click:second", clickCbs[5]);

    source.propagateEventTo(dest);
    source.propagateEventTo(dest);
    source.propagateEventTo(dest2);

    rawSource.trigger("click");

    expect(clickCbs[0]).toHaveBeenCalledTimes(1);
    expect(clickCbs[1]).toHaveBeenCalledTimes(1);
    expect(clickCbs[1]).toHaveBeenCalledWith(dest);
    expect(clickCbs[2]).toHaveBeenCalledWith(dest2);
    expect(clickCbs[3]).toHaveBeenCalledWith(dest2);
    expect(clickCbs[4]).toHaveBeenCalledWith(source);
    expect(clickCbs[5]).toHaveBeenCalledWith(source);
  });

  test("Propagate custom event to multiple dest", () => {
    dest.on("test", clickCbs[0]);
    dest.on("test:second", clickCbs[1]);
    dest2.on("test", clickCbs[2]);
    dest2.on("test:third", clickCbs[3]);
    source.on("test", clickCbs[4]);
    source.on("test:second", clickCbs[5]);

    source.propagateEventTo(dest);
    source.propagateEventTo(dest);
    source.propagateEventTo(dest2);

    source.trigger("test");

    expect(clickCbs[0]).toHaveBeenCalledTimes(1);
    expect(clickCbs[1]).toHaveBeenCalledTimes(1);
    expect(clickCbs[1]).toHaveBeenCalledWith(dest);
    expect(clickCbs[2]).toHaveBeenCalledWith(dest2);
    expect(clickCbs[3]).toHaveBeenCalledWith(dest2);
    expect(clickCbs[4]).toHaveBeenCalledWith(source);
    expect(clickCbs[5]).toHaveBeenCalledWith(source);

    jest.clearAllMocks();
    source.trigger("test:second");

    expect(clickCbs[0]).not.toHaveBeenCalled();
    expect(clickCbs[1]).toHaveBeenCalledTimes(1);
    expect(clickCbs[1]).toHaveBeenCalledWith(dest);
    expect(clickCbs[2]).not.toHaveBeenCalled();
    expect(clickCbs[3]).not.toHaveBeenCalled();
    expect(clickCbs[4]).not.toHaveBeenCalled();
    expect(clickCbs[5]).toHaveBeenCalledWith(source);
  });

  test("Remove an event don't break the link", () => {
    source.on("click", clickCbs[0]);
    dest.on("click", clickCbs[1]);

    source.propagateEventTo(dest, ["click"]);
    rawSource.trigger("click");

    expect(clickCbs[0]).toHaveBeenCalledTimes(1);
    expect(clickCbs[1]).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();

    source.off("click");

    rawSource.trigger("click");

    expect(clickCbs[0]).toHaveBeenCalledTimes(0);
    expect(clickCbs[1]).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
  });
});

describe("Event can be ran or not", () => {
  let subject: Dummy;

  beforeEach(() => {
    subject = new Dummy(rawCmp, undefined, () => false);
  });

  test("Not-runnable event is triggered manually", () => {
    const eventHandler = jest.fn();
    subject.on("click", eventHandler);

    expect(eventHandler).not.toHaveBeenCalled();

    subject.trigger("click");

    expect(eventHandler).toHaveBeenCalledTimes(1);
  });

  test("Not-runnable event is not triggered from raw event", () => {
    const eventHandler = jest.fn();
    subject.on("click", eventHandler);

    expect(eventHandler).not.toHaveBeenCalled();

    rawCmp.trigger("click");

    expect(eventHandler).not.toHaveBeenCalled();
  });

  test("Not-runnable event is triggered from raw event when added with onAlways", () => {
    const eventHandler = jest.fn();
    subject.onAlways("click", eventHandler);

    rawCmp.trigger("click");

    expect(eventHandler).toHaveBeenCalledTimes(1);
  });
});

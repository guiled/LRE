import { Error } from "../error";

export type EventHandler<Holder = any> = (
  cmp: Holder,
  ...rest: Array<any>
) => void;

export type EventDef<EventType extends string = LetsRole.EventType> = {
  name: EventType;
  eventId: EventType;
  event: EventType;
  delegated: boolean;
  subComponent: LetsRole.ComponentID | null;
  state: boolean;
  handlers: Record<string, EventHandler<any>>;
  rawHandler: LetsRole.EventCallback;
};

export const EVENT_SEP = ":";
const DELEGATED_SEP = "~";
const DEFAULT_HANDLER_ID = "default";

type EventTargetGetter<T extends string> = (
  target: LREEventTarget,
  event: EventDef<EventType<T>>
) => EventHolder;

type AttachToRawCallback<AdditionalEvents extends string> = (
  eventDef: EventDef<EventType<AdditionalEvents>>,
  operation: "on" | "off",
  rawDest?: LetsRole.Component
) => void;

export class EventHolder<
  AdditionalEvents extends string = EventHolderDefaultEvents
> implements IEventHolder<AdditionalEvents>
{
  #holderId: string;
  #getTarget: EventTargetGetter<AdditionalEvents> | undefined;
  #events: Partial<{
    [key in EventType<AdditionalEvents>]: EventDef<EventType<AdditionalEvents>>;
  }> = {};
  #canceledEvents: Array<EventType<AdditionalEvents>> = [];
  #lastUpdateEventValue: LetsRole.ComponentValue = null;
  #attachToRaw: AttachToRawCallback<AdditionalEvents> | undefined;

  constructor(
    holderId: string,
    targetGetter: EventTargetGetter<AdditionalEvents> | undefined = undefined,
    attachToRaw: AttachToRawCallback<AdditionalEvents> | undefined = undefined
  ) {
    (() => new Error())();
    this.#holderId = holderId;
    this.#getTarget = targetGetter;
    this.#attachToRaw = attachToRaw;
  }

  #eventIsEnabled(eventName: EventType<AdditionalEvents>) {
    return (
      eventName in this.#events &&
      this.#events[eventName]!.state &&
      !this.#canceledEvents.includes(eventName) &&
      Object.keys(this.#events[eventName]!.handlers).length > 0
    );
  }

  #runHandlers(
    eventId: EventType<AdditionalEvents>,
    handlers: EventDef["handlers"],
    target: any,
    ...args: unknown[]
  ) {
    Object.keys(handlers).some((hId) => {
      const fcn = handlers[hId];

      if (!this.#eventIsEnabled(eventId)) {
        return true;
      }

      try {
        fcn.apply(this, [target, ...args]);
      } catch (e) {
        lre.error(
          `[Event:${[this.#holderId, eventId, hId].join(
            EVENT_SEP
          )}] Unhandled error : ${e}`
        );
      }

      return false;
    });

    this.#uncancelEvent(eventId);
  }

  #getEventIdAndHandlersFromEventName(eventName: EventType<AdditionalEvents>): {
    eventId: EventType<AdditionalEvents>;
    handlers: EventDef["handlers"];
  } {
    const [eventId, ...rest] = eventName.split(
      EVENT_SEP
    ) as EventType<AdditionalEvents>[];
    let handlerId: string = rest.join(EVENT_SEP) || DEFAULT_HANDLER_ID;
    let handlers = {} as EventDef["handlers"];
    const event = this.#events[eventId]!;
    if (!event) {
      return {
        eventId,
        handlers,
      };
    }
    if (handlerId !== DEFAULT_HANDLER_ID) {
      if (handlerId in event.handlers) {
        handlers = {
          [handlerId]: event.handlers[handlerId],
        };
      }
    } else {
      handlers = { ...event.handlers };
    }

    return {
      eventId,
      handlers,
    };
  }

  #runEvents(
    eventName: EventType<AdditionalEvents>,
    manuallyTriggered = false
  ): LetsRole.EventCallback<LREEventTarget> {
    return (rawTarget: LREEventTarget, ...args: unknown[]): void => {
      const { eventId, handlers } =
        this.#getEventIdAndHandlersFromEventName(eventName);

      if (!this.#eventIsEnabled(eventId)) return;

      const cmp = this.#getTarget?.(rawTarget, this.#events[eventId]!) || this;

      if (rawTarget && "value" in rawTarget) {
        if (
          eventId === "update" &&
          !manuallyTriggered &&
          rawTarget.value!() === this.#lastUpdateEventValue
        ) {
          return;
        }

        this.#lastUpdateEventValue = structuredClone(
          rawTarget.value!()
        ) as LetsRole.ComponentValue;
      }

      this.#runHandlers(eventId, handlers, cmp, ...args);
    };
  }

  on(
    event: EventType<AdditionalEvents>,
    subComponent: LetsRole.ComponentID | EventHandler | undefined,
    handler?: EventHandler
  ): void {
    let [eventId, ...rest]: EventType<AdditionalEvents>[] = event.split(
      EVENT_SEP
    ) as EventType<AdditionalEvents>[];
    let handlerId: string = rest.join(EVENT_SEP) || DEFAULT_HANDLER_ID;
    let delegated = false;
    //let eventId: EventType<AdditionalEvents> = eventParts[0];
    let eventName = eventId;

    if (arguments.length === 3) {
      delegated = true;
      eventName = (eventId +
        DELEGATED_SEP +
        subComponent) as EventType<AdditionalEvents>;
    } else if (arguments.length === 2) {
      handler = subComponent as EventHandler;
      subComponent = undefined;
    }

    if (
      !(eventName in this.#events) ||
      this.#events[eventName] === void 0 ||
      Object.keys(this.#events[eventName]!.handlers).length === 0
    ) {
      this.#events[eventName] = {
        eventId,
        name: event,
        event,
        delegated,
        subComponent: delegated ? (subComponent as LetsRole.ComponentID) : null,
        state: true,
        handlers: {},
        rawHandler: this.#runEvents(eventName),
      };
      this.#attachToRaw?.(this.#events[eventName]!, "on");
    }

    const handlerAlreadyExists = this.#events[
      eventName
    ]!.handlers.hasOwnProperty(handlerId!);
    this.#events[eventName]!.handlers[handlerId] = handler!;
    const cnt = Object.keys(this.#events[eventName]!.handlers).length;

    let logText = "Handler added ";
    if (!handlerAlreadyExists) {
      this.trigger("eventhandler:added", event, subComponent, handler);
    } else {
      this.trigger("eventhandler:updated", event, subComponent, handler);
      logText = "Handler updated ";
    }
    lre.trace(
      logText +
        `for event ${event} on ${
          this.#holderId + (subComponent ? ">" + subComponent : "")
        }. Count : ${cnt}`
    );
  }

  once(
    event: EventType<AdditionalEvents>,
    handlerOrId: LetsRole.ComponentID | EventHandler,
    handler?: EventHandler
  ): void {
    const eventName = (event + EVENT_SEP + "once") as AdditionalEvents;

    if (arguments.length === 2) {
      const onceHandler: EventHandler = (cmp, ...args) => {
        this.off(eventName);
        (handlerOrId as EventHandler).apply(this, [cmp, ...args]);
      };
      this.on(eventName, onceHandler);
    } else {
      const onceHandler: EventHandler = (cmp, ...args) => {
        this.off(eventName, handlerOrId as LetsRole.ComponentID);
        handler!.apply(this, [cmp, ...args]);
      };
      this.on(eventName, handlerOrId, onceHandler);
    }
  }

  // Cancel the next callbacks of an event
  // Cancel happens only "once" per trigger
  cancelEvent(event: EventType<AdditionalEvents>) {
    if (!this.#canceledEvents.includes(event)) {
      this.#canceledEvents.push(event);
    }
  }

  #uncancelEvent(event: EventType<AdditionalEvents>) {
    const pos = this.#canceledEvents.indexOf(event);
    if (pos !== -1) {
      this.#canceledEvents.splice(pos, 1);
    }
  }

  disableEvent(event: EventType<AdditionalEvents>) {
    if (event in this.#events && this.#events[event] !== void 0) {
      this.#events[event]!.state = false;
    }
  }

  enableEvent(event: EventType<AdditionalEvents>) {
    if (event in this.#events && this.#events[event] !== void 0) {
      this.#events[event]!.state = true;
    }
  }

  off(event: EventType<AdditionalEvents>, delegateId?: LetsRole.ComponentID) {
    let [eventId, ...rest] = event.split(EVENT_SEP) as [
      EventType<AdditionalEvents>,
      ...string[]
    ];
    let handlerId = rest.join(EVENT_SEP) || DEFAULT_HANDLER_ID;

    let eventName = eventId;
    if (arguments.length === 2 && typeof delegateId === "string") {
      eventName = (eventId +
        DELEGATED_SEP +
        delegateId) as EventType<AdditionalEvents>;
    }

    const eventDef = this.#events[eventName];

    if (!eventDef) {
      return;
    }

    lre.trace(
      `Handlers for ${event} removed on ${
        this.#holderId + (delegateId ? ">" + delegateId : "")
      }`
    );

    delete eventDef.handlers[handlerId];

    if (Object.keys(eventDef.handlers).length === 0) {
      this.#attachToRaw?.(eventDef, "off");

      delete this.#events[eventName];
      this.trigger("eventhandler:removed", event, delegateId);
    }
  }

  trigger(eventName: EventType<AdditionalEvents>, ...args: unknown[]): void {
    const { eventId, handlers } =
      this.#getEventIdAndHandlersFromEventName(eventName);
    this.#runHandlers(eventId, handlers, this, ...args);
  }

  transferEvents(rawCmp: LetsRole.Component) {
    for (let eventName in this.#events) {
      const event = this.#events[eventName as EventType<AdditionalEvents>];
      if (event && !event.delegated) {
        // delegated event are automatically transferred
        this.#attachToRaw?.(event, "on", rawCmp);
      }
    }
  }

  linkEventTo(
    event: EventType<AdditionalEvents>,
    destination: IEventHolder<any>,
    triggeredEvent: string = event
  ) {
    this.on(`${event}${EVENT_SEP}linkedTo`, function (...args) {
      destination.trigger.apply(destination, [triggeredEvent, ...args]);
    });
  }
}

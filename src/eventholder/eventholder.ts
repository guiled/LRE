import { HasRaw } from "../hasraw";
import { handleError } from "../log/errorhandler";

type EventHandler<Holder = any> = (cmp: Holder, ...rest: Array<any>) => void;

export type EventDef<EventType extends string = LetsRole.EventType> = {
  name: EventType;
  event: EventType;
  delegated: boolean;
  subComponent: LetsRole.ComponentID | null;
  state: boolean;
  handlers: Record<string, EventHandler<any>>;
  rawHandler: LetsRole.EventCallback;
};

const RAW_EVENTS = [
  "click",
  "update",
  "mouseenter",
  "mouseleave",
  "keyup",
] as const;
type __RAW_EVENTS = typeof RAW_EVENTS;
type T_RAW_EVENTS = __RAW_EVENTS[number];
const EVENT_SEP = ":";
const DELEGATED_SEP = "~";
const DEFAULT_HANDLER_ID = "default";

type EventHolderEvents = "eventhandler:added" | "eventhandler:updated" | "eventhandler:removed";

type EventHolderDefaultEvents = EventHolderEvents;
type EventType<T extends string> =
  | EventHolderDefaultEvents
  | T
  | `${EventHolderDefaultEvents | T}${typeof EVENT_SEP}${string}`;

type EventTargetGetter<T extends string> = (
  target: EventTarget,
  event: EventDef<EventType<T>>
) => EventHolder;

export type EventTarget = Object &
  Pick<LetsRole.Component, "id"> &
  Partial<{
    value: LetsRole.Component["value"];
  }>;

export abstract class EventHolder<
  RawType extends EventTarget = LetsRole.Component,
  AdditionalEvents extends string = EventHolderDefaultEvents
> implements Pick<HasRaw<RawType>, "raw">
{
  #holderId: string;
  #getTarget: EventTargetGetter<AdditionalEvents> | undefined;
  #events: Partial<{
    [key in EventType<AdditionalEvents>]: EventDef<EventType<AdditionalEvents>>;
  }> = {};
  #canceledEvents: Array<EventType<AdditionalEvents>> = [];
  #lastUpdateEventValue: LetsRole.ComponentValue = null;

  constructor(
    holderId: string,
    targetGetter: EventTargetGetter<AdditionalEvents> | undefined = undefined
  ) {
    this.#holderId = holderId;
    this.#getTarget = targetGetter;
  }

  abstract raw(): RawType;

  #isRawEvent(eventId: EventType<AdditionalEvents>): boolean {
    return RAW_EVENTS.some((e) => e === eventId);
  }

  #eventIsEnabled(eventName: EventType<AdditionalEvents>) {
    return (
      eventName in this.#events &&
      this.#events[eventName]!.state &&
      !this.#canceledEvents.includes(eventName) &&
      Object.keys(this.#events[eventName]!.handlers).length > 0
    );
  }

  #runEvents(
    eventName: EventType<AdditionalEvents>,
    manuallyTriggered = false
  ): LetsRole.EventCallback<EventTarget> {
    return (rawTarget: EventTarget, ...args: unknown[]): void => {
      const [eventId, ...rest] = eventName.split(
        EVENT_SEP
      ) as EventType<AdditionalEvents>[];
      let handlerId: string = rest.join(EVENT_SEP) || DEFAULT_HANDLER_ID;
      if (!this.#eventIsEnabled(eventId)) return;

      const event = this.#events[eventId]!;
      const cmp =
        this.#getTarget?.(rawTarget, event) ||
        (this as EventHolder<RawType, EventHolderEvents>);

      if ("value" in rawTarget) {
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

      let handlers = {} as EventDef["handlers"];
      if (handlerId !== DEFAULT_HANDLER_ID) {
        if (handlerId in event.handlers) {
          handlers = {
            [handlerId]: event.handlers[handlerId],
          };
        }
      } else {
        handlers = { ...event.handlers };
      }
      Object.keys(handlers).some((hId) => {
        const fcn = event.handlers[hId];

        if (!this.#eventIsEnabled(eventId)) {
          return true;
        }

        try {
          //results!.push(
          fcn.apply(this, [cmp, ...args]);
          //  );
        } catch (e) {
          handleError(e as LetsRole.Error, `event ${e} on ${rawTarget.id()}`);
        }

        return false;
      });

      this.#uncancelEvent(eventName);
      //return results;
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
    let handlerId: string = rest.join(EVENT_SEP) || "default";
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
        name: event,
        event,
        delegated,
        subComponent: delegated ? (subComponent as LetsRole.ComponentID) : null,
        state: true,
        handlers: {},
        rawHandler: this.#runEvents(eventName),
      };
      if (this.#isRawEvent(eventId)) {
        const raw = this.raw();
        if ("on" in raw && typeof raw.on === "function") {
          const onArgs: any[] = [eventId];
          if (delegated && !!subComponent) {
            onArgs.push(subComponent);
          }
          onArgs.push(this.#events[eventName]!.rawHandler);
          raw.on.apply(raw, onArgs);
        }
      }
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
    //let eventName: EventType<AdditionalEvents> = event;
    let cmpId: LetsRole.ComponentID | null = null;
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
      if (this.#isRawEvent(eventId)) {
        const raw = this.raw();

        if ("off" in raw && !!raw.off && typeof raw.off === "function") {
          const offArgs: any[] = [eventId];

          if (eventDef.delegated && !!delegateId) {
            offArgs.push(delegateId);
          }

          raw.off.apply(raw, offArgs);
        }
      }

      delete this.#events[eventName];
      this.trigger("eventhandler:removed", event, delegateId);
    }
  }

  trigger(event: EventType<AdditionalEvents>, ...args: unknown[]): void {
    const eventHandler: LetsRole.EventCallback<EventTarget> = this.#runEvents(
      event,
      true
    );
    eventHandler.apply(this, [this.raw(), ...args]);
  }

  transferEvents(rawCmp: LetsRole.Component) {
    for (let eventName in this.#events) {
      const event = this.#events[eventName as EventType<AdditionalEvents>];
      if (event && !event.delegated && this.#isRawEvent(event.event)) {
        // delegated event are automatically transferred
        rawCmp.on(event.event as T_RAW_EVENTS, event.rawHandler);
      }
    }
  }
}

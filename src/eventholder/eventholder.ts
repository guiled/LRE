import { Component, REP_ID_SEP } from "../component";
import { handleError } from "../log/errorhandler";

type EventHandler = (cmp: LetsRole.Component, ...rest: Array<any>) => void;

type EventDef<EventType = LetsRole.EventType> = {
  name: EventType;
  event: EventType;
  delegated: boolean;
  subComponent: LetsRole.ComponentID | null;
  state: boolean;
  handlers: Record<string, EventHandler>;
  rawHandler: EventHandler;
};

type CallbackArguments = Array<any>;
type EventReturn = Array<any> | undefined;

const RAW_EVENTS = ["click", "update", "mouseenter", "mouseleave", "keyup"];
const EVENT_SEP = ':';

type RealEventHandler = (
  rawTarget: LetsRole.Component,
  args: CallbackArguments
) => EventReturn;

export class EventHolder<
  EventType extends string = LetsRole.EventType
> {
  #holder: any;
  #events: Partial<Record<EventType, EventDef<EventType>>> = {};
  #canceledEvents: Array<EventType> = [];
  #lastUpdateEventValue: LetsRole.ComponentValue = null;


  constructor(holder: any) {
    this.#holder = holder;
  }

  #eventIsEnabled(eventName: EventType) {
    return (
      !(eventName in this.#events) ||
      this.#events[eventName]!.state ||
      !this.#canceledEvents.includes(eventName)
    );
  }

  #runEvents(
    component: Component,
    eventName: EventType,
    manuallyTriggered = false
  ): RealEventHandler {
    return (
      ...tmpArgs: [LetsRole.Component, CallbackArguments]
    ): EventReturn | undefined => {
      let rawTarget: LetsRole.Component = tmpArgs[0];
      let args: CallbackArguments = tmpArgs[1];
      if (!this.#eventIsEnabled(eventName)) return;
      if (tmpArgs.length < 2) {
        args = [];
      }
      if (
        !(eventName in this.#events) ||
        !this.#events[eventName] ||
        !Array.isArray(this.#events[eventName]!.handlers) ||
        this.#events[eventName]!.handlers.length === 0
      ) {
        return;
      }
      const event: EventDef<EventType> = this.#events[eventName]!;
      let argsWithComponent: CallbackArguments = [];
      let cmp = null;
      if (event.delegated && rawTarget.index()) {
        cmp = component.find(rawTarget.index() + REP_ID_SEP + rawTarget.id());
      } else if (event.delegated) {
        cmp = component.find(rawTarget.id());
      } else {
        cmp = component;
      }
      if (
        eventName === "update" &&
        !manuallyTriggered &&
        rawTarget.value?.() === this.#lastUpdateEventValue
      ) {
        return;
      }
      this.#lastUpdateEventValue = structuredClone(
        rawTarget.value()
      ) as LetsRole.ComponentValue;
      argsWithComponent.push(cmp);
      argsWithComponent = argsWithComponent.concat(args);
      let results: EventReturn = [];
      Object.keys(event.handlers).some((handlerId) => {
        const fcn = event.handlers[handlerId];

        if (!this.#eventIsEnabled(eventName)) {
          return true;
        }

        try {
          results!.push(fcn.apply(component, argsWithComponent));
        } catch (e) {
          handleError(e as LetsRole.Error, `event ${eventName} on ${rawTarget.id()}`);
        }

        return false;
      });
      this.#uncancelEvent(eventName);
      return results;
    };
  }

  on(
    event: EventType,
    subComponent: LetsRole.ComponentID | EventHandler | null,
    handler?: EventHandler
  ): void {
    const eventParts: EventType[] = event.split(EVENT_SEP) as EventType[];
    let delegated = false;
    let eventName: EventType = event;
    let handlerId: string = eventParts[1] || 'default';

    if (arguments.length === 3) {
      delegated = true;
      eventName = (event + REP_ID_SEP + subComponent) as EventType;
    } else if (arguments.length === 2) {
      handler = subComponent as EventHandler;
      subComponent = null;
    }
    if (
      !(eventName in this.#events) ||
      this.#events[eventName] === void 0 ||
      Object.keys(this.#events[eventName]!.handlers).length === 0
    ) {
      this.#events[eventName] = {
        name: eventName,
        event,
        delegated,
        subComponent: delegated ? (subComponent as LetsRole.ComponentID) : null,
        state: true,
        handlers: {},
        rawHandler: this.#runEvents(this.#holder, eventName),
      };
      if (RAW_EVENTS.includes(event)) {
        if (delegated) {
          // there is a bug in Let's role that prevent adding delegated event on same instance
          this.#holder
            .sheet()
            .raw()
            .get(this.#holder.realId())
            .on(event, subComponent, this.#events[eventName]!.rawHandler);
          lre.trace(`Native event ${event} added to ${this.#holder.realId() + '>' + subComponent}`)
        } else {
          this.#holder.raw().on(event, this.#events[eventName]!.rawHandler);
          lre.trace(`Native event ${event} added to ${this.#holder.realId()}`)
        }
      }
    }
    if (!this.#events[eventName]!.handlers.hasOwnProperty(handlerId!)) {
      this.trigger('eventhandler:added', event, subComponent, handler);
      lre.trace(`Handler added for event ${event} on ${this.#holder.realId() + (subComponent ? '>' + subComponent : '')}. Count : ${cnt}`);
    } else {
      this.trigger('eventhandler:updated', event, subComponent, handler);
      lre.trace(`Handler updated for event ${event} on ${this.#holder.realId() + (subComponent ? '>' + subComponent : '')}. Count : ${cnt}`);
    }
    this.#events[eventName]!.handlers[handlerId] = handler!;
  }

  once(
    event: EventType,
    handlerOrId: LetsRole.ComponentID | EventHandler,
    handler?: EventHandler
  ): void {
    if (arguments.length === 2) {
      const onceHandler: EventHandler = () => {
        this.off(event, handlerOrId as EventHandler);
        this.off(event, onceHandler);
      }
      this.on(event, handlerOrId as EventHandler);
      this.on(event, onceHandler);
    } else {
      const onceHandler: EventHandler = () => {
        this.off(event, handlerOrId, handler);
        this.off(event, handlerOrId, onceHandler);
      }
      this.on(event, handlerOrId, handler);
      this.on(event, handlerOrId, onceHandler);
    }
  }

  // Cancel the next callbacks of an event
  // Cancel happens only "once" per trigger
  cancelEvent(event: EventType) {
    if (!this.#canceledEvents.includes(event)) {
      this.#canceledEvents.push(event);
    }
  }

  #uncancelEvent(event: EventType) {
    const pos = this.#canceledEvents.indexOf(event);
    if (pos !== -1) {
      this.#canceledEvents.splice(pos, 1);
    }
  }

  disableEvent(event: EventType) {
    if (event in this.#events && this.#events[event] !== void 0) {
      this.#events[event]!.state = false;
    }
  }

  enableEvent(event: EventType) {
    if (event in this.#events && this.#events[event] !== void 0) {
      this.#events[event]!.state = true;
    }
  }

  off(
    event: EventType,
    handlerOrId?: LetsRole.ComponentID | EventHandler,
    handler?: EventHandler
  ) {
    let eventName: EventType = event;
    let cmpId: LetsRole.ComponentID | null = null;

    if (
      arguments.length === 3 ||
      (arguments.length === 2 && typeof handlerOrId === "string")
    ) {
      cmpId = handlerOrId as LetsRole.ComponentID;
      eventName = (event + REP_ID_SEP + cmpId) as EventType;
    } else {
      eventName = event;
      if (arguments.length === 2 && typeof handlerOrId !== "string") {
        handler = handlerOrId as EventHandler;
        cmpId = null;
      }
    }

    const eventDef = this.#events[eventName];

    if (!eventDef) {
      return;
    }

    if (!!handler) {
      const idx = eventDef.handlers.indexOf(handler);
      if (idx !== -1) {
        eventDef.handlers.splice(idx, 1);
        lre.trace(`Handler removed for event ${event} on ${this.#holder.realId() + (cmpId ? '>' + cmpId : '')}. Count : ${eventDef.handlers.length}`);
      } else {
        lre.trace(`Handler not removed for event ${event} on ${this.#holder.realId() + (cmpId ? '>' + cmpId : '')} because it has not been added`);
      }
    } else if (handlerOrId !== undefined) {
      lre.trace(`All handlers removed for event ${event} on ${this.#holder.realId() + (cmpId ? '>' + cmpId : '')}`);
      eventDef.handlers = [];
    }

    if (eventDef.handlers.length === 0) {
      if (eventDef.delegated && !!cmpId) {
        lre.trace(`Native event ${event} removed for ${this.#holder.realId() + '>' + cmpId}`)
        this.#holder.raw().off(event, cmpId);
      } else {
        lre.trace(`Native event ${event} removed for ${this.#holder.realId()}`)
        this.#holder.raw().off(event);
      }
    }

  }

  trigger(event: EventType, ...args: unknown[]): EventReturn {
    const eventHandler: RealEventHandler = this.#runEvents(this, event, true);
    return eventHandler(
      this.#holder.raw?.raw?.() || this.#holder,
      args
    );
  }

  transferEvents(rawCmp: LetsRole.Component) {
    each(this.#events, (event: EventDef) => {
      if (!event.delegated) {
        // delegated event are automatically transferred
        rawCmp.on(event.event, event.rawHandler);
      }
    });
  }
}

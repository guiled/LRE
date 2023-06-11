import Component, { REP_ID_SEP } from "../component";

type EventHandler = (cmp: LetsRole.Component, ...rest: Array<any>) => void;

type EventDef<EventType = LetsRole.EventType> = {
  name: EventType;
  event: EventType;
  delegated: boolean;
  subComponent: LetsRole.ComponentID | null;
  state: boolean;
  handlers: Array<EventHandler>;
  rawHandler: EventHandler;
};

type CallbackArguments = Array<any>;
type EventReturn = Array<any> | undefined;

const RAW_EVENTS = ["click", "update", "mouseenter", "mouseleave", "keyup"];

type RealEventHandler = (
  rawTarget: LetsRole.Component,
  args: CallbackArguments
) => EventReturn;

export default class EventHolder<
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
        rawTarget.value() === this.#lastUpdateEventValue
      ) {
        return;
      }
      this.#lastUpdateEventValue = structuredClone(rawTarget.value()) as LetsRole.ComponentValue;
      argsWithComponent.push(cmp);
      argsWithComponent = argsWithComponent.concat(args);
      let results: EventReturn = [];
      event.handlers.some((fcn) => {
        if (!this.#eventIsEnabled(eventName)) {
          return true;
        }
        results!.push(fcn.apply(component, argsWithComponent));
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
    let delegated = false;
    let eventName: EventType = event;
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
      this.#events[eventName]!.handlers.length === 0
    ) {
      this.#events[eventName] = {
        name: eventName,
        event: event,
        delegated: delegated,
        subComponent: delegated ? (subComponent as LetsRole.ComponentID) : null,
        state: true,
        handlers: [],
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
        } else {
          this.#holder.raw().on(event, this.#events[eventName]!.rawHandler);
        }
      }
      if (!this.#events[eventName]!.handlers.includes(handler!)) {
        this.#events[eventName]!.handlers.push(handler!);
      }
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

  off(event: EventType, handler: EventHandler) {
    if (!(event in this.#events)) {
      return;
    }
    const eventDef = this.#events[event]!;
    if (handler !== undefined) {
      const idx = eventDef.handlers.indexOf(handler);
      if (idx !== -1) {
        eventDef.handlers.splice(idx, 1);
      }
    } else {
      eventDef.handlers = [];
    }
    if (eventDef.handlers.length === 0) {
      this.#holder.raw().off(event);
    }
  }

  trigger(event: EventType): EventReturn {
    const eventHandler: RealEventHandler = this.#runEvents(this, event, true);
    return eventHandler(
      this.#holder.raw ? this.#holder.raw() : this.#holder,
      Array.prototype.slice.call(arguments, 1)
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

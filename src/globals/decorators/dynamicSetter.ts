import { EVENT_SEP } from "../../eventholder";

type LogEventDefinition = {
  logType: ProxyModeHandlerLogType;
  event: string;
};

const logEvent: Array<LogEventDefinition> = [
  { logType: "value", event: "update" },
  { logType: "rawValue", event: "update" },
  { logType: "text", event: "update" },
  { logType: "text", event: "update" },
  { logType: "class", event: "class-updated" },
  { logType: "data", event: "data-updated" },
  { logType: "visible", event: "class-updated" },
];

type ComponentAttachedToComponent = Partial<
  Record<ProxyModeHandlerLogType, Array<LetsRole.ComponentID>>
>;

const isDataProvider = (input: any):input is IDataProvider => {
  return input.provider;
}

export const dynamicSetter = function <
  This extends ComponentCommon,
  TValue extends LetsRole.ComponentValue | IDataProvider | LetsRole.Choices,
  Return
>(
  target: (this: This, newValue?: DynamicSetValue<TValue>, data?: IDataProvider) => Return,
  context: ClassMethodDecoratorContext<
    This,
    (this: This, value?: DynamicSetValue<TValue>, data?: IDataProvider) => Return
  >
) {
  const eventLogs: ComponentAttachedToComponent = {};
  function replacementMethod(this: This, newValue?: DynamicSetValue<TValue>): Return {
    if (arguments.length > 0) {
      removeOldEventLogHandlers.call(
        this,
        eventLogs,
        context as ClassMethodDecoratorContext
      );
      if (isDataProvider(newValue)) {
        lre.trace(
          `Add dynamic setter for ${this.realId()} on ${context.name as string}`
        );
        const newSetter = (): any => {
          const valueToSet = loggedCall(newValue.providedValue.bind(newValue));
          const newEventLogs = handleAccessLog.call(this, eventLogs, newSetter);
          Object.assign(eventLogs, newEventLogs);
          return target.call(this, valueToSet, newValue);
        };
        return newSetter();
      } else if (typeof newValue === "function") {
        lre.trace(
          `Add dynamic setter for ${this.realId()} on ${context.name as string}`
        );
        const newSetter = (): any => {
          const valueToSet = loggedCall(newValue);
          const newEventLogs = handleAccessLog.call(this, eventLogs, newSetter);
          Object.assign(eventLogs, newEventLogs);
          return target.call(this, valueToSet);
        };
        return newSetter();
      }
      return target.call(this, newValue);
    }

    return target.call(this);
  }

  return replacementMethod;
};

const removeOldEventLogHandlers = function <This extends ComponentCommon>(
  this: This,
  eventLogs: ComponentAttachedToComponent,
  context: ClassMethodDecoratorContext
) {
  let deleted: boolean = false;
  logEvent.forEach((t) => {
    const eventId = getEventId.call(this, t);
    eventLogs[t.logType]?.forEach((realId) => {
      deleted = true;
      this.sheet().get(realId)?.off(eventId);
    });
    delete eventLogs[t.logType];
  });
  if (deleted) {
    lre.trace(
      `Remove dynamic setter for ${this.realId()} on ${context.name as string}`
    );
  }
};

const getEventId = function <This extends ComponentCommon>(
  this: This,
  def: LogEventDefinition
): EventType {
  return [def.event, def.logType, this.realId()].join(EVENT_SEP);
};

const handleAccessLog = function <This extends ComponentCommon>(
  this: This,
  eventLogs: any,
  newSetter: () => any
) {
  logEvent.forEach((t) => {
    const oldAccessLog: LetsRole.ComponentID[] = eventLogs[t.logType] || [];
    const newAccessLog: LetsRole.ComponentID[] = context
      .getPreviousAccessLog(t.logType)
      .filter((l) => !oldAccessLog.includes(l));

    const eventId = getEventId.call(this, t);
    newAccessLog.forEach((realId) => {
      this.sheet().get(realId)!.on(eventId, newSetter);
    });

    if (newAccessLog.length > 0) {
      eventLogs[t.logType] = [...oldAccessLog, ...newAccessLog];
    }
  });

  return eventLogs;
};

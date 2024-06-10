import { EVENT_SEP } from "../../eventholder";

type LogEventDefinition = {
  logType: ProxyModeHandlerLogType;
  event: string;
};

type ProvidedValue = {
  value: LetsRole.ComponentValue;
  providedBy: IDataProvider;
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

type DynamicArgType = "value" | "provider" | "callback";

type ComponentAttachedToComponent = Partial<
  Record<ProxyModeHandlerLogType, Array<LetsRole.ComponentID>>
>;

const isDataProvider = (input: any): input is IDataProvider => {
  return !!input.provider;
};

const traceDynamicSetter = (
  realId: string,
  context: ClassMethodDecoratorContext<any>
) => {
  lre.trace(`Add dynamic setter for ${realId} on ${context.name as string}`);
};

export const dynamicSetter = function <
  This extends ComponentCommon,
  Return,
  Args extends any[]
>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => Return
  >
) {
  const eventLogs: ComponentAttachedToComponent = {};
  function replacementMethod(this: This, ...args: Args): Return {
    if (arguments.length > 0) {
      removeOldEventLogHandlers.call(
        this,
        eventLogs,
        context as ClassMethodDecoratorContext
      );
      let hasDynamicSetter = false;
      const argTypes: Array<DynamicArgType> = [];

      args.forEach((newValue) => {
        if (isDataProvider(newValue)) {
          argTypes.push("provider");
          hasDynamicSetter = true;
        } else if (typeof newValue === "function") {
          argTypes.push("callback");
          hasDynamicSetter = true;
        } else {
          argTypes.push("value");
        }
      });

      if (hasDynamicSetter) {
        traceDynamicSetter(this.realId(), context);
        const newSetter = (): any => {
          const argsForTarget: Args = [] as unknown as Args;
          argTypes.forEach((t, i) => {
            const newValue = args[i];
            if (t === "provider") {
              argsForTarget.push({
                value: loggedCall(newValue.providedValue.bind(newValue)),
                providedBy: newValue,
              });
            } else if (t === "callback") {
              argsForTarget.push(loggedCall(newValue));
            } else {
              argsForTarget.push(args[i]);
            }
            const newEventLogs = handleAccessLog.call(
              this,
              eventLogs,
              newSetter
            );
            Object.assign(eventLogs, newEventLogs);
          });

          return target.apply(this, argsForTarget);
        };
        return newSetter();
      }
      return target.apply(this, args);
    }

    return target.apply(this);
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

export const getDataProvidersFromArgs = function <T extends Array<any>>(
  args: IArguments
): [T, Array<IDataProvider | undefined>] {
  const values: T = [] as unknown as T;
  const dataProviders: Array<IDataProvider | undefined> = [];

  Array.from(args).forEach((arg: unknown) => {
    if (isProvidedValue(arg)) {
      values.push(arg.value);
      dataProviders.push(arg.providedBy);
    } else {
      values.push(arg);
      dataProviders.push(undefined);
    }
  });

  return [values, dataProviders];
};

const isProvidedValue = (input: any): input is ProvidedValue => {
  return !!input.providedBy;
};

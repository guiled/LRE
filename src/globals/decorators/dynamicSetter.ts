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

type DynamicArgType = "value" | "provider" | "callback" | "component";

type ComponentAttachedToComponent = Partial<
  Record<ProxyModeHandlerLogType, Array<LetsRole.ComponentID>>
>;

const isDataProvider = (input: any): input is IDataProvider => {
  return !!input.provider;
};

const isComponent = (input: any): input is ComponentCommon => {
  return !!input.component;
};

const traceDynamicSetter = (
  realId: string,
  context: ClassMethodDecoratorContext<any>
) => {
  lre.trace(`Add dynamic setter for ${realId} on ${context.name as string}`);
};

export const extractDataProviders = function <
  This extends ComponentCommon,
  Return,
  Args extends any[]
>(...callbacks: Array<(...args: any[]) => any>) {
  return function (
    target: (this: This, ...args: Args) => Return,
    _context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: Args) => Return
    >
  ) {
    const replacementMethod = function (this: This, ...args: Args): Return {
      const dataProviders = getDataProvidersFromArgs<Array<unknown>>(args);
      const newArgs: Args = [] as unknown as Args;
      dataProviders[0].forEach((value, index) => {
        newArgs.push(value);
        if (!!dataProviders[1][index] && callbacks?.[index]) {
          callbacks[index].call?.(this, dataProviders[1][index]);
        }
      });
      return target.apply(this, newArgs);
    };
    return replacementMethod;
  };
};

export const flaggedDynamicSetter = function <
  This extends ComponentCommon,
  Return,
  Args extends any[]
>(
  argFlags: Array<Boolean> = []
): (
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<
    This,
    (this: This, ...args: Args) => Return
  >
) => any {
  return function (
    target: (this: This, ...args: Args) => Return,
    context: ClassMethodDecoratorContext<
      This,
      (this: This, ...args: Args) => Return
    >
  ) {
    const eventLogs: ComponentAttachedToComponent = {};
    const replacementMethod = function (this: This, ...args: Args): Return {
      if (arguments.length > 0) {
        removeOldEventLogHandlers.call(
          this,
          eventLogs,
          context as ClassMethodDecoratorContext
        );
        let hasDynamicSetter = false;
        const argTypes: Array<DynamicArgType> = [];

        args.forEach((newValue, idx) => {
          if (argFlags[idx] === false) {
            argTypes.push("value");
          } else if (isDataProvider(newValue)) {
            argTypes.push("provider");
            hasDynamicSetter = true;
          } else if (isComponent(newValue)) {
            argTypes.push("component");
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
              } else if (t === "component") {
                argsForTarget.push({
                  value: loggedCall(newValue.value.bind(newValue)),
                  providedBy:
                    newValue.valueProvider() || newValue.dataProvider(),
                });
                //argsForTarget.push(loggedCall(newValue.value.bind(newValue)));
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
    };

    return replacementMethod;
  };
};

export const dynamicSetter = flaggedDynamicSetter();

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
  args: IArguments | Array<any>
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

import { EVENT_SEP } from "../eventholder";

type DynamicSetterHolder = {
  realId(): string;
  getChangeTracker(): ChangeTracker;
};

type FunctionDecorator<
  This extends DynamicSetterHolder,
  Args extends any[],
  Return,
> = (
  target: (this: This, ...args: Args) => Return,
  context: DecoratorContext<This, Args, Return>,
) => any;

type DecoratorContext<This, Args extends any[], Return> =
  | ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
  | { name: string };

type DynamicArgType = "value" | "provider" | "callback" | "component";

type AnalyzedArgValue = [unknown, IDataProvider | undefined];

type ArgType =
  | {
      arg: unknown;
      type: "value";
    }
  | {
      arg: IDataProvider;
      type: "provider";
    }
  | {
      arg: IComponent;
      type: "component";
    }
  | {
      arg: Callback;
      type: "callback";
    };

const LOG_TYPE_EVENTS: Partial<Record<ProxyModeHandlerLogType, EventType>> = {
  value: "update",
  rawValue: "update",
  text: "update",
  class: "class-updated",
  data: "data-updated",
  visible: "class-updated",
};

export class ChangeTracker {
  #holder: DynamicSetterHolder;
  #context: ProxyModeHandler;
  #logs: Record<string, Partial<ContextLog>> = {};
  #isTracking: Record<string, boolean> = {};

  constructor(holder: DynamicSetterHolder, context: ProxyModeHandler) {
    this.#holder = holder;
    this.#context = context;
  }

  // static linkValueCallbackLogToTarget<Return>(
  //   cb: Callback<Return>,
  //   target: Callback,
  //   decoratorContextName: string,
  // ): Return {
  //   return ChangeTracker.linkParams()
  //     .call(this, target, {
  //       name: decoratorContextName,
  //     })
  //     .call(this, cb);
  // }

  static linkParams<
    This extends DynamicSetterHolder,
    Return,
    Args extends any[],
  >(
    argFlags: Array<boolean> = [],
    providerExtractors: Array<(dp: IDataProvider | undefined) => void> = [],
  ): FunctionDecorator<This, Args, Return> {
    return function (
      target: (this: This, ...args: Args) => Return,
      decoratorContext: DecoratorContext<This, Args, Return>,
    ) {
      const replacementMethod = function (this: This, ...args: Args): Return {
        if (arguments.length > 0) {
          const name: string = decoratorContext.name as string;
          const analyzedArgs: ArgType[] = args.map((arg, i) => {
            return ChangeTracker.analyzeArg(arg, argFlags[i]);
          });
          const hasDynamicSetter = analyzedArgs.some(
            (argType) => argType.type !== "value",
          );

          if (hasDynamicSetter) {
            LRE_DEBUG &&
              lre.trace(`Call ${this.realId()}:${name} with dynamic args`);

            const newSetter = (): any => {
              const tracker = this.getChangeTracker();
              const wasAlreadyTracking = tracker.isTracking(name);
              tracker.startTracking(name);
              const argValues =
                ChangeTracker.getAnalyzedArgValues(analyzedArgs);

              if (!wasAlreadyTracking) {
                this.getChangeTracker().handleChangeLinks(name, newSetter);
              }

              const values: Args = [] as unknown as Args;
              argValues.forEach(([value, provider], idx) => {
                values.push(value);
                providerExtractors[idx]?.call?.(this, provider);
              });

              const result = target.apply(this, values);
              tracker.stopTracking(name);

              return result;
            };

            return newSetter();
          } else if (!this.getChangeTracker().isTracking(name)) {
            this.getChangeTracker().handleChangeLinks(name);
            providerExtractors.forEach((extractor) =>
              extractor.call(this, undefined),
            );
          }

          return target.apply(this, args);
        }

        return target.apply(this);
      };

      return replacementMethod;
    };
  }

  handleChangeLinks(name: string, setter?: () => any): void {
    const newLogs: Partial<ContextLog> = this.#context.getLastLog();

    if (setter) {
      const logTypes: Array<ProxyModeHandlerLogType> = Object.keys(
        newLogs,
      ) as Array<ProxyModeHandlerLogType>;
      logTypes.forEach((type) => {
        const logs = newLogs[type] || [];
        const previousLogs = this.#logs[name]?.[type] ?? [];
        const hasPreviousLog: boolean = previousLogs.length > 0;
        let hasDeletedPreviousLogs: boolean = false;

        logs.forEach((log) => {
          const idx = hasPreviousLog
            ? ChangeTracker.findLogIndex(log, previousLogs)
            : -1;

          if (idx === -1) {
            this.#createEvent(type, name, log, setter);
          } else if (hasPreviousLog) {
            hasDeletedPreviousLogs = true;
            previousLogs.splice(idx, 1);
          }
        });

        if (hasDeletedPreviousLogs && previousLogs.length === 0) {
          delete this.#logs[name];
        }
      });
    }

    if (this.#logs[name]) {
      this.#destroyAllEvents(this.#logs[name], name);
    }

    this.#logs[name] = newLogs;
  }

  startTracking(name: string): void {
    this.#isTracking[name] = true;
  }

  stopTracking(name: string): void {
    delete this.#isTracking[name];
  }

  isTracking(name: string): boolean {
    return !!this.#isTracking[name];
  }

  static findLogIndex(
    log: ContextLogRecord,
    logs: Array<ContextLogRecord>,
  ): number {
    return logs.findIndex((l: ContextLogRecord) => {
      if (Array.isArray(l) && Array.isArray(log)) {
        return l[0] === log[0] && l[1] === log[1];
      } else if (!Array.isArray(l) && !Array.isArray(log)) {
        return l.realId() === log.realId();
      }

      return false;
    });
  }

  static getArgValue(
    arg: unknown,
    canBeDynamic: boolean = true,
    mustTrack: boolean = true,
  ): [unknown, IDataProvider | undefined] {
    const analyzedArgs = ChangeTracker.analyzeArg(arg, canBeDynamic);

    return ChangeTracker.getAnalyzedArgValues([analyzedArgs], mustTrack)[0];
  }

  static analyzeArg(arg: unknown, canBeDynamic: boolean = true): ArgType {
    let type: DynamicArgType = "value";

    if (canBeDynamic && typeof arg !== "undefined") {
      if (lre.isDataProvider(arg)) {
        type = "provider";
      } else if (lre.isComponent(arg)) {
        type = "component";
      } else if (typeof arg === "function") {
        type = "callback";
      }
    }

    return { arg, type } as ArgType;
  }

  static getAnalyzedArgValues(
    args: Array<ArgType>,
    mustTrack: boolean = true,
  ): Array<AnalyzedArgValue> {
    if (mustTrack) {
      const contextCallResult = context.call(true, () =>
        args.map((arg): AnalyzedArgValue => {
          if (arg.type === "value") {
            return [arg.arg, undefined];
          }

          return ChangeTracker.getAnalyzedArgValue(arg);
        }),
      );

      return contextCallResult[0];
    }

    return args.map(ChangeTracker.getAnalyzedArgValue);
  }

  static getAnalyzedArgValue({ arg, type }: ArgType): AnalyzedArgValue {
    let res: ArgType["arg"];
    let providedBy: IDataProvider | undefined = undefined;

    if (type === "provider") {
      res = arg.providedValue();
      providedBy = arg;
    } else if (type === "callback") {
      res = arg();
    } else if (type === "component") {
      res = arg.value();
      providedBy = arg.valueProvider() || arg.dataProvider();
    } else {
      res = arg;
    }

    return [res, providedBy];
  }

  #createEvent(
    typeLog: ProxyModeHandlerLogType,
    methodName: string,
    logData: ContextLogRecord,
    setter: () => any,
  ): void {
    this.#manageEventLog(true, typeLog, methodName, logData, setter);
  }

  #destroyAllEvents(
    contextLogs: Partial<ContextLog>,
    methodName: string,
  ): void {
    const logTypes = Object.keys(contextLogs) as Array<ProxyModeHandlerLogType>;
    logTypes.forEach((type) => {
      const logs = contextLogs[type] || [];
      logs.forEach((log) => {
        this.#destroyEvent(type, methodName, log);
      });
    });
  }

  #destroyEvent(
    typeLog: ProxyModeHandlerLogType,
    methodName: string,
    logData: ContextLogRecord,
  ): void {
    this.#manageEventLog(false, typeLog, methodName, logData);
  }

  #manageEventLog(
    create: boolean,
    typeLog: ProxyModeHandlerLogType,
    methodName: string,
    logData: ContextLogRecord,
    setter?: () => any,
  ): void {
    if (lre.isDataProvider(logData)) {
      const refreshId = this.#holder.realId() + "-" + methodName;

      if (create) {
        logData.subscribeRefresh(refreshId, setter!);
      } else {
        logData.unsubscribeRefresh(refreshId);
      }
    } else {
      const eventId = this.#getEventId(typeLog, methodName);

      if (Array.isArray(logData)) {
        const [sheetRealID, realId] = logData;
        const sheet = lre.sheets.get(sheetRealID);
        const cmp = sheet.get(realId);

        if (create) {
          cmp?.on(eventId, setter);
        } else {
          cmp?.off(eventId);
        }
      } else if (lre.isComponent(logData)) {
        if (create) {
          logData.on(eventId, setter);
        } else {
          logData.off(eventId);
        }
      } else {
        lre.error("Invalid log data " + typeof logData);
      }
    }
  }

  #getEventId(
    logType: ProxyModeHandlerLogType,
    methodName: string,
  ): EventType<EventHolderDefaultEvents> {
    return [
      LOG_TYPE_EVENTS[logType],
      logType,
      this.#holder.realId(),
      methodName,
    ].join(EVENT_SEP) as EventType<EventHolderDefaultEvents>;
  }
}

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

  constructor(holder: DynamicSetterHolder, context: ProxyModeHandler) {
    this.#holder = holder;
    this.#context = context;
  }

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
          let hasDynamicSetter = false;
          const argTypes: Array<DynamicArgType> = [];

          args.forEach((newValue, idx) => {
            if (argFlags[idx] === false) {
              argTypes.push("value");
            } else if (typeof newValue === "undefined") {
              argTypes.push("value");
            } else if (lre.isDataProvider(newValue)) {
              argTypes.push("provider");
              hasDynamicSetter = true;
            } else if (lre.isComponent(newValue)) {
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
            LRE_DEBUG &&
              lre.trace(`Add dynamic setter for ${this.realId()} on ${name}`);

            const newSetter = (): any => {
              const argsForTarget: Args = [] as unknown as Args;
              argTypes.forEach((t, i) => {
                const newValue = args[i];
                let res: ReturnType<ProxyModeHandler["call"]>;
                let providedBy: IDataProvider | undefined = undefined;

                if (t === "provider") {
                  res = context.call(
                    true,
                    newValue.providedValue.bind(newValue),
                  );
                  providedBy = newValue;
                } else if (t === "callback") {
                  res = context.call(true, newValue);
                } else if (t === "component") {
                  res = context.call(true, newValue.value.bind(newValue));
                  providedBy =
                    newValue.valueProvider() || newValue.dataProvider();
                } else {
                  res = [args[i], {}];
                }

                argsForTarget.push({
                  value: res[0],
                  providedBy,
                });
              });
              this.getChangeTracker().handleChangeLinks(name, newSetter);

              const values: Args = [] as unknown as Args;
              argsForTarget.forEach((arg, idx) => {
                values.push(arg.value);
                providerExtractors[idx]?.call?.(this, arg.providedBy);
              });

              return target.apply(this, values);
            };

            return newSetter();
          } else {
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
        const hasPreviousLog: boolean = !!this.#logs[name]?.[type];
        const previousLogs = this.#logs[name]?.[type] ?? [];
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
          delete this.#logs[type];
        }
      });
    }

    if (this.#logs[name]) {
      this.#destroyAllEvents(this.#logs[name], name);
    }

    this.#logs[name] = newLogs;
  }

  static findLogIndex(
    log: ContextLogRecord,
    logs: Array<ContextLogRecord>,
  ): number {
    return logs.findIndex((l: ContextLogRecord) => {
      if (Array.isArray(l) && Array.isArray(log)) {
        return l[0] === log[0] && l[1] === log[1];
      } else {
        return l === log;
      }
    });
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

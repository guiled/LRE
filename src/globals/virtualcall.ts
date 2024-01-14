import { EVENT_SEP } from "../eventholder";

export const loggedCall = <T extends any>(cb: () => T): T => {
  context.resetAccessLog();

  const result: T = cb();

  context.resetAccessLog();

  return result;
};

export const virtualCall = <T extends any>(cb: () => T): T => {
  context.setMode("virtual");

  const backup = {
    init,
    initRoll,
    getReferences,
    getBarAttributes,
    getCriticalHits,
    dropDice,
    drop,
    roll: Dice.roll,
  };
  Dice.roll = () => {};
  let result!: T;

  try {
    result = loggedCall(cb);
  } catch (e) {
    lre.error("[VC] Unhandled error : " + e);
  }

  init = backup.init;
  initRoll = backup.initRoll;
  getReferences = backup.getReferences;
  getBarAttributes = backup.getBarAttributes;
  getCriticalHits = backup.getCriticalHits;
  dropDice = backup.dropDice;
  drop = backup.drop;
  Dice.roll = backup.roll;

  context.setMode("real");
  return result;
};

const logEvent: Array<{
  logType: ProxyModeHandlerLogType;
  event: string;
}> = [
  { logType: "value", event: "update" },
  { logType: "rawValue", event: "update" },
  { logType: "text", event: "update" },
  { logType: "text", event: "update" },
  { logType: "class", event: "class-updated" },
  { logType: "data", event: "data-updated" },
  { logType: "visible", event: "class-updated" },
];

export const dynamicSetter = function <
  This extends ComponentCommon,
  TValue extends LetsRole.ComponentValue | (() => LetsRole.ComponentValue),
  Return
>(
  target: (this: This, newValue?: TValue) => Return,
  _context: ClassMethodDecoratorContext<
    This,
    (this: This, value?: TValue) => Return
  >
) {
  const eventLogs = {};
  function replacementMethod(this: This, newValue?: TValue): Return {
    if (arguments.length > 0) {
      if (typeof newValue === "function") {
        lre.trace(`Add dynamic setter for ${this.realId()} on ${(_context.name as string)}`);
        const newSetter = (): any => {
          const valueToSet = loggedCall(newValue as () => TValue);
          const newEventLogs = handleAccessLog.call(
            this,
            eventLogs,
            newSetter
          );
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

    newAccessLog.forEach((id) => {
      const eventIdParts = [t.event, t.logType, this.realId()];
      this.sheet()
        .get(id)!
        .on(eventIdParts.join(EVENT_SEP) as EventType<"update">, newSetter);
    });
    eventLogs[t.logType] = [...oldAccessLog, ...newAccessLog];
  });

  return eventLogs;
};

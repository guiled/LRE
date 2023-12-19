export const loggedCall = <T extends any>(cb: () => T): T => {
  context.resetAccessLog();

  const result: T = cb();

  context.resetAccessLog();

  return result;
}

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

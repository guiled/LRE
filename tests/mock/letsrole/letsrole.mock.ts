import { newMockedWait } from "./wait.mock";

const { wait, itHasWaitedEnough, itHasWaitedEverything } = newMockedWait();

const rollBuilderMock = {
  roll: jest.fn(),
  expression: jest.fn(),
  title: jest.fn(),
  visibility: jest.fn(),
  addAction: jest.fn(),
  removeAction: jest.fn(),
  onRoll: jest.fn(),
};

const Bindings = {
  add: jest.fn(),
  clear: jest.fn(),
  remove: jest.fn(),
  send: jest.fn(),
};

const RollBuilderClass = class {
  roll = rollBuilderMock.roll;
  expression = rollBuilderMock.expression;
  title = rollBuilderMock.title;
  visibility = rollBuilderMock.visibility;
  addAction = rollBuilderMock.addAction;
  removeAction = rollBuilderMock.removeAction;
  onRoll = rollBuilderMock.onRoll;
};

const Tables = {
  get: jest.fn((_id: string) => ({
    each: jest.fn(),
    get: jest.fn(),
    random: jest.fn(),
  })),
};

const initLetsRole = () => {
  global.each = jest.fn((obj: any, cb) => {
    for (let k in obj) {
      cb(obj[k], k);
    }
  });

  global.wait = wait;

  global.Bindings = Bindings;

  /* @ts-ignore */
  global.RollBuilder = RollBuilderClass;

  global.Tables = Tables;
};

export {
  initLetsRole,
  itHasWaitedEnough,
  itHasWaitedEverything,
  rollBuilderMock,
  RollBuilderClass,
  Bindings,
  Tables,
};

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

const initLetsRole = () => {
  global.each = jest.fn((obj: any, cb) => {
    for (let k in obj) {
      cb(obj[k], k);
    }
  });

  global.wait = wait;

  global.Bindings = {
    add: jest.fn(),
    clear: jest.fn(),
    remove: jest.fn(),
    send: jest.fn(),
  } as LetsRole.Bindings;

  /* @ts-ignore */
  global.RollBuilder = class {
    roll = rollBuilderMock.roll;
    expression = rollBuilderMock.expression;
    title = rollBuilderMock.title;
    visibility = rollBuilderMock.visibility;
    addAction = rollBuilderMock.addAction;
    removeAction = rollBuilderMock.removeAction;
    onRoll = rollBuilderMock.onRoll;
  };
};

export {
  initLetsRole,
  itHasWaitedEnough,
  itHasWaitedEverything,
  rollBuilderMock,
};

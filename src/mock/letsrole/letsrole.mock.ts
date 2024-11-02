import { loggedCall, virtualCall } from "../../globals/virtualcall";
import { ServerMock } from "./server.mock";
import { modeHandlerMock } from "../../../tests/mock/modeHandler.mock";
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

const initLetsRole = (server: ServerMock) => {
  global.each = jest.fn((obj: any, cb) => {
    for (let k in obj) {
      cb(obj[k], k);
    }
  });

  global.wait = wait;

  global.Bindings = Bindings;

  /* @ts-ignore */
  global.RollBuilder = RollBuilderClass;

  global.Tables = server.getMockOfTables();
  global.loggedCall = loggedCall;
  global.virtualCall = virtualCall;
  global.context = modeHandlerMock;
};

export {
  initLetsRole,
  itHasWaitedEnough,
  itHasWaitedEverything,
  rollBuilderMock,
  RollBuilderClass,
  Bindings,
};

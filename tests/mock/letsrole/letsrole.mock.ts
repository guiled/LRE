import { loggedCall, virtualCall } from "../../../src/globals/virtualcall";
import { modeHandlerMock } from "../modeHandler.mock";
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

const tables: Record<string, Array<LetsRole.TableRow>> = {};

const Tables: LetsRole.Tables = {
  get: jest.fn((_id: string) => ({
    each: jest.fn((cb: (row: LetsRole.TableRow, id: string) => void) => {
      tables[_id]?.forEach((r) => cb(r, r.id));
    }),
    get: jest.fn((id: string) => tables[_id]?.find((r) => r.id === id) || null),
    random: jest.fn(
      (
        countOrCb: number | ((row: LetsRole.TableRow) => void),
        cb?: (row: LetsRole.TableRow) => void
      ) => {
        if (!cb) {
          cb = countOrCb as (row: LetsRole.TableRow) => void;
          countOrCb = 1;
        } else {
          countOrCb = parseInt(countOrCb as any);
        }
        const rows = [];
        for (let i = 0; i < countOrCb; i++) {
          rows.push(
            tables[_id].splice(
              Math.floor(Math.random() * tables[_id].length),
              1
            )
          );
        }
      }
    ),
  })),
};

const defineTable = (name: string, defs: Array<LetsRole.TableRow>) => {
  tables[name] = defs;
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
  Tables,
  defineTable,
};

import { newMockedWait } from "./wait.mock";

const { wait, itHasWaitedEnough, itHasWaitedEverything } = newMockedWait();

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
};

export { initLetsRole, itHasWaitedEnough, itHasWaitedEverything };

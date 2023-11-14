import { newMockedWait } from "./wait.mock";

const { wait, itHasWaitedEnough, itHasWaitedEverything } = newMockedWait();

const initLetsRole = () => {
  global.each = jest.fn((obj: any, cb) => {
    for (let k in obj) {
      cb(obj[k], k);
    }
  });

  global.wait = wait;
};

export { initLetsRole, itHasWaitedEnough, itHasWaitedEverything };

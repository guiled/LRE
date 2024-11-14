type WaitedCallback = (...args: any[]) => any;

type MockedWait = {
  wait: jest.Mock;
  itHasWaitedEnough: () => void;
  itHasWaitedEverything: () => void;
};

const newMockedWait = (): MockedWait => {
  const waitedCallbacks: Array<WaitedCallback> = [];

  const itHasWaitedEnough = (): void => {
    const cb = waitedCallbacks.shift();

    if (cb) {
      cb();
    }
  };

  return {
    wait: jest.fn((_delay: number, cb: WaitedCallback) => {
      waitedCallbacks.push(cb);
    }),
    itHasWaitedEnough,
    itHasWaitedEverything: () => {
      while (waitedCallbacks.length > 0) {
        itHasWaitedEnough();
      }
    },
  };
};

export { newMockedWait };

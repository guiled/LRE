type WaitedCallback = (...args: any[]) => any;

const newMockedWait = () => {
  let waitedCallbacks: Array<WaitedCallback> = [];

  const itHasWaitedEnough = () => {
    const cb = waitedCallbacks.shift();

    if (cb) {
      cb();
    }
  };

  return {
    wait: (_delay: number, cb: WaitedCallback) => {
      waitedCallbacks.push(cb);
    },
    itHasWaitedEnough,
    itHasWaitedEverything: () => {
      while (waitedCallbacks.length > 0) {
        itHasWaitedEnough();
      }
    },
  };
};

export { newMockedWait };

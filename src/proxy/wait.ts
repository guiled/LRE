export const registerLreWait = (
  modeHandler: ProxyModeHandler,
  originalWait: typeof wait,
): typeof wait => {
  return (delay: number, callback: (...args: any[]) => void) => {
    if (modeHandler.getMode() !== "virtual") {
      originalWait(delay, function () {
        LRE_DEBUG && lre.push(`Waited for ${delay}ms`);

        try {
          callback();
        } catch (e) {
          lre.error(`[Wait] Unhandled error : ${e}`);
        }

        LRE_DEBUG && lre.pop();
      });
    }
  };
};

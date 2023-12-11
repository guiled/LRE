
export const registerLreWait = (modeHandler: ProxyModeHandler, originalWait: typeof wait): typeof wait => {
    return (delay: number, callback: (...args: any[]) => void) => {
        if (modeHandler.getMode() === "real") {
            originalWait(delay, callback);
        }
    };
}

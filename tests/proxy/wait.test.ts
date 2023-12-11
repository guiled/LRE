import { registerLreWait } from "../../src/proxy/wait";
import { newMockedWait } from "../mock/letsrole/wait.mock";

const mockedWaitDefs = newMockedWait();
global.wait = mockedWaitDefs.wait;

describe("Wait proxy", () => {
  let cb: () => void;
  let mode: ProxyMode = "real";
  let modeHandler: ProxyModeHandler;

  beforeEach(() => {
    cb = jest.fn();
    modeHandler = {
      getMode: () => mode,
      setMode: (newMode: ProxyMode) => (mode = newMode),
    };
  });

  test("runs normally in real mode", () => {
    modeHandler.setMode("real");
    const subject = registerLreWait(modeHandler, wait);
    expect(wait).not.toBeCalled();
    subject(100, cb);
    expect(cb).not.toBeCalled();
    expect(wait).toBeCalled();
    mockedWaitDefs.itHasWaitedEverything();
    expect(cb).toBeCalled();
  });

  test("wait is not called in real mode", () => {
    modeHandler.setMode("virtual");
    const subject = registerLreWait(modeHandler, wait);
    expect(wait).not.toBeCalled();
    subject(100, cb);
    expect(cb).not.toBeCalled();
    expect(wait).not.toBeCalled();
    mockedWaitDefs.itHasWaitedEverything();
    expect(cb).not.toBeCalled();
  });
});

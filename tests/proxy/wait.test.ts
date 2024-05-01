import { registerLreWait } from "../../src/proxy/wait";
import { newMockedWait } from "../mock/letsrole/wait.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

const mockedWaitDefs = newMockedWait();
global.wait = mockedWaitDefs.wait;

describe("Wait proxy", () => {
  let cb: () => void;

  beforeEach(() => {
    cb = jest.fn();
    modeHandlerMock.setMode("real")
  });

  test("runs normally in real mode", () => {
    modeHandlerMock.setMode("real");
    const subject = registerLreWait(modeHandlerMock, wait);
    expect(wait).not.toHaveBeenCalled();
    subject(100, cb);
    expect(cb).not.toHaveBeenCalled();
    expect(wait).toHaveBeenCalled();
    mockedWaitDefs.itHasWaitedEverything();
    expect(cb).toHaveBeenCalled();
  });

  test("wait is not called in real mode", () => {
    modeHandlerMock.setMode("virtual");
    const subject = registerLreWait(modeHandlerMock, wait);
    expect(wait).not.toHaveBeenCalled();
    subject(100, cb);
    expect(cb).not.toHaveBeenCalled();
    expect(wait).not.toHaveBeenCalled();
    mockedWaitDefs.itHasWaitedEverything();
    expect(cb).not.toHaveBeenCalled();
  });
});

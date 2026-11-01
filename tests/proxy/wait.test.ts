import { registerLreWait } from "../../src/proxy/wait";
import { newMockedWait } from "../../src/mock/letsrole/wait.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";
import { LRE } from "../../src/lre";

const context = modeHandlerMock();
const mockedWaitDefs = newMockedWait();
global.wait = mockedWaitDefs.wait;

describe("Wait proxy", () => {
  let cb: () => void;

  beforeEach(() => {
    cb = vi.fn();
    context.setMode("real");
    global.lre = new LRE(context);
  });

  test("runs normally in real mode", () => {
    context.setMode("real");
    const subject = registerLreWait(context, wait);

    expect(wait).not.toHaveBeenCalled();

    subject(100, cb);

    expect(cb).not.toHaveBeenCalled();
    expect(wait).toHaveBeenCalled();

    mockedWaitDefs.itHasWaitedEverything();

    expect(cb).toHaveBeenCalled();
  });

  test("wait is not called in real mode", () => {
    context.setMode("virtual");
    const subject = registerLreWait(context, wait);

    expect(wait).not.toHaveBeenCalled();

    subject(100, cb);

    expect(cb).not.toHaveBeenCalled();
    expect(wait).not.toHaveBeenCalled();

    mockedWaitDefs.itHasWaitedEverything();

    expect(cb).not.toHaveBeenCalled();
  });

  test("logs unhandled callback errors via lre.error", () => {
    vi.spyOn(lre, "error");
    const err = new Error("wait callback failed");
    const throwingCb = vi.fn(() => {
      throw err;
    });
    const subject = registerLreWait(context, wait);

    subject(100, throwingCb);

    expect(lre.error).not.toHaveBeenCalled();

    mockedWaitDefs.itHasWaitedEverything();

    expect(throwingCb).toHaveBeenCalled();
    expect(lre.error).toHaveBeenCalledWith(
      `[Wait] Unhandled error : ${err}`,
    );
  });
});

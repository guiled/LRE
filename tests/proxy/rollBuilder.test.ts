import { registerLreRollBuilder } from "../../src/proxy/rollBuilder";
import { initLetsRole, rollBuilderMock } from "../mock/letsrole/letsrole.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

describe("RollBuilder proxy", () => {
  let subject: typeof RollBuilder;
  let sheet: LetsRole.Sheet;
  beforeEach(() => {
    initLetsRole();
    subject = registerLreRollBuilder(modeHandlerMock, RollBuilder);
    sheet = MockSheet({ id: "main" });
  });

  test("works in real", () => {
    const rb = new subject(sheet);
    expect(rb).not.toBe(RollBuilder);
    expect(rb.title("title")).toBe(rb);
    expect(rb.visibility("visible")).toBe(rb);
    expect(rb.expression("2d6")).toBe(rb);
    expect(rb.addAction("action1", () => {})).toBe(rb);
    expect(rb.removeAction("action1")).toBe(rb);
    expect(rb.onRoll(() => {})).toBe(rb);
    expect(rb.roll()).toBeUndefined();
    expect(rollBuilderMock.title).toHaveBeenCalled();
    expect(rollBuilderMock.visibility).toHaveBeenCalled();
    expect(rollBuilderMock.expression).toHaveBeenCalled();
    expect(rollBuilderMock.addAction).toHaveBeenCalled();
    expect(rollBuilderMock.removeAction).toHaveBeenCalled();
    expect(rollBuilderMock.onRoll).toHaveBeenCalled();
    expect(rollBuilderMock.roll).toHaveBeenCalled();
  });
  test("works in virtual", () => {
    modeHandlerMock.setMode("virtual");
    const rb = new subject(sheet);
    expect(rb).not.toBe(RollBuilder);
    expect(rb.title("title")).toBe(rb);
    expect(rb.visibility("visible")).toBe(rb);
    expect(rb.expression("2d6")).toBe(rb);
    expect(rb.addAction("action1", () => {})).toBe(rb);
    expect(rb.removeAction("action1")).toBe(rb);
    expect(rb.onRoll(() => {})).toBe(rb);
    expect(rb.roll()).toBeUndefined();
    expect(rollBuilderMock.title).toHaveBeenCalled();
    expect(rollBuilderMock.visibility).toHaveBeenCalled();
    expect(rollBuilderMock.expression).toHaveBeenCalled();
    expect(rollBuilderMock.addAction).toHaveBeenCalled();
    expect(rollBuilderMock.removeAction).toHaveBeenCalled();
    expect(rollBuilderMock.onRoll).toHaveBeenCalled();
    expect(rollBuilderMock.roll).not.toHaveBeenCalled();
  });
});

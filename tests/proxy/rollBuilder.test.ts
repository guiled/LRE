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
    expect(rollBuilderMock.title).toBeCalled();
    expect(rollBuilderMock.visibility).toBeCalled();
    expect(rollBuilderMock.expression).toBeCalled();
    expect(rollBuilderMock.addAction).toBeCalled();
    expect(rollBuilderMock.removeAction).toBeCalled();
    expect(rollBuilderMock.onRoll).toBeCalled();
    expect(rollBuilderMock.roll).toBeCalled();
  });
  test("works in virtual", () => {
    modeHandlerMock.setMode("virtual")
    const rb = new subject(sheet);
    expect(rb).not.toBe(RollBuilder);
    expect(rb.title("title")).toBe(rb);
    expect(rb.visibility("visible")).toBe(rb);
    expect(rb.expression("2d6")).toBe(rb);
    expect(rb.addAction("action1", () => {})).toBe(rb);
    expect(rb.removeAction("action1")).toBe(rb);
    expect(rb.onRoll(() => {})).toBe(rb);
    expect(rb.roll()).toBeUndefined();
    expect(rollBuilderMock.title).toBeCalled();
    expect(rollBuilderMock.visibility).toBeCalled();
    expect(rollBuilderMock.expression).toBeCalled();
    expect(rollBuilderMock.addAction).toBeCalled();
    expect(rollBuilderMock.removeAction).toBeCalled();
    expect(rollBuilderMock.onRoll).toBeCalled();
    expect(rollBuilderMock.roll).not.toBeCalled();
  });
});

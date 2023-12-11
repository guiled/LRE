import { registerLreBindings } from "../../src/proxy/bindings";
import { initLetsRole } from "../mock/letsrole/letsrole.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

describe("Bindings proxy", () => {
  let subject: LetsRole.Bindings;
  beforeEach(() => {
    initLetsRole();
    subject = registerLreBindings(modeHandlerMock, Bindings);
    (Bindings.add as jest.Mock).mockClear();
    (Bindings.clear as jest.Mock).mockClear();
    (Bindings.remove as jest.Mock).mockClear();
    (Bindings.send as jest.Mock).mockClear();
  });
  test("works in real", () => {
    expect(subject).not.toBe(Bindings);
    expect(Object.keys(subject).sort()).toMatchObject(
      Object.keys(Bindings).sort()
    );
    subject.add("bindingName", "componentId", "viewId", () => ({}));
    expect(Bindings.add).toBeCalled();
    subject.clear("componentId");
    expect(Bindings.clear).toBeCalled();
    subject.remove("bindingName");
    expect(Bindings.remove).toBeCalled();
    subject.send(MockSheet({ id: "123" }), "bindingName");
    expect(Bindings.send).toBeCalled();
  });

  test("does nothing in virtual mode", () => {
    modeHandlerMock.setMode("virtual");
    subject.add("bindingName", "componentId", "viewId", () => ({}));
    expect(Bindings.add).not.toBeCalled();
    subject.clear("componentId");
    expect(Bindings.clear).not.toBeCalled();
    subject.remove("bindingName");
    expect(Bindings.remove).not.toBeCalled();
    subject.send(MockSheet({ id: "123" }), "bindingName");
    expect(Bindings.send).not.toBeCalled();
  });
});

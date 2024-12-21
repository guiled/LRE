import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { registerLreBindings } from "../../src/proxy/bindings";
import {
  initLetsRole,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";

describe("Bindings proxy", () => {
  let subject: LetsRole.Bindings;
  let server: ServerMock;

  beforeEach(() => {
    server = new ServerMock({
      views: [
        {
          id: "main",
          children: [],
          className: "View",
        },
      ],
    });
    initLetsRole(server);
    subject = registerLreBindings(context, Bindings);
    (Bindings.add as jest.Mock).mockClear();
    (Bindings.clear as jest.Mock).mockClear();
    (Bindings.remove as jest.Mock).mockClear();
    (Bindings.send as jest.Mock).mockClear();
  });

  afterEach(() => {
    terminateLetsRole();
  });

  test("works in real", () => {
    expect(subject).not.toBe(Bindings);
    expect(Object.keys(subject).sort()).toMatchObject(
      Object.keys(Bindings).sort(),
    );

    subject.add("bindingName", "componentId", "viewId", () => ({}));

    expect(Bindings.add).toHaveBeenCalled();

    subject.clear("componentId");

    expect(Bindings.clear).toHaveBeenCalled();

    subject.remove("bindingName");

    expect(Bindings.remove).toHaveBeenCalled();

    subject.send(server.openView("main", "123"), "bindingName");

    expect(Bindings.send).toHaveBeenCalled();
  });

  test("does nothing in virtual mode", () => {
    context.setMode("virtual");
    subject.add("bindingName", "componentId", "viewId", () => ({}));

    expect(Bindings.add).not.toHaveBeenCalled();

    subject.clear("componentId");

    expect(Bindings.clear).not.toHaveBeenCalled();

    subject.remove("bindingName");

    expect(Bindings.remove).not.toHaveBeenCalled();

    subject.send(server.openView("main", "123"), "bindingName");

    expect(Bindings.send).not.toHaveBeenCalled();
  });
});

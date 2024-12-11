import { ServerMock } from "../../../src/mock/letsrole/server.mock";

let server: ServerMock;
beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        children: [
          {
            id: "ch",
            className: "Choice",
            tableId: "theTable",
            label: "lbl",
          },
          {
            id: "chA",
            className: "Choice",
            tableId: "theTable",
            label: "lbl",
          },
          {
            id: "cmp1",
            className: "TextInput",
          },
          {
            id: "cmp2",
            className: "TextInput",
          },
        ],
        className: "View",
        name: "theSheet",
      },
      {
        id: "prompt",
        children: [
          {
            id: "ch",
            className: "Choice",
            tableId: "theTable",
            label: "lbl",
          },
        ],
        className: "View",
        name: "thePrompt",
      },
    ],
    tables: {
      theTable: [
        { id: "a", lbl: "theChoiceA", a: "1", b: "2" },
        { id: "b", lbl: "theChoiceB", a: "2", b: "3" },
      ],
    },
  });
});

describe("SheetMock behavior", () => {
  it.todo("SheetMock must refuse duplicate id in structure");
  it.todo("SheetMock must refuse setData with more than 20 components");
});

describe("Open view", () => {
  test("Open view launch init", () => {
    global.init = jest.fn();
    const sheet = server.openView("main", "12345");

    expect(global.init).toHaveBeenCalled();
    expect(global.init).toHaveBeenCalledWith(sheet);
  });
});

describe("Open prompt", () => {
  test("Prompt run init on view", () => {
    const main = server.openView("main", "12345");
    global.init = jest.fn();
    const initCb = jest.fn();
    main.prompt("title", "prompt", jest.fn(), initCb);

    expect(global.init).toHaveBeenCalled();
    expect(initCb).toHaveBeenCalled();
    const init: jest.Mock = global.init as jest.Mock;
    expect(init.mock.invocationCallOrder[0]).toBeLessThan(
      initCb.mock.invocationCallOrder[0],
    );
    expect(init.mock.calls[0][0]).toStrictEqual(initCb.mock.calls[0][0]);
  });
});

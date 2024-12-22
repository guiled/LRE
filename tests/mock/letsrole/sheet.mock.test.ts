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
          {
            id: "lbl",
            className: "Label",
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

describe("Prompt sheet", () => {
  test("Set value in a prompt", () => {
    const prompt = server.openView("prompt", undefined);
    const lbl = prompt.get("lbl");

    expect(lbl).toBeDefined();

    lbl.value("theLabel");

    expect(prompt.getData()).toMatchObject({ lbl: "theLabel" });
  });

  test("A prompt can be opened one at a time", () => {
    const main = server.openView("main", "12345");
    global.init = jest.fn();
    const initCb = jest.fn();

    main.prompt("title", "prompt", jest.fn(), initCb);

    expect(global.init).toHaveBeenCalledTimes(1);
    expect(initCb).toHaveBeenCalledTimes(1);

    main.prompt("title", "prompt", jest.fn(), initCb);

    expect(global.init).toHaveBeenCalledTimes(1);
    expect(initCb).toHaveBeenCalledTimes(1);

    server.closePrompt("prompt");
    main.prompt("title", "prompt", jest.fn(), initCb);

    expect(global.init).toHaveBeenCalledTimes(2);
    expect(initCb).toHaveBeenCalledTimes(2);
  });

  test("prompt data are independent", () => {
    const prompt1 = server.openView("prompt", undefined);
    const prompt2 = server.openView("prompt", undefined);
    const lbl1 = prompt1.get("lbl");

    lbl1.value("theLabel");
    const lbl2 = prompt2.get("lbl");

    expect(lbl2.value()).not.toBe("theLabel");
  });

  test("Prompt always has empty data at beginning", () => {
    let promptView: LetsRole.Sheet | undefined;

    const cb = (s: LetsRole.Sheet): void => {
      promptView = s;
    };

    const main = server.openView("main", "12345");

    main.prompt("title", "prompt", jest.fn(), cb);

    expect(promptView?.getData()).toMatchObject({});

    promptView?.get("lbl").value("theLabel");

    expect(promptView?.getData()).toMatchObject({
      lbl: "theLabel",
    });

    server.closePrompt("prompt");
    main.prompt("title", "prompt", jest.fn(), cb);

    expect(promptView?.getData()).toMatchObject({});
  });
});

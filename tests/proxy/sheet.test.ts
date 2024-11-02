import { Context } from "../../src/context";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { ViewMock } from "../../src/mock/letsrole/view.mock";
import { SheetProxy } from "../../src/proxy/sheet";

let context: ProxyModeHandler;
let server: ServerMock;
beforeEach(() => {
  context = new Context();
  context.setMode("real");
  server = new ServerMock({
    views: [
      {
        id: "main",
        children: [{
          id: "cmp1",
          className: "Label",
          text: "101",
        }, {
          id: "cmp2",
          className: "Label",
          text: "102",
        }],
        className: "View",
        name: "theSheet",
      },
    ],
    viewVariables: {
      main: {
        var1: 101,
        var2: 102,
      },
    }
  });
});

const spyView = (vw: ViewMock): ViewMock => {
  jest.spyOn(vw, "id");
  jest.spyOn(vw, "getSheetId");
  jest.spyOn(vw, "name");
  jest.spyOn(vw, "properName");
  jest.spyOn(vw, "getVariable");
  jest.spyOn(vw, "prompt");
  jest.spyOn(vw, "getData");
  jest.spyOn(vw, "setData");
  jest.spyOn(vw, "get");
  return vw;
};

describe("SheetProxy test", () => {
  test("Sheet proxy works in real by default", () => {
    const data = {
      cmp1: "42",
    };
    const raw = server.openView("main", "12345", data, "TheProperName");
    spyView(raw);
    const subject = new SheetProxy(context, raw);
    expect(raw.id).not.toHaveBeenCalled();
    expect(raw.getSheetId).not.toHaveBeenCalled();
    expect(raw.name).not.toHaveBeenCalled();
    expect(raw.properName).not.toHaveBeenCalled();
    expect(raw.getVariable).not.toHaveBeenCalled();

    expect(subject.id()).toBe("main");
    expect(raw.id).toHaveBeenCalled();

    expect(subject.getSheetId()).toBe("12345");
    expect(raw.getSheetId).toHaveBeenCalled();

    expect(subject.name()).toBe("theSheet");
    expect(raw.name).toHaveBeenCalled();

    expect(subject.properName()).toBe("TheProperName");
    expect(raw.properName).toHaveBeenCalled();

    expect(subject.getVariable("var2")).toBe(102);
    expect(raw.getVariable).toHaveBeenCalled();
    expect((raw.getVariable as jest.Mock).mock.calls[0][0]).toBe("var2");

    const cbPrompt = jest.fn();
    const cbInit = jest.fn();
    subject.prompt("the title", "viewId", cbPrompt, cbInit);
    expect(raw.prompt).toHaveBeenCalled();
    expect((raw.prompt as jest.Mock).mock.calls[0][0]).toBe("the title");
    expect((raw.prompt as jest.Mock).mock.calls[0][1]).toBe("viewId");
    expect((raw.prompt as jest.Mock).mock.calls[0][2]).toBe(cbPrompt);
    expect((raw.prompt as jest.Mock).mock.calls[0][3]).toBe(cbInit);

    expect(raw.getData).not.toHaveBeenCalled();
    expect(subject.getData()).toMatchObject(data);
    expect(raw.getData).toHaveBeenCalled();

    expect(raw.setData).not.toHaveBeenCalled();
    const newData = { cmp2: 43 };
    subject.setData(newData);
    expect(raw.setData).toHaveBeenCalled();
    expect(subject.getData()).toMatchObject({ ...data, ...newData });

    subject.get("test");
    expect(raw.get).toHaveBeenCalled();
  });

  test("Sheet proxy in virtual mode", () => {
    const data = {
      cmp1: "42",
    };
    const raw = server.openView("main", "12345", data, "TheProperName");
    spyView(raw);
    const subject = new SheetProxy(context, raw);
    context.setMode("virtual");
    (raw.getData as jest.Mock).mockClear();
    expect(subject.id()).toBe("main");
    expect(raw.id).toHaveBeenCalled();

    expect(subject.name()).toBe("theSheet");
    expect(raw.name).toHaveBeenCalled();

    expect(subject.properName()).toBe("TheProperName");
    expect(raw.properName).toHaveBeenCalled();

    expect(subject.getSheetId()).toBe("12345");
    expect(raw.getSheetId).toHaveBeenCalled();
    (raw.getData as jest.Mock).mockClear();
    expect(subject.getData()).toMatchObject(data);
    expect(raw.getData).not.toHaveBeenCalled();

    const addedData = { cmp2: 43 };
    subject.setData(addedData);
    expect(raw.setData).not.toHaveBeenCalled();
    expect(subject.getData()).toMatchObject({ ...data, ...addedData });

    subject.prompt("title", "view", jest.fn, jest.fn);
    expect(raw.prompt).not.toHaveBeenCalled();

    const cmp = subject.get("cmp1");
    (raw.getData as jest.Mock).mockClear();
    expect(raw.get).toHaveBeenCalled();
    expect(cmp.value()).toBe(data.cmp1);
    expect(raw.getData).not.toHaveBeenCalled();
  });
});

describe("Sheet real usages in virtual", () => {
  let data;
  let raw: LetsRole.Sheet;
  let subject: SheetProxy;
  beforeEach(() => {
    data = {
      cmp1: "42",
      cmp2: "43",
    };
    raw = server.openView("main", "12345", data, "TheProperName");
    subject = new SheetProxy(context, raw);
  });

  test("Two instances are synchronized", () => {
    const cmp1a = subject.get("cmp1");
    const cmp1b = subject.get("cmp1");
    expect(cmp1a.value()).toBe("42");
    expect(cmp1b.value()).toBe("42");
    cmp1a.value(41);
    expect(cmp1a.value()).toBe(41);
    expect(raw.getData().cmp1).toBe(41);
    expect(cmp1b.value()).toBe(41);

    context.setMode("virtual");
    expect(cmp1a.value()).toBe(41);
    expect(cmp1b.value()).toBe(41);
    cmp1a.value(43);
    expect(cmp1a.value()).toBe(43);
    expect(cmp1b.value()).toBe(43);
    expect(raw.getData().cmp1).toBe(41);
    context.setMode("real");
    expect(cmp1a.value()).toBe(41);
  });
});

describe("Proxy logs", () => {
  test("get cmp is logged", () => {
    const data = {
      cmp1: "42",
    };
    const raw = server.openView("main", "12345", data, "TheProperName");
    const subject = new SheetProxy(context, raw);
    expect(context.getAccessLog("cmp")).toStrictEqual([]);
    subject.get("cmp1");
    expect(context.getAccessLog("cmp").length).toBe(1);
  });
});

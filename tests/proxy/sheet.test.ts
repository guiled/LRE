import { Context } from "../../src/context";
import { SheetProxy } from "../../src/proxy/sheet";
import { MockServer } from "../mock/letsrole/server.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";

let context: ProxyModeHandler;
beforeEach(() => {
  context = new Context();
  context.setMode("real");
});

describe("SheetProxy test", () => {
  test("Sheet proxy works in real by default", () => {
    const data = {
      cmp1: "42",
    };
    const raw = MockSheet({
      id: "main",
      realId: "12345",
      properName: "TheProperName",
      data,
      name: "theSheet",
      variables: {
        var1: 101,
        var2: 102,
      },
    });
    const subject = new SheetProxy(context, raw);
    expect(raw.id).not.toBeCalled();
    expect(raw.getSheetId).not.toBeCalled();
    expect(raw.name).not.toBeCalled();
    expect(raw.properName).not.toBeCalled();
    expect(raw.getVariable).not.toBeCalled();

    expect(subject.id()).toBe("main");
    expect(raw.id).toBeCalled();

    expect(subject.getSheetId()).toBe("12345");
    expect(raw.getSheetId).toBeCalled();

    expect(subject.name()).toBe("theSheet");
    expect(raw.name).toBeCalled();

    expect(subject.properName()).toBe("TheProperName");
    expect(raw.properName).toBeCalled();

    expect(subject.getVariable("var2")).toBe(102);
    expect(raw.getVariable).toBeCalled();
    expect((raw.getVariable as jest.Mock).mock.calls[0][0]).toBe("var2");

    const cbPrompt = jest.fn();
    const cbInit = jest.fn();
    subject.prompt("the title", "viewId", cbPrompt, cbInit);
    expect(raw.prompt).toBeCalled();
    expect((raw.prompt as jest.Mock).mock.calls[0][0]).toBe("the title");
    expect((raw.prompt as jest.Mock).mock.calls[0][1]).toBe("viewId");
    expect((raw.prompt as jest.Mock).mock.calls[0][2]).toBe(cbPrompt);
    expect((raw.prompt as jest.Mock).mock.calls[0][3]).toBe(cbInit);

    expect(raw.getData).not.toBeCalled();
    expect(subject.getData()).toMatchObject(data);
    expect(raw.getData).toBeCalled();

    expect(raw.setData).not.toBeCalled();
    const newData = { cmp2: 43 };
    subject.setData(newData);
    expect(raw.setData).toBeCalled();
    expect(subject.getData()).toMatchObject({ ...data, ...newData });

    subject.get("test");
    expect(raw.get).toBeCalled();
  });

  test("Sheet proxy in virtual mode", () => {
    const data = {
      cmp1: "42",
    };
    const raw = MockSheet({
      id: "main",
      realId: "12345",
      properName: "TheProperName",
      data,
      name: "theSheet",
      variables: {
        var1: 101,
        var2: 102,
      },
    });
    const subject = new SheetProxy(context, raw);
    context.setMode("virtual");
    (raw.getData as jest.Mock).mockClear();
    expect(subject.id()).toBe("main");
    expect(raw.id).toBeCalled();

    expect(subject.name()).toBe("theSheet");
    expect(raw.name).toBeCalled();

    expect(subject.properName()).toBe("TheProperName");
    expect(raw.properName).toBeCalled();

    expect(subject.getSheetId()).toBe("12345");
    expect(raw.getSheetId).toBeCalled();
    (raw.getData as jest.Mock).mockClear();
    expect(subject.getData()).toMatchObject(data);
    expect(raw.getData).not.toBeCalled();

    const addedData = { cmp2: 43 };
    subject.setData(addedData);
    expect(raw.setData).not.toBeCalled();
    expect(subject.getData()).toMatchObject({ ...data, ...addedData });

    subject.prompt("title", "view", jest.fn, jest.fn);
    expect(raw.prompt).not.toBeCalled();

    const cmp = subject.get("cmp1");
    (raw.getData as jest.Mock).mockClear();
    expect(raw.get).toBeCalled();
    expect(cmp.value()).toBe(data.cmp1);
    expect(raw.getData).not.toBeCalled();
  });
});

describe("Sheet real usages in virtual", () => {
  let data;
  let raw: LetsRole.Sheet;
  let subject: SheetProxy;
  let server: MockServer;
  beforeEach(() => {
    data = {
      cmp1: "42",
      cmp2: "43",
    };
    raw = MockSheet({
      id: "main",
      realId: "12345",
      properName: "TheProperName",
      data,
      name: "theSheet",
      variables: {
        var1: 101,
        var2: 102,
      },
    });
    server = new MockServer();
    server.registerMockedSheet(raw);

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
    const raw = MockSheet({
      id: "main",
      realId: "12345",
      properName: "TheProperName",
      data,
      name: "theSheet",
      variables: {
        var1: 101,
        var2: 102,
      },
    });
    const subject = new SheetProxy(context, raw);
    expect(context.getAccessLog("cmp")).toStrictEqual([]);
    subject.get("cmp1");
    expect(context.getAccessLog("cmp").length).toBe(1);
  });
});

import { Container } from "../../src/component/container";
import { LRE } from "../../src/lre";
import {
  initLetsRole,
  itHasWaitedEverything,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";

let server: ServerMock;
let sheet: Sheet;

beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        name: "Main",
        className: "View",
        children: [
          {
            id: "container",
            name: "Container",
            className: "Container",
            children: [
              {
                id: "subTxt1",
                name: "Text",
                className: "TextInput",
              },
              {
                id: "subTxt2",
                name: "Text",
                className: "TextInput",
              },
            ],
          },
          {
            id: "containerWithDNone",
            name: "Container",
            className: "Container",
            children: [],
            classes: "d-none",
          },
          {
            id: "lbl",
            name: "Label",
            className: "Label",
            text: "Hello",
          },
          {
            id: "txt1",
            name: "Text",
            className: "TextInput",
            defaultValue: "World",
          },
          {
            id: "txt2",
            name: "Text",
            className: "TextInput",
            defaultValue: "World2",
          },
        ],
      },
    ],
  });
  initLetsRole(server);
  global.lre = new LRE(context);
  const rawSheet = server.openView("main", "123");
  const sheetProxy = new SheetProxy(context, rawSheet);
  sheet = new Sheet(sheetProxy, new DataBatcher(context, sheetProxy), context);
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

describe("Container", () => {
  test("hide removes d-flex class", () => {
    const container = sheet.get("container") as Container;

    expect(container.hasClass("d-flex")).toBe(true);
    expect(container.hasClass("d-none")).toBe(false);

    container.hide();

    expect(container.hasClass("d-flex")).toBe(false);
    expect(container.hasClass("d-none")).toBe(true);

    container.show();

    expect(container.hasClass("d-flex")).toBe(true);
    expect(container.hasClass("d-none")).toBe(false);
  });

  test("Find a child is successful", () => {
    const container = sheet.get("container") as Container;
    jest.spyOn(lre, "error");

    const child = container.find("subTxt1");

    expect(child).not.toBeNull();
    expect(child?.id()).toBe("subTxt1");
    expect(lre.error).not.toHaveBeenCalled();
  });

  test("Find a child that does not exist returns null and error be logged", () => {
    const container = sheet.get("container") as Container;
    jest.spyOn(lre, "error");

    const child = container.find("unknownCmp");

    expect(child).toBeNull();
    expect(lre.error).toHaveBeenCalled();
  });

  test("Find a child that exists elsewhere returns null and error must be logged", () => {
    const container = sheet.get("container") as Container;
    jest.spyOn(lre, "error");

    const child = container.find("txt1");

    expect(child).toBeNull();
    expect(lre.error).toHaveBeenCalled();
  });
});

describe("Container value", () => {
  test("set Value changes children values", () => {
    const container = sheet.get("container") as Container;

    let data: LetsRole.ViewData = sheet.getData() as LetsRole.ViewData;

    expect(data.subTxt1).toBeUndefined();

    container.value({
      subTxt1: 42,
    });
    itHasWaitedEverything();

    data = sheet.getData() as LetsRole.ViewData;

    expect(data).toStrictEqual({
      subTxt1: 42,
    });

    container.value({
      subTxt1: 43,
      subTxtUnknown: 44,
    });
    itHasWaitedEverything();
    data = sheet.getData() as LetsRole.ViewData;

    expect(data).toStrictEqual({
      subTxt1: 43,
    });
  });

  test("set value with invalid data logs error", () => {
    const container = sheet.get("container") as Container;
    jest.spyOn(lre, "error");

    container.value(42);

    expect(lre.error).toHaveBeenCalled();
  });

  test("get value returns the value of all known components", () => {
    const container = sheet.get("container") as Container;
    jest.spyOn(lre, "error");

    let result = container.value();

    expect(lre.error).not.toHaveBeenCalled();
    expect(result).toStrictEqual({});

    const cmp = container.find("subTxt1");

    expect(cmp?.exists()).toBeTruthy();

    result = container.value();

    expect(result).toStrictEqual({
      subTxt1: "",
    });

    container.value({
      subTxt1: 42,
      subTxt2: 43,
    });

    sheet.get("subTxt1")?.value(40);
    sheet.get("subTxt2")?.value(44);

    result = container.value();

    expect(result).toStrictEqual({
      subTxt1: 40,
      subTxt2: 44,
    });
  });
});

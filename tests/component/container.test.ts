import { Container } from "../../src/component/container";
import { LRE } from "../../src/lre";
import {
  initLetsRole,
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
            children: [],
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
});

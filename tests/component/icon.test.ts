import { Icon } from "../../src/component/icon";
import { LRE } from "../../src/lre";
import {
  initLetsRole,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { ViewMock } from "../../src/mock/letsrole/view.mock";

let server: ServerMock;
let rawSheet: ViewMock;
let sheet: Sheet;

beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        className: "View",
        children: [
          {
            id: "icon",
            className: "Icon",
            iconName: "icon",
          },
          {
            id: "icon2",
            className: "Icon",
            iconName: "icon2",
          },
        ],
      },
    ],
  });
  initLetsRole(server);
  global.lre = new LRE(context);
  context.setMode("real");
  rawSheet = server.openView("main", "12345");
  const sheetProxy = new SheetProxy(context, rawSheet);

  sheet = new Sheet(sheetProxy, new DataBatcher(context, sheetProxy), context);
  lre.sheets.add(sheet);
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

describe("Icon toString", () => {
  test("toString shows icon info without toggling (uses Icon-specific output)", () => {
    const icon = sheet.get("icon") as Icon;

    expect(icon).toBeInstanceOf(Icon);

    const result = icon.toString();

    expect(result).toBe("Icon<icon>(icon)");
  });

  test("toString shows icon info with toggling active (uses parent output)", () => {
    const icon = sheet.get("icon") as Icon;
    icon.toggling({ "1": "icon1", "2": "icon2" }, "1");
    const result = icon.toString();

    expect(result).toBe("Icon<icon>(icon, toggling=1)");
  });

  test("toString shows icon info with different toggling value", () => {
    const icon = sheet.get("icon2") as Icon;
    icon.toggling({ "1": "icon1", "2": "icon2" }, "2");
    const result = icon.toString();

    expect(result).toBe("Icon<icon2>(icon, toggling=2)");
  });

  test("toString returns to Icon-specific output after untoggling", () => {
    const icon = sheet.get("icon") as Icon;
    icon.toggling({ "1": "icon1", "2": "icon2" }, "1");

    expect(icon.toString()).toBe("Icon<icon>(icon, toggling=1)");

    icon.untoggling();

    expect(icon.toString()).toBe("Icon<icon>(icon)");
  });
});

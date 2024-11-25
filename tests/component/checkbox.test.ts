import { Checkbox } from "../../src/component/checkbox";
import { LRE } from "../../src/lre";
import { initLetsRole } from "../../src/mock/letsrole/letsrole.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { modeHandlerMock } from "../mock/modeHandler.mock";

let server: ServerMock;
let rawSheet: LetsRole.Sheet;
let sheet: Sheet;
let rawCheckbox: LetsRole.Component;

beforeEach(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        className: "View",
        children: [
          {
            id: "checkbox",
            className: "Checkbox",
          },
        ],
      },
    ],
  });
  initLetsRole(server);
  global.lre = new LRE(modeHandlerMock);
  modeHandlerMock.setMode("real");
  rawSheet = server.openView("main", "12345");
  rawCheckbox = rawSheet.get("checkbox");
  const proxySheet = new SheetProxy(modeHandlerMock, rawSheet);

  sheet = new Sheet(
    proxySheet,
    new DataBatcher(modeHandlerMock, proxySheet),
    modeHandlerMock,
  );
});

describe("Checkbox basics", () => {
  test("instantiation by factory", () => {
    const cmp = sheet.get("checkbox");
    expect(cmp).toBeInstanceOf(Checkbox);
  });

  test("isEnabled", () => {
    const cmp: Checkbox = new Checkbox(rawCheckbox, sheet, "checkbox");
    expect(cmp.isEnabled()).toBe(true);
    expect(cmp.isDisabled()).toBe(false);
    cmp.disable();
    console.log(cmp.toto);
    expect(cmp.isEnabled()).toBe(false);
    expect(cmp.isDisabled()).toBe(true);
  });
});

import { Repeater } from "../../src/component/repeater";
import { LRE } from "../../src/lre";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { ViewMock } from "../../src/mock/letsrole/view.mock";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { initLetsRole } from "../../src/mock/letsrole/letsrole.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

let rawRepeater: LetsRole.Component;
let repeater: Repeater;
let server: ServerMock;
let rawSheet: ViewMock;
let sheet: Sheet;
beforeAll(() => {
  server = new ServerMock({
    views: [
      {
        id: "main",
        children: [
          {
            id: "rep",
            className: "Repeater",
            viewId: "edt",
            readViewId: "rd",
          },
          {
            id: "cmp",
            className: "Label",
          },
        ],
        className: "View",
      },
      {
        id: "edt",
        className: "View",
        children: [
          {
            id: "name",
            className: "TextInput",
            name: "name",
          }
        ],
      },
      {
        id: "rd",
        className: "View",
        children: [
          {
            id: "name",
            className: "Label",
            name: "name",
          }
        ],
      }
    ],
  });
  initLetsRole(server);
  global.lre = new LRE(modeHandlerMock);
  modeHandlerMock.setMode("real");
  lre.autoNum(false);
  rawSheet = server.openView("main", "123", {
    rep: {},
    cmd: "2",
  });
  const proxySheet = new SheetProxy(modeHandlerMock, rawSheet);

  sheet = new Sheet(
    proxySheet,
    new DataBatcher(modeHandlerMock, proxySheet),
    modeHandlerMock
  );
  jest.spyOn(sheet, "get");
  jest.spyOn(sheet, "componentExists");
  jest.spyOn(sheet, "knownChildren");
  repeater = sheet.get("rep") as Repeater;
  rawRepeater = repeater.raw();
});

describe("Repeater is correctly initialized", () => {
  test("has the good type", () => {
    expect(repeater.lreType()).toBe("repeater");
  });

  test("text() is protected", () => {
    jest.spyOn(rawRepeater, "text");
    /* @ts-expect-error repeater.text() is protected and cannot receive parameter */
    repeater.text("test");
    expect(rawRepeater.text).toHaveBeenCalled();
    expect((rawRepeater.text as jest.Mock).mock.calls[0].length).toBe(0);
  });
});

describe("Repeater events", () => {
  test("Initread event is correctly launched", () => {
    const values: Record<string, any> = {
      "1": {
        name: "test",
      },
      "2": {
        name: "test2",
      },
      "3": {
        name: "test3",
      },
    };
    rawRepeater.value(values);
    const handler = jest.fn();
    repeater.on("initread", handler);
    expect(handler).toHaveBeenCalledTimes(3);
    handler.mockClear();
    values["4"] = {
      name: "test4",
    };
    rawRepeater.value({ ...values });
    expect(handler).toHaveBeenCalledTimes(1);
    handler.mockClear();
    values["1"].name = "test1";
    rawRepeater.value({ ...values });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

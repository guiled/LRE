import { Repeater } from "../../src/component/repeater";
import { LRE } from "../../src/lre";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import {
  MockComponent,
  MockedComponent,
} from "../mock/letsrole/component.mock";
import { initLetsRole } from "../mock/letsrole/letsrole.mock";
import { MockServer } from "../mock/letsrole/server.mock";
import { MockedSheet, MockSheet } from "../mock/letsrole/sheet.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

let rawRepeater: MockedComponent;
let repeater: Repeater;
let server: MockServer;
let rawSheet: MockedSheet;
let sheet: Sheet;
let cmpDefs;
beforeAll(() => {
  global.lre = new LRE(modeHandlerMock);
  initLetsRole();
  modeHandlerMock.setMode("real");
  lre.autoNum(false);
  server = new MockServer();
  rawSheet = MockSheet({
    id: "main",
    realId: "123",
    data: {
      rep: {},
      cmd: "2",
    },
  });
  server.registerMockedSheet(rawSheet, []);
  const proxySheet = new SheetProxy(modeHandlerMock, rawSheet);

  sheet = new Sheet(
    proxySheet,
    new DataBatcher(modeHandlerMock, proxySheet),
    modeHandlerMock
  );
  sheet.raw = jest.fn(() => proxySheet);
  jest.spyOn(sheet, "get");
  jest.spyOn(sheet, "componentExists");
  jest.spyOn(sheet, "knownChildren");
  cmpDefs = {
    id: "rep",
    sheet: proxySheet,
    name: "repeater",
    classes: ["repeater"],
    value: {},
  };
  rawRepeater = MockComponent(cmpDefs);

  server.registerMockedComponent(rawRepeater);
  repeater = new Repeater(rawRepeater, sheet, "rep");
});

describe("Repeater is correctly initialized", () => {
  test("has the good type", () => {
    expect(repeater.lreType()).toBe("repeater");
  });

  test("text() is protected", () => {
    /* @ts-expect-error repeater.text() is protected and cannot receive parameter */
    repeater.text("test");
    expect(rawRepeater.text).not.toHaveBeenCalledWith("test");
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

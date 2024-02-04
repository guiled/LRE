import { Choice } from "../../src/component/choice";
import { LRE } from "../../src/lre";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { MockComponent } from "../mock/letsrole/component.mock";
import { initLetsRole } from "../mock/letsrole/letsrole.mock";
import { MockServer } from "../mock/letsrole/server.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

let raw: LetsRole.Component;
let sheet: ISheet;

beforeEach(() => {
  initLetsRole();
  global.lre = new LRE(modeHandlerMock);

  let rawSheet = MockSheet({
    id: "main",
    realId: "12345",
  });
  const server = new MockServer();
  server.registerMockedSheet(rawSheet);
  sheet = new Sheet(
    rawSheet,
    new DataBatcher(modeHandlerMock, rawSheet),
    modeHandlerMock
  );
  raw = MockComponent({
    id: "ch",
    sheet: rawSheet,
    classes: ["choice"],
  });
});

describe("Choice basic", () => {
  test("setChoices", () => {
    const choice = new Choice(raw, sheet, "ch");
    expect(choice.value()).toBe("");
    expect(raw.setChoices).not.toBeCalled();
    const newChoices = {
      a: "1",
      b: "2",
    };
    choice.setChoices(newChoices);
    expect(raw.setChoices).toBeCalledWith(newChoices);
  });

  test("Events", () => {
    const choice = new Choice(raw, sheet, "ch");
    const select = jest.fn();
    const unselect = jest.fn();
    const valselect1 = jest.fn();
    const valselect2 = jest.fn();
    const valunselect1 = jest.fn();
    const valunselect2 = jest.fn();
    const valclick = jest.fn();
    choice.on("select", select);
    choice.on("unselect", unselect);
    choice.on("valselect:1", valselect1);
    choice.on("valselect:2", valselect2);
    choice.on("valunselect:1", valunselect1);
    choice.on("valunselect:2", valunselect2);
    choice.on("valclick", valclick);
    expect(choice.value()).toBe("");

    choice.value(1);
    expect(select).toBeCalledWith(choice, 1);
  });
});

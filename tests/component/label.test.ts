import { Label } from "../../src/component/label";
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
            id: "label",
            className: "Label",
          },
          {
            id: "label2",
            className: "Label",
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

describe("Label toString", () => {
  test("toString shows label info without toggling (uses Label-specific output)", () => {
    const label = sheet.get("label") as Label;

    expect(label).toBeInstanceOf(Label);

    const result = label.toString();

    expect(result).toBe("Label<label>(label)");
  });

  test("toString shows label info with toggling active (uses parent output)", () => {
    const label = sheet.get("label") as Label;
    label.toggling({ "1": "text1", "2": "text2" }, "1");
    const result = label.toString();

    expect(result).toBe("Label<label>(label, toggling=1)");
  });

  test("toString shows label info with different toggling value", () => {
    const label = sheet.get("label2") as Label;
    label.toggling({ "1": "text1", "2": "text2" }, "2");
    const result = label.toString();

    expect(result).toBe("Label<label2>(label, toggling=2)");
  });

  test("toString returns to Label-specific output after untoggling", () => {
    const label = sheet.get("label") as Label;
    label.toggling({ "1": "text1", "2": "text2" }, "1");

    expect(label.toString()).toBe("Label<label>(label, toggling=1)");

    label.untoggling();

    expect(label.toString()).toBe("Label<label>(label)");
  });
});

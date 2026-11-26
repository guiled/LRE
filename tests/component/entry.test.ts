import { Entry } from "../../src/component/entry";
import { Repeater } from "../../src/component/repeater";
import { LRE } from "../../src/lre";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { ViewMock } from "../../src/mock/letsrole/view.mock";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import {
  initLetsRole,
  itHasWaitedEverything,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { Component } from "../../src/component";

let repeater: Repeater;
let server: ServerMock;
let rawSheet: ViewMock;
let sheet: Sheet;

beforeEach(() => {
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
          },
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
          },
        ],
      },
    ],
  });
  initLetsRole(server);
  global.lre = new LRE(context);
  context.setMode("real");
  lre.autoNum(false);
  rawSheet = server.openView("main", "123", {
    rep: {},
  });
  const proxySheet = new SheetProxy(context, rawSheet);

  sheet = new Sheet(proxySheet, new DataBatcher(context, proxySheet), context);
  lre.sheets.add(sheet);
  repeater = sheet.get("rep") as Repeater;
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

function entryWithId(entryId: string): Entry {
  repeater.value({ [entryId]: { name: "Test" } });
  return repeater.find(entryId) as Entry;
}

describe("Entry initialization", () => {
  test("is an Entry with lreType entry", () => {
    const entry = entryWithId("a");

    expect(entry).toBeInstanceOf(Entry);
    expect(entry.lreType()).toBe("entry");
  });
});

describe("Entry find", () => {
  test("delegates to sheet.get with entry-scoped real id", () => {
    const entry = entryWithId("a");
    const getSpy = vi.spyOn(sheet, "get");

    entry.find("name");

    expect(getSpy).toHaveBeenCalledWith("rep.a.name", false);

    const child = entry.find("name") as Component;

    expect(child.realId()).toBe("rep.a.name");
  });

  test("passes silent flag to sheet.get", () => {
    const entry = entryWithId("a");
    const getSpy = vi.spyOn(sheet, "get");

    entry.find("missing", true);

    expect(getSpy).toHaveBeenCalledWith("rep.a.missing", true);
  });
});

describe("Entry move methods", () => {
  const threeEntries = {
    a: { name: "First" },
    b: { name: "Second" },
    c: { name: "Third" },
  };

  test("moveUp reorders repeater value keys", () => {
    repeater.value(threeEntries);
    itHasWaitedEverything();

    expect(Object.keys(repeater.value()!)).toEqual(["a", "b", "c"]);

    const entry = repeater.find("b") as Entry;

    entry.moveUp();
    itHasWaitedEverything();

    expect(Object.keys(repeater.value()!)).toEqual(["b", "a", "c"]);
    expect(repeater.value()).toMatchObject(threeEntries);
  });

  test("moveDown reorders repeater value keys", () => {
    repeater.value(threeEntries);
    itHasWaitedEverything();

    expect(Object.keys(repeater.value()!)).toEqual(["a", "b", "c"]);

    const entry = repeater.find("b") as Entry;

    entry.moveDown();
    itHasWaitedEverything();

    expect(Object.keys(repeater.value()!)).toEqual(["a", "c", "b"]);
    expect(repeater.value()).toMatchObject(threeEntries);
  });

  test("moveTop reorders repeater value keys", () => {
    repeater.value(threeEntries);
    itHasWaitedEverything();

    expect(Object.keys(repeater.value()!)).toEqual(["a", "b", "c"]);

    const entry = repeater.find("c") as Entry;

    entry.moveTop();
    itHasWaitedEverything();

    expect(Object.keys(repeater.value()!)).toEqual(["c", "a", "b"]);
    expect(repeater.value()).toMatchObject(threeEntries);
  });

  test("moveBottom reorders repeater value keys", () => {
    repeater.value(threeEntries);
    itHasWaitedEverything();

    expect(Object.keys(repeater.value()!)).toEqual(["a", "b", "c"]);

    const entry = repeater.find("a") as Entry;

    entry.moveBottom();
    itHasWaitedEverything();

    expect(Object.keys(repeater.value()!)).toEqual(["b", "c", "a"]);
    expect(repeater.value()).toMatchObject(threeEntries);
  });

  test.each([
    ["moveUp", "moveEntryUp"],
    ["moveDown", "moveEntryDown"],
    ["moveTop", "moveEntryTop"],
    ["moveBottom", "moveEntryBottom"],
  ] as const)(
    "%s does nothing when entry has no index",
    (moveMethod, repeaterMethod) => {
      const entry = entryWithId("a");
      vi.spyOn(entry, "index").mockReturnValue(null);
      const moveSpy = vi.spyOn(repeater, repeaterMethod);

      entry[moveMethod]();

      expect(moveSpy).not.toHaveBeenCalled();
    },
  );

  test.each([
    ["moveUp", "moveEntryUp"],
    ["moveDown", "moveEntryDown"],
    ["moveTop", "moveEntryTop"],
    ["moveBottom", "moveEntryBottom"],
  ] as const)(
    "%s does nothing when entry has no repeater",
    (moveMethod, repeaterMethod) => {
      const entry = entryWithId("a");
      vi.spyOn(entry, "repeater").mockReturnValue(undefined);
      const moveSpy = vi.spyOn(repeater, repeaterMethod);

      entry[moveMethod]();

      expect(moveSpy).not.toHaveBeenCalled();
    },
  );
});

describe("Entry toString", () => {
  test("shows entry real id and index", () => {
    const entry = entryWithId("1");

    expect(entry.toString()).toBe("Entry<rep.1>(1)");
  });

  test("shows different index", () => {
    const entry = entryWithId("42");

    expect(entry.toString()).toBe("Entry<rep.42>(42)");
  });

  test("shows no index when index is falsy", () => {
    const entry = entryWithId("test");
    vi.spyOn(entry.raw(), "index").mockReturnValue(null);

    expect(entry.toString()).toBe("Entry<rep.test>(no index)");
  });
});

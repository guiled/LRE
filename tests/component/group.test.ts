import { Group } from "../../src/component/group";
import { LRE } from "../../src/lre";
import { ComponentMock } from "../../src/mock/letsrole/component.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import {
  initLetsRole,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";

let sheet: Sheet;

beforeEach(() => {
  const server = new ServerMock({
    views: [
      {
        id: "main",
        children: [
          {
            id: "cmp1",
            name: "cmp1",
            className: "TextInput",
            classes: "a b c",
            defaultValue: "txt1",
          },
          {
            id: "cmp2",
            name: "cmp2",
            className: "TextInput",
            classes: "a d b",
            defaultValue: "txt2",
          },
          {
            id: "cmp3",
            name: "cmp3",
            className: "TextInput",
            classes: "b d a",
            defaultValue: "txt3",
          },
          {
            id: "cmp4",
            name: "cmp4",
            className: "TextInput",
            classes: "b d a",
            defaultValue: "txt3",
          },
          {
            id: "a",
            className: "Repeater",
            viewId: "edt",
            readViewId: "read",
          },
          {
            id: "checkbox",
            className: "Checkbox",
          },
        ],
        className: "View",
      },
      {
        id: "edt",
        children: [],
        className: "View",
      },
      {
        id: "read",
        children: [
          {
            id: "c",
            className: "Label",
            text: "ok",
          },
        ],
        className: "View",
      },
    ],
  });
  initLetsRole(server);
  global.lre = new LRE(context);
  const rawSheet = server.openView("main", "123", {
    a: {
      b: {
        c: true,
      },
    },
    cmp1: "val1",
    cmp2: "val2",
    cmp3: "val3",
  });
  sheet = new Sheet(rawSheet, new DataBatcher(context, rawSheet), context);
  lre.sheets.add(sheet);
});

afterEach(() => {
  // @ts-expect-error intentional deletion
  delete global.lre;
  terminateLetsRole();
});

describe("Component group is like a component", () => {
  test("Group construction", () => {
    jest.spyOn(sheet, "get");
    const group: Group = new Group(context, "group1", sheet);

    expect(sheet.get).not.toHaveBeenCalled();
    expect(group.count()).toBe(0);
    expect(group.id()).toBe("group1");
    expect(group.name()).toBe("group1");
    expect(group.realId()).toBe("group1");
    expect(group.lreType()).toBe("group");
    expect(group.raw()).toBe(group);
    expect(group.init()).toBe(group);
    expect(group.repeater()).toBeUndefined();
    expect(group.entry()).toBeUndefined();
    expect(group.exists()).toBeTruthy();
    expect(group.sheet()).toBe(sheet);
    expect(group.index()).toBeNull();
    expect(group.parent()).toBe(sheet);
  });

  test("Group has LRE component methods", () => {
    const group: Group = new Group(context, "group1", sheet);
    const cmp1 = sheet.get("cmp1")! as IComponent;
    const cmp2 = sheet.get("cmp2")! as IComponent;

    group.add(cmp1!);
    group.add(cmp2!);

    const methods = ["autoLoadSaveClasses", "toggle", "hide", "show"];

    type CommonMethodsBetweenComponentAndGroup =
      | "autoLoadSaveClasses"
      | "toggle"
      | "hide"
      | "show";

    (methods as Array<CommonMethodsBetweenComponentAndGroup>).forEach(
      (method) => {
        jest.spyOn(cmp1, method);
        jest.spyOn(cmp2, method);
        group[method]();

        expect(cmp1[method]).toHaveBeenCalled();
        expect(cmp2[method]).toHaveBeenCalled();
      },
    );

    expect(
      group
        .knownChildren()
        .map((c) => c.realId())
        .sort(),
    ).toEqual([cmp1.realId(), cmp2.realId()].sort());

    jest.spyOn(cmp1, "setToolTip");
    jest.spyOn(cmp2, "setToolTip");
    group.setToolTip("test");

    expect(cmp1.setToolTip).toHaveBeenCalledTimes(1);
    expect(cmp2.setToolTip).toHaveBeenCalledTimes(1);
    expect((cmp1.setToolTip as jest.Mock).mock.calls[0].length).toBe(1);
    expect((cmp1.setToolTip as jest.Mock).mock.calls[0][0]).toBe("test");

    group.setToolTip("test", "right");

    expect(cmp1.setToolTip).toHaveBeenCalledTimes(2);
    expect(cmp2.setToolTip).toHaveBeenCalledTimes(2);
    expect((cmp1.setToolTip as jest.Mock).mock.calls[1].length).toBe(2);
    expect((cmp1.setToolTip as jest.Mock).mock.calls[1][0]).toBe("test");
    expect((cmp1.setToolTip as jest.Mock).mock.calls[1][1]).toBe("right");

    sheet.get("a")!.lreType("repeater");
    sheet.get("a.b")!.lreType("entry");
    const subCmp = sheet.get("a.b.c")! as IComponent;
    group.add(subCmp);

    expect(group.find("cmp1")).toBe(cmp1);
    expect(group.get("cmp2")).toBe(cmp2);
    expect(group.find("a.b.c")).toBe(subCmp);

    cmp1.addClass("unique");
    jest.spyOn(cmp1, "addClass");
    jest.spyOn(cmp2, "addClass");
    jest.spyOn(subCmp, "addClass");
    jest.spyOn(cmp1, "removeClass");
    jest.spyOn(cmp2, "removeClass");
    jest.spyOn(subCmp, "removeClass");
    jest.spyOn(cmp1, "toggleClass");
    jest.spyOn(cmp2, "toggleClass");
    jest.spyOn(subCmp, "toggleClass");

    expect(group.addClass("test")).toBe(group);
    expect(group.hasClass("test")).toBeTruthy();
    expect(group.hasClass("unique")).toBeFalsy();
    expect(cmp1.addClass).toHaveBeenCalled();
    expect(cmp2.addClass).toHaveBeenCalled();
    expect(subCmp.addClass).toHaveBeenCalled();
    expect(group.removeClass("test")).toBe(group);
    expect(cmp1.removeClass).toHaveBeenCalled();
    expect(cmp2.removeClass).toHaveBeenCalled();
    expect(subCmp.removeClass).toHaveBeenCalled();
    expect(group.toggleClass("test")).toBe(group);
    expect(cmp1.toggleClass).toHaveBeenCalled();
    expect(cmp2.toggleClass).toHaveBeenCalled();
    expect(subCmp.toggleClass).toHaveBeenCalled();
  });
});

describe("Component group basics", () => {
  test("New group is empty", () => {
    const group: Group = new Group(context, "group1", sheet);

    expect(group.count()).toBe(0);
  });

  test("Add / remove components", () => {
    jest.spyOn(sheet, "get");
    const group: Group = new Group(context, "group1", sheet, ["cmp1"]);

    const updateCb = jest.fn();

    expect(sheet.get).toHaveBeenCalledTimes(1);
    expect(group.count()).toBe(1);
    expect(group.includes("cmp1")).toBeTruthy();
    expect(group.contains("cmp1")).toBeTruthy();
    expect(group.has("cmp1")).toBeTruthy();

    const addCb = jest.fn();
    const removeCb = jest.fn();
    group.on("add", addCb);
    group.on("remove", removeCb);
    group.on("update", updateCb);

    expect(updateCb).toHaveBeenCalledTimes(0);

    group.add("cmp2");

    expect(sheet.get).toHaveBeenCalledTimes(2);
    expect(group.count()).toBe(2);
    expect(updateCb).toHaveBeenCalledTimes(1);
    expect(addCb).toHaveBeenCalledTimes(1);

    const cmp3 = sheet.get("cmp3")! as IComponent;
    (sheet.get as jest.Mock).mockClear();

    expect(group.includes("cmp3")).toBeFalsy();
    expect(group.contains("cmp3")).toBeFalsy();
    expect(group.has("cmp3")).toBeFalsy();
    expect(group.includes(cmp3)).toBeFalsy();
    expect(group.contains(cmp3)).toBeFalsy();
    expect(group.has(cmp3)).toBeFalsy();

    group.add(cmp3);

    expect(updateCb).toHaveBeenCalledTimes(2);
    expect(sheet.get).toHaveBeenCalledTimes(0);
    expect(group.count()).toBe(3);
    expect(addCb).toHaveBeenCalledTimes(2);
    expect(group.includes("cmp3")).toBeTruthy();
    expect(group.contains("cmp3")).toBeTruthy();
    expect(group.has("cmp3")).toBeTruthy();
    expect(group.includes(cmp3)).toBeTruthy();
    expect(group.contains(cmp3)).toBeTruthy();
    expect(group.has(cmp3)).toBeTruthy();

    (sheet.get as jest.Mock).mockClear();
    updateCb.mockClear();
    group.add("cmp3");

    expect(group.count()).toBe(3);
    expect(updateCb).toHaveBeenCalledTimes(0);
    expect(addCb).toHaveBeenCalledTimes(2);

    expect(removeCb).toHaveBeenCalledTimes(0);

    group.remove(cmp3);

    expect(group.count()).toBe(2);
    expect(updateCb).toHaveBeenCalledTimes(1);
    expect(removeCb).toHaveBeenCalledTimes(1);

    group.remove(cmp3);

    expect(removeCb).toHaveBeenCalledTimes(1);

    group.remove("cmp2");

    expect(group.count()).toBe(1);
    expect(removeCb).toHaveBeenCalledTimes(2);
    expect(updateCb).toHaveBeenCalledTimes(2);

    updateCb.mockClear();
    group.add("unknown");

    expect(group.count()).toBe(1);
    expect(updateCb).toHaveBeenCalledTimes(0);

    expect(() => group.add(sheet.get("unknown")! as IComponent)).toThrow();
    expect(group.count()).toBe(1);
    expect(updateCb).toHaveBeenCalledTimes(0);
    expect(group.includes("unknown")).toBeFalsy();
  });

  test("Large group", () => {
    jest.spyOn(sheet, "get");
    const group: Group = new Group(context, "group1", sheet, [
      "cmp1",
      "cmp2",
      "cmp3",
    ]);

    expect(group.count()).toBe(3);
    expect(sheet.get).toHaveBeenCalledTimes(3);
  });

  test("Group added to group is forbidden", () => {
    const group1: Group = new Group(context, "group1", sheet);
    const group2: Group = new Group(context, "group2", sheet);

    /* @ts-expect-error Intended error to test */
    expect(() => group2.add(group1)).toThrow();
  });

  test.each([
    { val: [], desc: "array" },
    { val: {}, desc: "object" },
    { val: 42, desc: "number" },
    { val: console, desc: "invalid object" },
  ])(
    "Group add / remove throws error with $desc",
    ({ val: invalidAddedElement }) => {
      const group: Group = new Group(context, "group1", sheet);
      jest.spyOn(lre, "error");

      /* @ts-expect-error Intended error to test */
      expect(() => group.add(invalidAddedElement)).toThrow();

      (lre.error as jest.Mock).mockClear();

      /* @ts-expect-error Intended error to test */
      expect(group.includes(invalidAddedElement)).toBeFalsy();
      expect(lre.error).toHaveBeenCalled();

      (lre.error as jest.Mock).mockClear();
      /* @ts-expect-error Intended error to test */
      group.remove(invalidAddedElement);

      expect(lre.error).toHaveBeenCalled();
    },
  );
});

describe("Event attached to group are attached to all items", () => {
  test("Update events are linked between component and group", () => {
    const group: Group = new Group(context, "group1", sheet, ["cmp1", "cmp2"]);
    const updateFn = jest.fn();
    group.on("update", updateFn);
    const cmp1: ComponentMock = sheet.raw().get("cmp1") as ComponentMock;
    const cmp2: ComponentMock = sheet.raw().get("cmp2") as ComponentMock;

    expect(updateFn).not.toHaveBeenCalled();

    cmp1.trigger("update");

    expect(updateFn).toHaveBeenCalledTimes(1);

    cmp2.trigger("update");

    expect(updateFn).toHaveBeenCalledTimes(2);

    const cmp3: ComponentMock = sheet.raw().get("cmp3") as ComponentMock;
    group.add("cmp3");
    updateFn.mockClear();
    cmp3.trigger("update");

    expect(updateFn).toHaveBeenCalledTimes(1);

    group.remove("cmp2");
    updateFn.mockClear();
    cmp2.value(4242);

    expect(updateFn).toHaveBeenCalledTimes(0);
  });

  test("Add and remove event", () => {
    const group: Group = new Group(context, "group1", sheet, [
      "cmp1",
      "cmp2",
      "cmp3",
    ]);
    const clickFn = jest.fn();
    group.on("click:label", clickFn);
    const cmp1: ComponentMock = sheet.raw().get("cmp1") as ComponentMock;

    expect(clickFn).not.toHaveBeenCalled();

    cmp1.trigger("click");

    expect(clickFn).toHaveBeenCalled();

    clickFn.mockClear();
    const clickFn2 = jest.fn();
    group.on("click:label", clickFn2);
    cmp1.trigger("click");

    expect(clickFn).not.toHaveBeenCalled();
    expect(clickFn2).toHaveBeenCalled();

    clickFn.mockClear();
    clickFn2.mockClear();
    group.off("click:label");
    cmp1.trigger("click");

    expect(clickFn).not.toHaveBeenCalled();
    expect(clickFn2).not.toHaveBeenCalled();

    clickFn.mockClear();
    group.once("click:try", clickFn);
    cmp1.trigger("click");
    cmp1.trigger("click");

    expect(clickFn).toHaveBeenCalledTimes(1);

    clickFn.mockClear();
    group.on("click", clickFn);
    cmp1.trigger("click");

    expect(clickFn).toHaveBeenCalledTimes(1);

    group.disableEvent("click");
    cmp1.trigger("click");
    cmp1.trigger("click");

    expect(clickFn).toHaveBeenCalledTimes(1);

    group.enableEvent("click");
    cmp1.trigger("click");

    expect(clickFn).toHaveBeenCalledTimes(2);
  });

  test("Events are added to newly added components", () => {
    const group: Group = new Group(context, "group1", sheet);
    const clickFn = jest.fn();
    group.on("click:label", clickFn);

    group.add("cmp1");
    const cmp1: ComponentMock = sheet.raw().get("cmp1") as ComponentMock;
    cmp1.trigger("click");

    expect(clickFn).toHaveBeenCalled();

    clickFn.mockClear();
    group.remove("cmp1");
    cmp1.trigger("click");

    expect(clickFn).not.toHaveBeenCalled();
  });
});

describe("Group get values", () => {
  test("Get/Set Values", () => {
    const group = sheet.group("group2", ["cmp1", "cmp2", "cmp3"]);

    expect(group.providedValue()).toMatchObject({
      cmp1: "val1",
      cmp2: "val2",
      cmp3: "val3",
    });

    group.providedValue({
      cmp1: "val11",
    });

    expect(sheet.get("cmp1")!.value()).toBe("val11");

    const cmp4 = sheet.get("cmp4")!;
    group.providedValue({
      cmp4: "val4",
    });

    expect(cmp4.value()).not.toBe("val4");

    group.add("cmp4");
    group.providedValue({
      cmp4: "val4",
    });

    expect(cmp4.value()).toBe("val4");

    group.providedValue("Hello");

    expect(sheet.get("cmp1")!.value()).toBe("Hello");
    expect(sheet.get("cmp2")!.value()).toBe("Hello");
    expect(sheet.get("cmp3")!.value()).toBe("Hello");
    expect(sheet.get("cmp4")!.value()).toBe("Hello");
  });

  test("Get/Set virtual values and rawValue", () => {
    const group = new Group(context, "group2", sheet, ["cmp1", "cmp2", "cmp3"]);

    expect(group.virtualValue()).toMatchObject({
      cmp1: null,
      cmp2: null,
      cmp3: null,
    });
    expect(group.rawValue()).toMatchObject({
      cmp1: "val1",
      cmp2: "val2",
      cmp3: "val3",
    });

    group.virtualValue({
      cmp1: "val11",
    });

    expect(sheet.get("cmp1")!.virtualValue()).toBe("val11");

    const cmp4 = sheet.get("cmp4")!;
    group.virtualValue({
      cmp4: "val4",
    });

    expect(cmp4.virtualValue()).not.toBe("val4");

    group.add("cmp4");
    group.virtualValue({
      cmp4: "val4",
    });

    expect(cmp4.virtualValue()).toBe("val4");
  });

  test("Get/Set Texts", () => {
    const group = new Group(context, "group2", sheet, ["cmp1", "cmp2", "cmp3"]);

    expect(group.text()).toMatchObject({
      cmp1: "txt1",
      cmp2: "txt2",
      cmp3: "txt3",
    });

    group.text({
      cmp1: "txt11",
    });

    expect(sheet.get("cmp1")!.text()).toBe("txt11");

    const cmp4 = sheet.get("cmp4")!;
    group.text({
      cmp4: "txt4",
    });

    expect(cmp4.text()).not.toBe("txt4");

    group.add("cmp4");
    group.text({
      cmp4: "txt4",
    });

    expect(cmp4.text()).toBe("txt4");
  });

  test("getClasses gives classes that are on ALL components", () => {
    const group = new Group(context, "group2", sheet, ["cmp1", "cmp2", "cmp3"]);

    expect(group.getClasses().sort()).toEqual(
      ["a", "b", "form-control", "text-input", "widget"].sort(),
    );

    sheet.get("cmp1")!.addClass("d");

    expect(group.getClasses().sort()).toEqual(
      ["a", "b", "d", "form-control", "text-input", "widget"].sort(),
    );
  });

  test("visible get / set", () => {
    const group = new Group(context, "group2", sheet, ["cmp1", "cmp2", "cmp3"]);

    expect(group.visible()).toBeTruthy();

    sheet.get("cmp1")!.hide();

    expect(group.visible()).toBeFalsy();

    sheet.get("cmp2")!.hide();
    sheet.get("cmp1")!.show();

    expect(group.visible()).toBeFalsy();

    sheet.get("cmp2")!.show();

    expect(group.visible()).toBeTruthy();

    group.visible({
      cmp1: false,
    });

    expect(sheet.get("cmp1")!.visible()).toBeFalsy();
    expect(group.visible()).toBeFalsy();

    group.visible(true);

    expect(sheet.get("cmp1")!.visible()).toBeTruthy();
    expect(group.visible()).toBeTruthy();

    const chk = sheet.get("checkbox")!;
    chk.value(false);
    group.visible(function () {
      return !!chk.value();
    });

    expect(group.visible()).toBeFalsy();
    expect(sheet.get("cmp1")!.visible()).toBeFalsy();

    chk.value(true);

    expect(group.visible()).toBeTruthy();
    expect(sheet.get("cmp1")!.visible()).toBeTruthy();
    expect(sheet.get("cmp2")!.visible()).toBeTruthy();
    expect(sheet.get("cmp3")!.visible()).toBeTruthy();

    group.remove("cmp1");
    chk.value(false);

    expect(group.visible()).toBeFalsy();
    expect(sheet.get("cmp1")!.visible()).toBeTruthy();
    expect(sheet.get("cmp2")!.visible()).toBeFalsy();
    expect(sheet.get("cmp3")!.visible()).toBeFalsy();
  });
});

describe("Group and context", () => {
  test("Group value is logged, not components", () => {
    const grp = sheet.group("grp", ["a", "b", "c"]);
    context.setMode("virtual");
    grp.providedValue();
    context.setMode("real");
    const accessLog = context.getPreviousAccessLog("value");

    expect(accessLog.map((l) => (l as Array<string>).join("-"))).toContain(
      sheet.getSheetId() + "-grp",
    );
    expect(accessLog).not.toContain("a");
    expect(accessLog).not.toContain("b");
    expect(accessLog).not.toContain("c");
  });
});

describe("Group as data provider", () => {
  test("Get Data from group original components", () => {
    //const cmp1 = sheet.get("cmp1")!;
  });
});

import { Group } from "../../src/component/group";
import { LRE } from "../../src/lre";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { MockedComponent } from "../mock/letsrole/component.mock";
import { initLetsRole } from "../mock/letsrole/letsrole.mock";
import { MockServer } from "../mock/letsrole/server.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

let sheet: Sheet;
global.lre = new LRE(modeHandlerMock);
initLetsRole();

beforeEach(() => {
  const server = new MockServer();
  const rawSheet = MockSheet({
    id: "main",
    data: {
      a: {
        b: {
          c: true,
        },
      },
      cmp1: "val1",
      cmp2: "val2",
      cmp3: "val3",
    },
  });
  server.registerMockedSheet(rawSheet, [
    {
      id: "cmp1",
      name: "cmp1",
      classes: ["a", "b", "c"],
      text: "txt1",
    },
    {
      id: "cmp2",
      name: "cmp1",
      classes: ["a", "d", "b"],
      text: "txt2",
    },
    {
      id: "cmp3",
      name: "cmp1",
      classes: ["b", "d", "a"],
      text: "txt3",
    },
  ]);
  sheet = new Sheet(
    rawSheet,
    new DataBatcher(modeHandlerMock, rawSheet),
    modeHandlerMock
  );
  jest.spyOn(sheet, "get");
  jest.spyOn(lre, "error");
});

describe("Component group is like a component", () => {
  test("Group construction", () => {
    const group: Group = new Group("group1", sheet);
    expect(sheet.get).not.toBeCalled();
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
    const group: Group = new Group("group1", sheet);
    const cmp1 = sheet.get("cmp1")!;
    const cmp2 = sheet.get("cmp2")!;

    group.add(cmp1!);
    group.add(cmp2!);

    (
      ["autoLoadSaveClasses", "toggle", "hide", "show"] as Array<
        keyof IComponent
      >
    ).forEach((method) => {
      jest.spyOn(cmp1, method);
      jest.spyOn(cmp2, method);
      /* @ts-ignore */
      group[method]();
      expect(cmp1[method]).toBeCalled();
      expect(cmp2[method]).toBeCalled();
    });

    expect(
      group
        .knownChildren()
        .map((c) => c.realId())
        .sort()
    ).toEqual([cmp1.realId(), cmp2.realId()].sort());

    jest.spyOn(cmp1, "setTooltip");
    jest.spyOn(cmp2, "setTooltip");
    group.setTooltip("test");
    expect(cmp1.setTooltip).toBeCalledTimes(1);
    expect(cmp2.setTooltip).toBeCalledTimes(1);
    expect((cmp1.setTooltip as jest.Mock).mock.calls[0].length).toBe(1);
    expect((cmp1.setTooltip as jest.Mock).mock.calls[0][0]).toBe("test");
    group.setTooltip("test", "right");
    expect(cmp1.setTooltip).toBeCalledTimes(2);
    expect(cmp2.setTooltip).toBeCalledTimes(2);
    expect((cmp1.setTooltip as jest.Mock).mock.calls[1].length).toBe(2);
    expect((cmp1.setTooltip as jest.Mock).mock.calls[1][0]).toBe("test");
    expect((cmp1.setTooltip as jest.Mock).mock.calls[1][1]).toBe("right");

    sheet.get("a")!.lreType("repeater");
    sheet.get("a.b")!.lreType("entry");
    const subCmp = sheet.get("a.b.c")!;
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
    expect(cmp1.addClass).toBeCalled();
    expect(cmp2.addClass).toBeCalled();
    expect(subCmp.addClass).toBeCalled();
    expect(group.removeClass("test")).toBe(group);
    expect(cmp1.removeClass).toBeCalled();
    expect(cmp2.removeClass).toBeCalled();
    expect(subCmp.removeClass).toBeCalled();
    expect(group.toggleClass("test")).toBe(group);
    expect(cmp1.toggleClass).toBeCalled();
    expect(cmp2.toggleClass).toBeCalled();
    expect(subCmp.toggleClass).toBeCalled();
  });
});

describe("Component group basics", () => {
  test("New group is empty", () => {
    const group: Group = new Group("group1", sheet);
    expect(group.count()).toBe(0);
  });
  test("Add / remove components", () => {
    const group: Group = new Group("group1", sheet, ["cmp1"]);
    expect(sheet.get).toBeCalledTimes(1);
    expect(group.count()).toBe(1);
    expect(group.includes("cmp1")).toBeTruthy();
    expect(group.contains("cmp1")).toBeTruthy();
    expect(group.has("cmp1")).toBeTruthy();

    const addCb = jest.fn();
    const removeCb = jest.fn();
    group.on("add", addCb);
    group.on("remove", removeCb);
    group.add("cmp2");

    expect(sheet.get).toBeCalledTimes(2);
    expect(group.count()).toBe(2);
    expect(addCb).toBeCalledTimes(1);

    const cmp3 = sheet.get("cmp3")!;
    (sheet.get as jest.Mock).mockClear();
    expect(group.includes("cmp3")).toBeFalsy();
    expect(group.contains("cmp3")).toBeFalsy();
    expect(group.has("cmp3")).toBeFalsy();
    expect(group.includes(cmp3)).toBeFalsy();
    expect(group.contains(cmp3)).toBeFalsy();
    expect(group.has(cmp3)).toBeFalsy();
    group.add(cmp3);
    expect(sheet.get).toBeCalledTimes(0);
    expect(group.count()).toBe(3);
    expect(addCb).toBeCalledTimes(2);
    expect(group.includes("cmp3")).toBeTruthy();
    expect(group.contains("cmp3")).toBeTruthy();
    expect(group.has("cmp3")).toBeTruthy();
    expect(group.includes(cmp3)).toBeTruthy();
    expect(group.contains(cmp3)).toBeTruthy();
    expect(group.has(cmp3)).toBeTruthy();

    (sheet.get as jest.Mock).mockClear();
    group.add("cmp3");
    expect(group.count()).toBe(3);
    expect(addCb).toBeCalledTimes(2);

    expect(removeCb).toBeCalledTimes(0);
    group.remove(cmp3);
    expect(group.count()).toBe(2);
    expect(removeCb).toBeCalledTimes(1);
    group.remove(cmp3);
    expect(removeCb).toBeCalledTimes(1);

    group.remove("cmp2");
    expect(group.count()).toBe(1);
    expect(removeCb).toBeCalledTimes(2);

    group.add(MockServer.UNKNOWN_CMP_ID);
    expect(group.count()).toBe(1);

    group.add(sheet.get(MockServer.UNKNOWN_CMP_ID)!);
    expect(group.count()).toBe(1);
    expect(group.includes(MockServer.NON_EXISTING_CMP_ID)).toBeFalsy();
  });

  test("Large group", () => {
    const group: Group = new Group("group1", sheet, ["cmp1", "cmp2", "cmp3"]);
    expect(group.count()).toBe(3);
    expect(sheet.get).toBeCalledTimes(3);
  });

  test.each([
    { val: [], desc: "array" },
    { val: {}, desc: "object" },
    { val: 42, desc: "number" },
    { val: console, desc: "invalid object" },
  ])(
    "Group add / remove throws error with $desc",
    ({ val: invalidAddedElement }) => {
      const group: Group = new Group("group1", sheet);
      (lre.error as jest.Mock).mockClear();
      /* @ts-expect-error */
      group.add(invalidAddedElement);
      expect(lre.error).toBeCalled();

      (lre.error as jest.Mock).mockClear();
      /* @ts-expect-error */
      expect(group.includes(invalidAddedElement)).toBeFalsy();
      expect(lre.error).toBeCalled();

      (lre.error as jest.Mock).mockClear();
      /* @ts-expect-error */
      group.remove(invalidAddedElement);
      expect(lre.error).toBeCalled();
    }
  );
});

describe("Event attached to group are attached to all items", () => {
  test("Add and remove event", () => {
    const group: Group = new Group("group1", sheet, ["cmp1", "cmp2", "cmp3"]);
    const clickFn = jest.fn();
    group.on("click:label", clickFn);
    const cmp1: MockedComponent = sheet.raw().get("cmp1") as MockedComponent;

    expect(clickFn).not.toBeCalled();
    cmp1._trigger("click");
    expect(clickFn).toBeCalled();

    clickFn.mockClear();
    const clickFn2 = jest.fn();
    group.on("click:label", clickFn2);
    cmp1._trigger("click");
    expect(clickFn).not.toBeCalled();
    expect(clickFn2).toBeCalled();

    clickFn.mockClear();
    clickFn2.mockClear();
    group.off("click:label");
    cmp1._trigger("click");
    expect(clickFn).not.toBeCalled();
    expect(clickFn2).not.toBeCalled();

    clickFn.mockClear();
    group.once("click:try", clickFn);
    cmp1._trigger("click");
    cmp1._trigger("click");
    expect(clickFn).toBeCalledTimes(1);

    clickFn.mockClear();
    group.on("click", clickFn);
    cmp1._trigger("click");
    expect(clickFn).toBeCalledTimes(1);
    group.disableEvent("click");
    cmp1._trigger("click");
    cmp1._trigger("click");
    expect(clickFn).toBeCalledTimes(1);
    group.enableEvent("click");
    cmp1._trigger("click");
    expect(clickFn).toBeCalledTimes(2);
  });

  test("Events are added to newly added components", () => {
    const group: Group = new Group("group1", sheet);
    const clickFn = jest.fn();
    group.on("click:label", clickFn);

    group.add("cmp1");
    const cmp1: MockedComponent = sheet.raw().get("cmp1") as MockedComponent;
    cmp1._trigger("click");
    expect(clickFn).toBeCalled();

    clickFn.mockClear();
    group.remove("cmp1");
    cmp1._trigger("click");
    expect(clickFn).not.toBeCalled();
  });
});

describe("Group get values", () => {
  test("Get/Set Values", () => {
    const group = new Group("group2", sheet, ["cmp1", "cmp2", "cmp3"]);
    expect(group.value()).toMatchObject({
      cmp1: "val1",
      cmp2: "val2",
      cmp3: "val3",
    });
    group.value({
      cmp1: "val11",
    });
    expect(sheet.get("cmp1")!.value()).toBe("val11");
    const cmp4 = sheet.get("cmp4")!;
    group.value({
      cmp4: "val4",
    });
    expect(cmp4.value()).not.toBe("val4");
    group.add("cmp4");
    group.value({
      cmp4: "val4",
    });
    expect(cmp4.value()).toBe("val4");

    group.value('Hello');
    expect(sheet.get("cmp1")!.value()).toBe("Hello");
    expect(sheet.get("cmp2")!.value()).toBe("Hello");
    expect(sheet.get("cmp3")!.value()).toBe("Hello");
    expect(sheet.get("cmp4")!.value()).toBe("Hello");
  });

  test("Get/Set virtual values and rawValue", () => {
    const group = new Group("group2", sheet, ["cmp1", "cmp2", "cmp3"]);
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
    const group = new Group("group2", sheet, ["cmp1", "cmp2", "cmp3"]);
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
    const group = new Group("group2", sheet, ["cmp1", "cmp2", "cmp3"]);
    expect(group.getClasses().sort()).toEqual(["a", "b"].sort());
    sheet.get("cmp1")!.addClass("d");
    expect(group.getClasses().sort()).toEqual(["a", "b", "d"].sort());
  });

  test("visible get / set", () => {
    const group = new Group("group2", sheet, ["cmp1", "cmp2", "cmp3"]);
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

    const chk = sheet.get('checkbox')!;
    chk.value(false);
    group.visible(function () {
      return chk.value();
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

import { Component } from "../../src/component";
import { Choice } from "../../src/component/choice";
import { Container } from "../../src/component/container";
import { ComponentFactory } from "../../src/component/factory";
import { Icon } from "../../src/component/icon";
import { Label } from "../../src/component/label";
import { MultiChoice } from "../../src/component/multichoice";
import { LRE } from "../../src/lre";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { modeHandlerMock } from "../mock/modeHandler.mock";

jest.mock("../../src/lre");

global.lre = new LRE(modeHandlerMock);
let server: ServerMock;

describe("Component factory", () => {
  let rawCmp: LetsRole.Component, sheet: Sheet;
  let rawSheet: LetsRole.Sheet;
  beforeEach(() => {
    server = new ServerMock({
      views: [
        {
          id: "main",
          children: [
            {
              id: "cmp1",
              className: "Color",
            },
            {
              id: "lbl",
              className: "Label",
              text: "Hello",
            },
            {
              id: "rep1",
              className: "Repeater",
              viewId: "editView",
              readViewId: "readView",
            },
            {
              id: "choice",
              className: "Choice",
            },
            {
              id: "multipleChoice",
              className: "Choice",
              multiple: true,
            },
            {
              id: "icon",
              className: "Icon",
              iconName: "icon",
            },
            {
              id: "widgetContainer",
              children: [
                {
                  id: "cmp1",
                  className: "Color",
                },
              ],
              className: "Container",
            },
            {
              id: "view",
              children: [
                {
                  id: "cmp1",
                  className: "Color",
                },
              ],
              className: "View",
            },
            {
              id: "row",
              children: [
                {
                  id: "cmp1",
                  className: "Color",
                },
              ],
              className: "Row",
            },
            {
              id: "column",
              children: [
                {
                  id: "cmp1",
                  className: "Color",
                },
              ],
              className: "Column",
            },
          ],
          className: "View",
        },
        {
          id: "editView",
          children: [
            {
              id: "txt",
              className: "TextInput",
              defaultValue: "",
            },
          ],
          className: "View",
        },
        {
          id: "readView",
          children: [
            {
              id: "lbl",
              className: "Label",
              text: "",
            },
          ],
          className: "View",
        },
      ],
    });
    rawSheet = server.openView("main", "123", {
      rep1: { entry1: { txt: "hello", lbl: "Hello Read" } },
    });
    sheet = new Sheet(
      rawSheet,
      new DataBatcher(modeHandlerMock, rawSheet),
      modeHandlerMock,
    );
    rawCmp = rawSheet.get("cmp1");
  });
  test("Simple components", () => {
    const cmp = ComponentFactory.create(
      rawCmp,
      sheet as ComponentContainer<ComponentSearchResult>,
    );
    expect(cmp).toBeInstanceOf(Component);
    expect(cmp.sheet()).toStrictEqual(sheet);
    expect(cmp.parent()).toStrictEqual(sheet);
  });

  test("Component in repeater", () => {
    const rawRep = rawSheet.get("rep1");
    const rawEntry = rawRep.find("entry1");
    const rep = ComponentFactory.create(
      rawRep,
      sheet as ComponentContainer<ComponentSearchResult>,
    );
    expect(rep.lreType()).toBe<ComponentType>("repeater");
    expect(rep.entry()).toBeUndefined();
    expect(rep.repeater()).toBeUndefined();
    expect(rep.parent()).toStrictEqual(sheet);
    expect(rep.sheet()).toStrictEqual(sheet);
    expect(rep.realId()).toStrictEqual("rep1");
    const entry = ComponentFactory.create(rawEntry, rep);
    expect(entry.lreType()).toBe("entry");
    expect(entry.entry()).toBeUndefined();
    expect(entry.repeater()).toStrictEqual(rep);
    expect(entry.parent()).toStrictEqual(rep);
    expect(entry.sheet()).toStrictEqual(sheet);
    expect(entry.realId()).toStrictEqual("rep1.entry1");
    const cmp = ComponentFactory.create(rawCmp, entry);
    expect(cmp.lreType()).toBe<ComponentType>("component");
    expect(cmp.entry()).toStrictEqual(entry);
    expect(cmp.repeater()).toStrictEqual(rep);
    expect(cmp.parent()).toStrictEqual(entry);
    expect(cmp.sheet()).toStrictEqual(sheet);
    expect(cmp.realId()).toStrictEqual("rep1.entry1.cmp1");
  });

  test("Various component creation", () => {
    const rawChoice = rawSheet.get("choice");
    expect(
      ComponentFactory.create(
        rawChoice,
        sheet as ComponentContainer<ComponentSearchResult>,
      ),
    ).toBeInstanceOf(Choice);
    const rawMultipleChoice = rawSheet.get("multipleChoice");
    expect(
      ComponentFactory.create(
        rawMultipleChoice,
        sheet as ComponentContainer<ComponentSearchResult>,
      ),
    ).toBeInstanceOf(MultiChoice);
    const rawIcon = rawSheet.get("icon");
    expect(
      ComponentFactory.create(
        rawIcon,
        sheet as ComponentContainer<ComponentSearchResult>,
      ),
    ).toBeInstanceOf(Icon);
    const label = rawSheet.get("lbl");
    expect(
      ComponentFactory.create(
        label,
        sheet as ComponentContainer<ComponentSearchResult>,
      ),
    ).toBeInstanceOf(Label);
    const container1 = rawSheet.get("widgetContainer");
    expect(
      ComponentFactory.create(
        container1,
        sheet as ComponentContainer<ComponentSearchResult>,
      ),
    ).toBeInstanceOf(Container);
    const container2 = rawSheet.get("view");
    expect(
      ComponentFactory.create(
        container2,
        sheet as ComponentContainer<ComponentSearchResult>,
      ),
    ).toBeInstanceOf(Container);
    const container3 = rawSheet.get("row");
    expect(
      ComponentFactory.create(
        container3,
        sheet as ComponentContainer<ComponentSearchResult>,
      ),
    ).toBeInstanceOf(Container);
    const container4 = rawSheet.get("column");
    expect(
      ComponentFactory.create(
        container4,
        sheet as ComponentContainer<ComponentSearchResult>,
      ),
    ).toBeInstanceOf(Container);
  });
});

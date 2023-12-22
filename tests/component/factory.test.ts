import { Component } from "../../src/component";
import { Choice } from "../../src/component/choice";
import { Container } from "../../src/component/container";
import { ComponentFactory } from "../../src/component/factory";
import { Icon } from "../../src/component/icon";
import { Label } from "../../src/component/label";
import { MultiChoice } from "../../src/component/multichoice";
import { LRE } from "../../src/lre";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";
import { MockComponent } from "../mock/letsrole/component.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { modeHandlerMock } from "../mock/modeHandler.mock";

jest.mock("../../src/lre");

global.lre = new LRE(modeHandlerMock);

describe("Component factory", () => {
  let rawCmp: LetsRole.Component, sheet: Sheet;
  let rawSheet: LetsRole.Sheet;
  beforeAll(() => {
    rawSheet = MockSheet({
      id: "main",
      realId: "123",
    });
    sheet = new Sheet(rawSheet, new DataBatcher(modeHandlerMock, rawSheet), modeHandlerMock);
    rawCmp = MockComponent({
      id: "cmp1",
      sheet: rawSheet,
    });
  });
  test("Simple components", () => {
    const cmp = ComponentFactory.create(rawCmp, sheet);
    expect(cmp).toBeInstanceOf(Component);
    expect(cmp.sheet()).toStrictEqual(sheet);
    expect(cmp.parent()).toStrictEqual(sheet);
  });

  test("Component in repeater", () => {
    const rawRep = MockComponent({
      id: "rep1",
      sheet: rawSheet,
      classes: ["repeater"],
    });
    const rawEntry = MockComponent({
      id: "entry1",
      sheet: rawSheet,
      classes: ["repeater-element"],
    });
    const rep = ComponentFactory.create(rawRep, sheet);
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
    const rawChoice = MockComponent({
      id: "choice",
      sheet: rawSheet,
      classes: ["choice"],
    });
    expect(ComponentFactory.create(rawChoice, sheet)).toBeInstanceOf(Choice);
    const rawMultipleChoice = MockComponent({
      id: "multiplechoice",
      sheet: rawSheet,
      classes: ["choice", "multiple"],
    });
    expect(ComponentFactory.create(rawMultipleChoice, sheet)).toBeInstanceOf(
      MultiChoice
    );
    const rawIcon = MockComponent({
      id: "icon",
      sheet: rawSheet,
      classes: ["icon"],
    });
    expect(ComponentFactory.create(rawIcon, sheet)).toBeInstanceOf(Icon);
    const label = MockComponent({
      id: "label",
      sheet: rawSheet,
      classes: ["label"],
    });
    expect(ComponentFactory.create(label, sheet)).toBeInstanceOf(Label);
    const container1 = MockComponent({
      id: "ctnr1",
      sheet: rawSheet,
      classes: ["widget-container"],
    });
    expect(ComponentFactory.create(container1, sheet)).toBeInstanceOf(
      Container
    );
    const container2 = MockComponent({
      id: "ctnr2",
      sheet: rawSheet,
      classes: ["view"],
    });
    expect(ComponentFactory.create(container2, sheet)).toBeInstanceOf(
      Container
    );
    const container3 = MockComponent({
      id: "ctnr3",
      sheet: rawSheet,
      classes: ["row"],
    });
    expect(ComponentFactory.create(container3, sheet)).toBeInstanceOf(
      Container
    );
    const container4 = MockComponent({
      id: "ctnr4",
      sheet: rawSheet,
      classes: ["col"],
    });
    expect(ComponentFactory.create(container4, sheet)).toBeInstanceOf(
      Container
    );
  });
});

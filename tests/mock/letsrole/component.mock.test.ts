import {
  ComponentMock,
  FailingComponent,
  FailingExistingComponent,
} from "../../../src/mock/letsrole/component.mock";
import { ServerMock } from "../../../src/mock/letsrole/server.mock";
import { ViewMock } from "../../../src/mock/letsrole/view.mock";

const countClass = (cl: LetsRole.ClassName) => {
  return (previousValue: number, currentValue: string) => {
    return previousValue + (currentValue === cl ? 1 : 0);
  };
};

describe("ComponentMock behavior", () => {
  let sheet: ViewMock;
  let sheet2: ViewMock;
  let server: ServerMock;
  let componentContainer: ComponentMock;
  let componentLabel: ComponentMock;
  let componentSubLabel: ComponentMock;
  let componentInput: ComponentMock;
  const componentDefaultValue = "Hello";
  const system: LetsRoleMock.SystemDefinitions = {
    views: [
      {
        id: "main",
        name: "main",
        children: [
          {
            id: "ah",
            name: "ah",
            className: "Container",
            children: [
              {
                id: "oh2",
                name: "oh",
                className: "Label",
              },
              {
                id: "textInput",
                name: "input",
                className: "TextInput",
                defaultValue: componentDefaultValue,
              },
            ],
          },
          {
            id: "oh",
            name: "oh",
            className: "Label",
          },
        ],
        className: "View",
      },
    ],
  };

  beforeEach(() => {
    server = new ServerMock(system);
    sheet = server.openView("main", "123", {});
    sheet2 = server.openView("main", "123", {});
    componentContainer = sheet.get("ah") as ComponentMock;
    componentLabel = sheet.get("oh") as ComponentMock;
    componentSubLabel = sheet.get("oh2") as ComponentMock;
    componentInput = sheet.get("textInput") as ComponentMock;
  });

  test("id behavior", () => {
    expect(componentContainer.id()).toBe(system.views![0].children[0].id);
    expect(componentLabel.id()).toBe(system.views![0].children[1].id);
  });

  test("find behavior", () => {
    const found = componentLabel.find("oh");
    expect(found).toBeInstanceOf(FailingExistingComponent);
    expect(found.id()).toBe("oh");
    //found = componentContainer.find("oh");
    //expect(found).toBeInstanceOf(FailingOuterExistingComponent);
    //expect(found.id()).toBe(null);
    //found = componentContainer.find("oh2");
    //expect(found).toBeInstanceOf(FailingExistingComponent);
  });

  test("index basic behavior", () => {
    expect(componentContainer.index()).toBe(null);
  });

  test("name behavior", () => {
    expect(componentContainer.name()).toBe(system.views![0].children[0].name);
    expect(componentLabel.name()).toBe(system.views![0].children[1].name);
  });

  test("sheet behavior", () => {
    expect(componentContainer.sheet()).toBe(sheet);
    expect(componentContainer.find("oh2").sheet()).toBe(sheet);
  });

  test("parent behavior", () => {
    const child = sheet.get("oh2");
    const container = child.parent();
    expect(container).toBeInstanceOf(ComponentMock);
    expect(container.id()).toBe(system.views![0].children[0].id);
    const supposedSheet = componentContainer.parent();
    expect(supposedSheet).toBeInstanceOf(ComponentMock);
    expect(supposedSheet.id()).toBe(system.views![0].id);
  });

  test("events behavior", () => {
    const cb0 = jest.fn();
    let arg: ComponentMock;
    const cb = jest.fn((a) => (arg = a));
    componentContainer.on("click", cb0);
    componentContainer.on("click", cb);
    componentContainer.trigger("click");
    expect(cb0).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(arg!).toBeInstanceOf(ComponentMock);
    expect(arg!.id()).toBe("ah");
    cb.mockClear();
    componentContainer.off("click");
    componentContainer.trigger("click");
    expect(cb0).not.toHaveBeenCalled();
    expect(cb).not.toHaveBeenCalled();
  });

  test("click and change bubbling behavior", () => {
    const cb = jest.fn();
    componentContainer.on("click", cb);
    componentSubLabel.trigger("click");
    expect(cb).toHaveBeenCalledTimes(1);
    sheet.componentChangedManually(componentSubLabel.id()!, 42);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("value changed events", () => {
    const cbUpdate = jest.fn();
    const cbChange = jest.fn();
    componentInput.on("update", cbUpdate);
    componentInput.on("change", cbChange);
    componentInput.value("42");
    expect(cbUpdate).toHaveBeenCalledTimes(1);
    expect(cbChange).toHaveBeenCalledTimes(0);
    sheet.setData({
      test1: 13,
    });
    expect(cbUpdate).toHaveBeenCalledTimes(1);
    expect(cbChange).toHaveBeenCalledTimes(0);
    sheet.setData({
      [componentInput.id()!]: 13,
    });
    expect(cbUpdate).toHaveBeenCalledTimes(2);
    expect(cbChange).toHaveBeenCalledTimes(0);
    sheet.componentChangedManually(componentInput.id()!, 4242);
    expect(cbUpdate).toHaveBeenCalledTimes(3);
    expect(cbChange).toHaveBeenCalledTimes(1);
    sheet.componentChangedManually(componentInput.id()!, 4242);
    expect(cbUpdate).toHaveBeenCalledTimes(3);
    expect(cbChange).toHaveBeenCalledTimes(1);
  });

  it.todo("text() returns null for multichoice");
  it.todo("text() returns undefined for choice with no table or label");

  test("event delegation behavior", () => {
    let arg: ComponentMock;
    const cb = jest.fn((a) => (arg = a));
    componentContainer.on("click", ".label", cb);
    componentSubLabel.trigger("click");
    expect(cb).toHaveBeenCalledTimes(1);
    expect(arg!).toBeInstanceOf(ComponentMock);
    expect(arg!.id()).toBe("oh2");
    cb.mockClear();
    componentContainer.off("click", ".label");
    componentSubLabel.trigger("click");
    expect(cb).not.toHaveBeenCalled();
    componentContainer.on("click", componentSubLabel.id()!, cb);
    componentSubLabel.trigger("click");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("update event delegation must not work, but change does work", () => {
    const cb = jest.fn();
    const cb2 = jest.fn();
    componentContainer.on("update", ".widget", cb);
    componentContainer.on("change", ".widget", cb2);
    sheet.componentChangedManually(componentInput.id()!, Math.random());
    expect(cb).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it.todo("event delegation with class doesn't work with expanded choices");
  it.todo("event keyup work only on text input");
  it.todo("event mouseleave and mouseenter");

  test("class behavior", () => {
    expect(componentContainer.hasClass("widget")).toBeTruthy();
    expect(componentContainer.hasClass("toto")).toBeFalsy();
    componentContainer.addClass("toto");
    expect(componentContainer.hasClass("toto")).toBeTruthy();
    expect(componentContainer.getClasses()).toContainEqual("toto");
    componentContainer.removeClass("toto");
    expect(componentContainer.hasClass("toto")).toBeFalsy();
    componentContainer.toggleClass("toto");
    expect(componentContainer.hasClass("toto")).toBeTruthy();
    componentContainer.toggleClass("toto");
    expect(componentContainer.hasClass("toto")).toBeFalsy();
    componentContainer.addClass("toto");
    componentContainer.addClass("toto");
    let classes = componentContainer.getClasses();
    expect(classes.reduce(countClass("toto"), 0)).toBe(2);
    componentContainer.removeClass("toto");
    classes = componentContainer.getClasses();
    expect(classes.reduce(countClass("toto"), 0)).toBe(0);
  });

  test("hide/show behavior", () => {
    expect(componentSubLabel.hasClass("d-none")).toBeFalsy();
    componentSubLabel.hide();
    expect(componentSubLabel.hasClass("d-none")).toBeTruthy();
    componentSubLabel.show();
    expect(componentSubLabel.hasClass("d-none")).toBeFalsy();
  });

  test("value behavior", () => {
    expect(componentInput.value()).toBe(componentDefaultValue);
    expect(sheet.getData()[componentInput.id()!]).toBeUndefined();
    componentInput.value("42");
    expect(componentInput.value()).toBe("42");
    expect(sheet.getData()[componentInput.id()!]).toBe("42");
    sheet.setData({
      [componentInput.id()!]: "4343",
    });
    expect(componentInput.value()).toBe("4343");
    expect(sheet2.get(componentInput.id()!).value()).toBe("4343");
  });
});

describe("FailingComponent behavior", () => {
  let sheet: ViewMock;
  let failingComponent: FailingComponent;
  beforeEach(() => {
    const server = new ServerMock({
      views: [
        {
          id: "main",
          name: "main",
          children: [],
          className: "View",
        },
      ],
    });
    sheet = server.openView("main", "123", {});
    failingComponent = new FailingComponent(sheet, "ah");
  });

  test("id is null (and throws if component from FailingComponent.find)", () => {
    expect(failingComponent.id()).toBe(null);
    const secondFailingComponent = new FailingComponent(sheet, "");
    expect(() => secondFailingComponent.id()).toThrow();
  });

  test("parent throws exception", () => {
    expect(() => failingComponent.parent()).toThrow();
  });

  test("find throws exception", () => {
    const found = failingComponent.find("oh");
    expect(found).toBeInstanceOf(FailingComponent);
    expect(() => found.id()).toThrow();
  });

  test("on throws exception", () => {
    expect(() => failingComponent.on("click", () => {})).toThrow();
  });

  test("off does not throw exception", () => {
    expect(() => failingComponent.off("click")).not.toThrow();
  });

  test("hide throws exception", () => {
    expect(() => failingComponent.hide()).toThrow();
  });

  test("show throws exception", () => {
    expect(() => failingComponent.show()).toThrow();
  });

  test("addClass throws exception", () => {
    expect(() => failingComponent.addClass("ah")).toThrow();
  });

  test("removeClass throws exception", () => {
    expect(() => failingComponent.removeClass("ah")).toThrow();
  });

  test("toggleClass throws exception", () => {
    expect(() => failingComponent.toggleClass("ah")).toThrow();
  });

  test("hasClass throws exception", () => {
    expect(() => failingComponent.hasClass("ah")).toThrow();
  });

  test("getClasses throws exception", () => {
    expect(() => failingComponent.getClasses()).toThrow();
  });

  test("value works well", () => {
    expect(failingComponent.value()).toBe(null);
    expect(() => failingComponent.value(4242)).not.toThrow();
    expect(failingComponent.value()).toBe(4242);
  });

  test("FailingComponent virtualValue always returns null", () => {
    failingComponent.value(42);
    expect(failingComponent.value()).toBe(42);
    expect(failingComponent.virtualValue()).toBe(null);
    expect(() => failingComponent.virtualValue(4242)).not.toThrow();
    expect(failingComponent.virtualValue()).toBe(null);
    expect(failingComponent.value()).toBe(42);
  });

  test("rawValue works", () => {
    failingComponent.value(42);
    expect(failingComponent.value()).toBe(42);
    expect(failingComponent.rawValue()).toBe(42);
  });

  test("text throws exception", () => {
    expect(() => failingComponent.text()).toThrow();
    expect(() => failingComponent.text("ah")).toThrow();
  });

  test("visible throws exception", () => {
    expect(() => failingComponent.visible()).toThrow();
  });

  test("sheet works", () => {
    expect(failingComponent.sheet()).toBeInstanceOf(ViewMock);
  });

  test("setToolTip throws exception", () => {
    expect(() => failingComponent.setToolTip("ah")).toThrow();
  });

  test("setChoices works", () => {
    expect(failingComponent.setChoices({})).toBe(false);
  });

  test("name returns null", () => {
    expect(failingComponent.name()).toBe(null);
  });

  test("index throws exception", () => {
    expect(() => failingComponent.index()).toThrow();
  });

  test("getType behavior", () => {
    expect(failingComponent.getType()).toBe("_Unknown_");
  });
});

describe("ComponentMock event bubbling behavior", () => {
  let sheet: ViewMock;
  let server: ServerMock;
  let componentContainer: ComponentMock;
  let componentSub: ComponentMock;
  let componentLabel: ComponentMock;
  const system: LetsRoleMock.SystemDefinitions = {
    views: [
      {
        id: "main",
        name: "main",
        className: "View",
        children: [
          {
            id: "container",
            name: "ah",
            className: "Container",
            children: [
              {
                id: "sub",
                name: "ah",
                className: "Container",
                classes: "classOnSub",
                children: [
                  {
                    id: "label",
                    name: "oh",
                    className: "Label",
                    classes: "classOnLabel",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    server = new ServerMock(system);
    sheet = server.openView("main", "123", {});
    componentContainer = sheet.get("container") as ComponentMock;
    componentSub = sheet.get("sub") as ComponentMock;
    componentLabel = sheet.get("label") as ComponentMock;
  });

  test("delegated click events are bubbled in the good order", () => {
    const clickContainer = jest.fn();
    const clickSub = jest.fn();
    const clickLabel = jest.fn();

    componentContainer.on("click", clickContainer);
    componentSub.on("click", clickSub);
    componentLabel.on("click", clickLabel);

    componentLabel.trigger("click");
    expect(clickContainer).toHaveBeenCalledTimes(1);
    expect(clickSub).toHaveBeenCalledTimes(1);
    expect(clickLabel).toHaveBeenCalledTimes(1);
    expect(clickLabel.mock.invocationCallOrder[0]).toBeLessThan(
      clickSub.mock.invocationCallOrder[0],
    );
    expect(clickSub.mock.invocationCallOrder[0]).toBeLessThan(
      clickContainer.mock.invocationCallOrder[0],
    );
    jest.clearAllMocks();

    componentSub.trigger("click");
    expect(clickContainer).toHaveBeenCalledTimes(1);
    expect(clickSub).toHaveBeenCalledTimes(1);
    expect(clickLabel).toHaveBeenCalledTimes(0);
    expect(clickSub.mock.invocationCallOrder[0]).toBeLessThan(
      clickContainer.mock.invocationCallOrder[0],
    );
  });

  test("Events (direct or delegated) are launched in order of declaration", () => {
    const clickContainer = jest.fn();
    const clickDelegated = jest.fn();
    const clickDirect = jest.fn();

    componentContainer.on("click", ".classOnLabel", clickDelegated);
    componentLabel.on("click", clickDirect);
    componentContainer.on("click", clickContainer);

    componentLabel.trigger("click");
    expect(clickContainer).toHaveBeenCalledTimes(1);
    expect(clickDirect).toHaveBeenCalledTimes(1);
    expect(clickDelegated).toHaveBeenCalledTimes(1);
    expect(clickDirect.mock.invocationCallOrder[0]).toBeLessThan(
      clickDelegated.mock.invocationCallOrder[0],
    );
    expect(clickDelegated.mock.invocationCallOrder[0]).toBeLessThan(
      clickContainer.mock.invocationCallOrder[0],
    );
  });

  test("Complete event test sequence", () => {
    const clickContainer = jest.fn();
    const clickSub = jest.fn();
    const clickLabel = jest.fn();

    componentContainer.on("click", clickContainer);
    componentSub.on("click", clickSub);
    componentLabel.on("click", clickLabel);

    const clickLabelDelegatedByIdOnContainer = jest.fn();
    const clickLabelDelegatedByIdOnSub = jest.fn();

    componentContainer.on("click", "label", clickLabelDelegatedByIdOnContainer);
    componentSub.on("click", "label", clickLabelDelegatedByIdOnSub);

    const clickLabelDelegatedByClassOnContainer = jest.fn();
    const clickLabelDelegatedByClassOnSub = jest.fn();

    componentContainer.on(
      "click",
      ".classOnLabel",
      clickLabelDelegatedByClassOnContainer,
    );
    componentSub.on("click", ".classOnLabel", clickLabelDelegatedByClassOnSub);

    const clickSubDelegatedByClassOnContainer = jest.fn();
    const clickSubDelegatedByIdOnContainer = jest.fn();

    componentContainer.on(
      "click",
      ".classOnSub",
      clickSubDelegatedByClassOnContainer,
    );
    componentContainer.on("click", "sub", clickSubDelegatedByIdOnContainer);

    componentContainer.trigger("click");
    expect(clickContainer).toHaveBeenCalledTimes(1);
    expect(clickSub).toHaveBeenCalledTimes(0);
    expect(clickLabel).toHaveBeenCalledTimes(0);
    expect(clickLabelDelegatedByIdOnContainer).toHaveBeenCalledTimes(0);
    expect(clickLabelDelegatedByIdOnSub).toHaveBeenCalledTimes(0);
    expect(clickLabelDelegatedByClassOnContainer).toHaveBeenCalledTimes(0);
    expect(clickLabelDelegatedByClassOnSub).toHaveBeenCalledTimes(0);
    expect(clickSubDelegatedByClassOnContainer).toHaveBeenCalledTimes(0);
    expect(clickSubDelegatedByIdOnContainer).toHaveBeenCalledTimes(0);

    jest.clearAllMocks();

    componentSub.trigger("click");
    expect(clickContainer).toHaveBeenCalledTimes(1);
    expect(clickSub).toHaveBeenCalledTimes(1);
    expect(clickLabel).toHaveBeenCalledTimes(0);
    expect(clickLabelDelegatedByIdOnContainer).toHaveBeenCalledTimes(0);
    expect(clickLabelDelegatedByIdOnSub).toHaveBeenCalledTimes(0);
    expect(clickLabelDelegatedByClassOnContainer).toHaveBeenCalledTimes(0);
    expect(clickLabelDelegatedByClassOnSub).toHaveBeenCalledTimes(0);
    expect(clickSubDelegatedByClassOnContainer).toHaveBeenCalledTimes(1);
    expect(clickSubDelegatedByIdOnContainer).toHaveBeenCalledTimes(1);

    expect(clickSub.mock.invocationCallOrder[0]).toBeLessThan(
      clickContainer.mock.invocationCallOrder[0],
    );
    expect(clickContainer.mock.invocationCallOrder[0]).toBeLessThan(
      clickSubDelegatedByClassOnContainer.mock.invocationCallOrder[0],
    );
    expect(
      clickSubDelegatedByClassOnContainer.mock.invocationCallOrder[0],
    ).toBeLessThan(
      clickSubDelegatedByIdOnContainer.mock.invocationCallOrder[0],
    );

    jest.clearAllMocks();
    componentLabel.trigger("click");
    expect(clickContainer).toHaveBeenCalledTimes(1);
    expect(clickSub).toHaveBeenCalledTimes(1);
    expect(clickLabel).toHaveBeenCalledTimes(1);
    expect(clickLabelDelegatedByIdOnContainer).toHaveBeenCalledTimes(1);
    expect(clickLabelDelegatedByIdOnSub).toHaveBeenCalledTimes(1);
    expect(clickLabelDelegatedByClassOnContainer).toHaveBeenCalledTimes(1);
    expect(clickLabelDelegatedByClassOnSub).toHaveBeenCalledTimes(1);
    expect(clickSubDelegatedByClassOnContainer).toHaveBeenCalledTimes(0);
    expect(clickSubDelegatedByIdOnContainer).toHaveBeenCalledTimes(0);

    [
      clickLabel,
      clickSub,
      clickLabelDelegatedByIdOnSub,
      clickLabelDelegatedByClassOnSub,
      clickContainer,
      clickLabelDelegatedByIdOnContainer,
      clickLabelDelegatedByClassOnContainer,
    ].reduce((previousValue: jest.Mock | null, currentValue: jest.Mock) => {
      if (previousValue) {
        expect(currentValue.mock.invocationCallOrder[0]).toBeGreaterThan(
          previousValue.mock.invocationCallOrder[0],
        );
      }

      return currentValue;
    }, null);
  });
});

describe("FailingExistingComponent behavior", () => {
  let sheet: ViewMock;
  let failingComponent: FailingExistingComponent;
  beforeEach(() => {
    const server = new ServerMock({
      views: [
        {
          id: "main",
          name: "main",
          children: [],
          className: "View",
        },
      ],
    });
    sheet = server.openView("main", "123", {});
    failingComponent = new FailingExistingComponent(sheet, "ah.oh.eh");
  });

  test("FailingExistingComponent id works well", () => {
    expect(failingComponent.id()).toBe("eh");
  });
});

describe("Repeaters", () => {
  const system: LetsRoleMock.SystemDefinitions = {
    tables: {
      values: [
        {
          id: "1",
          lbl: "One",
        },
        {
          id: "2",
          lbl: "Two",
        },
        {
          id: "3",
          lbl: "Three",
        },
      ],
    },
    views: [
      {
        id: "main",
        name: "main",
        children: [
          {
            id: "rep",
            name: "repWithoutChoice",
            className: "Repeater",
            viewId: "editVw",
            readViewId: "readVw",
          },
          {
            id: "rep2",
            name: "repWithChoice",
            className: "Repeater",
            viewId: "editVwWithChoice",
            readViewId: "readVw",
          },
          {
            id: "rep3",
            name: "repWithBadChoice",
            className: "Repeater",
            viewId: "editVwWithBadChoice",
            readViewId: "readVw",
          },
        ],
        className: "View",
      },
      {
        id: "editVw",
        name: "editVw",
        children: [
          {
            id: "input",
            name: "input",
            className: "TextInput",
          },
        ],
        className: "View",
      },
      {
        id: "editVwWithChoice",
        name: "editVw",
        children: [
          {
            id: "input",
            name: "input",
            className: "TextInput",
            defaultValue: "Hi !",
          },
          {
            id: "choice",
            name: "choice",
            className: "Choice",
            tableId: "values",
            label: "lbl",
          },
        ],
        className: "View",
      },
      {
        id: "editVwWithBadChoice",
        name: "editVw",
        children: [
          {
            id: "input",
            name: "input",
            className: "TextInput",
          },
          {
            id: "choice",
            name: "choice",
            className: "Choice",
          },
        ],
        className: "View",
      },
      {
        id: "readVw",
        name: "readVw",
        children: [
          {
            id: "display",
            name: "display",
            className: "Label",
            text: "The Label",
          },
        ],
        className: "View",
      },
    ],
  };
  let server: ServerMock;
  let sheet: ViewMock;
  let repeater: ComponentMock;
  let repeaterKo: ComponentMock;
  let repeaterOk: ComponentMock;

  beforeEach(() => {
    server = new ServerMock(system);
    sheet = server.openView("main", "123", {});
    repeater = sheet.get("rep") as ComponentMock;
    repeaterOk = sheet.get("rep2") as ComponentMock;
    repeaterKo = sheet.get("rep3") as ComponentMock;
  });

  test("Find child when repeater is empty gives a FailingComponent", () => {
    const found = repeater.find("oh");
    expect(repeater.value()).toBeNull();
    expect(found).toBeInstanceOf(FailingComponent);
    expect(found.id()).toBe(null);
  });

  test("Get value for a component in a repeater", () => {
    const id = repeater.realId();
    expect(repeater.value()).toBeNull();
    const newValue = {
      entryId: {
        choice: "2",
        input: "42",
      },
    };
    sheet.setData({
      [id]: newValue,
    });
    expect(repeater.value()).toEqual(newValue);
    expect(repeater.find("entryId").value()).toEqual(newValue.entryId);
    expect(repeater.find("entryId").find("display").value()).toBe("The Label");
    expect(repeater.find("entryId").find("choice").value()).toBe("2");
    expect(repeater.find("entryId").find("input").value()).toBe("42");
    expect(repeater.find("entryId").hasClass("editing")).toBeFalsy();
  });

  test("Repeater click on add doesn't create an entry in the value", () => {
    sheet.repeaterClickOnAdd(repeater.realId());
    expect(repeater.value()).toBeNull();
    sheet.repeaterClickOnAdd(repeaterKo.realId());
    expect(repeaterKo.value()).toBeNull();
  });

  test("Repeater click on add creates an entry in the value IF there is a Choice", () => {
    sheet.repeaterClickOnAdd(repeaterOk.realId());
    const values = repeaterOk.value() as LetsRole.RepeaterValue;
    const keys = Object.keys(values!);
    expect(keys.length).toBe(1);
    expect(values![keys[0]]).toEqual({
      choice: "1",
    });

    expect(repeaterOk.find(keys[0]).id()).toBe(keys[0]);
    expect(repeaterOk.find(keys[0]).find("choice").id()).toBe("choice");
    expect(repeaterOk.find(keys[0]).find("choice").value()).toBe("1");
    expect(repeaterOk.find(keys[0]).hasClass("editing")).toBeTruthy();

    const input = repeaterOk.find(keys[0]).find("input");
    expect(input.id()).toBe("input");
    // yes, when editing, the text component gives the default value, but undefined in the repeater value
    expect(input.value()).toBe("Hi !");
    expect(repeaterOk.value()).toEqual({
      [keys[0]]: {
        choice: "1",
      },
    });
  });

  test("Change in a repeater edit view triggers update events", () => {
    const fnOnRepeater = jest.fn();
    const fnClickOnRepeater = jest.fn();
    repeaterOk.on("update", fnOnRepeater);
    repeaterOk.on("click", fnClickOnRepeater);

    const otherSheet = server.openView(sheet.id(), sheet.getSheetId(), {});
    const repeaterOkOther = otherSheet.get("rep2") as ComponentMock;
    const fnOnRepeaterOther = jest.fn();
    repeaterOkOther.on("update", fnOnRepeaterOther);

    sheet.repeaterClickOnAdd(repeaterOk.realId());

    expect(fnOnRepeater).not.toHaveBeenCalled();
    expect(fnClickOnRepeater).toHaveBeenCalledTimes(1);
    expect(fnOnRepeaterOther).toHaveBeenCalledTimes(1);

    fnOnRepeater.mockClear();
    fnOnRepeaterOther.mockClear();

    const values = repeaterOk.value() as LetsRole.RepeaterValue;
    const keys = Object.keys(values!);
    const input = repeaterOk.find(keys[0]).find("input");
    const fnOnInput = jest.fn();
    input.on("update", fnOnInput);
    const newVal = "Eh !";
    input.value(newVal);
    expect(input.value()).toBe(newVal);
    expect(repeaterOk.value()).toEqual({
      [keys[0]]: {
        choice: "1",
        input: newVal,
      },
    });
    expect(sheet.get(["rep2", keys[0], "input"].join(".")).value()).toBe(
      newVal,
    );
    expect(fnOnRepeater).not.toHaveBeenCalled();
    expect(fnOnRepeaterOther).toHaveBeenCalledTimes(1);
    expect(fnOnInput).toHaveBeenCalledTimes(1);
  });

  test("Repeater entry validation, edition or deletion triggers events", () => {
    const fnOnRepeater = jest.fn();
    const fnClickOnRepeater = jest.fn();
    repeaterOk.on("update", fnOnRepeater);
    repeaterOk.on("click", fnClickOnRepeater);

    const otherSheet = server.openView(sheet.id(), sheet.getSheetId(), {});
    const repeaterOkOther = otherSheet.get("rep2") as ComponentMock;
    const fnOnRepeaterOther = jest.fn();
    repeaterOkOther.on("update", fnOnRepeaterOther);

    sheet.repeaterClickOnAdd(repeaterOk.realId());

    expect(fnClickOnRepeater).toHaveBeenCalledTimes(1);

    const values = repeaterOk.value() as LetsRole.RepeaterValue;
    const keys = Object.keys(values!);
    let input = repeaterOk.find(keys[0]).find("input");
    const entryId = repeaterOk.realId() + "." + keys[0];

    let newVal = "Eh !";
    input.value(newVal);

    fnOnRepeaterOther.mockClear(); // because this has been called many times before (see previous tests)

    sheet.repeaterClickOnDone(entryId);

    expect(fnOnRepeater).toHaveBeenCalledTimes(1);
    expect(fnClickOnRepeater).toHaveBeenCalledTimes(2);
    expect(fnOnRepeaterOther).toHaveBeenCalledTimes(1);
    expect(repeaterOk.value()).toEqual({
      [keys[0]]: {
        choice: "1",
        input: newVal,
      },
    });

    input = repeaterOk.find(keys[0]).find("input");
    expect(input).toBeInstanceOf(FailingComponent);
    expect(input.value()).toBe(newVal);

    fnOnRepeater.mockClear();
    fnOnRepeaterOther.mockClear();

    expect(() => sheet.repeaterClickOnDone(entryId)).toThrow();
    expect(() => sheet.repeaterClickOnRemove(entryId)).toThrow();

    expect(fnClickOnRepeater).toHaveBeenCalledTimes(2);

    sheet.repeaterClickOnEdit(entryId);

    expect(fnClickOnRepeater).toHaveBeenCalledTimes(3);

    otherSheet.repeaterClickOnEdit(entryId);

    input = repeaterOk.find(keys[0]).find("input");
    const inputOther = repeaterOkOther.find(keys[0]).find("input");
    const fnOnInput = jest.fn();
    const fnOnInputOther = jest.fn();
    input.on("update", fnOnInput);
    inputOther.on("update", fnOnInputOther);

    expect(input).toBeInstanceOf(ComponentMock);
    expect(input.value()).toBe(newVal);
    expect(inputOther).toBeInstanceOf(ComponentMock);
    expect(inputOther.value()).toBe(newVal);

    newVal = "Eh Second !";
    input.value(newVal);

    expect(input.value()).toBe(newVal);
    expect(inputOther.value()).toBe(newVal);
    expect(fnOnInput).toHaveBeenCalledTimes(1);
    expect(fnOnInputOther).toHaveBeenCalledTimes(1);

    expect(fnOnRepeater).toHaveBeenCalledTimes(0);
    expect(fnOnRepeaterOther).toHaveBeenCalledTimes(0);

    sheet.repeaterClickOnRemove(entryId);
    expect(fnOnRepeater).toHaveBeenCalledTimes(1);
    expect(fnClickOnRepeater).toHaveBeenCalledTimes(4);
    expect(fnOnRepeaterOther).toHaveBeenCalledTimes(1);
    expect(repeaterOk.value()).toEqual({});
  });

  test.todo(
    "One view opened on two screens, it two different repeater entries are edited at the same time, an update on one screen will trigger update AND un-edit entries on the other screen",
  );
  test.todo(
    "update a component in a readable view doesn't trigger repeater update event",
  );
  test.todo(
    "One view opened on two screens, A number input change in a repeater edit view will un-edit the entry immediately IF the entry is in read view in the other screen AND it changes a read view component value",
  );
  test.todo(
    "If an edit view contains a choice with a list A of choices, editing an entry with a choice from list B will empty the value of the choice !!!",
  );
});

describe("Checkbox mock", () => {
  let server: ServerMock;
  let sheet: ViewMock;
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
    sheet = server.openView("main", "123", {});
    rawCheckbox = sheet.get("checkbox");
  });

  test("Checkbox default value is false", () => {
    expect(rawCheckbox.value()).toStrictEqual(false);
    sheet.setData({
      checkbox: true,
    });
    expect(rawCheckbox.value()).toStrictEqual(true);
  });

  test("Checkbox change its value when clicked", () => {
    expect(rawCheckbox.value()).toStrictEqual(false);
    sheet.triggerComponentEvent("checkbox", "click");
    expect(rawCheckbox.value()).toStrictEqual(true);
    sheet.triggerComponentEvent("checkbox", "click");
    expect(rawCheckbox.value()).toStrictEqual(false);
  });

  test("Checkbox click event sequence", () => {
    let clickValue: boolean | null = null;
    let updateValue: boolean | null = null;
    const click = jest.fn((chk) => {
      clickValue = chk.value();
    });
    const update = jest.fn((chk) => {
      updateValue = chk.value();
    });
    rawCheckbox.on("click", click);
    rawCheckbox.on("update", update);
    expect(rawCheckbox.value()).toStrictEqual(false);
    sheet.triggerComponentEvent("checkbox", "click");
    expect(rawCheckbox.value()).toStrictEqual(true);
    expect(click).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(click.mock.invocationCallOrder[0]).toBeLessThan(
      update.mock.invocationCallOrder[0],
    );
    expect(clickValue).toStrictEqual(false);
    expect(updateValue).toStrictEqual(true);

    sheet.triggerComponentEvent("checkbox", "click");
    expect(rawCheckbox.value()).toStrictEqual(false);
    expect(clickValue).toStrictEqual(true);
    expect(updateValue).toStrictEqual(false);
    expect(click).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(2);
    expect(click.mock.invocationCallOrder[1]).toBeLessThan(
      update.mock.invocationCallOrder[1],
    );
  });
});

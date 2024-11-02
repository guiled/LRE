import {
  ComponentMock,
  FailingComponent,
  FailingExistingComponent,
} from "./component.mock";
import { ServerMock } from "./server.mock";

type EntryState = "read" | "write";

const charForId = "abcdefghijklmnopqrstuvwxyz";

const CommonComponentClasses = ["widget"];

const ComponentClasses: Partial<
  Record<
    LetsRoleMock.ComponentDefinitions["className"],
    Array<LetsRole.ClassName>
  >
> = {
  Avatar: ["avatar", "d-flex", "flex-column", "persist"],
  Checkbox: ["checkbox", "custom-control-input"],
  Choice: ["choice", "persist"],
  Color: ["color", "persist"],
  Column: ["col"],
  Container: ["widget-container", "d-flex"],
  RepeaterElement: ["read-element", "repeater-element", "mb-2"],
  Icon: ["icon"],
  Label: ["label"],
  NumberInput: ["number", "form-control", "persist"],
  Repeater: ["repeater"],
  Row: ["row"],
  TextInput: ["text-input", "form-control"],
  Textarea: ["textarea", "form-control", "persist"],
  View: ["view"],
  _Unknown_: ["none"],
};

export class ViewMock implements LetsRole.Sheet {
  #server: ServerMock;
  #definitionId: LetsRole.ViewID;
  #sheetId: LetsRole.SheetRealID;
  #properName: LetsRole.Name;
  #componentEvents: Record<
    LetsRole.ComponentID,
    Partial<Record<LetsRole.EventType, LetsRole.EventCallback>>
  > = {};
  #componentDelegatedEvents: Record<
    LetsRole.ComponentID,
    Partial<
      Record<
        LetsRole.EventType,
        Record<LetsRole.Selector, LetsRole.EventCallback>
      >
    >
  > = {};
  #realView: ViewMock | null = null;
  #idPrefix: LetsRole.ComponentID = "";
  #entryStates: Record<LetsRole.ComponentID, EntryState> = {};
  #componentClasses: Record<LetsRole.ComponentID, Array<LetsRole.ClassName>> =
    {};
  #componentVirtualValues: Record<LetsRole.ComponentID, LetsRole.ComponentValue> = {};

  constructor(
    server: ServerMock,
    viewDefinitionId: LetsRole.ViewID,
    viewSheetId: LetsRole.SheetRealID,
    properName: LetsRole.Name = ""
  ) {
    this.#server = server;
    this.#definitionId = viewDefinitionId;
    this.#sheetId = viewSheetId;
    this.#properName = properName;
  }

  getSheetId(): LetsRole.SheetRealID {
    return this.#sheetId;
  }

  #getDefinitions(): LetsRoleMock.ViewDefinitions {
    return this.#server.getViewDefinitions(this.#definitionId) || {};
  }

  id(): LetsRole.ViewID {
    return this.#getDefinitions().id;
  }

  name(): LetsRole.Name {
    return this.#getDefinitions().name || "";
  }

  properName(): LetsRole.Name {
    return this.#properName;
  }

  get(id: LetsRole.ComponentID): ComponentMock | FailingComponent {
    let usedId = id;
    if (this.#realView) {
      if (!usedId.startsWith(this.#idPrefix)) {
        return this.#realView.get(usedId);
      }
      usedId = usedId.substring(this.#idPrefix.length + 1);
    }

    const parts = usedId.split(".");
    let [cmpId, entryId, ...rest] = parts;

    if (id === this.id()) {
      return this.toComponent(id, "_Unknown_");
    }

    const definition = this.#findIdInDefinition(
      this.#getDefinitions().children,
      cmpId
    );

    if (definition === null) {
      this.#server.showError(this, `Component ${id} not found`);
      return new FailingComponent(this.#realView || this, id);
    }

    const sheetData = this.#server.loadViewData(this.#sheetId);

    if (parts.length === 1) {
      if (this.#idPrefix) {
        cmpId = this.#idPrefix + "." + cmpId;
      }
      CommonComponentClasses.forEach((cl) =>
        this.addComponentClass(cmpId, cl, true)
      );
      definition.classes
        ?.split(" ")
        .forEach((cl) => this.addComponentClass(cmpId, cl, true));

      if (Array.isArray(ComponentClasses[definition.className])) {
        ComponentClasses[definition.className]?.forEach((cl) =>
          this.addComponentClass(cmpId, cl || "view", true)
        );
      }

      if (
        definition.className === "Label" ||
        definition.className === "TextInput" ||
        definition.className === "Textarea" ||
        definition.className === "NumberInput"
      ) {
        if (definition.computed) {
          this.addComponentClass(cmpId, "is-computed", true);
        }

        if (definition.tooltip) {
          this.addComponentClass(cmpId, "with-tooltip", true);
        }
      }

      if (definition.className === "Container") {
        if (definition.layout === "vertical") {
          this.addComponentClass(cmpId, "flex-column", true);
        } else {
          this.addComponentClass(cmpId, "flex-row", true);
        }
      }

      if (definition.className === "Choice"
        && definition.multiple) {
        this.addComponentClass(cmpId, "multiple", true);
      }

      return new ComponentMock(
        this.#realView || this,
        cmpId,
        definition,
        sheetData[cmpId] || null
      );
    }

    if (definition.className !== "Repeater") {
      if (
        this.#findIdInDefinition(definition.children || [], entryId) !== null
      ) {
        return new FailingExistingComponent(this.#realView || this, id);
      } else {
        return new FailingComponent(this.#realView || this, id);
      }
    }

    const repValue = (sheetData[cmpId] as LetsRole.RepeaterValue) || {};

    if (!repValue.hasOwnProperty(entryId)) {
      return new FailingComponent(this.#realView || this, id);
    }

    let viewToSearch: LetsRole.SheetID | null;
    if (this.getEntryState(cmpId + "." + entryId) === "read") {
      viewToSearch = definition.readViewId;
    } else {
      viewToSearch = definition.viewId;
    }

    if (!viewToSearch) {
      throw new Error(`Repeater ${cmpId} has an empty view`);
    }

    const entryView = this.#server.openView(
      viewToSearch,
      this.id() + "." + cmpId + "." + entryId,
      repValue[entryId]
    );
    entryView.setRealView(this, cmpId + "." + entryId);

    if (rest.length === 0) {
      return entryView.toComponent(usedId, "RepeaterElement");
    }

    return entryView.get(id);
  }

  toComponent(
    id: LetsRole.ComponentID,
    className: Exclude<LetsRoleMock.ComponentClassName, "View">
  ): ComponentMock {
    const cmp = new ComponentMock(
      this.#realView || this,
      id,
      {
        id,
        className,
      } as any,
      this.#getData()
    );

    if (this.#realView?.getEntryState(id) === "write"
      || this.getEntryState(id) === "write") {
      cmp.addClass("editing");
    }

    return cmp;
  }

  setRealView(view: ViewMock, idPrefix: LetsRole.ComponentID): void {
    this.#realView = view;
    this.#idPrefix = idPrefix;
  };

  getVariable(_id: LetsRole.VariableID): number | null {
    const vars = this.#server.loadViewVariable(this.#definitionId);

    return vars[_id] || null;
  }

  prompt(
    _title: string,
    _view: LetsRole.ViewID,
    _callback: (result: LetsRole.ViewData) => void,
    _callbackInit: (promptView: LetsRole.Sheet) => void
  ): void {
    return;
  };

  setData(data: LetsRole.ViewData, noUpdateEvent: boolean = false): void {
    if (Object.keys(data).length > 20) {
      this.#server.showError(this, "You cannot set more than 20 values with setData()");
      return;
    }
    this.setDataNoLimit(data, noUpdateEvent);
  }

  setDataNoLimit(
    data: LetsRole.ViewData,
    noUpdateEvent: boolean = false
  ): void {
    this.#server.saveViewData(
      this.#sheetId,
      data,
      noUpdateEvent ? this : noUpdateEvent
    );
  }

  getData(): LetsRole.ViewData {
    return this.#getData();
  }

  // This method is created in order to be used internally
  // and prevent a jest.spyOn getData triggered
  #getData(): LetsRole.ViewData {
    return this.#server.loadViewData(this.#sheetId);
  }

  #findIdInDefinition(
    children: Array<LetsRoleMock.ComponentDefinitions>,
    id: LetsRole.ComponentID
  ): LetsRoleMock.ComponentDefinitions | null {
    return this.#traverseDefinition(
      children,
      (definition) => definition.id === id
    );
  }

  #traverseDefinition(
    children: Array<LetsRoleMock.ComponentDefinitions>,
    finder: (definition: LetsRoleMock.ComponentDefinitions) => boolean
  ): LetsRoleMock.ComponentDefinitions | null {
    for (const definition of children) {
      if (finder(definition)) {
        return definition;
      }
      if (definition.children) {
        const result = this.#traverseDefinition(definition.children, finder);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  saveComponentValue(
    realId: LetsRole.ComponentID,
    value: LetsRole.ComponentValue
  ): void {

    // const data = this.getData();
    // const parts = realId.split(".");
    // const last = parts.pop()!;
    // let target: LetsRole.ViewData = data;

    // parts.forEach((part) => {
    //   if (!target?.hasOwnProperty(part)) {
    //     target[part] = {};
    //   }
    //   target = target[part] as LetsRole.ViewData;
    // });
    // target[last] = value;

    // this.setData(data, this.isInEditingRepeaterEntry(realId));
    this.setData({
      [realId]: value
    });
  }

  isInsideEditingRepeaterEntry(realId: LetsRole.ComponentID): boolean {
    let result = false;
    this.#getParentsRealIds(realId).reverse().some((id) => {
      const cmp = this.get(id);
      if (cmp.getType() === "RepeaterElement") {
        result = this.getEntryState(id) === "write";
        return true;
      }
      return false;
    });

    return result;
  }

  loadComponentValue(
    realId: LetsRole.ComponentID,
    defaultValue?: LetsRole.ComponentValue | undefined
  ): LetsRole.ComponentValue {
    let data: LetsRole.ViewData | LetsRole.ComponentValue = this.#getData();
    let usedId = realId;
    if (this.#realView && realId.startsWith(this.#idPrefix)) {
      usedId = realId.substring(this.#idPrefix.length + 1);
    }
    const parts = usedId.split(".");
    const finalId = parts.pop()!;

    parts.forEach((part) => {
      if (data?.hasOwnProperty(part)) {
        data = (data as LetsRole.ViewData)[part];
      } else {
        data = {};
      }
    });
    if (finalId === "") {
      return data;
    }
    let val = data.hasOwnProperty(finalId) ? data[finalId] : defaultValue;

    if (val === void 0) {
      return null;
    }

    return val;
  }

  setEventToComponent(
    realId: LetsRole.ComponentID,
    event: LetsRole.EventType,
    callback: LetsRole.EventCallback,
    delegation: false | LetsRole.Selector
  ): void {
    if (delegation) {
      if (this.#componentDelegatedEvents[realId] === void 0) {
        this.#componentDelegatedEvents[realId] = {};
      }
      if (this.#componentDelegatedEvents[realId][event] === void 0) {
        this.#componentDelegatedEvents[realId][event] = {};
      }
      this.#componentDelegatedEvents[realId][event]![delegation] = callback;

      return;
    }

    if (this.#componentEvents[realId] === void 0) {
      this.#componentEvents[realId] = {};
    }

    this.#componentEvents[realId][event] = callback;
  }

  unsetEventToComponent(
    realId: LetsRole.ComponentID,
    event: LetsRole.EventType,
    delegation: false | LetsRole.Selector
  ): void {
    if (delegation) {
      if (this.#componentDelegatedEvents[realId] === void 0) {
        return;
      }
      if (this.#componentDelegatedEvents[realId][event] === void 0) {
        return;
      }
      delete this.#componentDelegatedEvents[realId][event]![delegation];

      return;
    }

    if (this.#componentEvents[realId] === void 0) {
      return;
    }

    delete this.#componentEvents[realId][event];
  }

  triggerComponentEvent(
    realId: LetsRole.ComponentID,
    event: LetsRole.EventType
  ): void {
    if (event === "update" && realId.includes(".")) {
      if (this.isInsideEditingRepeaterEntry(realId)) {
        const callback = this.#componentEvents[realId]?.[event];

        if (callback) {
          callback(this.get(realId));
        }
      } else {
        const repRealId = this.getContainingRepeater(realId);

        if (repRealId) {
          const callback = this.#componentEvents[repRealId]?.[event];

          if (callback) {
            callback(this.get(repRealId));
          }
        }
      }
    } else {
      const callback = this.#componentEvents[realId]?.[event];

      if (callback) {
        callback(this.get(realId));
      }
    }

    if (!["click", "change"].includes(event)) return;

    const id = realId.substring(realId.lastIndexOf(".") + 1);
    // event delegation
    let parent = this.findParent(id);
    while (parent.id()) {
      const parentEvent =
        this.#componentDelegatedEvents[parent.realId()]?.[event] || {};
      for (let selector in parentEvent) {
        if (selector[0] === ".") {
          const className = selector.substring(1);
          if (this.componentHasClass(realId, className)) {
            parentEvent[selector](this.get(realId));
          }
        } else if (id === selector) {
          parentEvent[selector](this.get(realId));
        }
      }
      parent = this.findParent(parent.id()!);
    }
  }

  getContainingRepeater(realId: LetsRole.ComponentID): LetsRole.ComponentID | null {
    return this.#getParentsRealIds(realId).reverse().find((id) => {
      const cmp = this.get(id);
      return cmp.getType() === "Repeater";
    }) || null;
  }

  #getParentsRealIds(realId: LetsRole.ComponentID): Array<LetsRole.ComponentID> {
    const parts = realId.split(".");
    return parts.reduce((acc: Array<LetsRole.ComponentID>, part: LetsRole.ComponentID) => {
      if (acc.length === 0) {
        return [part];
      }
      return [...acc, acc[acc.length - 1] + "." + part];
    }, []);
  }

  findParent(id: LetsRole.ComponentID): ComponentMock | FailingComponent {
    const def = this.#traverseDefinition(
      [this.#getDefinitions()],
      (definition) => !!definition.children?.some((child) => child.id === id)
    );

    if (!def) {
      return new FailingComponent(this, id);
    }

    return new ComponentMock(this, def.id, def, null);
  }

  setEntryState(realId: string, newState: EntryState): void {
    this.#entryStates[realId] = newState;
  }

  getEntryState(realId: string): EntryState {
    return this.#entryStates[realId] || "read";
  }

  deleteEntryState(realId: string): void {
    delete this.#entryStates[realId];
  }

  getComponentClass(realId: LetsRole.ComponentID) {
    return this.#componentClasses[realId] || [];
  }

  addComponentClass(
    realId: LetsRole.ComponentID,
    className: LetsRole.ClassName,
    unique: boolean = false
  ) {
    if (!this.#componentClasses[realId]) {
      this.#componentClasses[realId] = [];
    }
    if (!unique || !this.componentHasClass(realId, className)) {
      this.#componentClasses[realId].push(className);
    }
  }

  removeComponentClass(
    realId: LetsRole.ComponentID,
    className: LetsRole.ClassName
  ) {
    if (this.#componentClasses[realId]) {
      this.#componentClasses[realId] = this.#componentClasses[realId].filter(
        (cl) => cl !== className
      );
    }
  }

  componentHasClass(
    realId: LetsRole.ComponentID,
    className: LetsRole.ClassName
  ): boolean {
    if (this.#realView && realId === this.#idPrefix) {
      return this.#realView.componentHasClass(realId, className);
    }
    return !!this.#componentClasses[realId]?.includes(className);
  }

  componentChangedManually(
    realId: LetsRole.ComponentID,
    newValue: LetsRole.ComponentValue
  ) {
    const currentValue = this.loadComponentValue(realId);

    if (newValue === currentValue) return;

    this.saveComponentValue(realId, newValue);
    const defs = this.#findIdInDefinition(this.#getDefinitions().children, realId);

    if (
      defs &&
      ["TextInput", "Textarea", "NumberInput", "Choice"].includes(
        defs.className
      )
    ) {
      this.triggerComponentEvent(realId, "change");
    }
  }

  repeaterClickOnAdd(realId: LetsRole.ComponentID) {
    const defs = this.#findIdInDefinition(this.#getDefinitions().children, realId);
    if (!defs || defs.className !== "Repeater") {
      throw new Error(`Component ${realId} is not a repeater`);
    }

    if (!defs.viewId) {
      throw new Error(`Repeater ${realId} has an empty edit view id`);
    }
    const newEntryId = this.#randomString(10);

    const editView = this.#server.openView(
      defs.viewId,
      realId + "." + newEntryId,
      {}
    );

    const choiceDefs =
      (editView.findChoiceDefs() as LetsRoleMock.ChoiceDefinitions) || null;

    if (!!choiceDefs && !!choiceDefs.tableId) {
      const tableRows: Array<LetsRole.TableRow> = [];
      const table = this.#server.getTable(choiceDefs.tableId);
      if (!table) {
        throw new Error(`Table ${choiceDefs.tableId} not found`);
      }
      table.each((row) => tableRows.push(row));
      const sheetData = this.getData();
      const repValue = (sheetData[realId] || {}) as LetsRole.RepeaterValue;

      this.setData(
        {
          [realId]: {
            ...repValue,
            [newEntryId]: {
              [choiceDefs.id]: choiceDefs.optional ? 0 : tableRows[0].id,
            },
          },
        },
        true
      );
      this.setEntryState(realId + "." + newEntryId, "write");
    }
  }

  repeaterClickOnDone(entryRealId: LetsRole.ComponentID) {
    const idParts = entryRealId.split(".");

    if (idParts.length < 2) {
      throw new Error(`Invalid repeater element id ${entryRealId}`);
    }

    idParts.pop()!;
    const repeaterRealId = idParts.join(".");

    const defs = this.#findIdInDefinition(
      this.#getDefinitions().children,
      repeaterRealId
    );

    if (!defs || defs.className !== "Repeater") {
      throw new Error(`Component ${repeaterRealId} is not a repeater`);
    }

    if (!defs.readViewId) {
      throw new Error(`Repeater ${repeaterRealId} has an empty read view id`);
    }

    if (this.getEntryState(entryRealId) !== "write") {
      throw new Error(`Repeater entry ${repeaterRealId} is not editing`);
    }

    this.setEntryState(entryRealId, "read");
    this.setData({
      [repeaterRealId]: this.getData()[repeaterRealId],
    });
  }

  repeaterClickOnRemove(entryRealId: LetsRole.ComponentID) {
    const idParts = entryRealId.split(".");

    if (idParts.length < 2) {
      throw new Error(`Invalid repeater element id ${entryRealId}`);
    }

    const entryId = idParts.pop()!;
    const repeaterRealId = idParts.join(".");

    const defs = this.#findIdInDefinition(
      this.#getDefinitions().children,
      repeaterRealId
    );

    if (!defs || defs.className !== "Repeater") {
      throw new Error(`Component ${repeaterRealId} is not a repeater`);
    }

    if (this.getEntryState(entryRealId) !== "write") {
      throw new Error(`Repeater entry ${repeaterRealId} is not editing`);
    }

    this.deleteEntryState(entryRealId);
    const repValue = (this.getData()[repeaterRealId] as LetsRole.RepeaterValue) || {};
    delete repValue[entryId];
    this.setData({
      [repeaterRealId]: repValue,
    });
  }

  repeaterClickOnEdit(entryRealId: LetsRole.ComponentID) {
    const idParts = entryRealId.split(".");

    if (idParts.length < 2) {
      throw new Error(`Invalid repeater element id ${entryRealId}`);
    }

    idParts.pop()!;
    const repeaterRealId = idParts.join(".");

    const defs = this.#findIdInDefinition(
      this.#getDefinitions().children,
      repeaterRealId
    );

    if (!defs || defs.className !== "Repeater") {
      throw new Error(`Component ${repeaterRealId} is not a repeater`);
    }

    if (!defs.viewId) {
      throw new Error(`Repeater ${repeaterRealId} has an empty edit view id`);
    }

    if (this.getEntryState(entryRealId) !== "read") {
      throw new Error(`Repeater entry ${repeaterRealId} is already being edited`);
    }

    this.setEntryState(entryRealId, "write");
  }

  findChoiceDefs(): LetsRoleMock.ComponentDefinitions | null {
    return this.#traverseDefinition(this.#getDefinitions().children, (def) => {
      return def.className === "Choice";
    });
  }

  #randomString(length: number): string {
    let result = "";

    for (let i = 0; i < length; i++) {
      const n = Math.floor(Math.random() * charForId.length);
      result += charForId.substring(n, n + 1);
    }

    return result;
  }

  getTableData(tableId: LetsRole.TableID): LetsRole.Table | null {
    return this.#server.getTable(tableId);
  }

  getComponentVirtualValue(realId: LetsRole.ComponentID): LetsRole.ComponentValue {
    return this.#componentVirtualValues[realId] || null;
  }

  setComponentVirtualValue(realId: LetsRole.ComponentID, value: LetsRole.ComponentValue): void {
    this.#componentVirtualValues[realId] = value;
  }
}

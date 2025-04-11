import {
  ComponentMock,
  FailingComponent,
  FailingExistingComponent,
} from "./component.mock";
import { ServerMock } from "./server.mock";

type EntryState = "read" | "write";

const NOT_DELEGATED = "-";

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

const bubblingEvents = ["click", "change"];
type EventDef = {
  selector: LetsRole.Selector;
  callback: LetsRole.EventCallback;
};

export class ViewMock implements LetsRole.Sheet {
  #server: ServerMock;
  #definitionId: LetsRole.ViewID;
  #sheetId: LetsRole.SheetRealID;
  #properName: LetsRole.Name;
  #componentEvents: Record<
    LetsRole.ComponentID,
    Partial<Record<LetsRole.EventType, Array<EventDef>>>
  > = {};
  #realView: ViewMock | null = null;
  #idPrefix: LetsRole.ComponentID = "";
  #entryStates: Record<LetsRole.ComponentID, EntryState> = {};
  #componentClasses: Record<LetsRole.ComponentID, Array<LetsRole.ClassName>> =
    {};
  #componentVirtualValues: Record<
    LetsRole.ComponentID,
    LetsRole.ComponentValue
  > = {};
  #localData: LetsRole.ViewData = {};

  constructor(
    server: ServerMock,
    viewDefinitionId: LetsRole.ViewID,
    viewSheetId: LetsRole.SheetRealID,
    properName: LetsRole.Name = "",
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

  getSheetType(): LetsRole.SheetType {
    return "character"; // todo for prompt and craft
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
    let cmpId = parts[0];
    const [_unused, entryId, ...rest] = parts;

    if (id === this.id()) {
      return this.toComponent(
        id,
        "_CmpFromSheet_",
        this.#getDefinitions()?.children,
      );
    }

    const definition = ViewMock.findIdInDefinition(
      this.#getDefinitions().children,
      cmpId,
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
        this.addComponentClass(cmpId, cl, true),
      );
      definition.classes
        ?.split(" ")
        .forEach((cl) => this.addComponentClass(cmpId, cl, true));

      if (Array.isArray(ComponentClasses[definition.className])) {
        ComponentClasses[definition.className]?.forEach((cl) =>
          this.addComponentClass(cmpId, cl || "view", true),
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

      if (definition.className === "Choice" && definition.multiple) {
        this.addComponentClass(cmpId, "multiple", true);
      }

      return new ComponentMock(
        this.#realView || this,
        cmpId,
        definition,
        sheetData[cmpId] || null,
      );
    }

    if (definition.className !== "Repeater") {
      if (
        ViewMock.findIdInDefinition(definition.children || [], entryId) !== null
      ) {
        return new FailingExistingComponent(this.#realView || this, id);
      } else {
        return new FailingComponent(this.#realView || this, id);
      }
    }

    const repValue = (sheetData[cmpId] as LetsRole.RepeaterValue) || {};

    if (!Object.prototype.hasOwnProperty.call(repValue, entryId)) {
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
      repValue[entryId],
    );
    entryView.setRealView(this, cmpId + "." + entryId);

    if (rest.length === 0) {
      return entryView.toComponent(
        usedId,
        "RepeaterElement",
        definition.children || [],
      );
    }

    return entryView.get(id);
  }

  toComponent(
    id: LetsRole.ComponentID,
    className: Exclude<LetsRoleMock.ComponentClassName, "View">,
    children: Array<LetsRoleMock.ComponentDefinitions>,
  ): ComponentMock {
    const cmp = new ComponentMock(
      this.#realView || this,
      id,
      {
        id,
        className,
        children,
      } as any,
      this.#getData(),
    );

    if (
      this.#realView?.getEntryState(id) === "write" ||
      this.getEntryState(id) === "write"
    ) {
      cmp.addClass("editing");
    }

    return cmp;
  }

  setRealView(view: ViewMock, idPrefix: LetsRole.ComponentID): void {
    this.#realView = view;
    this.#idPrefix = idPrefix;
  }

  getVariable(_id: LetsRole.VariableID): number | null {
    const vars = this.#server.loadViewVariable(this.#definitionId);

    return vars[_id] || null;
  }

  prompt(
    _title: string,
    view: LetsRole.ViewID,
    resultCallback: (result: LetsRole.ViewData) => void,
    callbackInit: (promptView: LetsRole.Sheet) => void,
  ): void {
    try {
      const promptView = this.#server.openPrompt(view, resultCallback);
      callbackInit(promptView);
    } catch (e) {}

    return;
  }

  setData(data: LetsRole.ViewData, noUpdateEvent: boolean = false): void {
    if (Object.keys(data).length > 20) {
      this.#server.showError(
        this,
        "You cannot set more than 20 values with setData()",
      );
      return;
    }

    this.setDataNoLimit(data, noUpdateEvent);
  }

  setDataNoLimit(
    data: LetsRole.ViewData,
    noUpdateEvent: boolean = false,
  ): void {
    if (this.#sheetId) {
      this.#server.saveViewData(
        this.#sheetId,
        data,
        noUpdateEvent ? this : noUpdateEvent,
      );
    } else {
      this.#localData = { ...this.#localData, ...data };
    }
  }

  getData(): LetsRole.ViewData {
    return this.#getData();
  }

  // This method is created in order to be used internally
  // and prevent a jest.spyOn getData triggered
  #getData(): LetsRole.ViewData {
    if (this.#sheetId) {
      return this.#server.loadViewData(this.#sheetId);
    } else {
      return structuredClone(this.#localData);
    }
  }

  static findIdInDefinition(
    children: Array<LetsRoleMock.ComponentDefinitions>,
    id: LetsRole.ComponentID,
  ): LetsRoleMock.ComponentDefinitions | null {
    return ViewMock.traverseDefinition(
      children,
      (definition) => definition.id === id,
    );
  }

  static traverseDefinition(
    children: Array<LetsRoleMock.ComponentDefinitions>,
    finder: (definition: LetsRoleMock.ComponentDefinitions) => boolean,
  ): LetsRoleMock.ComponentDefinitions | null {
    for (const definition of children) {
      if (finder(definition)) {
        return definition;
      }

      if (definition.children) {
        const result = ViewMock.traverseDefinition(definition.children, finder);

        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  saveComponentValue(
    realId: LetsRole.ComponentID,
    value: LetsRole.ComponentValue,
  ): void {
    // const data = this.getData();
    // const parts = realId.split(".");
    // const last = parts.pop()!;
    // let target: LetsRole.ViewData = data;

    // parts.forEach((part) => {
    //   if (!target?Object.prototype.hasOwnProperty.call(, part)) {
    //     target[part] = {};
    //   }
    //   target = target[part] as LetsRole.ViewData;
    // });
    // target[last] = value;

    // this.setData(data, this.isInEditingRepeaterEntry(realId));
    this.setData({
      [realId]: value,
    });
  }

  getContainingEntryId(
    realId: LetsRole.ComponentID,
  ): LetsRole.ComponentID | false {
    let result: LetsRole.ComponentID | false = false;
    const arr = this.#getParentsRealIds(realId);
    arr.reverse().some((id) => {
      const cmp = this.get(id);

      if (cmp.getType() === "RepeaterElement") {
        result = id;
        return true;
      }

      return false;
    });

    return result;
  }

  isInsideEditingRepeaterEntry(realId: LetsRole.ComponentID): boolean {
    const entryId = this.getContainingEntryId(realId);

    if (!entryId) {
      return false;
    }

    return this.getEntryState(entryId) === "write";
  }

  isInsideRepeater(realId: LetsRole.ComponentID): boolean {
    const parts: Array<LetsRole.ComponentID | LetsRole.Index> =
      realId.split(".");

    if (parts.length < 2) {
      return false;
    }

    const rootDef = ViewMock.findIdInDefinition(
      this.#getDefinitions().children,
      parts[0],
    );

    return rootDef?.className === "Repeater";
  }

  loadComponentValue(
    realId: LetsRole.ComponentID,
    defaultValue?: LetsRole.ComponentValue | undefined,
  ): LetsRole.ComponentValue {
    let data: LetsRole.ViewData | LetsRole.ComponentValue = this.#getData();
    let usedId = realId;

    if (this.#realView && realId.startsWith(this.#idPrefix)) {
      usedId = realId.substring(this.#idPrefix.length + 1);
    }

    const parts = usedId.split(".");
    const finalId = parts.pop()!;

    parts.forEach((part) => {
      if (data && Object.prototype.hasOwnProperty.call(data, part)) {
        data = (data as LetsRole.ViewData)[part];
      } else {
        data = {};
      }
    });

    if (finalId === "") {
      return data;
    }

    const val = Object.prototype.hasOwnProperty.call(data, finalId)
      ? data[finalId]
      : defaultValue;

    if (val === void 0) {
      return null;
    }

    return val;
  }

  setEventToComponent(
    realId: LetsRole.ComponentID,
    event: LetsRole.EventType,
    callback: LetsRole.EventCallback,
    delegation: false | LetsRole.Selector,
  ): void {
    if (!delegation) {
      delegation = NOT_DELEGATED;
    }

    if (this.#componentEvents[realId] === void 0) {
      this.#componentEvents[realId] = {};
    }

    if (this.#componentEvents[realId][event] === void 0) {
      this.#componentEvents[realId][event] = [];
    }

    this.unsetEventToComponent(realId, event, delegation);

    this.#componentEvents[realId][event]!.push({
      selector: delegation,
      callback,
    });
  }

  unsetEventToComponent(
    realId: LetsRole.ComponentID,
    event: LetsRole.EventType,
    delegation: false | LetsRole.Selector,
  ): void {
    if (!delegation) {
      delegation = NOT_DELEGATED;
    }

    if (this.#componentEvents[realId] === void 0) {
      return;
    }

    if (
      this.#componentEvents[realId][event] === void 0 ||
      this.#componentEvents[realId][event].length === 0
    ) {
      return;
    }

    this.#componentEvents[realId][event] = this.#componentEvents[realId][
      event
    ]!.filter((delegated) => delegated.selector !== delegation);
  }

  triggerComponentEvent(
    realId: LetsRole.ComponentID,
    event: LetsRole.EventType,
  ): void {
    let cmp: ComponentMock | FailingComponent;

    if (event === "update" && realId.includes(".")) {
      if (this.isInsideEditingRepeaterEntry(realId)) {
        const callback = this.#getDirectEvent(realId, event);

        if (callback) {
          cmp ??= this.get(realId);
          callback(this.get(realId));
        }
      } else {
        const repRealId = this.getContainingRepeater(realId);

        if (repRealId) {
          const callback = this.#getDirectEvent(repRealId, event);

          if (callback) {
            callback(this.get(repRealId));
          }
        }
      }
    } else {
      this.#runDirectEvent(realId, event);

      const defs = ViewMock.findIdInDefinition(
        this.#getDefinitions().children,
        realId,
      );

      if (event === "click" && defs?.className === "Checkbox") {
        const value = this.loadComponentValue(realId);
        this.setData({
          [realId]: !value,
        });
      }
    }

    if (!bubblingEvents.includes(event)) return;

    // event delegation
    let parent: ComponentMock | FailingComponent = this.findParent(realId);

    while (parent.id()) {
      const parentEvent = this.#getEvents(parent.realId(), event);
      const id = realId.substring(realId.lastIndexOf(".") + 1);

      parentEvent.forEach((eventDef) => {
        if (id === eventDef.selector) {
          cmp ??= this.get(realId);
          eventDef.callback(cmp);
        } else if (eventDef.selector[0] === ".") {
          const className = eventDef.selector.substring(1);

          if (this.componentHasClass(realId, className)) {
            cmp ??= this.get(realId);
            eventDef.callback(cmp);
          }
        } else if (eventDef.selector === NOT_DELEGATED) {
          eventDef.callback(parent);
        }
      });

      parent = this.findParent(parent.id()!);
    }
  }

  #runDirectEvent(
    realId: LetsRole.ComponentID,
    event: LetsRole.EventType,
  ): void {
    const callback = this.#getDirectEvent(realId, event);

    if (callback) {
      callback(this.get(realId));
    }
  }

  #getEvents(
    realId: LetsRole.ComponentID,
    event: LetsRole.EventType,
  ): Array<EventDef> {
    return this.#componentEvents[realId]?.[event] || [];
  }

  #getDirectEvent(
    realId: LetsRole.ComponentID,
    event: LetsRole.EventType,
  ): LetsRole.EventCallback | null {
    return (
      this.#getEvents(realId, event).find((e) => e.selector === NOT_DELEGATED)
        ?.callback || null
    );
  }

  getContainingRepeater(
    realId: LetsRole.ComponentID,
  ): LetsRole.ComponentID | null {
    return (
      this.#getParentsRealIds(realId)
        .reverse()
        .find((id) => {
          const cmp = this.get(id);
          return cmp.getType() === "Repeater";
        }) || null
    );
  }

  #getParentsRealIds(
    realId: LetsRole.ComponentID,
  ): Array<LetsRole.ComponentID> {
    const parts = realId.split(".");
    return parts.reduce(
      (acc: Array<LetsRole.ComponentID>, part: LetsRole.ComponentID) => {
        if (acc.length === 0) {
          acc.push(part);
        } else {
          acc.push(acc[acc.length - 1] + "." + part);
        }

        return acc;
      },
      [],
    );
  }

  findParent(id: LetsRole.ComponentID): ComponentMock | FailingComponent {
    if (this.isInsideRepeater(id)) {
      return this.findParentInRepeater(id);
    }

    const def = ViewMock.traverseDefinition(
      [this.#getDefinitions()],
      (definition) => !!definition.children?.some((child) => child.id === id),
    );

    if (!def) {
      return new FailingComponent(this, id);
    }

    return new ComponentMock(this, def.id, def, null);
  }

  findParentInRepeater(id: string): ComponentMock | FailingComponent {
    const parts = id.split(".");
    const repeaterId = this.getContainingRepeater(id)!;

    const lvlInRepeater = parts.length % 2;

    let parentId: LetsRole.ComponentID;

    if (lvlInRepeater === 1) {
      const entryId = this.getContainingEntryId(id) as LetsRole.ComponentID;
      const view = this.getEntryView(entryId, repeaterId);
      parentId = view.findParent(parts[parts.length - 1]).id() || entryId;
    } else {
      parentId = repeaterId;
    }

    return this.get(parentId);
  }

  private getEntryView(entryId: string, repeaterId: string): ViewMock {
    const entryState = this.getEntryState(entryId);
    let vwId;
    const repeaterDef = ViewMock.findIdInDefinition(
      this.#getDefinitions().children,
      repeaterId,
    ) as LetsRoleMock.RepeaterDefinitions;

    if (entryState === "write") {
      vwId = repeaterDef.viewId;
    } else {
      vwId = repeaterDef.readViewId;
    }

    if (!vwId) {
      throw new Error(`Repeater ${repeaterId} has an empty view id`);
    }

    const view = this.#server.openView(vwId, entryId, {});
    return view;
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

  getComponentClass(realId: LetsRole.ComponentID): Array<LetsRole.ClassName> {
    return this.#componentClasses[realId] || [];
  }

  addComponentClass(
    realId: LetsRole.ComponentID,
    className: LetsRole.ClassName,
    unique: boolean = false,
  ): void {
    if (!this.#componentClasses[realId]) {
      this.#componentClasses[realId] = [];
    }

    if (!unique || !this.componentHasClass(realId, className)) {
      this.#componentClasses[realId].push(className);
    }
  }

  removeComponentClass(
    realId: LetsRole.ComponentID,
    className: LetsRole.ClassName,
  ): void {
    if (this.#componentClasses[realId]) {
      this.#componentClasses[realId] = this.#componentClasses[realId].filter(
        (cl) => cl !== className,
      );
    }
  }

  componentHasClass(
    realId: LetsRole.ComponentID,
    className: LetsRole.ClassName,
  ): boolean {
    if (this.#realView && realId === this.#idPrefix) {
      return this.#realView.componentHasClass(realId, className);
    }

    return !!this.#componentClasses[realId]?.includes(className);
  }

  componentChangedManually(
    realId: LetsRole.ComponentID,
    newValue: LetsRole.ComponentValue,
  ): void {
    const currentValue = this.loadComponentValue(realId);

    if (newValue === currentValue) return;

    this.saveComponentValue(realId, newValue);
    const defs = ViewMock.findIdInDefinition(
      this.#getDefinitions().children,
      realId,
    );

    if (
      defs &&
      ["TextInput", "Textarea", "NumberInput", "Choice"].includes(
        defs.className,
      )
    ) {
      this.triggerComponentEvent(realId, "change");
    }
  }

  repeaterClickOnAdd(realId: LetsRole.ComponentID): void {
    const defs = ViewMock.findIdInDefinition(
      this.#getDefinitions().children,
      realId,
    );

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
      {},
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
        true,
      );
      this.setEntryState(realId + "." + newEntryId, "write");
      this.triggerComponentEvent(realId, "click");
    }
  }

  repeaterClickOnDone(entryRealId: LetsRole.ComponentID): void {
    const idParts = entryRealId.split(".");

    if (idParts.length < 2) {
      throw new Error(`Invalid repeater element id ${entryRealId}`);
    }

    idParts.pop()!;
    const repeaterRealId = idParts.join(".");

    const defs = ViewMock.findIdInDefinition(
      this.#getDefinitions().children,
      repeaterRealId,
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
    this.triggerComponentEvent(entryRealId, "click");
  }

  repeaterClickOnRemove(entryRealId: LetsRole.ComponentID): void {
    const idParts = entryRealId.split(".");

    if (idParts.length < 2) {
      throw new Error(`Invalid repeater element id ${entryRealId}`);
    }

    const entryId = idParts.pop()!;
    const repeaterRealId = idParts.join(".");

    const defs = ViewMock.findIdInDefinition(
      this.#getDefinitions().children,
      repeaterRealId,
    );

    if (!defs || defs.className !== "Repeater") {
      throw new Error(`Component ${repeaterRealId} is not a repeater`);
    }

    if (this.getEntryState(entryRealId) !== "write") {
      throw new Error(`Repeater entry ${repeaterRealId} is not editing`);
    }

    this.deleteEntryState(entryRealId);
    const repValue =
      (this.getData()[repeaterRealId] as LetsRole.RepeaterValue) || {};
    delete repValue[entryId];
    this.setData({
      [repeaterRealId]: repValue,
    });
    this.triggerComponentEvent(entryRealId, "click");
  }

  repeaterClickOnEdit(entryRealId: LetsRole.ComponentID): void {
    const idParts = entryRealId.split(".");

    if (idParts.length < 2) {
      throw new Error(`Invalid repeater element id ${entryRealId}`);
    }

    idParts.pop()!;
    const repeaterRealId = idParts.join(".");

    const defs = ViewMock.findIdInDefinition(
      this.#getDefinitions().children,
      repeaterRealId,
    );

    if (!defs || defs.className !== "Repeater") {
      throw new Error(`Component ${repeaterRealId} is not a repeater`);
    }

    if (!defs.viewId) {
      throw new Error(`Repeater ${repeaterRealId} has an empty edit view id`);
    }

    if (this.getEntryState(entryRealId) !== "read") {
      throw new Error(
        `Repeater entry ${repeaterRealId} is already being edited`,
      );
    }

    this.setEntryState(entryRealId, "write");
    this.triggerComponentEvent(entryRealId, "click");
  }

  findChoiceDefs(): LetsRoleMock.ComponentDefinitions | null {
    return ViewMock.traverseDefinition(
      this.#getDefinitions().children,
      (def) => {
        return def.className === "Choice";
      },
    );
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

  getComponentVirtualValue(
    realId: LetsRole.ComponentID,
  ): LetsRole.ComponentValue {
    return this.#componentVirtualValues[realId] || null;
  }

  setComponentVirtualValue(
    realId: LetsRole.ComponentID,
    value: LetsRole.ComponentValue,
  ): void {
    this.#componentVirtualValues[realId] = value;
  }
}

import { TableMock } from "./table.mock";
import { ViewMock } from "./view.mock";

export class ServerMock {
  #views: LetsRoleMock.ViewDefinitions[];
  #viewVariables: Record<LetsRole.ViewID, Record<string, number>> = {};
  #viewData: Record<NonNullable<LetsRole.SheetRealID>, LetsRole.ViewData> = {};
  #openedSheets: Record<NonNullable<LetsRole.SheetRealID>, Array<ViewMock>> =
    {};
  #openedPrompts: Record<
    LetsRole.SheetID,
    (result: LetsRole.ViewData) => void
  > = {};

  #tables: Record<string, LetsRole.TableRow[]>;

  constructor(system: LetsRoleMock.SystemDefinitions) {
    this.#views = system.views || [];
    this.#tables = system.tables || {};
    this.#viewVariables = system.viewVariables || {};
  }

  openView(
    viewId: LetsRole.ViewID,
    viewSheetId: LetsRole.SheetRealID,
    data?: LetsRole.ViewData,
    properName: LetsRole.Name = "",
  ): ViewMock {
    this.getViewDefinitions(viewId);

    if (viewSheetId) {
      if (data === void 0) {
        if (this.#viewData[viewSheetId] === void 0) {
          data = {};
        } else {
          data = this.#viewData[viewSheetId];
        }
      }

      this.#viewData[viewSheetId] = structuredClone(data);
    }

    const newView = new ViewMock(this, viewId, viewSheetId, properName);

    if (viewSheetId) {
      if (
        !Object.prototype.hasOwnProperty.call(this.#openedSheets, viewSheetId)
      ) {
        this.#openedSheets[viewSheetId] = [];
      }

      this.#openedSheets[viewSheetId].push(newView);
    }

    if (global.init) {
      global.init(newView);
    }

    return newView;
  }

  getViewDefinitions(viewId: LetsRole.ViewID): LetsRoleMock.ViewDefinitions {
    const viewDefinitions: LetsRoleMock.ViewDefinitions | undefined =
      this.#views.find(
        ({ id, className }) => id === viewId && className === "View",
      );

    if (viewDefinitions === void 0) {
      throw new Error(`Unknown view : ${viewId}`);
    }

    return structuredClone(viewDefinitions);
  }

  saveViewData(
    viewSheetId: LetsRole.SheetRealID,
    data: LetsRole.ViewData,
    noUpdateEvent: boolean | ViewMock = false,
  ): void {
    if (!viewSheetId) return;

    const newData = structuredClone(this.#viewData[viewSheetId] || {});

    for (const [key, value] of Object.entries(data)) {
      const parts = key.split(".");

      if (parts.length === 1) {
        newData[key] = value;
      } else {
        const last = parts.pop()!;
        let target: LetsRole.ViewData = newData;

        parts.forEach((part) => {
          if (!Object.prototype.hasOwnProperty.call(target, part)) {
            target[part] = {};
          }

          target = target[part] as LetsRole.ViewData;
        });
        target[last] = value;
      }
    }

    this.#viewData[viewSheetId] = Object.assign(
      this.#viewData[viewSheetId],
      newData,
    );

    if (!noUpdateEvent || noUpdateEvent instanceof ViewMock) {
      for (const id in data) {
        this.#openedSheets[viewSheetId]?.forEach((view) => {
          if (!(noUpdateEvent instanceof ViewMock) || view !== noUpdateEvent) {
            view.triggerComponentEvent(id, "update");
          }
        });
      }
    }
  }

  loadViewData(viewSheetId: LetsRole.SheetRealID): LetsRole.ViewData {
    if (!viewSheetId) return {};

    return structuredClone(this.#viewData[viewSheetId]) || {};
  }

  loadViewVariable(viewId: LetsRole.ViewID): Record<string, number> {
    return structuredClone(this.#viewVariables[viewId]) || {};
  }

  getTable(tableId: string): TableMock | null {
    return this.#tables[tableId] ? new TableMock(this.#tables[tableId]) : null;
  }

  showError(_destView: ViewMock, _message: string): void {}

  dynamicAddComponentToView(
    viewId: LetsRole.ViewID,
    component: LetsRoleMock.ComponentDefinitions,
  ): void {
    const viewDef = this.#views?.find(({ id }) => id === viewId);

    if (!viewDef) {
      throw new Error(`Unknown view ${viewId}`);
    }

    viewDef.children.push(component);
  }

  getMockOfTables(): LetsRole.Tables {
    return {
      get: (id: string) => {
        return this.getTable(id);
      },
    };
  }

  openPrompt(
    viewId: LetsRole.SheetID,
    resultCallback: (result: LetsRole.ViewData) => void,
  ): ViewMock {
    if (this.promptAlreadyOpened(viewId)) {
      throw new Error(`Prompt ${viewId} already opened`);
    }

    this.#openedPrompts[viewId] = resultCallback;

    return this.openView(viewId, undefined);
  }

  closePrompt(viewId: LetsRole.SheetID): void {
    delete this.#openedPrompts[viewId];
  }

  promptAlreadyOpened(viewId: LetsRole.SheetID): boolean {
    return Object.prototype.hasOwnProperty.call(this.#openedPrompts, viewId);
  }

  validatePrompt(view: LetsRole.Sheet): void {
    if (!this.promptAlreadyOpened(view.id())) {
      throw new Error(`Prompt ${view.id()} not opened`);
    }

    this.#openedPrompts[view.id()](view.getData());
  }
}

import { MockComponent, MockedComponent } from "./component.mock";
import { MockedSheet } from "./sheet.mock";

type ComponentStructure = {
  id: string;
  name: string;
  classes: Array<string>;
  children?: ComponentStructureList;
  text?: string;
  choices?: LetsRole.Choices;
  value?: LetsRole.ComponentValue;
};

type ComponentStructureList = Array<ComponentStructure>;

type ExtendedMockedComponent = MockedComponent & {
  _realId: () => string;
};

export class MockServer {
  static UNKNOWN_CMP_ID = "_unknown_";
  static NULL_CMP_ID = "_null_";
  static NON_EXISTING_CMP_ID = "_nonexisting_";
  static NonExistingCmpDummy: LetsRole.Component = {
    id: jest.fn(() => null),
    getClasses: jest.fn(() => {
      throw new TypeError("h() is null");
    }),
  } as unknown as LetsRole.Component;
  sheets: Record<LetsRole.SheetID, Array<MockedSheet>> = {};
  sheetData: Record<LetsRole.SheetID, LetsRole.ViewData> = {};
  cmp: Record<
    LetsRole.SheetID,
    Record<LetsRole.ComponentID, WeakMap<MockedSheet, MockedComponent>>
  > = {};

  unknownComponents: Array<LetsRole.ComponentID> = [];
  nullComponents: Array<LetsRole.ComponentID> = [];
  nonExistingComponents: Array<LetsRole.ComponentID> = [];

  registerMockedSheet(
    sheet: MockedSheet,
    structure: ComponentStructureList = []
  ) {
    (() => {
      const id = sheet.getSheetId();
      this.sheets[id] ??= [];
      this.sheets[id].push(sheet);
      this.sheetData[id] ??= sheet.getData() || {};
      this.cmp[id] ??= {};
    })();
    sheet.getData = jest.fn(() => {
      return Object.assign(
        {},
        structuredClone(this.sheetData[sheet.getSheetId()])
      );
    });

    sheet.setData = jest.fn((newData) => {
      const ids = Object.keys(newData);
      if (ids.length > 20) {
        throw "Limit of 20 data set exceeded";
      }
      Object.assign(
        this.sheetData[sheet.getSheetId()],
        structuredClone(newData)
      );
      this.sheets[sheet.getSheetId()].forEach((sh: MockedSheet) => {
        const sheetCmp = this.cmp[sheet.getSheetId()]?.[sheet.id()]?.get(sh);
        if (sheetCmp) {
          //sheetCmp._trigger("update");
          ids.forEach((id) => {
            (sh.get(id) as MockedComponent)?._trigger?.("update");
          });
        }
      });
    });

    sheet.get = jest.fn((cmpId: LetsRole.ComponentID) => {
      if (
        this.unknownComponents.includes(cmpId) ||
        cmpId.indexOf(MockServer.UNKNOWN_CMP_ID) !== -1
      ) {
        return { ...MockServer.NonExistingCmpDummy };
      } else if (
        this.nullComponents.includes(cmpId) ||
        cmpId.indexOf(MockServer.NULL_CMP_ID) !== -1
      ) {
        return null as unknown as LetsRole.Component;
      } else if (
        this.nonExistingComponents.includes(cmpId) ||
        cmpId.indexOf(MockServer.NON_EXISTING_CMP_ID) !== -1
      ) {
        return {
          ...MockServer.NonExistingCmpDummy,
          id: jest.fn(() => null as unknown as string),
          addClass: () => {
            throw Error("non");
          },
          removeClass: () => {
            throw Error("non");
          },
        };
      }
      const sheetId = sheet.getSheetId();
      this.cmp[sheetId][cmpId] = this.cmp[sheetId][cmpId] || new WeakMap();
      if (this.cmp[sheetId][cmpId].has(sheet)) {
        return this.cmp[sheetId][cmpId].get(sheet)!;
      }
      let cmpContainerId: LetsRole.ComponentID | undefined,
        cmpStructure: ComponentStructure | undefined,
        cmpStructureList: ComponentStructureList | undefined = structure;
      if (structure.length > 0) {
        let tabId = cmpId.split(".");
        tabId.forEach((id) => {
          cmpContainerId = cmpStructure?.id;
          cmpStructure = cmpStructureList?.find?.((s) => s.id === id);
          cmpStructureList = cmpStructure?.children;
        });
      }
      const cmp: MockedComponent = this.registerMockedComponent(
        MockComponent({
          id: cmpId,
          sheet,
          cntr: cmpContainerId
            ? (sheet.get(cmpContainerId!) as MockedComponent)
            : undefined,
          name: cmpStructure?.name || "nameless",
          classes: [
            ...(cmpStructure?.classes || []),
            ...(cmpId.indexOf("rep") !== -1 ? ["repeater"] : []),
          ],
          value:
            cmpStructure?.value || this.sheetData[sheet.getSheetId()][cmpId],
          text: cmpStructure?.text,
          choices: {
            ...(cmpStructure?.choices || {}),
          },
        })
      );
      cmp.value = jest.fn(
        function (this: MockServer, v?: LetsRole.ComponentValue) {
          if (arguments.length > 0) {
            this.sheetData[sheet.getSheetId()][cmpId] = v;
            cmp._trigger("update");
          }
          return this.sheetData[sheet.getSheetId()][cmpId] || "";
        }.bind(this)
      );
      this.cmp[sheetId][cmpId].set(sheet, cmp);

      return cmp;
    });
  }

  registerMockedComponent(
    cmp: MockedComponent,
    container?: ExtendedMockedComponent
  ): ExtendedMockedComponent {
    const prevCmpFind = cmp.find;

    const newCmp: ExtendedMockedComponent = Object.assign(cmp, {
      _realId: jest.fn(
        () => (container ? container._realId() + "." : "") + cmp.id()
      ),
      value: jest.fn((newValue?: LetsRole.ComponentValue) => {
        if (newValue !== void 0) {
          this.sheetData[cmp.sheet().getSheetId()][cmp.id()] = newValue;
          newCmp._trigger("update");
          return;
        }
        return this.sheetData[cmp.sheet().getSheetId()][cmp.id()] || "";
      }),
      find: jest.fn((id: LetsRole.ComponentID) => {
        const searchedComponentId =
          (container ? container._realId() + "." : "") + id;
        if (
          this.unknownComponents.includes(searchedComponentId) ||
          id.indexOf(MockServer.UNKNOWN_CMP_ID) !== -1
        ) {
          return { ...MockServer.NonExistingCmpDummy };
        } else if (
          this.nullComponents.includes(searchedComponentId) ||
          id.indexOf(MockServer.NULL_CMP_ID) !== -1
        ) {
          return null as unknown as LetsRole.Component;
        } else if (
          this.nonExistingComponents.includes(searchedComponentId) ||
          id.indexOf(MockServer.NON_EXISTING_CMP_ID) !== -1
        ) {
          return {
            ...MockServer.NonExistingCmpDummy,
            id: jest.fn(() => null as unknown as string),
            addClass: () => {
              throw Error("non");
            },
            removeClass: () => {
              throw Error("non");
            },
          };
        }
        const foundCmp = prevCmpFind(id) as MockedComponent;
        return this.registerMockedComponent(foundCmp, newCmp);
      }),
    });

    return newCmp;
  }
}

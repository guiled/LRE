import { MockComponent, MockedComponent } from "./component.mock";
import { MockedSheet } from "./sheet.mock";

type ComponentStructure = {
  id: string;
  name: string;
  classes: Array<string>;
  children?: ComponentStructureList;
};

type ComponentStructureList = Array<ComponentStructure>;

function deepClone<T = any>(val: T): T {
  if (typeof val === "object" || Array.isArray(val)) {
    let result: T = (Array.isArray(val) ? [] : {}) as any;
    for (let k in val) {
      result[k] = deepClone(val[k]);
    }
    return result;
  } else {
    return val;
  }
}

export class MockServer {
  static UNKNOWN_CMP_ID = "_unknown_";
  sheets: Record<LetsRole.SheetID, Array<MockedSheet>> = {};
  sheetData: Record<LetsRole.SheetID, LetsRole.ViewData> = {};
  cmp: Record<
    LetsRole.SheetID,
    Record<LetsRole.ComponentID, WeakMap<MockedSheet, MockedComponent>>
  > = {};

  registerMockedSheet(
    sheet: MockedSheet,
    structure: ComponentStructureList = []
  ) {
    (() => {
      const id = sheet.getSheetId();
      this.sheets[id] = this.sheets[id] || [];
      this.sheets[id].push(sheet);
      this.sheetData[id] = this.sheetData[id] || {};
      this.cmp[id] = this.cmp[id] || {};
    })();

    sheet.getData = jest.fn(() => {
      return Object.assign({}, deepClone(this.sheetData[sheet.getSheetId()]));
    });

    sheet.setData = jest.fn((newData) => {
      if (Object.keys(newData).length > 20) {
        throw "Limit of 20 data set exceeded";
      }
      Object.assign(this.sheetData[sheet.getSheetId()], deepClone(newData));
      this.sheets[sheet.getSheetId()].forEach((sh: MockedSheet) => {
        const cmp = this.cmp[sheet.getSheetId()]?.[sheet.id()]?.get(sh);
        if (cmp) {
          cmp._trigger("update");
        }
      });
    });

    sheet.get = jest.fn((cmpId: LetsRole.ComponentID) => {
      if (cmpId.indexOf(MockServer.UNKNOWN_CMP_ID) !== -1) {
        return ({
          id: jest.fn(),
          getClasses: jest.fn(() => []),
        }) as unknown as LetsRole.Component;
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
      const cmp = MockComponent({
        id: cmpId,
        sheet,
        cntr: cmpContainerId
          ? (sheet.get(cmpContainerId!) as MockedComponent)
          : undefined,
        classes: cmpStructure?.classes,
      });
      this.cmp[sheetId][cmpId].set(sheet, cmp);

      return cmp;
    });
  }
}

import { MockComponent, MockedComponent } from "./component.mock";
import { MockedSheet } from "./sheet.mock";

export class MockServer {
  sheets: Record<LetsRole.SheetID, Array<MockedSheet>> = {};
  sheetData: Record<LetsRole.SheetID, LetsRole.ViewData> = {};
  cmp: Record<
    LetsRole.SheetID,
    Record<LetsRole.ComponentID, WeakMap<MockedSheet, MockedComponent>>
  > = {};

  registerMockedSheet(sheet: MockedSheet) {
    (() => {
      const id = sheet.getSheetId();
      this.sheets[id] = this.sheets[id] || [];
      this.sheets[id].push(sheet);
      this.sheetData[id] = this.sheetData[id] || {};
      this.cmp[id] = this.cmp[id] || {};
    })();

    sheet.getData = jest.fn(() => {
      return Object.assign({}, this.sheetData[sheet.getSheetId()]);
    });

    sheet.setData = jest.fn((newData) => {
      if (Object.keys(newData).length > 20) {
        throw "Limit of 20 data set exceeded";
      }
      Object.assign(this.sheetData[sheet.getSheetId()], newData);
      this.sheets[sheet.getSheetId()].forEach((sh: MockedSheet) => {
        const cmp = this.cmp[sheet.getSheetId()]?.[sheet.id()]?.get(sh);
        if (cmp) {
          cmp._trigger("update");
        }
      });
    });

    sheet.get = jest.fn((cmpId: LetsRole.ComponentID) => {
      const id = sheet.getSheetId();
      this.cmp[id][cmpId] = this.cmp[id][cmpId] || new WeakMap();
      if (this.cmp[id][cmpId].has(sheet)) {
        return this.cmp[id][cmpId].get(sheet)!;
      }
      const cmp = MockComponent({ id: cmpId, sheet });
      this.cmp[id][cmpId].set(sheet, cmp);

      return cmp;
    });
  }
}

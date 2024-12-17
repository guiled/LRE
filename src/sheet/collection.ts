import { Sheet } from "./sheet";

export class SheetCollection implements ISheetCollection {
  #sheets: Record<LetsRole.SheetRealIdDefined, Sheet> = {};

  add(s: Sheet): void {
    const sheetId = s.getSheetId();

    if (sheetId) {
      lre.log(`sheet stored ${sheetId}`);
      this.#sheets[sheetId] = s;
    }
  }

  each(f: (v: Sheet, k?: LetsRole.SheetID) => any): void {
    for (const sheetId in this.#sheets) {
      f(this.#sheets[sheetId], sheetId);
    }
  }

  get(sheetId: LetsRole.SheetID): Sheet | undefined {
    return this.#sheets?.[sheetId];
  }
}

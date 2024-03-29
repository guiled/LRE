import Sheet from ".";

export default class SheetCollection {
  #sheets: Record<LetsRole.SheetID, Sheet> = {};

  add(s: Sheet) {
    if (s.getSheetId()) {
        this.#sheets[s.getSheetId()] = s;
    }
  }

  each(f: (v: Sheet, k?: LetsRole.SheetID) => any): void {
    for (let sheetId in this.#sheets) {
      f(this.#sheets[sheetId], sheetId);
    }
  }

  get(sheetId: LetsRole.SheetID): Sheet | undefined {
    return this.#sheets?.[sheetId];
  }
}

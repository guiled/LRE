import { Sheet } from "./sheet";

export class SheetCollection {
  #sheets: Record<LetsRole.SheetID, Sheet> = {};

  add(s: Sheet): void {
    if (s.getSheetId()) {
      lre.log(`sheet stored ${s.getSheetId()}`);
      this.#sheets[s.getSheetId()] = s;
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

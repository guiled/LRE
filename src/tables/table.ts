import { HasRaw } from "../hasraw";

export interface Table extends HasRaw<LetsRole.Table> {}
export class Table implements LetsRole.Table {
  get: (id: LetsRole.ColumnId) => LetsRole.TableRow;
  each: (callback: (row: LetsRole.TableRow) => void) => void;
  random: (callback: (row: LetsRole.TableRow) => void) => void;

  constructor(raw: LetsRole.Table) {
    Object.assign(this, new HasRaw(raw));
  }
}

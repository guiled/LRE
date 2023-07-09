import { HasRaw } from "../hasraw";

export class Table extends HasRaw<LetsRole.Table> implements LetsRole.Table {
  get(id: LetsRole.ColumnId): LetsRole.TableRow {
    return {} as LetsRole.TableRow;
  }
  each(callback: (row: LetsRole.TableRow) => void): void {}
  random(callback: (row: LetsRole.TableRow) => void): void {}

  constructor(raw: LetsRole.Table) {
    super(raw);
  }
}

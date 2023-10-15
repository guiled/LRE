import { HasRaw } from "../hasraw";

export class Table extends HasRaw<LetsRole.Table> implements LetsRole.Table {
  get(id: LetsRole.ColumnId): LetsRole.TableRow {
    return this.raw().get(id);
  }
  each(callback: (row: LetsRole.TableRow) => void): void {
    return this.raw().each(callback);
  }
  random(...args: any[]): void {
    let callback: (row: LetsRole.TableRow) => void, count: number;
    if (args.length === 2) {
      [count, callback] = args;
      /* @ts-ignore */
      this.raw().random(count, callback);
    } else {
      [callback] = args;
      this.raw().random(callback);
    }
  }

  constructor(raw: LetsRole.Table) {
    super({
      getRaw: () => raw,
    });
  }
}

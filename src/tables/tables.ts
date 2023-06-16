import { HasRaw } from "../hasraw";
import { Table } from "./table";

interface LreTables extends HasRaw<LetsRole.Tables> {}
class LreTables implements LetsRole.Tables {
  #tables: Record<LetsRole.TableID, Table> = {};

  get(id: LetsRole.TableID): Table {
    if (!this.#tables.hasOwnProperty(id)) {
      this.#tables[id] = new Table(this.raw().get(id));
    }
    return this.#tables[id];
  }

  constructor(raw: LetsRole.Tables) {
    Object.assign(this, new HasRaw(raw));
  }
}

export function overloadTables(_Tables: LetsRole.Tables): void {
  Tables = new LreTables(_Tables);
}

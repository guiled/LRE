import { HasRaw } from "../hasraw";
import { Table } from "./table";

class LreTables extends HasRaw<LetsRole.Tables> implements LetsRole.Tables {
  #tables: Record<LetsRole.TableID, Table> = {};

  get(id: LetsRole.TableID): Table {
    if (!this.#tables.hasOwnProperty(id)) {
      this.#tables[id] = new Table(this.raw().get(id));
    }
    return this.#tables[id];
  }

  constructor(raw: LetsRole.Tables) {
    super(raw);
  }
}

export function overloadTables(_Tables: LetsRole.Tables): void {
  Tables = new LreTables(_Tables);
}

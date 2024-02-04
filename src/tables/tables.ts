import { HasRaw } from "../hasraw";
import { Mixin } from "../mixin";
import { Table } from "./table";

class LreTables
  extends Mixin(HasRaw<LetsRole.Tables>)
  implements LetsRole.Tables
{
  #tables: Record<LetsRole.TableID, Table> = {};

  get(id: LetsRole.TableID): Table {
    if (!this.#tables.hasOwnProperty(id)) {
      this.#tables[id] = new Table(this.raw().get(id));
    }
    return this.#tables[id];
  }

  constructor(raw: LetsRole.Tables) {
    super([
      [
        {
          getRaw: () => raw,
        },
      ],
    ]);
  }
}

export function overloadTables(_Tables: LetsRole.Tables): void {
  Tables = new LreTables(_Tables);
}

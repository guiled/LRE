import { HasRaw } from "../hasraw";
import { Mixin } from "../mixin";
import { Table } from "./table";

export class LreTables
  extends Mixin(HasRaw<LetsRole.Tables>)
  implements LetsRole.Tables
{
  #tables: Record<LetsRole.TableID, Table | null> = {};

  get(id: LetsRole.TableID): Table | null {
    if (!this.#tables.hasOwnProperty(id)) {
      const foundTable = this.raw().get(id);
      this.#tables[id] = foundTable ? new Table(foundTable) : null;
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

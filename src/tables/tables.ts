import { HasRaw } from "../hasraw";
import { Mixin } from "../mixin";
import { Table } from "./table";

export class LreTables
  extends Mixin(HasRaw<LetsRole.Tables>)
  implements ITables
{
  #tables: Record<LetsRole.TableID, ITable | null> = {};

  constructor(raw: LetsRole.Tables) {
    super([
      [
        {
          getRaw: () => raw,
        },
      ],
    ]);
  }
  get(id: LetsRole.TableID): ITable | null {
    lre.trace(`Get table "${id}"`);

    if (!Object.prototype.hasOwnProperty.call(this.#tables, id)) {
      const foundTable = this.raw().get(id);
      this.#tables[id] = foundTable ? new Table(foundTable, id) : null;
    }

    return this.#tables[id];
  }
}

export function overloadTables(_Tables: LetsRole.Tables): void {
  Tables = new LreTables(_Tables);
}

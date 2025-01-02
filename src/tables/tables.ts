import { HasRaw } from "../hasraw";
import { Mixin } from "../mixin";
import { Table } from "./table";

export class LreTables
  extends Mixin(HasRaw<LetsRole.Tables>)
  implements ITables
{
  #tables: Record<LetsRole.TableID, ITable | null> = {};
  #context: ProxyModeHandler;

  constructor(raw: LetsRole.Tables, context: ProxyModeHandler) {
    super([
      [
        {
          getRaw: () => raw,
        },
      ],
    ]);
    this.#context = context;
  }

  get(id: LetsRole.TableID): ITable | null {
    LRE_DEBUG && lre.trace(`Get table "${id}"`);

    if (!Object.prototype.hasOwnProperty.call(this.#tables, id)) {
      const foundTable = this.raw().get(id);
      this.#tables[id] = foundTable
        ? new Table(foundTable, this.#context, id)
        : null;
    }

    return this.#tables[id];
  }
}

export function overloadTables(
  _Tables: LetsRole.Tables,
  context: ProxyModeHandler,
): void {
  Tables = new LreTables(_Tables, context);
}

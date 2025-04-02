import { HasRaw } from "../hasraw";
import { Mixin } from "../mixin";
import { ScriptTable, AcceptedScriptTableSource } from "./scriptTable";
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
    LRE_DEBUG && lre.trace(`[Table] Get table "${id}"`);

    if (!Object.prototype.hasOwnProperty.call(this.#tables, id)) {
      const foundTable = this.raw().get(id);
      this.#tables[id] = foundTable
        ? new Table(foundTable, this.#context, id)
        : null;
    }

    if (!this.#tables[id]) {
      lre.error(`[Table] "${id}" not found`);
    }

    return this.#tables[id];
  }

  register(id: LetsRole.TableID, data: AcceptedScriptTableSource): ITable {
    LRE_DEBUG && lre.trace(`[Table] Register table "${id}"`);
    this.#tables[id] = new ScriptTable(data, this.#context, id);

    return this.#tables[id];
  }
}

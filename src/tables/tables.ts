import { HasRaw } from "../hasraw";
import { Mixin } from "../mixin";
import { ScriptTable, AcceptedScriptTableSource } from "./scriptTable";
import { Table } from "./table";

export class LreTables
  extends Mixin(HasRaw<LetsRole.Tables>)
  implements ITables
{
  #tables: Record<LetsRole.TableID, ITable | null> = {};
  #dynamicTableDef: Record<LetsRole.TableID, AcceptedScriptTableSource> = {};
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

  get(id: LetsRole.TableID, arg?: unknown): ITable | null {
    LRE_DEBUG && lre.trace(`[Table] Get table "${id}"`);

    if (Object.prototype.hasOwnProperty.call(this.#dynamicTableDef, id)) {
      return new ScriptTable(this.#dynamicTableDef[id], this.#context, id, arg);
    }

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

  register(id: LetsRole.TableID, data: AcceptedScriptTableSource): void {
    LRE_DEBUG && lre.trace(`[Table] Register table "${id}"`);

    if (typeof data === "function") {
      this.#dynamicTableDef[id] = data;
    } else {
      this.#tables[id] = new ScriptTable(data, this.#context, id);
    }
  }
}

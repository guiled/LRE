import { DataProvider } from "../dataprovider";
import { ChangeTracker } from "../globals/changetracker";
import { Mixin } from "../mixin";

type ScriptTableSourceArray = Array<LetsRole.TableRow>;

type ScriptTableSourceObject = Record<string, Omit<LetsRole.TableRow, "id">>;
type ScriptTableSourceFunction = (
  arg?: unknown,
) => ScriptTableSourceObject | ScriptTableSourceArray;

type InternalScriptTableSource =
  | ScriptTableSourceArray
  | ScriptTableSourceFunction;

export type AcceptedScriptTableSource =
  | ScriptTableSourceObject
  | InternalScriptTableSource;

export class ScriptTable extends Mixin(DataProvider) implements ITable {
  //#context: ProxyModeHandler;
  #id: string;
  #data!: InternalScriptTableSource;
  #index: Record<string, number> | null;
  #tracker: ChangeTracker;
  #functionArg: unknown | undefined;

  constructor(
    data: AcceptedScriptTableSource,
    context: ProxyModeHandler,
    id: LetsRole.TableID,
    arg: unknown | undefined = undefined,
  ) {
    super([
      [
        context,
        () => {
          const result: { [key: keyof TableRow]: TableRow } = {};
          this.each((row: TableRow) => {
            result[row.id] = row;
          });
          return result;
        },
      ],
    ]);
    this.#tracker = new ChangeTracker(this, context);
    this.#functionArg = arg;

    if (typeof data === "function") {
      this.#data = data;
      this.#index = null;
    } else {
      this.#data = this.#transformDataToArray(data);
      this.#index = this.#getIndexes(this.#data);
    }

    this.#id = id;
  }

  id(): string {
    return this.#id;
  }

  getChangeTracker(): ChangeTracker {
    return this.#tracker;
  }

  @ChangeTracker.linkParams()
  get(id: DynamicSetValue<LetsRole.ColumnId>): TableRow | null {
    const data = this.#getData();
    const indexes = this.#index || this.#getIndexes(data);

    if (!lre.isIndex(id)) {
      LRE_DEBUG &&
        lre.trace(
          `[Table] Invalid id to get table row "${id}" in table ${this.id()}`,
        );
      return null;
    }

    if (!Object.prototype.hasOwnProperty.call(indexes, id)) {
      LRE_DEBUG &&
        lre.trace(`[Table] get() on ${this.realId()} can't find row ${id}`);
      return null;
    }

    return data[indexes[id]];
  }

  random(...args: any[]): TableRow | Array<TableRow> | undefined {
    let callback: (row: LetsRole.TableRow) => void, count: number;
    const data = this.#getData();

    if (args.length === 2) {
      [count, callback] = args;
    } else {
      callback = args[0];
      count = 1;
    }

    const result: Array<LetsRole.TableRow> = [];

    for (let i = 0; i < count && data.length; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      const row = data[randomIndex];
      callback(row);
      result.push(row);
      data.splice(randomIndex, 1);
    }

    return count === 1 ? result[0] : result;
  }

  each(
    callback: (
      row: TableRow,
      key: string | number,
      originalData: TableRow,
    ) => void,
  ): void {
    const data = this.#getData();
    data.forEach((data) => {
      callback(data, data.id, data);
    });
  }

  #transformDataToArray(
    data: ScriptTableSourceArray | ScriptTableSourceObject,
  ): ScriptTableSourceArray {
    if (Array.isArray(data)) {
      return Array.from(data);
    }

    return Object.keys(data).map((key) => {
      return {
        id: key,
        ...(data as ScriptTableSourceObject)[key],
      };
    });
  }

  #getIndexes(data: ScriptTableSourceArray): Record<string, number> {
    return data.reduce(
      (acc, row, index) => {
        acc[row.id] = index;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  #getData(): ScriptTableSourceArray {
    if (typeof this.#data === "function") {
      return this.#functionToArray(this.#data);
    }

    return [...this.#data];
  }

  #functionToArray(data: ScriptTableSourceFunction): ScriptTableSourceArray {
    const result = this.#functionArg ? data(this.#functionArg) : data();

    if (typeof result === "function") {
      return this.#functionToArray(result);
    }

    return this.#transformDataToArray(result);
  }
}

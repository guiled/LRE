import { DataProvider } from "../dataprovider";
import { ChangeTracker } from "../globals/changetracker";
import { HasRaw } from "../hasraw";
import { Mixin } from "../mixin";

export class Table
  extends Mixin(HasRaw<LetsRole.Table>, DataProvider)
  implements ITable
{
  #id: LetsRole.TableID;
  #tracker: ChangeTracker;

  constructor(
    raw: LetsRole.Table,
    context: ProxyModeHandler,
    id: LetsRole.TableID,
  ) {
    super([
      [
        {
          getRaw: () => raw,
        },
      ],
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
    this.#id = id;
    this.#tracker = new ChangeTracker(this, context);
  }

  id(): LetsRole.TableID {
    return this.#id;
  }

  realId(): LetsRole.TableID {
    return `table(${this.id()})`;
  }

  getChangeTracker(): ChangeTracker {
    return this.#tracker;
  }

  @ChangeTracker.linkParams()
  get(id: DynamicSetValue<LetsRole.ColumnId>): TableRow | null {
    if (typeof id !== "string") {
      return null;
    }

    const row = this.raw().get(id);

    if (!row) {
      return row;
    }

    return lre.value(row);
  }

  each(
    callback: (
      row: TableRow,
      key: string | number,
      originalData: TableRow,
    ) => void,
  ): void {
    return this.raw().each((row: LetsRole.TableRow) => {
      callback(lre.value(row), lre.value(row.id), lre.value(row));
    });
  }

  random(...args: any[]): TableRow | Array<TableRow> | undefined {
    let callback: (row: LetsRole.TableRow) => void, count: number;

    if (args.length === 2) {
      [count, callback] = args;
      const result: Array<LetsRole.TableRow> = [];
      /* @ts-expect-error the second parameter is optional but raise an error */
      this.raw().random(count, (row: LetsRole.TableRow) => {
        const transformedRow = lre.value(row);
        result.push(transformedRow);
        callback(transformedRow);
      });
      return result;
    } else {
      let result: LetsRole.TableRow | undefined;
      [callback] = args;
      this.raw().random((row: LetsRole.TableRow) => {
        result = lre.value(row);
        callback(result);
      });
      return result;
    }
  }
}

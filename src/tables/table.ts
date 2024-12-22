import { DataProvider } from "../dataprovider";
import { HasRaw } from "../hasraw";
import { Mixin } from "../mixin";

export class Table
  extends Mixin(HasRaw<LetsRole.Table>, DataProvider)
  implements ITable
{
  #id: LetsRole.TableID;

  constructor(raw: LetsRole.Table, id: LetsRole.TableID) {
    super([
      [
        {
          getRaw: () => raw,
        },
      ],
      [
        undefined,
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
  }

  id(): LetsRole.TableID {
    return this.#id;
  }

  get(id: LetsRole.ColumnId): TableRow | null {
    const row = this.raw().get(id);

    if (!row) {
      return row;
    }

    return lre.value(row);
  }

  each(callback: (row: TableRow, key: string | number) => void): void {
    return this.raw().each((row: LetsRole.TableRow) => {
      callback(lre.value(row), lre.value(row.id));
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

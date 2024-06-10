import { DataProvider } from "../dataprovider";
import { HasRaw } from "../hasraw";
import { Mixin } from "../mixin";

export class Table
  extends Mixin(HasRaw<LetsRole.Table>, DataProvider)
  implements LetsRole.Table
{
  get(id: LetsRole.ColumnId): LetsRole.TableRow | null {
    return this.raw().get(id);
  }
  each(callback: (row: LetsRole.TableRow, key: string) => void): void {
    return this.raw().each((row: LetsRole.TableRow) => {
      callback(row, row.id);
    });
  }
  random(...args: any[]): void {
    let callback: (row: LetsRole.TableRow) => void, count: number;
    if (args.length === 2) {
      [count, callback] = args;
      /* @ts-ignore the second parameter is optional but raise an error */
      this.raw().random(count, callback);
    } else {
      [callback] = args;
      this.raw().random(callback);
    }
  }

  constructor(raw: LetsRole.Table) {
    super([
      [
        {
          getRaw: () => raw,
        },
      ],
      [
        () => {
          const result: { [key: LetsRole.TableValue]: LetsRole.TableRow } = {};
          this.each((row: LetsRole.TableRow) => {
            result[row.id] = row;
          });
          return result;
        },
      ],
    ]);
  }
}

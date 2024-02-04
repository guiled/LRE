import { HasRaw } from "../hasraw";
import { Mixin } from "../mixin";

export class Table
  extends Mixin(HasRaw<LetsRole.Table>)
  implements LetsRole.Table
{
  get(id: LetsRole.ColumnId): LetsRole.TableRow {
    return this.raw().get(id);
  }
  each(callback: (row: LetsRole.TableRow) => void): void {
    return this.raw().each(callback);
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
    ]);
  }
}

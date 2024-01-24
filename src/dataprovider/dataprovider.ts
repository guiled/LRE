type DataGetter = () => LetsRole.ComponentValue | void;

type Sorter = (a: any, b: any) => number;
const defaultSorter: Sorter = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export class DataProvider implements IDataProvider {
  public provider = true;
  #getter: DataGetter;

  constructor(getter: DataGetter) {
    this.#getter = getter;
  }

  value(): LetsRole.ComponentValue | void {
    return this.#getter();
  }

  sort(sorter: Sorter = defaultSorter): IDataProvider {
    return new DataProvider(() => {
      const data = this.#getter();
      if (Array.isArray(data)) {
        return data.toSorted(sorter);
      } else if (typeof data === "object") {
        return Object.entries(
          data as LetsRole.ViewData | LetsRole.RepeaterValue
        )
          .sort(([, a]: [any, any], [, b]: [any, any]) => sorter(a, b))
          .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
      } else {
        return data;
      }
    });
  }
}

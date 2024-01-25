type ValueGetterSetter = (
  newValue?: LetsRole.ComponentValue
) => LetsRole.ViewData | void;

type Sorter = (a: any, b: any) => number;
const defaultSorter: Sorter = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export class DataProvider implements IDataProvider {
  public provider = true;
  #valueCb: ValueGetterSetter;

  constructor(valueCb: ValueGetterSetter) {
    this.#valueCb = valueCb;
  }

  value(_newValue?: LetsRole.ComponentValue): LetsRole.ViewData | void {
    return this.#handleSet(this.#valueCb).apply(this, Array.from(arguments) as [LetsRole.ComponentValue]);
  }

  sort(sorter: Sorter = defaultSorter): IDataProvider {
    return new DataProvider(
      this.#handleSet(() => {
        const data = this.#valueCb();
        if (Array.isArray(data)) {
          console.log("🚀 ~ DataProvider ~ this.#handleSet ~ data", data)
          return data.toSorted(sorter);
        } else if (typeof data === "object") {
          return Object.entries(
            data as LetsRole.ViewData | LetsRole.RepeaterValue
          )
            .sort(([, a]: [any, any], [, b]: [any, any]) => sorter(a, b))
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
        }
        return data;
      })
    );
  }

  #handleSet(valueCb: ValueGetterSetter): ValueGetterSetter {
    return (...args: any[]): LetsRole.ViewData | void => {
      if (args.length > 0) {
        return this.#valueCb(...args);
      }
      return valueCb();
    };
  }
}

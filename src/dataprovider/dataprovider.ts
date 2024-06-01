import { Mixin } from "../mixin";

type ValueGetterSetter<
  T extends LetsRole.ComponentValue | undefined = undefined,
> = (newValue?: T) => T extends undefined ? LetsRole.ComponentValue : void;

type Sorter = (a: any, b: any) => number;
const defaultSorter: Sorter = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const DataProvider = (superclass: Newable = class {}) =>
  class DataProvider extends superclass implements IDataProvider {
    public provider = true;
    #valueCb: ValueGetterSetter;

    constructor(valueCb: ValueGetterSetter) {
      super();
      this.#valueCb = valueCb;
    }

    providedValue<T extends LetsRole.ComponentValue | undefined = undefined>(
      _newValue?: T
    ): ReturnType<ValueGetterSetter<T>> {
      return this.#handleSet(this.#valueCb).apply(
        this,
        Array.from(arguments) as [any]
      ) as ReturnType<ValueGetterSetter<T>>;
    }

    sort(sorterOrString: string | Sorter = defaultSorter): IDataProvider {
      let sorter: Sorter;
      if (typeof sorterOrString === "string") {
        let field: string = sorterOrString;
        sorter = (a: any, b: any) => defaultSorter(a[field], b[field]);
      } else {
        sorter = sorterOrString;
      }
      return new DirectDataProvider(
        this.#handleSet(() => {
          const data = this.#valueCb();
          if (Array.isArray(data)) {
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

    #handleSet<T extends LetsRole.ComponentValue | undefined = undefined>(
      valueCb: ValueGetterSetter<T>
    ): ValueGetterSetter<T> {
      return ((...args: [any] | []): ReturnType<ValueGetterSetter<T>> => {
        if (args.length === 0) {
          return valueCb();
        }
        this.#valueCb(...args);
      }) as ValueGetterSetter<T>;
    }

    each(
      mapper: (val: LetsRole.ComponentValue, key: number | string) => void
    ): void {
      const values = this.#valueCb();

      if (typeof values === "undefined") return;

      if (Array.isArray(values)) {
        values.forEach(mapper);
      } else if (lre.isObject(values)) {
        Object.keys(values).forEach((k) => mapper(values[k], k));
      } else {
        mapper(values, "");
      }
    }

    select(column: string): IDataProvider {
      return new DirectDataProvider(
        this.#handleSet(() => {
          let result: Record<
            string,
            LetsRole.TableRow | LetsRole.ComponentValue
          > = {};

          this.each((v, k) => {
            if (typeof v === "undefined") return;
            else if (Array.isArray(v)) {
              result[k] = v.includes(column);
            } else if (v && lre.isObject(v) && v.hasOwnProperty(column)) {
              result[k] = v[column] as LetsRole.ComponentValue;
            } else {
              result[k] = undefined;
            }
          });

          if (result.hasOwnProperty("") && Object.keys(result).length === 1) {
            return result[""];
          }
          return result;
        })
      );
    }

    getData(
      id:
        | LetsRole.ComponentID
        | LetsRole.ColumnId
        | LetsRole.ComponentValue
        | Array<number | string>
    ): LetsRole.TableRow | LetsRole.ComponentValue {
      const values = this.providedValue();

      if (Array.isArray(values) || lre.isObject(values)) {
        if (lre.isUseableAsIndex(id)) {
          return this.#getFromArrOrObj(values, id);
        }

        const result: LetsRole.ViewData = {};
        if (Array.isArray(id)) {
          id.forEach((v) => (result[v] = this.#getFromArrOrObj(values, v)));
        }

        return result;
      } else {
        return values;
      }
    }

    #getFromArrOrObj(
      values: LetsRole.ComposedComponentValue,
      id: number | string
    ): LetsRole.ComponentValue {
      if (Array.isArray(values)) {
        const index = typeof id === "string" ? parseInt(id) : id;
        return values?.[index];
      } else {
        return values?.[id];
      }
    }
  };

export class DirectDataProvider extends Mixin(DataProvider) {
  constructor(valueCb: ValueGetterSetter) {
    super([[valueCb]]);
  }
}

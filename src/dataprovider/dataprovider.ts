import { Mixin } from "../mixin";

type ValueGetterSetter<
  T extends LetsRole.ComponentValue | LetsRole.TableRow | undefined = undefined
> = (
  newValue?: T
) => T extends undefined ? LetsRole.ComponentValue | LetsRole.TableRow : void;

type Sorter = (a: any, b: any) => number;
const defaultSorter: Sorter = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const DataProvider = (superclass: Newable = class {}) =>
  class DataProvider extends superclass implements IDataProvider {
    public provider = true;
    #valueCb: ValueGetterSetter;
    #originalValueCb: ValueGetterSetter;

    constructor(
      valueCb: ValueGetterSetter,
      originalValueCb: ValueGetterSetter = valueCb
    ) {
      super();
      this.#valueCb = valueCb;
      this.#originalValueCb = originalValueCb;
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
        }),
        this.#originalValueCb
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
      mapper: (
        val: LetsRole.ComponentValue | LetsRole.TableRow,
        key: DataProviderDataId
      ) => void
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
        }),
        this.#originalValueCb
      );
    }

    getData(
      id?:
        | LetsRole.ComponentID
        | LetsRole.ColumnId
        | LetsRole.ComponentValue
        | Array<number | string>
    ): LetsRole.TableRow | LetsRole.ComponentValue {
      const originalValues = this.#originalValueCb();

      if (typeof id === "undefined") {
        if (Array.isArray(originalValues) && originalValues.length === 1) {
          return originalValues[0];
        } else if (lre.isObject<LetsRole.ValueAsObject>(originalValues)) {
          const values = this.#valueCb() as LetsRole.ValueAsObject;
          const valueKeys = Object.keys(values);
          if (valueKeys.length === 1) {
            return originalValues[valueKeys[0]];
          }
        } else {
          return originalValues;
        }
        return undefined;
      }

      if (Array.isArray(originalValues) || lre.isObject(originalValues)) {
        if (lre.isUseableAsIndex(id)) {
          return this.#getFromArrOrObj(originalValues, id);
        }

        const result: LetsRole.ViewData = {};
        if (Array.isArray(id)) {
          id.forEach(
            (v) => (result[v] = this.#getFromArrOrObj(originalValues, v))
          );
        }

        return result;
      } else {
        return originalValues;
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

    filter(condition: DataProviderWhereConditioner): IDataProvider {
      return new DirectDataProvider(
        this.#handleSet(() => {
          let result: Record<
            string,
            LetsRole.TableRow | LetsRole.ComponentValue
          > = {};

          this.each((v, k) => {
            if (condition(v, k, this.getData(k))) {
              result[k] = v;
            }
          });

          return result;
        }),
        this.#originalValueCb
      );
    }

    where(
      condition: LetsRole.ComponentValue | DataProviderWhereConditioner
    ): IDataProvider {
      if (typeof condition === undefined) return this;

      let conditioner: DataProviderWhereConditioner = (v) => v === condition;
      if (typeof condition === "function") {
        conditioner = condition as DataProviderWhereConditioner;
      }

      return this.filter(conditioner);
    }

    count(): number {
      const values = this.#valueCb();
      if (Array.isArray(values)) {
        return values.length;
      } else if (lre.isObject(values)) {
        return Object.keys(values).length;
      } else {
        return 1;
      }
    }

    length(): number {
      return this.count();
    }

    singleValue(): DataProviderDataValue {
      const values = this.#valueCb();
      if (Array.isArray(values)) {
        return values[0];
      } else if (lre.isObject(values)) {
        return Object.values(values)[0];
      } else {
        return values;
      }
    }

    singleId(): DataProviderDataId {
      const values = this.#valueCb();
      if (Array.isArray(values)) {
        if (lre.isObject(values[0]) && values[0].hasOwnProperty("id")) {
          return values[0].id;
        }
        return 0;
      } else if (lre.isObject(values)) {
        return Object.keys(values)[0];
      } else {
        return 0;
      }
    }
  };

export class DirectDataProvider extends Mixin(DataProvider) {
  constructor(
    valueCb: ValueGetterSetter,
    originalValueCb: ValueGetterSetter = valueCb
  ) {
    const dataProviderArgs = [valueCb];
    if (arguments.length > 1) {
      dataProviderArgs.push(originalValueCb);
    }
    super([dataProviderArgs]);
  }
}

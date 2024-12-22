import {
  dynamicSetter,
  extractDataProviders,
} from "../globals/decorators/dynamicSetter";
import { Mixin } from "../mixin";

export type ValueGetterSetter<
  T extends LetsRole.ComponentValue | LetsRole.TableRow | undefined = undefined,
> = (
  newValue?: T,
) => T extends undefined ? LetsRole.ComponentValue | LetsRole.TableRow : void;

/*type FlatDataRow = {
  id: DataProviderDataId;
  val: DataProviderDataValue;
} & Record<string, DataProviderDataValue>;
*/
type Sorter = (
  a: DataProviderDataValue,
  b: DataProviderDataValue,
  keyA?: DataProviderDataId,
  keyB?: DataProviderDataId,
  dataA?: DataProviderDataValue,
  dataB?: DataProviderDataValue,
) => number;
const defaultSorter: Sorter = ((a: number | string, b: number | string) =>
  a < b ? -1 : a > b ? 1 : 0) as Sorter;

// giving a type to the function will break the Mixin usage
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const DataProvider = (superclass: Newable = class {}) =>
  class DataProvider extends superclass implements IDataProvider {
    public provider = true;
    #valueCb: ValueGetterSetter;
    #originalValueCb: ValueGetterSetter | undefined;
    #currentValue: ReturnType<ValueGetterSetter> | undefined;
    #originalValue: ReturnType<ValueGetterSetter> | undefined;
    #sourceRefresh: undefined | (() => void);
    #destRefresh: Record<string, () => void> = {};
    #context: ProxyModeHandler | undefined;

    constructor(
      context: ProxyModeHandler | undefined,
      valueCb: ValueGetterSetter,
      originalValueCb?: ValueGetterSetter,
      sourceRefresh?: () => void,
    ) {
      super();
      this.#context = context;
      this.#valueCb = valueCb;
      this.#originalValueCb = originalValueCb;
      this.#sourceRefresh = sourceRefresh;
    }

    @dynamicSetter
    @extractDataProviders()
    #setCurrentValue(
      value: DynamicSetValue<ReturnType<ValueGetterSetter>>,
    ): ReturnType<ValueGetterSetter> {
      if (!lre.deepEqual(this.#currentValue, value)) {
        this.#currentValue = value as ReturnType<ValueGetterSetter>;
        this.refreshDerived();
      }

      return this.#currentValue;
    }

    #getCurrentValue(): ReturnType<ValueGetterSetter> {
      const result = this.#currentValue ?? this.#setCurrentValue(this.#valueCb);

      return lre.value(result);
    }

    @dynamicSetter
    @extractDataProviders()
    #setOriginalValue(
      value: DynamicSetValue<ReturnType<ValueGetterSetter>>,
    ): ReturnType<ValueGetterSetter> {
      this.#originalValue = (value ??
        this.#getCurrentValue()) as ReturnType<ValueGetterSetter>;

      return this.#originalValue;
    }

    #getOriginalValue(): ReturnType<ValueGetterSetter> {
      if (!this.#originalValue) {
        if (this.#originalValueCb) {
          return this.#setOriginalValue(this.#originalValueCb);
        }

        this.#originalValue = this.#getCurrentValue();
      }

      return this.#originalValue;
    }

    realId(): string {
      return "dp-" + lre.getRandomId();
    }

    providedValue<T extends LetsRole.ComponentValue | undefined = undefined>(
      _newValue?: T,
    ): ReturnType<ValueGetterSetter<T>> {
      const getSet = this.#handleSet(this.#getCurrentValue.bind(this));

      if (arguments.length === 0) {
        return getSet.call(this) as ReturnType<ValueGetterSetter<T>>;
      } else {
        return getSet.apply(this, Array.from(arguments) as []) as ReturnType<
          ValueGetterSetter<T>
        >;
      }
    }

    refresh(): void {
      this.#sourceRefresh?.();
      this.#currentValue = undefined;
      this.#originalValue = undefined;
      this.#getCurrentValue();
      this.#getOriginalValue();
    }

    sort(sorterOrString: Sorter | string = defaultSorter): IDataProvider {
      let sorter: Sorter;

      if (typeof sorterOrString === "string") {
        const field: string = sorterOrString;
        sorter = ((
          a: Record<string, DataProviderDataValue>,
          b: Record<string, DataProviderDataValue>,
          _ka: DataProviderDataId,
          _kb: DataProviderDataId,
          dataA: DataProviderDataValue,
          dataB: DataProviderDataValue,
        ) =>
          defaultSorter(
            a[field] ?? (dataA as Record<string, any>)?.[field],
            b[field] ?? (dataB as Record<string, any>)?.[field],
          )) as Sorter;
      } else {
        sorter = sorterOrString;
      }

      return this.#sortData(sorter);
    }

    sortBy(sorterWithData: DataProviderComputer): IDataProvider {
      return this.#sortData((a, b, ka, kb, dataA, dataB) =>
        defaultSorter(
          sorterWithData(a, ka, dataA),
          sorterWithData(b, kb, dataB),
        ),
      );
    }

    #sortData(sorter: Sorter): IDataProvider {
      return this.#newProvider("sort", () => {
        const data = this.#getCurrentValue();

        if (Array.isArray(data)) {
          return data.toSorted((a, b) => sorter(a, b));
        } else if (lre.isObject(data)) {
          return Object.entries(data)
            .sort(
              (
                [ka, a]: [DataProviderDataId, DataProviderDataValue],
                [kb, b]: [DataProviderDataId, DataProviderDataValue],
              ) => sorter(a, b, ka, kb, this.getData(ka), this.getData(kb)),
            )
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
        }

        return data;
      });
    }

    #handleSet<T extends LetsRole.ComponentValue | undefined = undefined>(
      valueCb: ValueGetterSetter<T>,
    ): ValueGetterSetter<T> {
      return ((...args: [undefined] | []): ReturnType<ValueGetterSetter<T>> => {
        if (args.length === 0) {
          this.#context?.logAccess?.("provider", this);
          return valueCb();
        }

        this.#valueCb(...args);
      }) as ValueGetterSetter<T>;
    }

    each(
      mapper: (
        val: LetsRole.ComponentValue | LetsRole.TableRow,
        key: DataProviderDataId,
      ) => void,
    ): void {
      const values = this.#getCurrentValue();

      if (typeof values === "undefined") return;

      if (Array.isArray(values)) {
        values.forEach(mapper);
      } else if (lre.isObject(values) && !lre.isAvatarValue(values)) {
        Object.keys(values).forEach((k) => mapper(values[k], k));
      } else {
        mapper(values, "");
      }
    }

    select(column: string): IDataProvider {
      return this.#newProvider("select", () => {
        const result: Record<
          string,
          LetsRole.TableRow | LetsRole.ComponentValue
        > = {};

        this.each((v, k) => {
          if (typeof v === "undefined") return;
          else if (Array.isArray(v)) {
            result[k] = v.includes(column);
          } else if (
            v &&
            lre.isObject(v) &&
            !lre.isAvatarValue(v) &&
            Object.prototype.hasOwnProperty.call(v, column)
          ) {
            result[k] = v[column] as LetsRole.ComponentValue;
          } else {
            result[k] = undefined;
          }
        });

        if (
          Object.prototype.hasOwnProperty.call(result, "") &&
          Object.keys(result).length === 1
        ) {
          return result[""];
        }

        return result;
      });
    }

    getData(
      id?: DataProviderDataId | Array<number | string>,
    ): LetsRole.TableRow | LetsRole.ComponentValue {
      const originalValues = this.#getOriginalValue();

      if (typeof id === "undefined") {
        if (Array.isArray(originalValues) && originalValues.length === 1) {
          return originalValues[0];
        } else if (
          !Array.isArray(originalValues) &&
          lre.isObject(originalValues) &&
          !lre.isAvatarValue(originalValues)
        ) {
          const values = this.#getCurrentValue() || {};
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
            (v) => (result[v] = this.#getFromArrOrObj(originalValues, v)),
          );
        }

        return result;
      } else {
        return originalValues;
      }
    }

    #getFromArrOrObj(
      values: LetsRole.ComposedComponentValue,
      id: number | string,
    ): LetsRole.ComponentValue {
      if (Array.isArray(values)) {
        const index = typeof id === "string" ? parseInt(id) : id;
        return values?.[index];
      } else if (!lre.isAvatarValue(values)) {
        return values?.[id];
      }

      return undefined;
    }

    filter(condition: DataProviderWhereConditioner): IDataProvider {
      return this.#newProvider("filter", () => {
        const result: Record<
          string,
          LetsRole.TableRow | LetsRole.ComponentValue
        > = {};

        this.each((v, k) => {
          if (condition(v, k, this.getData(k))) {
            result[k] = v;
          }
        });

        return result;
      });
    }

    where(
      condition: LetsRole.ComponentValue | DataProviderWhereConditioner,
    ): IDataProvider {
      if (typeof condition === "undefined") return this;

      let conditioner: DataProviderWhereConditioner = (v) => v === condition;

      if (typeof condition === "function") {
        conditioner = condition as DataProviderWhereConditioner;
      }

      return this.filter(conditioner);
    }

    count(): number {
      const values = this.#getCurrentValue();

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
      const values = this.#getCurrentValue();

      if (Array.isArray(values)) {
        return values[0];
      } else if (lre.isObject(values)) {
        return Object.values(values)[0];
      } else {
        return values;
      }
    }

    singleId(): DataProviderDataId {
      const values = this.#getCurrentValue();

      if (Array.isArray(values)) {
        if (
          lre.isObject(values[0]) &&
          Object.prototype.hasOwnProperty.call(values[0], "id")
        ) {
          return values[0].id;
        }

        return 0;
      } else if (lre.isObject(values)) {
        return Object.keys(values)[0];
      } else {
        return 0;
      }
    }

    #newProvider(id: string, valueCb: ValueGetterSetter): IDataProvider {
      const provider = new DirectDataProvider(
        id,
        this.#context,
        this.#handleSet(valueCb),
        this.#getOriginalValue.bind(this),
        this.refresh.bind(this),
      );
      this.subscribeRefresh(
        provider.realId(),
        provider.providedValue.bind(provider),
      );

      return provider;
    }

    subscribeRefresh(id: string, refresh: () => void): void {
      this.#destRefresh[id] = refresh;
    }

    unsubscribeRefresh(id: string): void {
      delete this.#destRefresh[id];
    }

    refreshDerived(): void {
      Object.values(this.#destRefresh).forEach((refresh) => refresh());
    }

    /*toArray(): Array<DataProviderDataValue> {
      const values = this.#getCurrentValue();

      if (Array.isArray(values)) {
        return values;
      } else if (lre.isObject(values)) {
        return Object.values(values);
      } else {
        return [values];
      }
    }*/
  };

export class DirectDataProvider extends Mixin(DataProvider) {
  #id: string;

  constructor(
    id: string,
    context: ProxyModeHandler | undefined,
    valueCb: ValueGetterSetter,
    originalValueCb?: ValueGetterSetter,
    sourceRefresh?: () => void,
  ) {
    const dataProviderArgs: Partial<
      ConstructorParameters<ReturnType<typeof DataProvider>>
    > = [context, valueCb];

    if (arguments.length > 2) {
      dataProviderArgs.push(originalValueCb);
    }

    if (arguments.length > 3) {
      dataProviderArgs.push(sourceRefresh!);
    }

    super([dataProviderArgs]);
    this.#id = super.realId() + "-" + id;
  }

  realId(): string {
    return this.#id;
  }
}

import {
  dynamicSetter,
  extractDataProviders,
} from "../globals/decorators/dynamicSetter";
import { Mixin } from "../mixin";

export type ValueGetterSetter<
  T extends LetsRole.ComponentValue | TableRow | undefined = undefined,
> = (
  newValue?: T,
) => T extends undefined ? LetsRole.ComponentValue | TableRow : void;

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
    #id: string;

    constructor(
      context: ProxyModeHandler | undefined,
      valueCb: ValueGetterSetter,
      originalValueCb?: ValueGetterSetter,
      sourceRefresh?: () => void,
    ) {
      super();
      this.#id = "dp-" + lre.getRandomId();
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
      return this.#id;
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

    sort(
      sorterOrString: Sorter | string = defaultSorter,
      direction: SortDirection = "ASC",
    ): IDataProvider {
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

      return this.#sortData(sorter, direction);
    }

    sortBy(
      sorterWithData: DataProviderComputer,
      direction: SortDirection = "ASC",
    ): IDataProvider {
      return this.#sortData(
        (a, b, ka, kb, dataA, dataB) =>
          defaultSorter(
            sorterWithData(a, ka, dataA),
            sorterWithData(b, kb, dataB),
          ),
        direction,
      );
    }

    #sortData(sorter: Sorter, direction: SortDirection): IDataProvider {
      return this.#newProvider("sort", () => {
        const data = this.#getCurrentValue();

        if (Array.isArray(data)) {
          return data.toSorted(
            (a, b) => (direction === "ASC" ? 1 : -1) * sorter(a, b),
          );
        } else if (lre.isObject(data)) {
          const sorted = Object.entries(data).toSorted(
            (
              [ka, a]: [DataProviderDataId, DataProviderDataValue],
              [kb, b]: [DataProviderDataId, DataProviderDataValue],
            ) =>
              (direction === "ASC" ? 1 : -1) *
              sorter(a, b, ka, kb, this.getData(ka), this.getData(kb)),
          );
          const result: ReturnType<ValueGetterSetter> = {};
          sorted.forEach(([k, v]) => (result[k] = v));

          return result;
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
        val: DataProviderDataValue,
        key: DataProviderDataId,
        originalValue: LetsRole.ComponentValue | TableRow,
      ) => void | false,
    ): void {
      const values = this.#getCurrentValue();

      if (typeof values === "undefined") {
        return;
      }

      if (Array.isArray(values)) {
        values.every((v, k) => mapper(v, k, this.getData(k)) !== false);
      } else if (lre.isObject(values) && !lre.isAvatarValue(values)) {
        Object.keys(values).every(
          (k) => mapper(values[k], k, this.getData(k)) !== false,
        );
      } else {
        mapper(values, "", values);
      }
    }

    select(column: string): IDataProvider {
      return this.#newProvider(`${this.realId()}-select-${column}`, () => {
        const result: Record<string, TableRow | LetsRole.ComponentValue> = {};

        this.each((v, k) => {
          result[k] = this.#getValueColumn(v, column);
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

    #getValueColumn(
      value: DataProviderDataValue,
      column: string | number,
    ): LetsRole.ComponentValue {
      if (typeof value === "undefined") {
        return;
      } else if (Array.isArray(value)) {
        return value.includes(column as string);
      } else if (
        value &&
        lre.isObject(value) &&
        !lre.isAvatarValue(value) &&
        Object.prototype.hasOwnProperty.call(value, column)
      ) {
        return value[column] as LetsRole.ComponentValue;
      } else {
        return undefined;
      }
    }

    getData(
      id?: DataProviderDataId | Array<number | string>,
    ): TableRow | LetsRole.ComponentValue {
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
        const result: Record<string, TableRow | LetsRole.ComponentValue> = {};

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

    countDistinct(dataValueOrColumn?: string | DataProviderGetValue): number {
      const values: Array<LetsRole.ComponentValue> = [];
      dataValueOrColumn = this.#getDataValueGetter(dataValueOrColumn)[1];
      this.each((value, key, data) => {
        const val = dataValueOrColumn(value, key, data);

        if (lre.isObject(val)) {
          if (!values.some((v) => lre.deepEqual(v, val))) {
            values.push(val);
          }
        } else if (!values.includes(val)) {
          values.push(val);
        }
      });

      return values.length;
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

    min(dataValueOrColumn?: string | DataProviderGetValue): IDataProvider {
      return this.#comparisonProvider(
        this.realId() + "-min",
        dataValueOrColumn,
        (a: LetsRole.ComponentValue, b: LetsRole.ComponentValue) => a! < b!,
      );
    }

    max(dataValueOrColumn?: string | DataProviderGetValue): IDataProvider {
      return this.#comparisonProvider(
        this.realId() + "-max",
        dataValueOrColumn,
        (a: LetsRole.ComponentValue, b: LetsRole.ComponentValue) => a! > b!,
      );
    }

    #comparisonProvider(
      id: string,
      dataValueOrColumn: string | DataProviderGetValue | undefined,
      comparisonCallback: (
        a: LetsRole.ComponentValue,
        b: LetsRole.ComponentValue,
      ) => boolean,
    ): IDataProvider {
      const dataGetterResult = this.#getDataValueGetter(dataValueOrColumn);

      const comparisonId: string = dataGetterResult[0];
      dataValueOrColumn = dataGetterResult[1];

      return this.#newProvider(`${id}-${comparisonId}`, () => {
        let minData: DataProviderDataValue | undefined = undefined;
        let minVal: LetsRole.ComponentValue | undefined = undefined;
        this.each((v, k, data) => {
          const val = dataValueOrColumn(v, k, data);

          if (!val) return;

          if (
            typeof minVal === "undefined" ||
            comparisonCallback(val, minVal)
          ) {
            minData = { [k]: v };
            minVal = val;
          }
        });

        return minData;
      });
    }

    #getDataValueGetter(
      dataValueOrColumn: string | DataProviderGetValue | undefined,
    ): [string, DataProviderGetValue] {
      let comparisonId: string;

      if (typeof dataValueOrColumn === "undefined") {
        comparisonId = "value";
        dataValueOrColumn = (v: DataProviderDataValue) => v;
      } else if (typeof dataValueOrColumn === "string") {
        comparisonId = dataValueOrColumn;
        const colName = dataValueOrColumn;

        dataValueOrColumn = (
          value: DataProviderDataValue,
          _key?: DataProviderDataId,
          data?: DataProviderDataValue,
        ): ReturnType<DataProviderGetValue> => {
          return (
            this.#getValueColumn(value, colName) ??
            this.#getValueColumn(data, colName)
          );
        };
      } else {
        comparisonId = lre.getRandomId();
      }

      return [comparisonId, dataValueOrColumn];
    }

    sum(dataValueOrColumn?: string | DataProviderGetValue): number {
      let total: number = 0;
      let hasNaN = false;

      const dataGetterResult = this.#getDataValueGetter(dataValueOrColumn);
      dataValueOrColumn = dataGetterResult[1];

      this.each((v, k, data) => {
        const val = dataValueOrColumn(v, k, data);

        if (typeof val === "number" || !isNaN(val as unknown as number)) {
          hasNaN = true;
        }

        total += 1 * (val as number);
      });

      LRE_DEBUG &&
        hasNaN &&
        lre.warn(
          `Sum for ${this.realId()} could have failed because of non numeric values`,
        );

      return total;
    }

    limit(nb: number): IDataProvider {
      return this.#newProvider(this.realId() + "-limit-" + nb, () => {
        const values = this.#getCurrentValue();

        if (Array.isArray(values)) {
          return values.slice(0, nb);
        } else if (lre.isObject(values)) {
          const result: ReturnType<ValueGetterSetter> = {};
          let i = 0;

          (Object.keys(values) as Array<keyof typeof values>).every((k) => {
            result[k] = values[k];
            i++;

            return i < nb;
          });

          return result;
        }

        return values;
      });
    }

    getBy(
      dataValueOrColumn: string | DataProviderGetValue,
      value: LetsRole.ComponentValue,
    ): DataProviderDataValue {
      dataValueOrColumn = this.#getDataValueGetter(dataValueOrColumn)[1];

      let result: DataProviderDataValue | undefined = undefined;
      this.each((v, k, data) => {
        if (dataValueOrColumn(v, k, data) === value) {
          result = { [k]: v };
          return false;
        }
      });

      return result;
    }
  };

export class DirectDataProvider extends Mixin(DataProvider) {
  #directId: string;

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
    this.#directId = id;
  }

  realId(): string {
    return this.#directId;
  }
}

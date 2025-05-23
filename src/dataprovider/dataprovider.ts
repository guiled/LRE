import { EventHolder } from "../eventholder";
import { ChangeTracker } from "../globals/changetracker";
import { Mixin } from "../mixin";

export type ValueGetterSetter<
  T extends LetsRole.ComponentValue | TableRow | undefined = undefined,
> = (
  newValue?: T,
) => T extends undefined ? LetsRole.ComponentValue | TableRow : void;

const defaultSorter: DataProviderValueComparator<number> = ((
  a: number | string,
  b: number | string,
) => (a < b ? -1 : a > b ? 1 : 0)) as DataProviderValueComparator<number>;

const arrayTransformer: DataProviderCallback<unknown> = (
  value: DataProviderDataValue,
  key?: DataProviderDataId,
): unknown => {
  if (typeof key === "undefined") {
    key = lre.getRandomId();
  }

  if (lre.isObject(value)) {
    return { id: key, ...value };
  }

  return {
    id: key,
    value,
  };
};

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
    #context: ProxyModeHandler;
    #id: string;
    #tracker: ChangeTracker;

    constructor(
      context: ProxyModeHandler,
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
      this.#tracker = new ChangeTracker(this, context);
    }

    realId(): string {
      return this.id();
    }

    getChangeTracker(): ChangeTracker {
      return this.#tracker;
    }

    @ChangeTracker.linkParams()
    #setCurrentValue(
      value: DynamicSetValue<ReturnType<ValueGetterSetter>>,
    ): ReturnType<ValueGetterSetter> {
      if (!lre.deepEqual(this.#currentValue, value)) {
        this.#currentValue = value as ReturnType<ValueGetterSetter>;
        this.#originalValue = undefined;
        this.refreshDerived();
      }

      return this.#currentValue;
    }

    #getCurrentValue(): ReturnType<ValueGetterSetter> {
      this.#context.logAccess?.("provider", this);
      const result = this.#currentValue ?? this.#setCurrentValue(this.#valueCb);

      return lre.value(result);
    }

    @ChangeTracker.linkParams()
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

    id(): string {
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
      this.refreshSelf();
    }

    refreshSelf(): void {
      this.#currentValue = undefined;
      this.#originalValue = undefined;
      this.#getOriginalValue();
      this.#getCurrentValue();
    }

    sort(
      sorterOrString:
        | DataProviderValueComparator<number>
        | string = defaultSorter,
      direction: SortDirection = "ASC",
    ): IDataProvider {
      let sorter: DataProviderValueComparator<number>;

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
          )) as DataProviderValueComparator<number>;
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

    #sortData(
      sorter: DataProviderValueComparator<number>,
      direction: SortDirection,
    ): IDataProvider {
      return this.#newProvider(
        this.realId() + "-sort",
        () => {
          const data = this.#getCurrentValue();

          if (Array.isArray(data)) {
            return data.toSorted(
              (a, b) => (direction === "ASC" ? 1 : -1) * sorter(a, b),
            );
          } else if (lre.isObject(data)) {
            let hasNumericKey = false;
            const sorted = Object.entries(data).toSorted(
              (
                [ka, a]: [DataProviderDataId, DataProviderDataValue],
                [kb, b]: [DataProviderDataId, DataProviderDataValue],
              ) => {
                hasNumericKey ||=
                  !isNaN(ka as unknown as number) ||
                  !isNaN(kb as unknown as number);
                return (
                  (direction === "ASC" ? 1 : -1) *
                  sorter(a, b, ka, kb, this.getData(ka), this.getData(kb))
                );
              },
            );
            LRE_DEBUG &&
              hasNumericKey &&
              lre.warn("Numeric keys prevent sort from working properly");
            const result: ReturnType<ValueGetterSetter> = {};
            sorted.forEach(([k, v]) => (result[k] = v));

            return result;
          }

          return data;
        },
        true,
      );
    }

    #handleSet<T extends LetsRole.ComponentValue | undefined = undefined>(
      valueCb: ValueGetterSetter<T>,
    ): ValueGetterSetter<T> {
      return ((...args: [undefined] | []): ReturnType<ValueGetterSetter<T>> => {
        if (args.length === 0) {
          this.#context.logAccess?.("provider", this);
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

    select(column: DynamicSetValue<string>): IDataProvider {
      return this.#newProvider(`${this.realId()}-select(${column})`, () => {
        let [col] = ChangeTracker.getArgValue(column, true, false);

        if (typeof col !== "string" && typeof col !== "number") {
          col = "id";
        }

        const result: Record<string, TableRow | LetsRole.ComponentValue> = {};

        this.each((v, k) => {
          result[k] = this.#getValueColumn(v, col as string);
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
    ): DataProviderDataValue {
      const originalValues = this.#getOriginalValue();

      if (typeof id === "undefined") {
        const values = this.#getCurrentValue() || {};

        if (Array.isArray(values)) {
          return values.reduce<Record<any, any>>((acc, _v, i) => {
            acc[i] = this.getData(i);
            return acc;
          }, {});
        }

        if (Array.isArray(originalValues)) {
          return originalValues;
        } else if (
          !Array.isArray(originalValues) &&
          lre.isObject(originalValues) &&
          !lre.isAvatarValue(originalValues)
        ) {
          const values = this.#getCurrentValue() || {};
          const valueKeys = Object.keys(values);

          return valueKeys.reduce<Record<any, any>>((acc, k) => {
            acc[k] = originalValues[k];
            return acc;
          }, {});
        } else {
          return originalValues;
        }
      }

      if (Array.isArray(originalValues) || lre.isObject(originalValues)) {
        if (lre.isIndex(id)) {
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

    filter(
      condition: DataProviderWhereConditioner,
      name: string = "filter",
    ): IDataProvider {
      return this.#newProvider(
        `${this.realId()}-${name}`,
        () => {
          const result: Record<string, TableRow | LetsRole.ComponentValue> = {};

          this.each((v, k, data) => {
            if (condition(v, k, data)) {
              result[k] = v;
            }
          });

          return result;
        },
        true,
      );
    }

    where(
      column:
        | string
        | LetsRole.ComponentValue
        | Array<LetsRole.ComponentValue>
        | DataProviderWhereConditioner
        | IComponent,
      condition?:
        | LetsRole.ComponentValue
        | Array<LetsRole.ComponentValue>
        | DataProviderWhereConditioner
        | IComponent,
    ): IDataProvider {
      let filterName: string = "where";

      if (arguments.length === 1) {
        condition = column;
        column = undefined;
      }

      if (typeof condition === "undefined") return this;

      let comparator: DataProviderWhereConditioner = (a: unknown): boolean =>
        a === condition;

      if (Array.isArray(condition)) {
        comparator = (a: unknown): boolean => condition.includes(a as string);
      } else if (lre.isComponent(condition)) {
        comparator = (a: unknown): boolean =>
          lre.deepEqual(a, condition.value());
      } else if (typeof condition === "function") {
        comparator = condition as DataProviderWhereConditioner;
      }

      let conditioner: DataProviderWhereConditioner;

      if (typeof column === "undefined") {
        conditioner = comparator;
      } else if (typeof column === "string") {
        filterName = `where(${column}=?)`;
        const dataValueOrColumn = this.#getDataValueGetter(column)[1];
        conditioner = (v, k, data) => comparator(dataValueOrColumn(v, k, data));
      } else {
        throw new Error("Invalid where condition");
      }

      return this.filter(conditioner, filterName);
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

    #newProvider(
      id: string,
      valueCb: ValueGetterSetter,
      withRandom: boolean = false,
    ): IDataProvider {
      if (withRandom) {
        let rnd: string = lre.getRandomId(5);
        let cnt: number = 0;

        while (cnt++ < 10 && this.#destRefresh[id + "-" + rnd]) {
          rnd = lre.getRandomId(5);
        }

        if (cnt >= 10) {
          throw new Error("Could not generate a unique random id");
        }

        id += "#" + rnd;
      }

      const provider = new DirectDataProvider(
        id,
        this.#context,
        this.#handleSet(valueCb),
        this.#getOriginalValue.bind(this),
        this.refresh.bind(this),
      );
      this.subscribeRefresh(
        provider.realId(),
        provider.refreshSelf.bind(provider),
      );

      return provider;
    }

    subscribeRefresh(id: string, refresh: () => void): void {
      LRE_DEBUG &&
        lre.trace(`Add update subscriber in ${this.realId()}: ${id}`);
      this.#destRefresh[id] = refresh;
    }

    unsubscribeRefresh(id: string): void {
      LRE_DEBUG &&
        !!this.#destRefresh[id] &&
        lre.trace(`Remove update subscriber in ${this.realId()}: ${id}`);
      delete this.#destRefresh[id];
    }

    refreshDerived(): void {
      // These 2 commented lines here might be useful one day
      // but for now, the UT are ok without them
      // this.#getCurrentValue();
      // this.#getOriginalValue();
      Object.keys(this.#destRefresh).forEach((id) => {
        if (!this.#destRefresh[id]) return;
        LRE_DEBUG && lre.trace(`${this.id()} refreshes ${id}`);
        this.#destRefresh[id]();
      });
    }

    min(dataValueOrColumn?: string | DataProviderGetValue): IDataProvider {
      return this.#comparisonProvider(
        "min",
        dataValueOrColumn,
        (a: LetsRole.ComponentValue, b: LetsRole.ComponentValue) => a! < b!,
      );
    }

    max(dataValueOrColumn?: string | DataProviderGetValue): IDataProvider {
      return this.#comparisonProvider(
        "max",
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

      return this.#newProvider(
        `${this.realId()}-${id}-${comparisonId}`,
        () => {
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
        },
        true,
      );
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
          `Sum for ${this.id()} could have failed because of non numeric values`,
        );

      return total;
    }

    limit(nb: number): IDataProvider {
      return this.#newProvider(`${this.realId()}-limit(${nb})`, () => {
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

    transform(
      map:
        | Record<
            string | number,
            | string
            | number
            | DataProviderCallback<TableRow | LetsRole.ComponentValue>
          >
        | string
        | DataProviderCallback<
            | TableRow
            | LetsRole.ComponentValue
            | Record<string | number, TableRow | LetsRole.ComponentValue>
          >,
    ): IDataProvider {
      let cbEach: DataProviderCallback<
        | TableRow
        | LetsRole.ComponentValue
        | Record<string | number, TableRow | LetsRole.ComponentValue>
      >;

      if (typeof map === "string") {
        cbEach = (v, _k, data) => {
          const vIsObj = lre.isObject<Record<string, string>>(v);
          const dataIsObj = lre.isObject<Record<string, string>>(data);

          if (vIsObj && typeof v[map] !== "undefined") {
            return v[map];
          } else if (dataIsObj && typeof data[map] !== "undefined") {
            return data[map];
          }

          return undefined;
        };
      } else if (typeof map === "function") {
        cbEach = map;
      } else {
        cbEach = (v, k, data) => {
          const newValue: Record<string, TableRow | LetsRole.ComponentValue> =
            {};
          const vIsObj = lre.isObject<Record<string, string>>(v);
          const dataIsObj = lre.isObject<Record<string, string>>(data);

          Object.keys(map).forEach((mapKey) => {
            const transformedKey = map[mapKey];

            if (typeof transformedKey === "function") {
              newValue[mapKey] = transformedKey(v, k, data);
            } else if (vIsObj && typeof v[transformedKey] !== "undefined") {
              newValue[mapKey] = v[transformedKey];
            } else if (
              dataIsObj &&
              typeof data[transformedKey] !== "undefined"
            ) {
              newValue[mapKey] = data[transformedKey];
            }
          });

          return newValue;
        };
      }

      return this.#newProvider(
        this.realId() + "-transform",
        () => {
          const result: DataProviderDataValue = {};

          this.each((v, k, data) => {
            result[k] = cbEach(v, k, data);
          });

          return result;
        },
        true,
      );
    }

    toArray(
      transform: DataProviderCallback<unknown> = arrayTransformer,
    ): Array<unknown> {
      const result: Array<unknown> = [];
      const data = this.#getCurrentValue();

      this.each((v, k) => {
        result.push(transform(v, k, data));
      });

      return result;
    }

    search(column: string, value: LetsRole.ComponentValue): IDataProvider {
      return this.filter(
        (v, k, data) =>
          (column === "id" && k === value) ||
          this.#getValueColumn(v, column) === value ||
          this.#getValueColumn(data, column) === value,
        `search(${column}=${value})`,
      );
    }

    union(dataProvider: IDataProvider): IDataProvider {
      return this.#newProvider(
        this.realId() + "-union-" + dataProvider.realId(),
        () => {
          const result: DataProviderDataValue = {};

          this.each((v, k) => {
            result[k] = v;
          });

          dataProvider.each((v, k) => {
            result[k] = v;
          });

          return result;
        },
        true,
      );
    }

    innerJoin(
      dataProvider: IDataProvider,
      arg1: string,
      arg2?: string,
    ): IDataProvider;
    innerJoin(dataProvider: IDataProvider, arg1: JoinOptions): IDataProvider;
    innerJoin(
      dataProvider: IDataProvider,
      arg1: DataProviderValueComparator<boolean>,
    ): IDataProvider;
    innerJoin(
      dataProvider: IDataProvider,
      arg1: string | JoinOptions | DataProviderValueComparator<boolean>,
      arg2?: string,
    ): IDataProvider {
      return this.#dataJoin(dataProvider, false, arg1, arg2);
    }

    leftJoin(
      dataProvider: IDataProvider,
      arg1: string,
      arg2?: string,
    ): IDataProvider;
    leftJoin(dataProvider: IDataProvider, arg1: JoinOptions): IDataProvider;
    leftJoin(
      dataProvider: IDataProvider,
      arg1: DataProviderValueComparator<boolean>,
    ): IDataProvider;
    leftJoin(
      dataProvider: IDataProvider,
      arg1: string | JoinOptions | DataProviderValueComparator<boolean>,
      arg2?: string,
    ): IDataProvider {
      return this.#dataJoin(dataProvider, true, arg1, arg2);
    }

    #dataJoin(
      dataProvider: IDataProvider,
      _optional: boolean,
      arg1: string | JoinOptions | DataProviderValueComparator<boolean>,
      arg2?: string,
    ): IDataProvider {
      const joinOptions: JoinOptions = this.#getJoinOptionFromArgs(arg1, arg2);

      return this.#newProvider(
        this.realId() + "-join-" + dataProvider.realId(),
        () => {
          const result: DataProviderDataValue = {};

          const indexedRightData: Record<string, DataProviderDataValue> = {};

          this.each((rowLeft, keyLeft, originalValueLeft) => {
            if (!lre.isObject(rowLeft)) {
              result[keyLeft] = rowLeft;
              return;
            }

            let leftColumnValue: LetsRole.ComponentValue;

            if (joinOptions.leftColumn) {
              leftColumnValue = this.#getValueColumn(
                rowLeft,
                joinOptions.leftColumn,
              );

              if (!lre.isIndex(leftColumnValue)) {
                throw new Error("Invalid left column value");
              }

              if (indexedRightData[leftColumnValue]) {
                result[keyLeft] = this.#mergeRows(
                  rowLeft,
                  indexedRightData[leftColumnValue],
                );
                return;
              }
            }

            dataProvider.each((rowRight, keyRight, originalValueRight) => {
              if (
                joinOptions.on!(
                  rowLeft,
                  rowRight,
                  keyLeft,
                  keyRight,
                  originalValueLeft,
                  originalValueRight,
                )
              ) {
                if (lre.isIndex(leftColumnValue)) {
                  indexedRightData[leftColumnValue] = rowRight;
                }

                result[keyLeft] = this.#mergeRows(rowLeft, rowRight);
                return false;
              }

              return true;
            });
          });
          return result;
        },
      );
    }

    #getJoinOptionFromArgs(
      arg1: string | JoinOptions | DataProviderValueComparator<boolean>,
      arg2?: string,
    ): JoinOptions {
      const joinOptions: any = {};

      if (lre.isIndex(arg1)) {
        joinOptions.leftColumn = arg1;

        if (lre.isIndex(arg2)) {
          joinOptions.rightColumn = arg2;
        } else {
          joinOptions.rightColumn = "id";
        }
      } else if (lre.isObject(arg1)) {
        Object.assign(joinOptions, arg1);
      } else if (typeof arg1 === "function") {
        joinOptions.on = arg1;
      } else {
        throw new Error("Invalid join options");
      }

      if (!joinOptions.on) {
        if (
          !lre.isIndex(joinOptions.leftColumn) ||
          !lre.isIndex(joinOptions.rightColumn)
        ) {
          throw new Error(
            "Invalid join options, missing comparison function and bad column types",
          );
        }

        joinOptions.on = (
          valA: DataProviderDataValue,
          valB: DataProviderDataValue,
        ): boolean => {
          return (
            this.#getValueColumn(valA, joinOptions.leftColumn) ===
            this.#getValueColumn(valB, joinOptions.rightColumn)
          );
        };
      }

      return joinOptions;
    }

    #mergeRows(
      rowLeft: DataProviderDataValue,
      rowRight: DataProviderDataValue,
    ): DataProviderDataValue {
      const result: DataProviderDataValue = {};
      let keys: Array<string | number> = [];

      if (lre.isObject(rowLeft)) {
        keys = Object.keys(rowLeft);
        keys.forEach((k) => {
          result[k] = (rowLeft as Record<string, LetsRole.ComponentValue>)[k];
        });
      }

      if (lre.isObject(rowRight)) {
        Object.keys(rowRight).forEach((k) => {
          if (k === "id") return;

          result[this.#getUniqueKey(k, keys)] = (
            rowRight as Record<string, LetsRole.ComponentValue>
          )[k];
        });
      }

      return result;
    }

    #getUniqueKey(key: string, keys: Array<string | number>): string {
      let suffix = "";

      while (keys.includes(key + suffix)) {
        suffix += "_";
      }

      return key + suffix;
    }
  };

type DataProviderEvents = "refresh";

export class DirectDataProvider extends Mixin(
  DataProvider,
  EventHolder<DataProviderEvents>,
) {
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

    super([dataProviderArgs, [id, () => this]]);
    this.#directId = id;
  }

  id(): string {
    return this.#directId;
  }

  refresh(): void {
    this.trigger("refresh");
    super.refresh();
  }

  providedValue<T extends LetsRole.ComponentValue | undefined = undefined>(
    newValue?: T,
  ): ReturnType<ValueGetterSetter<T>> {
    this.trigger("refresh");

    if (arguments.length > 0) {
      return super.providedValue(newValue);
    }

    return super.providedValue();
  }
}

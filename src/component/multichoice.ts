import { DirectDataProvider } from "../dataprovider";
import { flaggedDynamicSetter } from "../globals/decorators/dynamicSetter";
import { Choice, ChoiceEvents, UPDATE_CHECK_CHANGES } from "./choice";

type MultiChoiceEvents = "limit" | ChoiceEvents;

type MinMaxCalculator = (
  label: LetsRole.Choices[LetsRole.ChoiceValue],
  id: LetsRole.ChoiceValue,
  data: DataProviderDataValue | undefined,
  result: number | Record<string, number>
) => number | Record<string, number>;

type MinMaxLimit = number | Record<string, number>;

type MinMaxLimiter = MinMaxLimit | (() => MinMaxLimit);

type OVER_UNDER = 1 | -1;
const OVER: OVER_UNDER = 1;
const UNDER: OVER_UNDER = -1;

const defaultCalculator = () => 1;

export class MultiChoice extends Choice<
  LetsRole.MultiChoiceValue,
  MultiChoiceEvents
> {
  #currentValue: LetsRole.MultiChoiceValue;
  #minLimiter: MinMaxLimiter | undefined;
  #maxLimiter: MinMaxLimiter | undefined;
  #minCalculator: MinMaxCalculator;
  #maxCalculator: MinMaxCalculator;
  #valuesSavedForMinMax: LetsRole.MultiChoiceValue = [];

  constructor(
    raw: LetsRole.Component,
    sheet: ISheet,
    realId: LetsRole.ComponentID
  ) {
    super(raw, sheet, realId);
    this.lreType("multichoice");
    this.#currentValue = Array.from(super.value() || []);
    this.on(UPDATE_CHECK_CHANGES, this.#checkChanges.bind(this));
    this.#minCalculator = defaultCalculator;
    this.#maxCalculator = defaultCalculator;
    this.#valuesSavedForMinMax =
      (this.raw().value() as LetsRole.MultiChoiceValue) || [];
  }

  value(
    newValue?: DynamicSetValue<LetsRole.MultiChoiceValue>
  ): void | LetsRole.MultiChoiceValue {
    if (arguments.length > 0) {
      if (!Array.isArray(newValue)) {
        lre.error(`[MultiChoice] ${this.realId()} value should be an array.`);
        this.clear();
        return;
      }
      const valueAsArray = this.#sanitizeValue(newValue);
      const setChoicesNeeded = this.#currentValue.some(
        (v) => !valueAsArray.includes(v)
      );
      super.value(valueAsArray);
      this.sheet().sendPendingDataFor(this.realId());
      if (setChoicesNeeded) {
        this.refreshChoices();
      }
      this.#currentValue = valueAsArray;
    }
    return this.#sanitizeValue(super.value());
  }

  #sanitizeValue(value: unknown): LetsRole.MultiChoiceValue {
    if (
      value !== null &&
      typeof value !== "undefined" &&
      !Array.isArray(value)
    ) {
      return [value as string].filter((v) => typeof v !== "undefined");
    }
    return value as LetsRole.MultiChoiceValue;
  }

  #checkChanges(choice: MultiChoice) {
    const newValue = choice.value()!;
    const selected: LetsRole.MultiChoiceValue = newValue.filter(
      (x) => !this.#currentValue.includes(x)
    );
    const unselected: LetsRole.MultiChoiceValue = this.#currentValue.filter(
      (x) => !newValue.includes(x)
    );

    this.#handleSelectEvent("select", selected);
    this.#handleSelectEvent("unselect", unselected);

    this.#currentValue = [...newValue];
  }

  #handleSelectEvent(
    eventName: MultiChoiceEvents,
    values: LetsRole.MultiChoiceValue
  ) {
    if (values.length === 0) {
      return;
    }

    const args: [
      MultiChoiceEvents,
      (string | Array<string>)?,
      (DataProviderDataValue | Array<DataProviderDataValue>)?
    ] = [eventName];

    if (values.length === 1) {
      args.push(values[0]);
      args.push(this.label(values[0]));
      args.push(this.getChoiceData(values[0]));
    } else {
      const labels: Record<LetsRole.ChoiceValue, string> = {};
      const data: Record<
        LetsRole.ChoiceValue,
        DataProviderDataValue | undefined
      > = {};
      args.push(values);
      values.forEach((v) => {
        labels[v] = this.label(v);
        data[v] = this.getChoiceData(v);
      });
      args.push(labels);
      args.push(data);
    }

    this.trigger.apply(this, args);

    each(values, (val) => {
      this.trigger(`${eventName}:${val}`);
    });
  }

  valueData(): Record<
    LetsRole.ChoiceValue,
    LetsRole.ComponentValue | LetsRole.TableRow
  > {
    const values = this.value();
    const result: Record<
      LetsRole.ChoiceValue,
      LetsRole.ComponentValue | LetsRole.TableRow
    > = {};
    each(values, (v) => {
      result[v] = this.getChoiceData(v);
    });

    return result;
  }

  clear() {
    this.value([]);
  }
  selectNone() {
    this.clear();
  }
  unselectAll() {
    this.clear();
  }

  selectAll() {
    this.value(Object.keys(this.getChoices()));
  }

  invert() {
    const choices = this.getChoices();
    const val = this.value() || [];
    this.value(Object.keys(choices).filter((v) => !val.includes(v)));
  }

  checked(): IDataProvider {
    return new DirectDataProvider(
      () => {
        const result: LetsRole.ViewData = {};
        each(this.value(), (v) => {
          result[v] = this.label(v);
        });

        return result;
      },
      () => {
        return this.valueData();
      }
    );
  }

  unchecked(): IDataProvider {
    return new DirectDataProvider(
      () => {
        const result: LetsRole.ViewData = {};
        each(this.getChoices(), (_v, k) => {
          if (!this.value()!.includes(k)) {
            result[k] = this.label(k);
          }
        });

        return result;
      },
      () => {
        const result: Record<
          LetsRole.ChoiceValue,
          LetsRole.ComponentValue | LetsRole.TableRow
        > = {};
        each(this.getChoices(), (_v, k) => {
          if (!this.value()!.includes(k)) {
            result[k] = this.getChoiceData(k);
          }
        });

        return result;
      }
    );
  }

  @flaggedDynamicSetter([true, false])
  maxChoiceNb(nb?: MinMaxLimiter, calculator?: MinMaxCalculator) {
    if (arguments.length === 0) {
      return this.#getLimiterValue(this.#maxLimiter);
    }
    this.#maxLimiter = nb;
    this.#maxCalculator = calculator || defaultCalculator;
    this.on("update:__Lre__minmax", this.#checkLimit.bind(this));
  }

  @flaggedDynamicSetter([true, false])
  minChoiceNb(nb?: MinMaxLimiter, calculator?: MinMaxCalculator) {
    if (arguments.length === 0) {
      return this.#getLimiterValue(this.#minLimiter);
    }
    this.#minLimiter = nb;
    this.#minCalculator = calculator || defaultCalculator;
  }

  #getLimiterValue(
    limiter: MinMaxLimiter | undefined
  ): MinMaxLimit | undefined {
    if (typeof limiter === "function") {
      return limiter();
    }
    return limiter;
  }

  #checkLimit() {
    let resultMin: ReturnType<MinMaxCalculator> = 0,
      resultMax: ReturnType<MinMaxCalculator> = 0;
    const choices = this.getChoices();
    const newValue = this.value()!;

    each(newValue, (id) => {
      resultMin = this.#calculate(choices, id, this.#minCalculator, resultMin);
      resultMax = this.#calculate(choices, id, this.#maxCalculator, resultMax);
    });
    const minValue = this.#getLimiterValue(this.#minLimiter);
    const maxValue = this.#getLimiterValue(this.#maxLimiter);

    if (
      this.#testExceedLimit(
        minValue,
        resultMin,
        newValue,
        this.#valuesSavedForMinMax,
        UNDER
      ) ||
      this.#testExceedLimit(
        maxValue,
        resultMax,
        newValue,
        this.#valuesSavedForMinMax,
        OVER
      )
    ) {
      this.trigger("limit");
      this.disableEvent("update");
      this.value(this.#valuesSavedForMinMax.slice());
      this.sheet().sendPendingDataFor(this.realId());
      this.enableEvent("update");
      this.cancelEvent("update");
      return false;
    }
    this.#valuesSavedForMinMax = newValue;
  }

  #calculate(
    choices: LetsRole.Choices,
    id: LetsRole.ChoiceValue,
    calculator: MinMaxCalculator,
    acc: ReturnType<MinMaxCalculator>
  ): ReturnType<MinMaxCalculator> {
    const value = calculator(choices[id], id, this.getChoiceData(id), acc);

    if (lre.isObject(value)) {
      if (!lre.isObject(acc)) acc = {};
      acc = this.#addToObjectProperties(acc, value);
    } else {
      if (lre.isObject(acc)) acc = 0;
      acc += 1.0 * value;
    }

    return acc;
  }

  #addToObjectProperties(
    dest: Record<string, number>,
    value: Record<string, number>
  ): Record<string, number> {
    const result = dest;
    each(value, function (v, k) {
      if (!result.hasOwnProperty(k)) {
        result[k] = 0;
      }
      result[k] += 1.0 * v;
    });
    return result;
  }

  #testExceedLimit(
    limit: MinMaxLimit | undefined,
    result: ReturnType<MinMaxCalculator>,
    newValues: LetsRole.MultiChoiceValue,
    prevValues: LetsRole.MultiChoiceValue,
    overUnder: OVER_UNDER
  ): boolean {
    if (typeof limit === "undefined") {
      return false;
    } else if (lre.isObject(limit)) {
      return this.#objectExceedComparison(limit, result, overUnder);
    } else if (overUnder * newValues.length < overUnder * prevValues.length) {
      return false;
    } else if (!lre.isObject(result)) {
      return limit > 0 && overUnder * result > overUnder * limit;
    } else {
      return false;
    }
  }

  #objectExceedComparison(
    a: Record<string, number>,
    b: Record<string, number> | number,
    overUnder: OVER_UNDER
  ): boolean {
    return Object.keys(a).some(function (k) {
      if (lre.isObject(b)) {
        return b.hasOwnProperty(k) && overUnder * b[k] > overUnder * a[k];
      } else {
        return overUnder * b > overUnder * a[k];
      }
    });
  }
}

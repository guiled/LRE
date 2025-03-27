import { ChangeTracker } from "../globals/changetracker";
import { Component } from "./component";

type TogglingValue = string | number;

type TogglingData = Partial<{
  icon?: string;
  classes: Array<LetsRole.ClassName>;
  show: Array<LetsRole.ComponentID>;
  hide: Array<LetsRole.ComponentID>;
  showflex: Array<LetsRole.ComponentID>;
  hideflex: Array<LetsRole.ComponentID>;
}>;

type TogglingDataArrayItem = keyof Omit<TogglingData, "icon">;

type TogglingDataMap = Record<TogglingValue, TogglingData>;

type TogglingOptions = {
  default?: TogglingValue;
  save?: boolean;
};

const defaultOptions: TogglingOptions = {
  save: true,
};

const TOGGLING_EVENT_NAME = "click:__lreToggle";
const VALUE_DATA_ID = "togglingValue";

export class Toggle<
  AdditionalEvents extends string = LetsRole.EventType,
> extends Component<string, AdditionalEvents> {
  #togglingData: TogglingDataMap = {};
  #togglingValues: TogglingValue[] = [];
  #currentTogglingValue: TogglingValue | null = null;
  #hadClickableClass: boolean = false;
  #changeAwaited: boolean = false;
  #options: TogglingOptions = Object.assign({}, defaultOptions);

  // constructor only for builder compatibility
  constructor(raw: LetsRole.Component, sheet: ISheet, realId: string) {
    super(raw, sheet, realId);
  }

  toggling(
    data: TogglingDataMap | Record<TogglingValue, string>,
    defaultValue?: TogglingOptions,
  ): this;
  toggling(
    data: TogglingDataMap | Record<TogglingValue, string>,
    defaultValue?: TogglingValue,
    save?: boolean,
  ): this;
  @ChangeTracker.linkParams()
  toggling(
    data: TogglingDataMap | Record<TogglingValue, string>,
    defaultValue?: TogglingValue | TogglingOptions,
    save: boolean = true,
  ): this {
    if (!lre.isObject(defaultValue)) {
      this.#options.default = defaultValue;
      this.#options.save = save;
    } else {
      this.#options = Object.assign({}, defaultOptions, defaultValue);

      if (arguments.length === 3) {
        this.#options.save = save;
      }
    }

    for (const k in data) {
      if (typeof data[k] === "string") {
        data[k] = { icon: data[k] };
      }
    }

    this.#togglingData = data as TogglingDataMap;

    if (this.#togglingValues.length === 0) {
      // Add click handler only if component is not yet toggling
      this.on(TOGGLING_EVENT_NAME, this.#handleToggleClick);
      this.#hadClickableClass = this.hasClass("clickable");

      if (!this.#hadClickableClass) {
        this.addClass("clickable");
      }
    }

    this.#togglingValues = Object.keys(data);

    if (this.#togglingValues.length === 0) {
      return this;
    }

    this.#options.default ??= this.#togglingValues[0];

    const savedValue: string | null = this.#options.save
      ? (this.data(VALUE_DATA_ID) as string)
      : null;

    if (savedValue && this.#togglingValues.includes(savedValue)) {
      this.#setTogglingValue(savedValue);
    } else if (this.#togglingValues.includes(this.#options.default)) {
      this.#setTogglingValue(this.#options.default);
    } else {
      const rawValue = this.raw().value();
      const newVal = this.#togglingValues.find(function (k) {
        return k === rawValue;
      });

      if (typeof newVal !== "undefined") {
        this.#setTogglingValue.call(this, newVal);
      }
    }

    return this;
  }

  untoggling(): this {
    this.#togglingData = {};
    this.#togglingValues = [];
    this.off(TOGGLING_EVENT_NAME);
    this.deleteData(VALUE_DATA_ID, true);

    if (!this.#hadClickableClass) {
      this.removeClass("clickable");
    }

    return this;
  }

  value(): string;
  value(newValue: DynamicSetValue<string>): void;
  @ChangeTracker.linkParams()
  value(newValue?: DynamicSetValue<string>): void | LetsRole.ComponentValue {
    if (!this.#togglingValues?.length) {
      if (arguments.length === 0) {
        if (this.hasData(VALUE_DATA_ID)) {
          super.value();
          return this.data(VALUE_DATA_ID) as string;
        }

        return super.value();
      }

      return super.value(newValue);
    }

    if (arguments.length === 0) {
      super.value();
      return this.#currentTogglingValue;
    } else {
      this.#setTogglingValue(newValue as string);
    }
  }

  next(num: number = 1): LetsRole.ComponentValue {
    return this.#getNextOrPrev(num);
  }

  prev(num: number = 1): LetsRole.ComponentValue {
    return this.#getNextOrPrev(-num);
  }

  #getNextOrPrev(num: number): LetsRole.ComponentValue {
    const current = this.value();
    const index = this.#togglingValues.findIndex((v) => v === current);

    if (index === -1) {
      LRE_DEBUG &&
        lre.warn(`[Toggle] Unable to get next/prev value of ${current}`);
      return current;
    }

    const nb = this.#togglingValues.length;

    return this.#togglingValues[(nb + index + (num % nb)) % nb];
  }

  refreshRaw(
    newRaw?: LetsRole.Component<LetsRole.ComponentValue> | undefined,
  ): LetsRole.Component<LetsRole.ComponentValue> {
    const result = super.refreshRaw(newRaw);

    if (this.#togglingValues.length) {
      this.#setTogglingValue(this.#currentTogglingValue, true);
    }

    return result;
  }

  #setTogglingValue(value: TogglingValue | null, force: boolean = false): void {
    if (!value || !this.#togglingData[value]) {
      return;
    }

    const oldData: TogglingData = {
      classes: [],
      show: [],
      hide: [],
      showflex: [],
      hideflex: [],
    };

    if (!force) {
      this.#togglingValues
        .filter(
          (v) =>
            (this.#currentTogglingValue === null && v !== value) ||
            v === this.#currentTogglingValue,
        )
        .forEach((v) => {
          for (const k in oldData) {
            const key = k as TogglingDataArrayItem;
            oldData[key] = this.#arrayMergeUnique(
              oldData[key] || [],
              this.#togglingData[v][key] || [],
            );

            if (this.#currentTogglingValue === null) {
              oldData[key] = this.#arrayDiff(
                oldData[key],
                this.#togglingData[value][key] || [],
              );
            }
          }
        });
    }

    this.#changeTogglingData(oldData, this.#togglingData[value]);
    this.#currentTogglingValue = value;
    this.#options.save && this.data(VALUE_DATA_ID, value, true);

    if (
      Object.prototype.hasOwnProperty.call(this.#togglingData[value], "icon")
    ) {
      ChangeTracker.noChangeHandling(this, super.value, [
        this.#togglingData[value].icon!,
      ]);
    } else if (typeof this.#togglingData[value] === "string") {
      ChangeTracker.noChangeHandling(this, super.value, [
        this.#togglingData[value],
      ]);
    } else {
      // update event is triggered by changing icon value, but is not triggered if only style change, etc.
      // So we trigger update event manually if icon value is not changed but the toggle value changed
      this.trigger("update", this);
    }
  }

  #arrayMergeUnique<T, U>(a: Array<T | U>, b: Array<T | U>): Array<T | U> {
    if (!Array.isArray(a) || !Array.isArray(b)) return [];
    return a.concat(b.filter((v) => !a.includes(v)));
  }

  #changeTogglingData(oldData: TogglingData, newData: TogglingData): void {
    if (!this.#changeAwaited) {
      this.#changeAwaited = true;
      lre.wait(
        0,
        () => {
          this.#changeAwaited = false;
          const sheet = this.sheet();

          const showflex = (id: LetsRole.ComponentID): unknown =>
            sheet.get(id)?.addClass("d-flex").removeClass("d-none");
          const hideflex = (id: LetsRole.ComponentID): unknown =>
            sheet.get(id)?.addClass("d-none").removeClass("d-flex");
          const show = (id: LetsRole.ComponentID): unknown =>
            sheet.get(id)?.removeClass("d-none");
          const hide = (id: LetsRole.ComponentID): unknown =>
            sheet.get(id)?.addClass("d-none");

          this.#manageAddedRemoved(
            oldData,
            newData,
            "classes",
            this.addClass.bind(this),
            this.removeClass.bind(this),
          );
          this.#manageAddedRemoved(
            oldData,
            newData,
            "showflex",
            showflex,
            hideflex,
          );
          this.#manageAddedRemoved(
            oldData,
            newData,
            "hideflex",
            hideflex,
            showflex,
          );
          this.#manageAddedRemoved(oldData, newData, "show", show, hide);
          this.#manageAddedRemoved(oldData, newData, "hide", hide, show);
        },
        `${this.realId()}:Change Toggling Data`,
      );
    }
  }

  #manageAddedRemoved(
    oldData: TogglingData,
    newData: TogglingData,
    prop: TogglingDataArrayItem,
    addCB: (id: string) => unknown,
    delCB: (id: string) => unknown,
  ): void {
    const oldArray = Object.prototype.hasOwnProperty.call(oldData, prop)
      ? oldData[prop]!
      : [];
    const newArray = Object.prototype.hasOwnProperty.call(newData, prop)
      ? newData[prop]!
      : [];
    this.#arrayDiff(oldArray, newArray).forEach(delCB);
    this.#arrayDiff(newArray, oldArray).forEach(addCB);
  }

  #arrayDiff<T, U>(a: Array<T | U>, b: Array<T | U>): Array<T | U> {
    if (!Array.isArray(a) || !Array.isArray(b)) return [];
    return a.filter(function (i) {
      return !b.includes(i);
    });
  }

  #handleToggleClick(): void {
    let index =
      this.#togglingValues.findIndex((e) => this.#currentTogglingValue === e) ??
      -1;

    index++;

    if (index >= this.#togglingValues.length) {
      index = 0;
    }

    this.getChangeTracker().startTracking("value");
    this.#setTogglingValue(this.#togglingValues[index]);
    this.getChangeTracker().stopTracking("value");
  }
}

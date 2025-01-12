import { DirectDataProvider, ValueGetterSetter } from "./dataprovider";
import { Logger } from "./log";
import { SheetProxy } from "./proxy/sheet";
import { Sheet } from "./sheet";
import { SheetCollection } from "./sheet/collection";
import { DataBatcher } from "./sheet/databatcher";

firstInit = undefined;
let firstLaunchDone: boolean = false;

type BasicObject<T = any> = { [key: string]: T };

// This LRE interface is here to allow the LRE class to be used as a function
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface LRE extends ILRE, Logger, cb {}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class LRE extends Logger implements ILRE {
  #context: ProxyModeHandler;
  #autoNum: boolean = false;
  sheets: SheetCollection;
  public __debug: boolean = false;
  public __enableGroupedSetValue: boolean = true;
  #firstLaunchCb?: (ctx: ProxyModeHandler) => void;

  apply(_thisArg: any, argArray?: any) {
    LRE_DEBUG && this.log("prepare init");

    if (!firstLaunchDone && this.#firstLaunchCb) {
      firstLaunchDone = true;
      this.#firstLaunchCb(this.#context);
    }

    const [callback] = argArray;
    // this aliasing for Let's Role compatibility
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const thisLre = this;

    return (rawSheet: LetsRole.Sheet): void => {
      // The wait may allow a faster display
      thisLre.wait(
        0,
        () => {
          const sheetId = rawSheet.getSheetId();
          const sheetProxy = new SheetProxy(this.#context, rawSheet);
          const _sheet = new Sheet(
            sheetProxy,
            new DataBatcher(this.#context, sheetProxy),
            this.#context,
          );
          _sheet.cleanCmpData();
          this.sheets.add(_sheet);

          if (!_sheet.isInitialized() && firstInit !== void 0) {
            LRE_DEBUG && this.log(`sheet first initialization`);

            try {
              _sheet.persistingData("initialized", firstInit(_sheet));
            } catch (e) {
              this.error("[First init] Unhandled error : " + e);
            }
          }

          LRE_DEBUG &&
            this.log(
              `init sheet ${rawSheet.id()} (${rawSheet.name()} ${
                rawSheet.properName() || ""
              } ${sheetId ? "#" + sheetId : ""})`,
            );

          try {
            callback.call(this, _sheet);
          } catch (e: unknown) {
            this.error("[Init] Unhandled error : " + e);
          }
        },
        "sheet init",
      );
    };
  }

  constructor(
    context: ProxyModeHandler,
    firstLaunchCb?: (ctx: ProxyModeHandler) => void,
  ) {
    super();
    this.#context = context;
    this.#firstLaunchCb = firstLaunchCb;
    LRE_DEBUG && this.log(`init`);
    this.sheets = new SheetCollection();
  }

  // convert a number to a string of letters
  numToAlpha(n: number): string {
    let s = "";
    const k = 26,
      K = k * 2;
    const charBase = [65, 97];

    while (n >= K) {
      const m = Math.floor(n / K);
      const r = n - m * K;
      s = String.fromCharCode(charBase[Math.floor(r / k)] + (r % k)) + s;
      n = m;
    }

    s = String.fromCharCode(charBase[Math.floor(n / k)] + (n % k)) + s;
    return s;
  }

  // convert a string of letters to a number
  alphaToNum(s: string): number {
    let n = 0;
    let c;
    let K = 1;
    const length = s.split("").length;

    for (let i = 0; i < length; i++) {
      c = s.charCodeAt(length - 1 - i);
      n += (c - ((c & 96) === 96 ? 97 - 26 : 65)) * K;
      K = K * 52;
    }

    return n;
  }

  getRandomId(length?: number): string {
    if (length) {
      const rnd = Math.ceil(Math.random() * (Math.pow(2 * 26, length) - 1));

      return this.numToAlpha(rnd);
    }

    const rnd = Math.ceil(Math.random() * Number.MAX_SAFE_INTEGER);

    return this.numToAlpha(rnd);
  }

  isComponent(value: any): value is IComponent {
    return !!value?.component;
  }

  isObject<T extends BasicObject = BasicObject>(object: any): object is T {
    return (
      object != null && typeof object === "object" && !Array.isArray(object)
    );
  }

  isIterableByEach(object: any): object is LetsRole.EachValue {
    return (
      Array.isArray(object) ||
      this.isObject(object) ||
      typeof object === "string"
    );
  }

  isAvatarValue(value: LetsRole.ComponentValue): value is LetsRole.AvatarValue {
    return (
      this.isObject(value) &&
      Object.prototype.hasOwnProperty.call(value, "avatar")
    );
  }

  isRepeaterValue(
    object: LetsRole.ComponentValue,
  ): object is LetsRole.RepeaterValue {
    return this.isObject(object) && !this.isAvatarValue(object);
  }

  //
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  isObjectEmpty(object: any): object is {} {
    if (!this.isObject(object)) return false;

    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) return false;
    }

    return true;
  }

  isUseableAsIndex(value: any): value is number | string {
    return typeof value === "number" || typeof value === "string";
  }

  isDataProvider(value: any): value is IDataProvider {
    return !!value.provider;
  }

  deepMerge(target: any, ...sources: any[]): any {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) target = Object.assign({}, target, { [key]: {} });
          target[key] = this.deepMerge(target[key], source[key]);
        } else {
          target = Object.assign({}, target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge.apply(this, [target, ...sources]);
  }

  deepEqual(x: any, y: any): boolean {
    if (x === y) {
      return true;
    } else if (this.isObject(x) && this.isObject(y)) {
      if (Object.keys(x).length != Object.keys(y).length) return false;

      for (const prop in x) {
        if (Object.prototype.hasOwnProperty.call(y, prop)) {
          if (!this.deepEqual(x[prop], y[prop])) return false;
        } else return false;
      }

      return true;
    } else if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length != y.length) return false;

      for (let i = 0; i < x.length; i++) {
        if (!this.deepEqual(x[i], y[i])) return false;
      }

      return true;
    } else return false;
  }

  wait(delay: number, cb: () => void, waitName: string = "No-name"): void {
    if (this.#context.getMode() !== "virtual") {
      wait(delay, () => {
        try {
          cb();
        } catch (e) {
          this.error(`[Wait:${waitName} Unhandled error : ${e}`);
        }
      });
    }
  }

  autoNum(v: boolean = true): void {
    LRE_DEBUG && this.trace(`auto num ${v ? "activated" : "deactivated"}`);
    this.#autoNum = v;
  }

  value<T = any>(value: T): T {
    if (!this.#autoNum) return value;

    if (typeof value === "string" && value !== "" && !isNaN(Number(value))) {
      return Number(value) as T;
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.value(v)) as T;
    }

    if (this.isObject(value)) {
      const result: BasicObject = {};

      for (const key in value) {
        result[key] = this.value(value[key]);
      }

      return result as T;
    }

    return value;
  }

  dataProvider(
    id: string,
    valueCb: ValueGetterSetter,
    originalValueCb?: ValueGetterSetter,
    sourceRefresh?: () => void,
  ): IDataProvider {
    return new DirectDataProvider(
      id,
      this.#context,
      valueCb,
      originalValueCb,
      sourceRefresh,
    );
  }

  each<T extends LetsRole.EachValue = LetsRole.EachValue>(
    value: T,
    cb: LetsRole.EachCallback<T, T>,
  ): T {
    const result: T = (Array.isArray(value) ? [] : {}) as T;

    // @ts-expect-error The type here can be easily and clearly fixed
    each(value, (v: T[keyof T], k: keyof T) => (result[k] = cb(v, k)));

    return result;
  }
}

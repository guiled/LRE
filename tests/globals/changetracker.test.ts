import { Context } from "../../src/context";
import { DirectDataProvider } from "../../src/dataprovider";
import { ChangeTracker } from "../../src/globals/changetracker";
import { LRE } from "../../src/lre";
import {
  initLetsRole,
  terminateLetsRole,
} from "../../src/mock/letsrole/letsrole.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";
import { SheetProxy } from "../../src/proxy/sheet";
import { Sheet } from "../../src/sheet";
import { DataBatcher } from "../../src/sheet/databatcher";

describe("ChangeTracker linkParams", () => {
  let ClassA: any;
  let sheet: Sheet;

  beforeEach(() => {
    const server = new ServerMock({
      views: [
        {
          id: "main",
          className: "View",
          children: [
            {
              id: "a",
              className: "TextInput",
            },
            {
              id: "b",
              className: "TextInput",
            },
          ],
        },
      ],
      tables: {},
    });
    initLetsRole(server, new Context());
    global.lre = new LRE(context);
    const raw = new SheetProxy(context, server.openView("main", "123"));
    sheet = new Sheet(raw, new DataBatcher(context, raw), context);
    lre.sheets.add(sheet);

    ClassA = class implements IDataProviderAsSource {
      #id: string;
      #fn: (a: number, b?: number) => void = jest.fn();
      #tracker: ChangeTracker = new ChangeTracker(this, context);
      #value: number | undefined = undefined;
      #refresher: Record<string, any> = {};
      provider = true;

      constructor(id: string, fn?: () => void) {
        this.#id = id;

        if (fn) {
          this.#fn = fn;
        }
      }

      realId(): string {
        return this.#id;
      }

      getChangeTracker(): ChangeTracker {
        return this.#tracker;
      }

      @ChangeTracker.linkParams()
      method(a: number): any {
        this.#value = a;
        this.#fn(a);

        for (const key in this.#refresher) {
          this.#refresher[key]();
        }

        return a;
      }

      providedValue<T extends DataProviderDataValue = DataProviderDataValue>(
        _newValue?: T,
      ): T extends undefined ? DataProviderDataValue : void {
        context.logAccess("provider", this);
        // @ts-expect-error only for testing
        return this.#value;
      }

      subscribeRefresh(id: string, refresh: () => void): void {
        this.#refresher[id] = refresh;
      }

      unsubscribeRefresh(id: string): void {
        delete this.#refresher[id];
      }
    };
  });

  afterEach(() => {
    terminateLetsRole();
  });

  test("ChangeTracker is linked", () => {
    const a = new ClassA("Aa");
    const tracker = a.getChangeTracker();

    expect(tracker).toBeInstanceOf(ChangeTracker);
  });

  test("empty logs", () => {
    const a = new ClassA("Aa");

    a.method(1, 2);

    expect(context.getLastLog()).toStrictEqual({});
  });

  test("Value log add event and refresh", () => {
    const a = new ClassA("Aa");

    const cmp = sheet.get("a")!;

    jest.spyOn(cmp, "on");

    const fn = jest.fn();
    a.method(() => {
      fn();
      return cmp.value();
    }, 2);

    expect(context.getLastLog()).toStrictEqual({
      value: [["123", "a"]],
    });
    expect(cmp.on).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    cmp.value("42");

    expect(fn).toHaveBeenCalledTimes(1);

    cmp.value("42");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("Value log add event, remove event", () => {
    const a = new ClassA("Aa");

    const cmp1 = sheet.get("a")!;
    cmp1.value("a1");
    jest.spyOn(cmp1, "on");
    jest.spyOn(cmp1, "off");
    const cmp2 = sheet.get("b")!;
    cmp2.value("b1");
    jest.spyOn(cmp2, "on");
    jest.spyOn(cmp2, "off");

    const fn = jest.fn();
    let switcher = true;
    a.method(() => {
      if (switcher) {
        return fn(cmp1.value());
      } else {
        return fn(cmp2.value());
      }
    }, 2);

    expect(context.getLastLog()).toStrictEqual({
      value: [["123", "a"]],
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a1");
    expect(cmp1.on).toHaveBeenCalledTimes(1);
    expect(cmp1.off).not.toHaveBeenCalled();
    expect(cmp2.on).not.toHaveBeenCalled();
    expect(cmp2.off).not.toHaveBeenCalled();

    jest.clearAllMocks();
    switcher = false;
    cmp1.value("a42");

    expect(context.getLastLog()).toStrictEqual({
      value: [["123", "b"]],
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("b1");
    expect(cmp1.on).not.toHaveBeenCalled();
    expect(cmp1.off).toHaveBeenCalledTimes(1);
    expect(cmp2.on).toHaveBeenCalledTimes(1);
    expect(cmp2.off).not.toHaveBeenCalled();

    jest.clearAllMocks();
    cmp1.value("a43");

    expect(fn).not.toHaveBeenCalled();

    jest.clearAllMocks();
    cmp2.value("b41");

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("b41");
    expect(context.getLastLog()).toStrictEqual({
      value: [["123", "b"]],
    });
    expect(cmp1.on).not.toHaveBeenCalled();
    expect(cmp1.off).not.toHaveBeenCalled();
    expect(cmp2.on).not.toHaveBeenCalled();
    expect(cmp2.off).not.toHaveBeenCalled();
  });

  test("Events are changed if changing the value", () => {
    const a = new ClassA("Aa");

    const cmp1 = sheet.get("a")!;
    const cmp2 = sheet.get("b")!;

    jest.spyOn(cmp1, "on");
    jest.spyOn(cmp1, "off");
    jest.spyOn(cmp2, "on");
    jest.spyOn(cmp2, "off");

    a.method(() => {
      return cmp1.value();
    });

    expect(cmp1.on).toHaveBeenCalledTimes(1);
    expect(cmp1.off).not.toHaveBeenCalled();
    expect(cmp2.on).not.toHaveBeenCalled();
    expect(cmp2.off).not.toHaveBeenCalled();

    jest.clearAllMocks();
    a.method(() => {
      return cmp2.value();
    });

    expect(cmp1.on).not.toHaveBeenCalled();
    expect(cmp1.off).toHaveBeenCalledTimes(1);
    expect(cmp2.on).toHaveBeenCalledTimes(1);
    expect(cmp2.off).not.toHaveBeenCalled();

    jest.clearAllMocks();
    a.method(42);

    expect(cmp1.on).not.toHaveBeenCalled();
    expect(cmp1.off).not.toHaveBeenCalled();
    expect(cmp2.on).not.toHaveBeenCalled();
    expect(cmp2.off).toHaveBeenCalledTimes(1);
  });

  test("Value of one component linked to two methods creates two event handlers", () => {
    const a = new ClassA("Aa");
    const b = new ClassA("Ab");

    const cmp = sheet.get("a")!;
    cmp.value("a1");

    jest.spyOn(cmp, "on");
    jest.spyOn(cmp, "off");

    const fna = jest.fn();
    const fnb = jest.fn();
    let switcher = true;
    a.method(() => {
      if (switcher) {
        return fna(cmp.value());
      }

      return fna(false);
    }, 2);
    b.method(() => {
      return fnb(cmp.value());
    }, 2);

    expect(cmp.on).toHaveBeenCalledTimes(2);
    expect(cmp.off).toHaveBeenCalledTimes(0);

    jest.clearAllMocks();
    cmp.value("a42");

    expect(fna).toHaveBeenCalledTimes(1);
    expect(fna).toHaveBeenCalledWith("a42");
    expect(fnb).toHaveBeenCalledTimes(1);
    expect(fnb).toHaveBeenCalledWith("a42");
    expect(cmp.on).toHaveBeenCalledTimes(0);
    expect(cmp.off).toHaveBeenCalledTimes(0);

    switcher = false;
    jest.clearAllMocks();
    cmp.value("a43");

    expect(fna).toHaveBeenCalledTimes(1);
    expect(fna).toHaveBeenCalledWith(false);
    expect(fnb).toHaveBeenCalledTimes(1);
    expect(fnb).toHaveBeenCalledWith("a43");
    expect(cmp.on).toHaveBeenCalledTimes(0);
    expect(cmp.off).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    cmp.value("a44");

    expect(fna).toHaveBeenCalledTimes(0);
    expect(fnb).toHaveBeenCalledTimes(1);
    expect(fnb).toHaveBeenCalledWith("a44");
    expect(cmp.on).toHaveBeenCalledTimes(0);
    expect(cmp.off).toHaveBeenCalledTimes(0);
  });

  describe("Logs create events depending on the log type", () => {
    const testCases: Array<{ type: ProxyModeHandlerLogType; match: RegExp }> = [
      { type: "value", match: /^update:/ },
      { type: "rawValue", match: /^update/ },
      { type: "text", match: /^update/ },
      { type: "class", match: /^class-updated/ },
      { type: "data", match: /^data-updated/ },
      { type: "visible", match: /^class-updated/ },
    ];

    test.each(testCases)("Event for $type is $match", ({ type, match }) => {
      const a = new ClassA("Aa");
      const cmp = sheet.get("a")!;
      jest.spyOn(cmp, "on");
      jest.spyOn(cmp, "off");

      a.method(() => {
        context.logAccess(type, ["123", "a"]);
      });

      expect(cmp.on).toHaveBeenCalledTimes(1);

      let eventId = (cmp.on as jest.Mock).mock.calls[0][0];

      expect(eventId).toMatch(match);
      expect(cmp.off).not.toHaveBeenCalled();

      jest.clearAllMocks();
      a.method(42);

      expect(cmp.on).not.toHaveBeenCalled();
      expect(cmp.off).toHaveBeenCalledTimes(1);

      eventId = (cmp.off as jest.Mock).mock.calls[0][0];

      expect(eventId).toMatch(match);
    });
  });

  test("Direct component as argument create a value log", () => {
    const cb = jest.fn();
    const a = new ClassA("Aa", cb);
    const cmp = sheet.get("a")!;
    cmp.value("a1");
    jest.spyOn(cmp, "on");
    jest.spyOn(cmp, "off");
    jest.spyOn(a, "method");

    a.method(cmp);

    expect(cb).toHaveBeenCalledTimes(1);

    expect(context.getLastLog()).toStrictEqual({
      value: [["123", "a"]],
    });
    expect(cmp.on).toHaveBeenCalledTimes(1);
    expect(cmp.off).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith("a1");

    jest.clearAllMocks();
    cmp.value("a42");

    expect(context.getLastLog()).toStrictEqual({
      value: [["123", "a"]],
    });
    expect(cmp.on).not.toHaveBeenCalled();
    expect(cmp.off).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith("a42");
  });

  test("DataProvider as argument create a provider log", () => {
    const cb = jest.fn();
    const a = new ClassA("Aa", cb);
    let val = 42;
    const dp = new DirectDataProvider("dp", context, () => val);

    jest.spyOn(dp, "subscribeRefresh");
    jest.spyOn(dp, "unsubscribeRefresh");

    a.method(dp);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(val);
    expect(dp.subscribeRefresh).toHaveBeenCalledTimes(1);
    expect(dp.unsubscribeRefresh).not.toHaveBeenCalled();

    val = 43;
    jest.clearAllMocks();
    dp.refresh();

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(val);
    expect(dp.subscribeRefresh).not.toHaveBeenCalled();
    expect(dp.unsubscribeRefresh).not.toHaveBeenCalled();

    jest.clearAllMocks();
    a.method(22);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(22);
    expect(dp.subscribeRefresh).not.toHaveBeenCalled();
    expect(dp.unsubscribeRefresh).toHaveBeenCalledTimes(1);
  });

  test("Chained links", () => {
    let val = 42;
    const dp = new DirectDataProvider("dp", context, () => val);

    const a = new ClassA("Aa");

    jest.spyOn(dp, "subscribeRefresh");
    jest.spyOn(dp, "unsubscribeRefresh");
    jest.spyOn(a, "subscribeRefresh");
    jest.spyOn(a, "unsubscribeRefresh");

    a.method(dp);

    expect(dp.subscribeRefresh).toHaveBeenCalledTimes(1);
    expect(a.providedValue()).toBe(42);

    val = 43;
    dp.refresh();

    expect(a.providedValue()).toBe(43);

    jest.clearAllMocks();
    const b = new ClassA("Ab");

    expect(dp.subscribeRefresh).toHaveBeenCalledTimes(0);
    expect(a.subscribeRefresh).toHaveBeenCalledTimes(0);

    b.method(a);

    expect(a.subscribeRefresh).toHaveBeenCalledTimes(1);
    expect(b.providedValue()).toBe(43);

    val = 44;
    dp.refresh();

    expect(b.providedValue()).toBe(44);
  });
});

describe("ChangeTracker linkParams with flags", () => {
  let ClassA: any;

  beforeEach(() => {
    const server = new ServerMock({});
    initLetsRole(server, new Context());
    global.lre = new LRE(context);

    ClassA = class {
      #id: string;
      #fn: (a: number, b?: number) => void = jest.fn();
      #tracker: ChangeTracker = new ChangeTracker(this, context);
      value: Array<number> | undefined = undefined;
      givenCb: undefined | (() => void);

      constructor(id: string, fn?: () => void) {
        this.#id = id;

        if (fn) {
          this.#fn = fn;
        }
      }

      realId(): string {
        return this.#id;
      }

      getChangeTracker(): ChangeTracker {
        return this.#tracker;
      }

      @ChangeTracker.linkParams([true, true, false])
      method(a: number, b: number, cb?: () => void): any {
        this.value = [a, b];
        if (cb) this.givenCb = cb;
        this.#fn(a);

        return a;
      }
    };
  });

  afterEach(() => {
    terminateLetsRole();
  });

  test("Multiple linked parameters", () => {
    const a = new ClassA("Aa");

    let val = 42;
    const dp1 = new DirectDataProvider("dp", context, () => val);
    const dp2 = new DirectDataProvider("dp", context, () => val + 1);

    const cb = jest.fn(() => val);

    a.method(dp1, dp2, cb);

    expect(a.value).toStrictEqual([42, 43]);
    expect(a.givenCb).toBe(cb);

    val = 48;
    dp1.refresh();
    dp2.refresh();

    expect(a.value).toStrictEqual([48, 49]);
    expect(a.givenCb).toBe(cb);
  });
});

describe("ChangeTracker extract data providers", () => {
  let ClassA: any;

  beforeEach(() => {
    const server = new ServerMock({});
    initLetsRole(server, new Context());
    global.lre = new LRE(context);

    ClassA = class {
      #id: string;
      #fn: (a: number, b?: number) => void = jest.fn();
      #tracker: ChangeTracker = new ChangeTracker(this, context);
      #dp1: IDataProvider | undefined;
      #dp2: IDataProvider | undefined;
      givenCb: undefined | (() => void);

      constructor(id: string, fn?: () => void) {
        this.#id = id;

        if (fn) {
          this.#fn = fn;
        }
      }

      realId(): string {
        return this.#id;
      }

      getChangeTracker(): ChangeTracker {
        return this.#tracker;
      }

      @ChangeTracker.linkParams(
        [true, false],
        [
          function (
            this: typeof ClassA,
            dataProvider: IDataProvider | undefined,
          ) {
            this.#dp1 = dataProvider;
          },
          function (
            this: typeof ClassA,
            dataProvider: IDataProvider | undefined,
          ) {
            this.#dp2 = dataProvider;
          },
        ],
      )
      method(a: number, cb?: () => void): any {
        if (cb) this.givenCb = cb;
        this.#fn(a);

        return a;
      }

      getProvider1(): IDataProvider | undefined {
        return this.#dp1;
      }

      getProvider2(): IDataProvider | undefined {
        return this.#dp2;
      }
    };
  });

  afterEach(() => {
    terminateLetsRole();
  });

  test("Extracted DataProvider is undefined", () => {
    const a = new ClassA("Aa");
    const cb = jest.fn();

    a.method(42, cb);

    expect(a.getProvider1()).toBeUndefined();
    expect(a.getProvider2()).toBeUndefined();
    expect(a.givenCb).toBe(cb);
  });

  test("Extracted DataProvider is defined if flag is true, undefined if flag is false", () => {
    const val = 42;
    const dp = new DirectDataProvider("dp", context, () => val);
    const dp2 = new DirectDataProvider("dp", context, () => val);

    const a = new ClassA("Aa");

    a.method(dp, dp2);

    expect(a.getProvider1()).toStrictEqual(dp);
    expect(a.getProvider2()).toBeUndefined();
    expect(a.givenCb).toBe(dp2);
  });
});

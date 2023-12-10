import { MockComponent } from "../mock/letsrole/component.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { ComponentCache } from "../../src/component/cache";
import { Component } from "../../src/component/component";
import { LRE } from "../../src/lre";
import { ComponentSearchResult } from "../../src/component/container";
import { newMockedWait } from "../mock/letsrole/wait.mock";
import { Sheet } from "../../src/sheet";

jest.mock("../../src/lre");
jest.mock("../../src/component/component");

global.lre = new LRE();
const mockedWaitDefs = newMockedWait();
global.wait = mockedWaitDefs.wait;
lre.wait = wait;

let cache: ComponentCache;
const rawSheet = MockSheet({
  id: "sheet",
  realId: "realId",
});
const sheet = new Sheet(rawSheet);
const UNKNOWN_CMP_ID = "_unknown_";

const newCmp = jest.fn((id: string): ComponentSearchResult => {
  if (id === UNKNOWN_CMP_ID) {
    return null;
  }

  const cmp = new Component(
    MockComponent({
      id: id,
      sheet: rawSheet,
    }),
    sheet,
    id
  );

  jest.spyOn(cmp, "realId").mockReturnValue(id);

  return cmp;
});

beforeAll(() => {
  cache = new ComponentCache(newCmp);
});

describe("Component cache set/get/unset/inCache", () => {
  test("Set / Get / Incache", () => {
    expect(cache.get(UNKNOWN_CMP_ID)).toBeNull();
    expect(newCmp).toBeCalledTimes(1);
    expect(cache.inCache(UNKNOWN_CMP_ID)).toBeFalsy();
    expect(cache.inCache("123")).toBeFalsy();
    expect(newCmp).toBeCalledTimes(1);
    newCmp.mockClear();
    expect(cache.get("123")).not.toBeNull();
    expect(newCmp).toBeCalledTimes(1);
    expect(cache.inCache("123")).toBeTruthy();
    const cmp = newCmp("123")!;
    cache.set("123", cmp);
    newCmp.mockClear();
    expect(newCmp).not.toBeCalled();
    expect(cache.get("123")).toStrictEqual(cmp);
    expect(newCmp).not.toBeCalled();
    cache.unset("123");
    expect(newCmp).not.toBeCalled();
    expect(cache.get("123")).not.toStrictEqual(cmp);
    expect(newCmp).toBeCalledTimes(1);
  });

  test("Set / Get / Incache for repeaters", () => {
    const rep = newCmp("rep")!;
    cache.set("rep", rep);
    const entry1 = newCmp("rep.1")!;
    cache.set("rep.1", entry1);
    const cmp1a = newCmp("rep.1.a")!;
    cache.set("rep.1.a", cmp1a);
    const cmp1b = newCmp("rep.1.b")!;
    cache.set("rep.1.b", cmp1a);
    const entry2 = newCmp("rep.2")!;
    cache.set("rep.2", entry2);
    newCmp("rep.2.a");
    cache.set("rep.2.a", cmp1a);
    newCmp("rep.1.b");
    cache.set("rep.2.b", cmp1b);
    expect(cache.inCache("*rep")).toBeTruthy();
    expect(cache.inCache("*reup")).toBeFalsy();
    expect(cache.inCache("*rep.1")).toBeTruthy();
    expect(cache.inCache("*rep.1")).toBeTruthy();
    expect(cache.children("rep.1").sort()).toEqual(
      ["rep.1.a", "rep.1.b"].sort()
    );
    expect(cache.children("rep").sort()).toEqual(
      ["rep.2.a", "rep.2", "rep.1", "rep.2.b", "rep.1.a", "rep.1.b"].sort()
    );
  });
});

describe("Component cache forget/remember", () => {
  beforeEach(() => {
    newCmp.mockClear();
    cache = new ComponentCache(newCmp);
  });

  test("forget/remember", () => {
    expect(cache.inCache("123")).toBeFalsy();
    cache.remember("123");
    cache.remember("abc");
    expect(newCmp).not.toBeCalled();
    cache.get("123.b.c");
    expect(cache.inCache("123")).toBeFalsy();
    mockedWaitDefs.itHasWaitedEverything();
    expect(cache.inCache("123")).not.toBeFalsy();
    expect(newCmp).toBeCalled();
    expect(cache.inCache("123.b.c")).not.toBeFalsy();
    cache.forget("123");
    expect(cache.inCache("123.b.c")).not.toBeFalsy();
    expect(cache.inCache("123")).not.toBeFalsy();
    mockedWaitDefs.itHasWaitedEverything();
    expect(cache.inCache("123.b.c")).toBeFalsy();
    expect(cache.inCache("123")).toBeFalsy();
    cache.get("b");
    cache.forget("b");
    cache.remember("a");
    cache.remember("b");
    cache.forget("a");
    mockedWaitDefs.itHasWaitedEverything();
    expect(cache.inCache("a")).toBeFalsy();
    expect(cache.inCache("b")).not.toBeFalsy();
  });
});

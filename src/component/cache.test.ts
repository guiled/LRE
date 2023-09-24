import { Logger } from "../log";
import { MockComponent } from "../mock/letsrole/component.mock";
import { MockSheet } from "../mock/letsrole/sheet.mock";
import { Sheet } from "../sheet";
import { ComponentCache } from "./cache";
import { Component } from "./component";
jest.mock("../sheet");
jest.mock("./component");

global.lre = new Logger();

let cache: ComponentCache;
const rawSheet = MockSheet({
  id: "sheet",
  realId: "realId",
});
const sheet = new Sheet(rawSheet);

const newCmp = (id: string) => {
  const rawCmp = MockComponent({
    id: id,
    sheet: rawSheet,
  });

  return new Component(rawCmp, sheet, id);
};

beforeAll(() => {
  cache = new ComponentCache();
});

describe("Component cache", () => {
  test("Set / Get / Incache", () => {
    expect(cache.get("123")).toBeNull();
    const cmp = newCmp("123");
    expect(cache.inCache("123")).toBeFalsy();
    cache.set("123", cmp);
    expect(cache.get("123")).toStrictEqual(cmp);
    expect(cache.inCache("123")).toBeTruthy();
    const cmp2 = newCmp("123");
    cache.set("123", cmp2);
    expect(cache.get("123")).toStrictEqual(cmp2);
    cache.unset("123");
    expect(cache.get("123")).toBeNull();
  });

  test("Set / Get / Incache for repeaters", () => {
    const rep = newCmp("rep");
    cache.set("rep", rep);
    const entry1 = newCmp("rep.1");
    cache.set("rep.1", entry1);
    const cmp1a = newCmp("rep.1.a");
    cache.set("rep.1.a", cmp1a);
    const cmp1b = newCmp("rep.1.b");
    cache.set("rep.1.b", cmp1a);
    const entry2 = newCmp("rep.2");
    cache.set("rep.2", entry2);
    const cmp2a = newCmp("rep.2.a");
    cache.set("rep.2.a", cmp1a);
    const cmp2b = newCmp("rep.1.b");
    cache.set("rep.2.b", cmp1b);
    expect(cache.inCache("*rep")).toBeTruthy();
    expect(cache.inCache("*reup")).toBeFalsy();
    expect(cache.inCache("*rep.1")).toBeTruthy();
    expect(cache.inCache("*rep.1")).toBeTruthy();
    expect(cache.children("rep.1").sort()).toEqual(["rep.1.a", "rep.1.b"].sort());
    expect(cache.children("rep").sort()).toEqual(["rep.2.a", "rep.2", "rep.1", "rep.2.b", "rep.1.a", "rep.1.b"].sort());
  });
});

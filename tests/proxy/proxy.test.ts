import { LreProxy } from "../../src/proxy";
import { modeHandlerMock } from "../mock/modeHandler.mock";

describe("Proxy generic class tests", () => {
  test("Generic proxy", () => {
    const obj = {};
    const context = modeHandlerMock();
    const subject = new LreProxy(context, obj);
    expect(subject.getDest()).toBe(obj);
    context.setMode("virtual");
    expect(() => subject.getDest()).toThrow();
    const obj2 = {};
    const newProxyCreator = jest.fn((_obj) => obj2);
    subject.setModeDest("virtual", newProxyCreator);
    expect(newProxyCreator).not.toHaveBeenCalled();
    context.setMode("virtual");
    expect(() => subject.getDest()).not.toThrow();
    expect(newProxyCreator).toHaveBeenCalledTimes(1);
    expect(subject.getDest()).not.toBe(obj);
    expect(subject.getDest()).toBe(obj2);
    expect(() => context.setMode("real")).not.toThrow();
    expect(subject.getDest()).toBe(obj);
    expect(subject.getDest()).not.toBe(obj2);
  });
});

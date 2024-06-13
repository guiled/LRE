import { LreProxy } from "../../src/proxy";
import { modeHandlerMock } from "../mock/modeHandler.mock";

describe("Proxy generic class tests", () => {
  test("Generic proxy", () => {
    const obj = {};
    const subject = new LreProxy(modeHandlerMock, obj);
    expect(subject.getDest()).toBe(obj);
    modeHandlerMock.setMode("virtual");
    expect(() => subject.getDest()).toThrow();
    const obj2 = {};
    const newProxyCreator = jest.fn((_obj) => obj2);
    subject.setModeDest("virtual", newProxyCreator);
    expect(newProxyCreator).not.toHaveBeenCalled();
    modeHandlerMock.setMode("virtual");
    expect(() => subject.getDest()).not.toThrow();
    expect(newProxyCreator).toHaveBeenCalledTimes(1);
    expect(subject.getDest()).not.toBe(obj);
    expect(subject.getDest()).toBe(obj2);
    expect(() => modeHandlerMock.setMode("real")).not.toThrow();
    expect(subject.getDest()).toBe(obj);
    expect(subject.getDest()).not.toBe(obj2);
  });
});

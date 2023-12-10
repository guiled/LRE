import { LreProxy, ProxyMode, ProxyModeHandler } from "../../src/proxy";

describe("Proxy generic class tests", () => {
  test("Generic proxy", () => {
    const obj = {};
    let mode: ProxyMode = "real";
    const modes: ProxyModeHandler = {
      getMode() {
        return mode;
      },
      setMode(newMode) {
        mode = newMode;
      },
    };
    const subject = new LreProxy(modes, obj);
    expect(subject.getDest()).toBe(obj);
    modes.setMode("virtual");
    expect(() => subject.getDest()).toThrowError();
    const obj2 = {};
    const newProxyCreator = jest.fn((_obj) => obj2);
    subject.setModeDest("virtual", newProxyCreator);
    expect(newProxyCreator).not.toBeCalled();
    modes.setMode("virtual")
    expect(() => subject.getDest()).not.toThrowError();
    expect(newProxyCreator).toBeCalledTimes(1);
    expect(subject.getDest()).not.toBe(obj);
    expect(subject.getDest()).toBe(obj2);
    expect(() => modes.setMode("real")).not.toThrowError();
    expect(subject.getDest()).toBe(obj);
    expect(subject.getDest()).not.toBe(obj2);
  });
});

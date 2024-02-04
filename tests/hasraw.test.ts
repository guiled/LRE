import { HasRaw } from "../src/hasraw"



describe("Hasraw", () => {
    test("Hasraw construction and public methods", () => {
        let raw = {};
        const getRaw = jest.fn(() => raw);
        const onRefresh = jest.fn();
        const subject = new (HasRaw<any>())({
            getRaw,
            onRefresh,
        });
        expect(getRaw).toBeCalledTimes(0);
        expect(subject.raw()).toBe(raw);
        expect(getRaw).toBeCalledTimes(1);
        expect(onRefresh).toBeCalledTimes(0);
        raw = {};
        expect(subject.raw()).not.toBe(raw);
        subject.refreshRaw();
        expect(getRaw).toBeCalledTimes(2);
        expect(onRefresh).toBeCalledTimes(1);
        expect(subject.raw()).toBe(raw);
    })
})
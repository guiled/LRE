import { i18n, setLang } from "../../../src/mock/letsrole/i18n";

describe("i18n mock without translation data", () => {
  test("returns an identity translator when data is undefined", () => {
    const translate = i18n(undefined);

    expect(translate("hello")).toBe("hello");
    expect(translate("")).toBe("");
  });

  test("identity translator ignores setLang and leaves text unchanged", () => {
    setLang("fr");
    const translate = i18n(undefined);

    expect(translate("some.key")).toBe("some.key");
  });
});

import { LREi18n } from "../../src/globals/i18n";
import { LRE } from "../../src/lre";
import { setLang } from "../../src/mock/letsrole/i18n";
import { initLetsRole } from "../../src/mock/letsrole/letsrole.mock";
import { ServerMock } from "../../src/mock/letsrole/server.mock";

let server: ServerMock;

beforeEach(() => {
  server = new ServerMock({
    i18n: {
      defaultLang: "en",
      texts: ["trad1", "trad2", "trad3"],
      translations: {
        fr: {
          trad1: "frTrad1",
          trad2: "frTrad2",
        },
      },
    },
  });
  initLetsRole(server);
  global.lre = new LRE(context);
});

describe("_ is used by LREi18n", () => {
  test("_ is called", () => {
    jest.spyOn(global, "_");
    lre.i18n = new LREi18n(_);

    expect(_).not.toHaveBeenCalled();

    lre.i18n._("test");

    expect(_).toHaveBeenCalledWith("test");
  });

  test("lre.i18n._ translates like _ does", () => {
    lre.i18n = new LREi18n(_);

    expect(lre.i18n._("trad1")).toBe("trad1");
    expect(lre.i18n._("trad2")).toBe("trad2");

    setLang("fr");

    expect(lre.i18n._("trad1")).toBe("frTrad1");
    expect(lre.i18n._("trad2")).toBe("frTrad2");
  });
});

describe("collect missing translations", () => {
  test("Missing translations are collected", () => {
    lre.i18n = new LREi18n(_);

    setLang("fr");

    expect(lre.i18n._("trad1")).toBe("frTrad1");
    expect(lre.i18n._("trad3")).toBe("trad3");

    expect(lre.i18n.getUntranslated()).toEqual(["trad3"]);
  });
});

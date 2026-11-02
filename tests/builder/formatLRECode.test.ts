import fs from "fs";
import { formatLRECode } from "../../builder/formatLRECode";

describe("formatLRECode", () => {
  it("should not break for headers that contain nested function semicolons", () => {
    const code =
      'p=function(t,e,n){for(var r=function(r){var i=e[r];Object.defineProperty(t,i,{configurable:!0,enumerable:!0,get:function(){n&&lre.warn(d.replace("%s","get of "+i));var e=v(t)[i];return tpo(e,4)?e.bind(t.raw()):e;},set:function(e){n&&lre.warn(d.replace("%s","set of "+i));v(t)[i]=e;}});},i=0;i<e.length;i++)r(i);};';

    for (let i = 0; i < 20; i++) {
      const formatted = formatLRECode(code, false);

      expect(formatted).not.toMatch(/i<e\.length;{2,}i\+\+/);
      expect(() => new Function(formatted)).not.toThrow();
    }
  });

  it("should drop a leading semicolon before else and keep line length", () => {
    const prefix = "x".repeat(90);
    const code = `${prefix}if(o)a=Reflect.decorate(t,n,e,r);else for(var l=0;l>=0;l--){}`;
    const formatted = formatLRECode(code, false);

    expect(formatted).not.toMatch(/\n;else/);

    formatted.split("\n").forEach((line) => {
      expect(line.trimStart()).not.toMatch(/^;else/);
      expect(line.length).toBeLessThanOrEqual(131);
    });
  });

  it("should format the content of lre.tmp.1.js", () => {
    const filePath = __dirname + "/../../build/lre.tmp.1.js";
    let formattedContent = "skipped";

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      formattedContent = formatLRECode(fileContent, true);
    }

    expect(formattedContent).not.toBe("");
  });
});

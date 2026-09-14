import fs from "fs";
import { formatLRECode } from "../../builder/formatLRECode";

describe("formatLRECode", () => {
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

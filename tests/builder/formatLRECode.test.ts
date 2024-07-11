import fs from "fs";
import { formatLRECode } from "../../builder/formatLRECode";

describe("formatLRECode", () => {
  it("should format the content of lre.tmp.1.js", () => {
    const filePath = __dirname + "/lre.tmp.1.js";
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const formattedContent = formatLRECode(fileContent, true);

    expect(formattedContent).not.toBe("");
  });
});

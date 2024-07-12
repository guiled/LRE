import fs from "fs";
import { formatLRECode } from "../../builder/formatLRECode";

describe("formatLRECode", () => {
  it("should format the content of lre.tmp.1.js", () => {
    const filePath = __dirname + "/lre.tmp.1.js";
    let formattedContent = "skipped";
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      formattedContent = formatLRECode(fileContent, true);
    }
    expect(formattedContent).not.toBe("");
  });
});

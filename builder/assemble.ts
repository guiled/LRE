import fs from "fs";

export const assembleLRECode = (code: string): string => {
  const libStart = "(function() {";
  const libEnd = "})();";
  const insertAtStartCode = code.indexOf(libStart) + libStart.length;
  const insertAtEndCode = code.lastIndexOf(libEnd);
  const startCode = fs.readFileSync("assemble/start.js", "utf8");
  const endCode = fs.readFileSync("assemble/end.js", "utf8");
  return [
    code.substring(0, insertAtStartCode),
    startCode,
    code.substring(insertAtStartCode, insertAtEndCode),
    endCode,
    code.substring(insertAtEndCode),
  ].join("");
};

import fs from "fs";
import { instrumentTraceLog } from "./builder/instrumentTraceLog";
import { getArgv } from "./builder/utils";

const INPUT_FILE = getArgv("--input", "build/lre.debug.js");
const OUTPUT_FILE = getArgv("--output", "build/lre.trace.js");

const code = fs.readFileSync(INPUT_FILE, "utf8");
const instrumented = instrumentTraceLog(code);

fs.writeFileSync(OUTPUT_FILE, instrumented);

const lineCount = instrumented.split("\n").length;
const charCount = instrumented.length;

console.log(
  `Wrote ${OUTPUT_FILE} (${lineCount} lines, ${charCount} characters)`,
);

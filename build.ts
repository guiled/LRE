import esbuild from "esbuild";
import { transformFile } from "@swc/core";
import { postCleanup } from "./transpile.conf";
import fs from "fs";
import { formatLRECode } from "./builder/formatLRECode";
import { assembleLRECode, encloseInRegion } from "./builder/assemble";
import { getArgv, hasArgv } from "./builder/utils";
import { getEsBuildConfig } from "./builder/config";

const DEBUG_BUILD: boolean = hasArgv("--debug");
let OUTPUT_FILE: string = getArgv("--output", "build/lre.js");
const INPUT_FILE: string = getArgv("--input", "src/index.ts");

if (DEBUG_BUILD) {
  const fileNameParts = OUTPUT_FILE.split(".");
  fileNameParts.splice(-1, 0, "debug");
  OUTPUT_FILE = fileNameParts.join(".");
}

esbuild
  .build(getEsBuildConfig(INPUT_FILE, OUTPUT_FILE, DEBUG_BUILD))
  .then(() => {
    if (DEBUG_BUILD && postCleanup.jsc) {
      delete postCleanup.jsc.minify;
    }

    return transformFile(OUTPUT_FILE + ".0.tmp.js", postCleanup);
  })
  .then((result) =>
    result.code
      .trim()
      .replace(/void 0/g, "undefined")
      .replace(/\(\)=>\{/g, "function() {")
      .replace(/`\n`/gm, '"\\n"')
      .replace(/bind\(this\)\.(bind|apply)\(this/gm, "$1(this"),
  )
  .then((code) => {
    code = assembleLRECode(code);
    fs.writeFileSync(OUTPUT_FILE + ".1.tmp.js", code);
    return code;
  })
  .then((code) => {
    if (!DEBUG_BUILD) {
      code = formatLRECode(code, true);
    }

    return fs.writeFileSync(OUTPUT_FILE, encloseInRegion(code));
  });

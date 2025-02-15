import esbuild from "esbuild";
import { transformFile, transformSync } from "@swc/core";
import { transformForLR, postCleanup } from "./transpile.conf";
import fs from "fs";
import { formatLRECode } from "./builder/formatLRECode";
import { assembleLRECode, encloseInRegion } from "./builder/assemble";
import { getArgv, hasArgv } from "./builder/utils";

const DEBUG_BUILD: boolean = hasArgv("--debug");
let OUTPUT_FILE: string = getArgv("--output", "build/lre.js");
const INPUT_FILE: string = getArgv("--input", "src/index.ts");

if (DEBUG_BUILD) {
  const fileNameParts = OUTPUT_FILE.split(".");
  fileNameParts.splice(-1, 0, "debug");
  OUTPUT_FILE = fileNameParts.join(".");
}

const swcPlugin: esbuild.Plugin = {
  name: "swcPlugin",
  setup(build) {
    if (DEBUG_BUILD && transformForLR.jsc) {
      delete transformForLR.jsc.minify;
    }

    build.onLoad({ filter: /\.ts?$/ }, async (args) => {
      const input = await fs.promises.readFile(args.path, "utf8");
      //var output = transformFileSync(args.path, transformForLR);
      const output = transformSync(input, transformForLR);
      return {
        contents: output.code,
        loader: "ts",
      };
    });
  },
};

esbuild
  .build({
    entryPoints: [INPUT_FILE],
    target: "es2024",
    bundle: true,
    minify: false,
    platform: "neutral",
    outfile: OUTPUT_FILE + ".0.tmp.js",
    plugins: [swcPlugin],
    format: "iife",
    define: {
      "console.log": "log",
      LRE_DEBUG: `${DEBUG_BUILD}`,
    },
    minifySyntax: true,
  })
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

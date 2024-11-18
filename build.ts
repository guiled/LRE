import esbuild from "esbuild";
import { transformFile, transformSync } from "@swc/core";
import { transformForLR, noVoid0Plugin } from "./transpile.conf";
import fs from "fs";
import { formatLRECode } from "./builder/formatLRECode";
import { assembleLRECode } from "./builder/assemble";

const OUTPUT_FILE: string = process.argv[2] || "build/lre.js";
const DEBUG_BUILD: boolean = process.argv.includes("debug");

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
    entryPoints: ["src/index.ts"],
    target: "es2022",
    bundle: true,
    minify: false,
    platform: "neutral",
    outfile: OUTPUT_FILE + ".0.tmp.js",
    plugins: [swcPlugin],
    format: "iife",
    define: {
      "console.log": "log",
    },
  })
  .then(() => {
    if (DEBUG_BUILD && noVoid0Plugin.jsc) {
      delete noVoid0Plugin.jsc.minify;
    }

    return transformFile(OUTPUT_FILE + ".0.tmp.js", noVoid0Plugin);
  })
  .then((result) => result.code.trim())
  .then((code) => {
    code = assembleLRECode(code);
    fs.writeFileSync(OUTPUT_FILE + ".1.tmp.js", code);
    return code;
  })
  .then((code) => {
    if (!DEBUG_BUILD) {
      code = formatLRECode(code, true);
    }

    return fs.writeFileSync(
      OUTPUT_FILE,
      `//region LRE ${process.env.npm_package_version} ${Date.now()}
${code}
//endregion LRE ${process.env.npm_package_version}
`,
    );
  });

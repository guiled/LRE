import esbuild from "esbuild";
import { transformFile, transformSync } from "@swc/core";
import { transformForLR, noVoid0Plugin } from "./transpile.conf";
import fs from "fs";
import { formatLRECode } from "./builder/formatLRECode";
import { assembleLRECode } from "./builder/assemble";


let swcPlugin: esbuild.Plugin = {
  name: "swcPlugin",
  setup(build) {
    build.onLoad({ filter: /\.ts?$/ }, async (args) => {
      let input = await fs.promises.readFile(args.path, "utf8");
      //var output = transformFileSync(args.path, transformForLR);
      var output = transformSync(input, transformForLR);
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
    outfile: "build/lre.tmp.0.js",
    plugins: [swcPlugin],
    format: "iife",
    define: {
      "console.log": "log",
    },
  })
  .then(() => transformFile("build/lre.tmp.0.js", noVoid0Plugin))
  .then((result) => result.code.trim())
  .then((code) => {
    code = assembleLRECode(code);
    fs.writeFileSync("build/lre.tmp.1.js", code);
    return code;
  })
  .then((code) => {
    code = formatLRECode(code, true);
    return fs.writeFileSync(
      "build/lre.js",
      `//region LRE ${process.env.npm_package_version} ${Date.now()}
${code}
//endregion LRE ${process.env.npm_package_version}
`
    );
  });

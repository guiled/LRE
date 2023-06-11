import esbuild from "esbuild";
import { transformFile, transformSync } from "@swc/core";
import { transformForLR, noVoid0Plugin } from "./transpile.conf";
import fs from "fs";

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
    outfile: "build/lre.tmp.js",
    plugins: [swcPlugin],
    format: "iife",
    define: {
      "console.log": "log",
    },
  })
  .then(() => transformFile("build/lre.tmp.js", noVoid0Plugin))
  .then((result) => fs.writeFileSync("build/lre.js", `//region LRE ${process.env.npm_package_version} ${Date.now()}
${result.code.trim()}
//endregion LRE ${process.env.npm_package_version}
`));


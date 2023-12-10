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
  .then((result) => {
    let code = result.code.trim();
    const libStart = "(function() {";
    const libEnd = "})();";
    const insertAtStartCode = code.indexOf(libStart) + libStart.length;
    const insertAtEndCode = code.lastIndexOf(libEnd);
    const startCode = fs.readFileSync("assemble/start.js", "utf8");
    const endCode = fs.readFileSync("assemble/end.js", "utf8");
    code = [
      code.substring(0, insertAtStartCode),
      startCode,
      code.substring(insertAtStartCode, insertAtEndCode),
      endCode,
      code.substring(insertAtEndCode),
    ].join("");
    [
      /^\s*(.*)/gm,  // remove spaces from line starts
      /\n+\s*(\n)/g, // remove multiple line breaks
      /([\{\[])\n+\s*/g,  // remove spaces after opening brackets
      /\n+\s*([\}\]]\)?;?)/g,// remove spaces before opening brackets
      /((?=^.*,)(?!^.+[:;]).+?)\n[\s\n]*/gm,
      /[ \t]*([^\s\w"']+)[ \t]*/g,
    ].forEach((e) => (code = code.replace(e, "$1")));
    return fs.writeFileSync(
      "build/lre.js",
      `//region LRE ${process.env.npm_package_version} ${Date.now()}
${code}
//endregion LRE ${process.env.npm_package_version}
`
    );
  });

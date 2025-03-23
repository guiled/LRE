import { transformSync } from "@swc/core";
import esbuild from "esbuild";
import { transformForLR } from "../transpile.conf";
import fs from "fs";

const getSWCPlugin = function (debugBuild: boolean): esbuild.Plugin {
  return {
    name: "swcPlugin",
    setup(build) {
      if (debugBuild && transformForLR.jsc) {
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
};

export function getEsBuildConfig(
  inputFile: string,
  outputFile: string,
  debugBuild: boolean,
): esbuild.BuildOptions {
  return {
    entryPoints: [inputFile],
    target: "es2024",
    bundle: true,
    minify: false,
    platform: "neutral",
    outfile: outputFile + ".0.tmp.js",
    plugins: [getSWCPlugin(debugBuild)],
    format: "iife",
    define: {
      "console.log": "log",
      LRE_DEBUG: `${debugBuild}`,
      REPEATER_OPTIMIZATION_ENABLED: "false",
    },
    minifySyntax: true,
  };
}


import { transformFileSync, transformSync, minifySync, plugins } from "@swc/core";
import transpileConf, { noVoid0Plugin } from "./transpile.conf";
var output = transformFileSync("./build/lre.tmp.js", transpileConf);
output = transformSync(output.code, noVoid0Plugin);

const result = `//region LRE ${process.env.npm_package_version}
${output.code.trim()}
//endregion LRE`;
process.stdout.write(result);
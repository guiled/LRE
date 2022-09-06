import { Options, plugins } from "@swc/core";
import classExtend from "./src/swc/ClassExtend";
import classToFunction from "./src/swc/ClassToFunction";
import defaultVisitor from "./src/swc/DefaulVisitor";
import noArraySpreading from "./src/swc/NoArraySpreading";
import noVoid0 from "./src/swc/NoVoid0";

const conf: Options = {
  jsc: {
    parser: {
      syntax: "ecmascript",
    },
    target: "es5",
    loose: true,
  },
  minify: false,
  module: {
    type: "commonjs",
    strict: false,
    strictMode: false,
    lazy: false,
    noInterop: false,
    ignoreDynamic: false,
  },
  plugin: plugins([
    noArraySpreading(),
    classExtend(),
    classToFunction(),
  ]),
  sourceMaps: false,
};

const noVoid0Plugin = {
  ...conf,
  plugin: plugins([noVoid0()]),
};

export { noVoid0Plugin };

export default conf;

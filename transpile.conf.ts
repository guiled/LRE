import { Options, plugins } from "@swc/core";
import classExtend from "./src/swc/ClassExtend";
import classToFunction from "./src/swc/ClassToFunction";
import computedObjectProps from "./src/swc/ComputedObjectProp";
//import defaultVisitor from "./src/swc/DefaultVisitor";
//import keepInstanceOf from "./src/swc/KeepInstanceOf";
import noArraySpreading from "./src/swc/NoArraySpreading";
import noVoid0 from "./src/swc/NoVoid0";
import defaultParameter from "./src/swc/ParamDefaultValue";
import replaceInOperator from "./src/swc/ReplaceInOperator";
import noThrowStatement from "./src/swc/NoThrowStatement";
import { noDoWhile } from "./src/swc/NoDoWhile";
import { mixinToAssign } from "./src/swc/MixinToAssign";
import { noRestElement } from "./src/swc/NoRestElement";
import noInstanceOf from "./src/swc/NoInstanceOf";
import noObjectSpreading from "./src/swc/NoObjectSpread";

const transformForLR: Options = {
  jsc: {
    parser: {
      syntax: "typescript",
      tsx: false,
    },
    target: "es5",
    loose: true,
  },
  minify: false,
  isModule: true,
  module: {
    type: "es6",
  },
  plugin: plugins([noThrowStatement(), noInstanceOf(), noDoWhile(), noArraySpreading(), noObjectSpreading(), noRestElement(), replaceInOperator(), defaultParameter(), computedObjectProps(), mixinToAssign(), classExtend(), classToFunction(), defaultParameter()]),
  sourceMaps: false,
};

const noVoid0Plugin: Options = {
  ...transformForLR,
  plugin: plugins([noVoid0()]),
};

export { transformForLR, noVoid0Plugin };
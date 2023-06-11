import { Options, plugins } from "@swc/core";
import classExtend from "./src/swc/ClassExtend";
import classToFunction from "./src/swc/ClassToFunction";
import computedObjectProps from "./src/swc/ComputedObjectProp";
import defaultVisitor from "./src/swc/DefaultVisitor";
import keepInstanceOf from "./src/swc/KeepInstanceOf";
import noArraySpreading from "./src/swc/NoArraySpreading";
import noVoid0 from "./src/swc/NoVoid0";
import defaultParameter from "./src/swc/ParamDefaultValue";
import replaceInOperator from "./src/swc/ReplaceInOperator";
import noThrowStatement from "./src/swc/NoThrowStatement";

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
    // strict: false,
    // strictMode: false,
    // lazy: false,
    // noInterop: false,
    // ignoreDynamic: false,
  },
  //plugin: plugins([defaultVisitor()]),
  //plugin: plugins([defaultVisitor(), classToFunction()]),
  plugin: plugins([noArraySpreading(), replaceInOperator(), defaultParameter(), computedObjectProps(), classExtend(), classToFunction()]),
  sourceMaps: false,
};

const noVoid0Plugin: Options = {
  ...transformForLR,
  plugin: plugins([noThrowStatement(), noVoid0(), keepInstanceOf()]),
};

export { transformForLR, noVoid0Plugin };
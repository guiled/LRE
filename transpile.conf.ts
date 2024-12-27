import { Options, plugins } from "@swc/core";
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
import { noSpreadArgument } from "./src/swc/NoSpreadArgument";
import fixArrayFromArguments from "./src/swc/FixArrayFromArguments";
import { noSequence } from "./src/swc/noSequence";
import { noTypeof } from "./src/swc/noTypeof";
import { noCallInIf } from "./src/swc/noCallInIf";

const transformForLR: Options = {
  jsc: {
    parser: {
      syntax: "typescript",
      decorators: true,
      tsx: false,
    },
    target: "es5",
    loose: true,
    minify: {
      compress: false,
      mangle: {
        toplevel: false,
        keep_classnames: false,
        keep_fnames: false,
        keep_private_props: false,
        ie8: false,
        safari10: false,
      },
    },
  },
  minify: false,
  isModule: true,
  module: {
    type: "es6",
  },
  plugin: plugins([
    noThrowStatement(),
    noInstanceOf(),
    noDoWhile(),
    noArraySpreading(),
    noObjectSpreading(),
    mixinToAssign(),
    defaultParameter(),
    noSpreadArgument(),
    noRestElement(),
    replaceInOperator(),
    computedObjectProps(),
    classToFunction(),
    fixArrayFromArguments(),
    defaultParameter(),
  ]),
  sourceMaps: false,
};

const postCleanup: Options = {
  // jsc: {
  //   parser: {
  //     syntax: "ecmascript",
  //     decorators: false,
  //   },
  //   target: "es5",
  //   loose: false,
  //   minify: {
  //     compress: false,
  //     mangle: {
  //       toplevel: false,
  //       keep_classnames: false,
  //       keep_fnames: false,
  //       keep_private_props: false,
  //       ie8: false,
  //       safari10: false,
  //     },
  //   },
  // },
  // minify: false,
  // isModule: false,
  ...transformForLR,
  plugin: plugins([noVoid0(), noTypeof(), noSequence(), noCallInIf()]),
};

export { transformForLR, postCleanup };

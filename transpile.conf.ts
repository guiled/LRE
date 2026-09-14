import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Options } from "@swc/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const lreTransformsWasm = path.resolve(
  __dirname,
  "swc-plugins/lre-transforms/target/wasm32-wasip1/release/lre_transforms.wasm",
);

const sharedJsc = {
  parser: {
    syntax: "typescript" as const,
    decorators: true,
    tsx: false,
  },
  target: "es5" as const,
  loose: true,
};

const transformForLR: Options = {
  jsc: {
    ...sharedJsc,
    experimental: {
      plugins: [[lreTransformsWasm, { phase: "transform" }]],
      runPluginFirst: true,
    },
  },
  minify: false,
  isModule: true,
  module: {
    type: "es6",
  },
  sourceMaps: false,
};

const postCleanup: Options = {
  jsc: {
    ...sharedJsc,
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
    experimental: {
      plugins: [[lreTransformsWasm, { phase: "postCleanup" }]],
    },
  },
  minify: false,
  isModule: true,
  module: {
    type: "es6",
  },
  sourceMaps: false,
};

const typeOfCleanup: Options = {
  jsc: {
    parser: {
      syntax: "ecmascript" as const,
    },
    target: "es2020" as const,
    loose: true,
    experimental: {
      plugins: [[lreTransformsWasm, { phase: "typeOfCleanup" }]],
      runPluginFirst: true,
    },
  },
  minify: false,
  isModule: true,
  module: {
    type: "es6",
  },
  sourceMaps: false,
};

export { transformForLR, postCleanup, typeOfCleanup };

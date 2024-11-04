import eslint from "@eslint/js";
import tsESlint from "typescript-eslint";

import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import stylisticTs from "@stylistic/eslint-plugin-ts";
import prettierRecommended from "eslint-plugin-prettier/recommended";

export default tsESlint.config(
  eslint.configs.recommended,
  ...tsESlint.configs.recommended,
  prettierRecommended,
  {
    ignores: [
      "out/**/*",
      "build/**/*",
      "coverage/**/*",
      "assemble/**/*",
      "lre*.js",
    ],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@stylistic": stylisticTs,
    },
    rules: {
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "block-like" },
        { blankLine: "always", prev: "block-like", next: "*" },
      ],
    },
  },
);

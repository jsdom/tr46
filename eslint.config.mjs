import domenicConfig from "@domenic/eslint-config";
import domenicStylisticConfig from "@domenic/eslint-config/stylistic";
import globals from "globals";

export default [
  {
    ignores: ["lib/mappingTable.json", "lib/regexes.js"],
  },
  ...domenicConfig,
  ...domenicStylisticConfig,
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: globals.nodeBuiltin,
    },
  },
];

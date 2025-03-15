import domenicConfig from "@domenic/eslint-config";
import globals from "globals";
export default [
  {
    ignores: [
      "lib/mappingTable.json",
      "lib/regexes.js"
    ]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node
    }
  },
  ...domenicConfig,
  {
    files: ["scripts/**.js"],
    rules: {
      "no-console": "off"
    }
  }
];

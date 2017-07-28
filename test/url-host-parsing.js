/* eslint-env node, mocha */
"use strict";

const assert = require("assert");

const tr46 = require("../index.js");

const options = { useSTD3ASCIIRules: false };

describe("WPT host parsing", () => {
  for (let i = 0; i < 0x7F; i++) {
    const str = String.fromCharCode(i);
    specify(`toASCII ${encodeURI(str)}`, () => {
      assert.strictEqual(tr46.toASCII(str, options), str.toLowerCase());
    });
    specify(`toUnicode ${encodeURI(str)}`, () => {
      const { domain, error } = tr46.toUnicode(str, options);
      assert.strictEqual(domain, str.toLowerCase());
      assert.strictEqual(error, false);
    });
  }
});

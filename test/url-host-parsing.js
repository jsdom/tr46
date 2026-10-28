"use strict";
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const tr46 = require("../index.js");

const options = { useSTD3ASCIIRules: false };

describe("WPT host parsing", () => {
  for (let i = 0; i < 0x7f; i++) {
    const str = String.fromCharCode(i);
    test(`toASCII ${encodeURI(str)}`, () => {
      assert.equal(tr46.toASCII(str, options), str.toLowerCase());
    });
    test(`toUnicode ${encodeURI(str)}`, () => {
      const { domain, error } = tr46.toUnicode(str, options);
      assert.equal(domain, str.toLowerCase());
      assert.equal(error, false);
    });
  }
});

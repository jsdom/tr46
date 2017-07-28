/* eslint-env node, mocha */
"use strict";

const assert = require("assert");
const tr46 = require("../index.js");

const toASCIITestCases = require("./fixtures/toascii.json");

function testToASCII(testCase) {
  return () => {
    const result = tr46.toASCII(testCase.input, {
      checkBidi: true,
      checkHyphens: false,
      checkJoiners: true,
      useSTD3ASCIIRules: false,
      verifyDNSLength: false
    });

    assert.strictEqual(result, testCase.output);
  };
}

describe("ToASCII", () => {
  for (const testCase of toASCIITestCases) {
    if (typeof testCase === "string") {
      // It's a "comment"; skip it.
      continue;
    }

    let description = testCase.input;
    if (testCase.comment) {
      description = ` (${testCase.comment})`;
    }

    specify(description, testToASCII(testCase));
  }
});

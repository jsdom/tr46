"use strict";
const { describe, test } = require("node:test");
const assert = require("assert");
const tr46 = require("../index.js");

const toASCIITestCases = require("./fixtures/toascii.json");
const idnaTestV2 = require("./fixtures/IdnaTestV2ToASCII.json");

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
      description += ` (${testCase.comment})`;
    }

    test(description, testToASCII(testCase));
  }
});

describe("ToASCII via IdnaTestV2.json in wpt", () => {
  for (const testCase of idnaTestV2) {
    if (typeof testCase === "string") {
      // It's a "comment"; skip it.
      continue;
    }

    if (testCase.input.includes("?")) {
      // ToASCII will not fail on these. But, the URL Standard will. IdnaTestV2.json is mostly focused on the URL
      // Standard, so it expects failures. We should skip them.
      continue;
    }

    let description = testCase.input;
    if (testCase.comment) {
      description += ` (${testCase.comment})`;
    }

    test(description, testToASCII(testCase));
  }
});

/* eslint-env node, mocha */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const tr46 = require("../index.js");

// UTS #46 version 13.0.0 includes the following broken tests.
// They both include U+18C4E, which prior to 13.0.0 was treated as disallowed
// but became valid in 13.0.0. However, the IdnaTestV2.txt file does not appear
// to be updated for this change, and still considers them invalid.
const UNICODE_13_BROKEN_TO_UNICODE_TESTS = [
  [0x3A1B, 0x18C4E, 0x2E, 0x3002, 0x37, 0x0D01].map(cp => String.fromCodePoint(cp)).join(""),
  "xn--mbm8237g..xn--7-7hf"
];

function normalize(inp) {
  let out = "";

  for (let i = 0; i < inp.length; ++i) {
    if (inp[i] === "\\") {
      if (inp[++i] === "u") {
        out += String.fromCharCode(parseInt(inp[++i] + inp[++i] + inp[++i] + inp[++i], 16));
      } else {
        throw new Error("Found \\ without it being the start of a unicode character sequence");
      }
    } else {
      out += inp[i];
    }
  }

  return out;
}

function testConversionOption(source, expected, status, option) {
  const out = tr46.toASCII(source, {
    checkHyphens: true,
    checkBidi: true,
    checkJoiners: true,
    useSTD3ASCIIRules: true,
    processingOption: option,
    verifyDNSLength: true
  });

  if (status) { // Error code
    assert.equal(out, null, "toASCII should result in an error");
  } else if (out !== null) {
    assert.equal(out, expected, "toASCII should equal the expected value");
  } else {
    // We are allowed to error out in more cases than the test file indicates,
    // which is actually necessary for the test suite to pass.
  }
}

function testConversion(test) {
  return function () {
    testConversionOption(test.source, test.toASCIIN, test.toASCIINStatus, "nontransitional");
    testConversionOption(test.source, test.toASCIIT, test.toASCIITStatus, "transitional");

    const res = tr46.toUnicode(test.source, {
      checkHyphens: true,
      checkBidi: true,
      checkJoiners: true,
      useSTD3ASCIIRules: true,
      processingOption: "nontransitional"
    });
    if (UNICODE_13_BROKEN_TO_UNICODE_TESTS.includes(test.source)) {
      assert.ok(!res.error);
    } else if (test.toUnicodeStatus) { // Error code
      assert.ok(res.error, "ToUnicode should result in an error");
    } else {
      assert.equal(res.domain, test.toUnicode, "ToUnicode should equal the expected value");
    }
  };
}

const lines = fs.readFileSync(path.resolve(__dirname, "fixtures", "IdnaTestV2.txt"), { encoding: "utf8" })
  .split("\n")
  .map(l => l.split("#")[0]);

const testCases = [];

for (const l of lines) {
  const splitted = l.split(";");
  if (splitted.length !== 1) {
    let [
      source,
      toUnicode,
      toUnicodeStatus,
      toASCIIN,
      toASCIINStatus,
      toASCIIT,
      toASCIITStatus
    ] = splitted.map(c => normalize(c.trim()));

    toUnicode = toUnicode || source;
    // We don't care about X* error codes since they are just bugs in a
    // previous version of the test suite.
    if (toUnicodeStatus === "[]" || toUnicodeStatus === "[X4_2]") {
      toUnicodeStatus = "";
    }
    toASCIIN = toASCIIN || toUnicode;
    if (toASCIINStatus === "[]") {
      toASCIINStatus = "";
    }
    toASCIIT = toASCIIT || toASCIIN;
    if (toASCIITStatus === "[]") {
      toASCIITStatus = "";
    }

    testCases.push({
      source,
      toUnicode,
      toUnicodeStatus,
      toASCIIN,
      toASCIINStatus,
      toASCIIT,
      toASCIITStatus
    });
  }
}

describe("IdnaTestV2.txt", () => {
  for (const test of testCases) {
    it(`Converting <${test.source}>`, testConversion(test));
  }
});

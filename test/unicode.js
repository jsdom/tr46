/* eslint-env node, mocha */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const tr46 = require("../index.js");

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

function testConversionOption(test, option) {
  const out = tr46.toASCII(test[1], true, option, true, true, true, true);

  if ((test[3] || test[2])[0] === "[") { // Error code
    assert.equal(out, null, "toASCII should result in an error");
  } else if (out !== null) {
    assert.equal(out, test[3] || test[2] || test[1], "toASCII should equal the expected value");
  }
  // We are allowed to error out in more cases than the test file indicates,
  // which is actually necessary for the test suite to pass.
}

function testConversion(test) {
  return () => {
    if (test[0] === "B" || test[0] === "N") {
      testConversionOption(test, tr46.PROCESSING_OPTIONS.NONTRANSITIONAL);
    }

    if (test[0] === "B" || test[0] === "T") {
      testConversionOption(test, tr46.PROCESSING_OPTIONS.TRANSITIONAL);
    }

    // ToUnicode is always non-transitional.
    const res = tr46.toUnicode(test[1], true, true, true, true);
    if (test[2][0] === "[") { // Error code
      assert.ok(res.error, "ToUnicode should result in an error");
    } else {
      assert.equal(res.domain, test[2] || test[1], "ToUnicode should equal the expected value");
    }
  };
}

const lines = fs.readFileSync(path.resolve(__dirname, "unicode", "IdnaTest.txt"), { encoding: "utf8" })
  .split("\n")
  .map(l => l.split("#")[0]);

const testCases = [];

for (const l of lines) {
  const splitted = l.split(";").map(c => normalize(c.trim()));
  if (splitted.length !== 1) {
    testCases.push(splitted);
  }
}

describe("Web Platform Tests", () => {
  for (const test of testCases) {
    it("Converting <" + test[1] + "> with type " + test[0], testConversion(test));
  }
});

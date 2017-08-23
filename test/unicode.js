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
  const out = tr46.toASCII(test[1], {
    checkHyphens: true,
    checkBidi: true,
    checkJoiners: true,
    useSTD3ASCIIRules: true,
    processingOption: option,
    verifyDNSLength: true
  });

  if ((test[3] || test[2])[0] === "[") { // Error code
    assert.equal(out, null, "toASCII should result in an error");
  } else if (out !== null) {
    assert.equal(out, test[3] || test[2] || test[1], "toASCII should equal the expected value");
  }
  // We are allowed to error out in more cases than the test file indicates,
  // which is actually necessary for the test suite to pass.
}

function testConversion(test) {
  return function () {
    if (test[0] === "B" || test[0] === "N") {
      testConversionOption(test, "nontransitional");
    }

    if (test[0] === "B" || test[0] === "T") {
      testConversionOption(test, "transitional");
    }

    // If the ToUnicode error code is [A4_2], it means that the test is buggy. See
    // https://github.com/Sebmaster/tr46.js/pull/13#issuecomment-318874337.

    // The `this.skip()` line below will show the entire test is skipped in Mocha's output, but in fact toASCII is still
    // tested above (and an error will be thrown if toASCII breaks).
    if (test[2].trim() === "[A4_2]") {
      this.skip(); // eslint-disable-line no-invalid-this
      return;
    }

    // ToUnicode is always non-transitional.
    const res = tr46.toUnicode(test[1], {
      checkHyphens: true,
      checkBidi: true,
      checkJoiners: true,
      useSTD3ASCIIRules: true
    });
    if (test[2][0] === "[") { // Error code
      assert.ok(res.error, "ToUnicode should result in an error");
    } else {
      assert.equal(res.domain, test[2] || test[1], "ToUnicode should equal the expected value");
    }
  };
}

const lines = fs.readFileSync(path.resolve(__dirname, "fixtures", "IdnaTest.txt"), { encoding: "utf8" })
  .split("\n")
  .map(l => l.split("#")[0]);

const testCases = [];

for (const l of lines) {
  const splitted = l.split(";").map(c => normalize(c.trim()));
  if (splitted.length !== 1) {
    testCases.push(splitted);
  }
}

describe("IdnaTest.txt", () => {
  for (const test of testCases) {
    it("Converting <" + test[1] + "> with type " + test[0], testConversion(test));
  }
});

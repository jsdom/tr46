"use strict";
const { describe, test } = require("node:test");
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

function testConversionOption(source, expected, status, transitionalProcessing) {
  const out = tr46.toASCII(source, {
    checkHyphens: true,
    checkBidi: true,
    checkJoiners: true,
    useSTD3ASCIIRules: true,
    transitionalProcessing,
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

function testConversion(testCase) {
  return () => {
    testConversionOption(testCase.source, testCase.toASCIIN, testCase.toASCIINStatus, false);
    testConversionOption(testCase.source, testCase.toASCIIT, testCase.toASCIITStatus, true);

    const res = tr46.toUnicode(testCase.source, {
      checkHyphens: true,
      checkBidi: true,
      checkJoiners: true,
      useSTD3ASCIIRules: true
    });
    if (testCase.toUnicodeStatus) { // Error code
      assert.ok(res.error, "ToUnicode should result in an error");
    } else {
      assert.equal(res.domain, testCase.toUnicode, "ToUnicode should equal the expected value");
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

    toUnicode ||= source;
    // We don't care about X* error codes since they are just bugs in a
    // previous version of the test suite.
    if (toUnicodeStatus === "[]" || toUnicodeStatus === "[X4_2]") {
      toUnicodeStatus = "";
    }
    toASCIIN ||= toUnicode;
    if (toASCIINStatus === "[]") {
      toASCIINStatus = "";
    }
    toASCIIT ||= toASCIIN;
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
  for (const testCase of testCases) {
    test(`Converting <${testCase.source}>`, testConversion(testCase));
  }
});

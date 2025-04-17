"use strict";
const { describe, test } = require("node:test");
const assert = require("assert");
const tr46 = require("../index.js");

function testToASCIIWithSTD3ASCIIRules(testCase) {
  const result = tr46.toASCII(testCase.input, {
    checkBidi: false,
    checkHyphens: false,
    checkJoiners: false,
    useSTD3ASCIIRules: true,
    verifyDNSLength: false
  });

  assert.strictEqual(result, testCase.output);
}

describe("ToASCII with useSTD3ASCIIRules = true", () => {
  const testCases = [];

  // Add test cases for valid characters
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const hyphen = "-";
  const allowedChars = alphabet + digits + hyphen;
  for (const char of allowedChars) {
    testCases.push({
      input: char,
      output: char,
      comment: "STD3 range"
    });
  }

  // Add not supported ascii characters
  for (let i = 0; i < 128; i++) {
    const char = String.fromCharCode(i);
    if (allowedChars.includes(char)) {
      continue;
    }

    // Upper-case letters are converted to lower case, so we we exclude them from a negative test case
    if (allowedChars.includes(char.toLowerCase())) {
      continue;
    }

    // Dot is exclude from negative test cases, since it is allowed in domain names
    if (char === ".") {
      continue;
    }

    testCases.push({
      input: char,
      output: null,
      comment: "Outside of STD3 range"
    });
  }

  // Add a unicode character, since it should be converted to punycode
  testCases.push({
    input: "é",
    output: "xn--9ca",
    comment: "Unicode"
  });

  // Additional test cases, with mixed valid and invalid characters
  testCases.push({
    input: "inv@alid",
    output: null,
    comment: "Invalid label"
  });
  testCases.push({
    input: "valid",
    output: "valid",
    comment: "Valid label"
  });
  testCases.push({
    input: "unicodé",
    output: "xn--unicod-gva",
    comment: "Valid uncode label"
  });
  testCases.push({
    input: "uni!codé",
    output: null,
    comment: "Invalid uncode label"
  });

  for (const testCase of testCases) {
    let description = testCase.input;

    if (testCase.comment) {
      description += ` (${testCase.comment})`;
    }

    test(description, () => {
      testToASCIIWithSTD3ASCIIRules(testCase);
    });
  }
});


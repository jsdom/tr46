"use strict";

var assert = require("assert");
var fs = require("fs");

var tr46 = require("../index.js");

function normalize(inp) {
  var out = "";
  
  for (var i = 0; i < inp.length; ++i) {
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
  if ((test[3] || test[2])[0] === "[") { // error code
    assert.equal(tr46.toASCII(test[1], true, option), null, "toASCII should result in an error");
  } else {
    assert.equal(tr46.toASCII(test[1], true, option), test[3] || test[2] || test[1], "toASCII should equal the expected value");
  }
}

function testConversion(test) {
  return function() {
  
    if (test[0] === "B" || test[0] === "N") {
      testConversionOption(test, tr46.PROCESSING_OPTIONS.NONTRANSITIONAL);
    }
    
    if (test[0] === "B" || test[0] === "T") {
      testConversionOption(test, tr46.PROCESSING_OPTIONS.TRANSITIONAL);
    }
  
    // toUnicode is always tested non transitional
    if (test[2][0] === "[") { // error code
      assert.ok(tr46.toUnicode(test[1], true).error, "ToUnicode should result in an error");
    } else {
      var res = tr46.toUnicode(test[1], true);
      assert.ok(!res.error, "ToUnicode should not result in an error");
      assert.equal(res.domain, test[2] || test[1], "ToUnicode should equal the expected value");
    }
  };
};

var lines = fs.readFileSync(__dirname + "/unicode/IdnaTest.txt", { encoding: "utf8" })
  .split("\n")
  .map(function(l) {
    return l.split("#")[0];
  });

var testCases = [];

lines.forEach(function(l) {
  var splitted = l.split(";").map(function(c) {
    return normalize(c.trim());
  });
  
  if (splitted.length === 1) return;
  testCases.push(splitted);
});

describe("Web Platform Tests", function () {
  var len = testCases.length;
  for (let i = 0; i < len; i++) {
    var test = testCases[i];
    
    it("Converting <" + test[1] + "> with type " + test[0], testConversion(test));
  }
});

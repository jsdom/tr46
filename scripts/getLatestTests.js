"use strict";
/* eslint-disable no-process-env, no-process-exit */

if (process.env.NO_UPDATE) {
  process.exit(0);
}

const fs = require("fs");
const path = require("path");
const request = require("request");
const { unicodeVersion } = require("../package.json");

const target = fs.createWriteStream(path.resolve(__dirname, "../test/fixtures/IdnaTest.txt"));
request.get(`http://www.unicode.org/Public/idna/${unicodeVersion}/IdnaTest.txt`)
  .pipe(target);

const asciiTarget = fs.createWriteStream(path.resolve(__dirname, "../test/fixtures/toascii.json"));
request.get("https://rawgit.com/w3c/web-platform-tests/785ec55ddc2dc2e5dfecac65832d68c82f72e50b/url/toascii.json")
  .pipe(asciiTarget);

"use strict";
/* eslint-disable no-process-env, no-process-exit */

if (process.env.NO_UPDATE) {
  process.exit(0);
}

const fs = require("fs");
const path = require("path");
const request = require("request");
const { unicodeVersion } = require("../package.json");

const target = fs.createWriteStream(path.resolve(__dirname, "../test/unicode/IdnaTest.txt"));
request.get(`http://www.unicode.org/Public/idna/${unicodeVersion}/IdnaTest.txt`)
  .pipe(target);

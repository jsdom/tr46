"use strict";
/* eslint-disable no-process-env, no-process-exit */

if (process.env.NO_UPDATE) {
  process.exit(0);
}

const fs = require("fs");
const path = require("path");
const request = require("request");
const { unicodeVersion } = require("../package.json");

const target = fs.createWriteStream(path.resolve(__dirname, "../test/fixtures/IdnaTestV2.txt"));
request.get(`https://unicode.org/Public/idna/${unicodeVersion}/IdnaTestV2.txt`)
  .pipe(target);

const asciiTarget = fs.createWriteStream(path.resolve(__dirname, "../test/fixtures/toascii.json"));
request.get("https://raw.githubusercontent.com/web-platform-tests/wpt/112ad5ca55d55f6da2ccc7468e6dcc91b4e5d223/url/resources/toascii.json")
  .pipe(asciiTarget);

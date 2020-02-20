"use strict";
/* eslint-disable no-process-env, no-process-exit */

if (process.env.NO_UPDATE) {
  process.exit(0);
}

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
// Replace this with stream.pipeline when we require Node.js 10.x.
const pump = require("pump");
const fetch = require("node-fetch");
const { unicodeVersion } = require("../package.json");

const pumpPromise = promisify(pump);

async function main() {
  await Promise.all([
    (async () => {
      const target = fs.createWriteStream(path.resolve(__dirname, "../test/fixtures/IdnaTestV2.txt"));
      const response = await fetch(`https://unicode.org/Public/idna/${unicodeVersion}/IdnaTestV2.txt`);
      await pumpPromise(response.body, target);
    })(),
    (async () => {
      const asciiTarget = fs.createWriteStream(path.resolve(__dirname, "../test/fixtures/toascii.json"));
      const response = await fetch("https://raw.githubusercontent.com/web-platform-tests/wpt/112ad5ca55d55f6da2ccc7468e6dcc91b4e5d223/url/resources/toascii.json");
      await pumpPromise(response.body, asciiTarget);
    })()
  ]);
}

main();

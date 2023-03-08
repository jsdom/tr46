"use strict";
/* eslint-disable no-process-env, no-process-exit */

if (process.env.NO_UPDATE) {
  process.exit(0);
}

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
// Replace this with stream/promises.pipeline when we require Node.js 15.x.
const { pipeline } = require("stream");
const fetch = require("minipass-fetch");
const { unicodeVersion } = require("../package.json");

const pipelinePromise = promisify(pipeline);

// Update this by going to https://github.com/web-platform-tests/wpt/tree/master/url/resources and pressing "y" on the
// keyboard.
const wptSHA = "417a64d8351792b768efe089934edce3259f63d1";

async function main() {
  await Promise.all([
    (async () => {
      const target = fs.createWriteStream(path.resolve(__dirname, "../test/fixtures/IdnaTestV2.txt"));
      const response = await fetch(`https://unicode.org/Public/idna/${unicodeVersion}/IdnaTestV2.txt`);
      await pipelinePromise(response.body, target);
    })(),
    (async () => {
      const asciiTarget = fs.createWriteStream(path.resolve(__dirname, "../test/fixtures/toascii.json"));
      const response = await fetch(`https://github.com/web-platform-tests/wpt/raw/${wptSHA}/url/resources/toascii.json`);
      await pipelinePromise(response.body, asciiTarget);
    })(),
    (async () => {
      const asciiTarget = fs.createWriteStream(path.resolve(__dirname, "../test/fixtures/IdnaTestV2ToASCII.json"));
      const response = await fetch(`https://github.com/web-platform-tests/wpt/raw/${wptSHA}/url/resources/IdnaTestV2.json`);
      await pipelinePromise(response.body, asciiTarget);
    })()
  ]);
}

main();

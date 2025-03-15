"use strict";

if (process.env.NO_UPDATE) {
  process.exit(0);
}

const fs = require("fs/promises");
const path = require("path");
const { unicodeVersion } = require("../package.json");

// Update this by going to https://github.com/web-platform-tests/wpt/tree/master/url/resources and pressing "y" on the
// keyboard.
const wptSHA = "2db3299cf649d5a532f9b22f5cf1b2064eab7ce4";

main().catch(e => {
  console.error(e);
  process.exit(1);
});

async function main() {
  await Promise.all([
    (async () => {
      const target = path.resolve(__dirname, "../test/fixtures/IdnaTestV2.txt");
      const response = await fetch(`https://unicode.org/Public/idna/${unicodeVersion}/IdnaTestV2.txt`);
      await fs.writeFile(target, response.body);
    })(),
    (async () => {
      const target = path.resolve(__dirname, "../test/fixtures/toascii.json");
      const response = await fetch(`https://github.com/web-platform-tests/wpt/raw/${wptSHA}/url/resources/toascii.json`);
      await fs.writeFile(target, response.body);
    })(),
    (async () => {
      const target = path.resolve(__dirname, "../test/fixtures/IdnaTestV2ToASCII.json");
      const response = await fetch(`https://github.com/web-platform-tests/wpt/raw/${wptSHA}/url/resources/IdnaTestV2.json`);
      await fs.writeFile(target, response.body);
    })()
  ]);
}

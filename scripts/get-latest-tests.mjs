import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

if (process.env.NO_UPDATE) {
  process.exit(0);
}

const { unicodeVersion } = JSON.parse(
  await readFile(path.resolve(import.meta.dirname, "../package.json"), "utf8"),
);

// Update this by going to https://github.com/web-platform-tests/wpt/tree/master/url/resources and pressing "y" on the
// keyboard.
const wptSHA = "13748c36fdf9dd77cd0b34dd6b244256b365ea60";

const targetDir = path.resolve(import.meta.dirname, "../test/fixtures");
await mkdir(targetDir, { recursive: true });
await Promise.all([
  downloadTest(
    `https://unicode.org/Public/${unicodeVersion}/idna/IdnaTestV2.txt`,
    "IdnaTestV2.txt",
  ),
  downloadTest(
    `https://github.com/web-platform-tests/wpt/raw/${wptSHA}/url/resources/toascii.json`,
    "toascii.json",
  ),
  downloadTest(
    `https://github.com/web-platform-tests/wpt/raw/${wptSHA}/url/resources/IdnaTestV2.json`,
    "IdnaTestV2ToASCII.json",
  ),
]);

async function downloadTest(url, filename) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${response.url}: ${response.status}`);
  }
  await writeFile(path.resolve(targetDir, filename), response.body);
}

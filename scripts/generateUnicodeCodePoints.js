"use strict";
const fs = require("fs");

if (process.argv.length < 3) {
  /* eslint-disable no-console */
  console.error("Usage: node generateUnicodeCodePoints.js filename [categories...]");
  console.error("Convert a derived Unicode Character Database file to a JSON map.");
  /* eslint-enable no-console */
  return;
}

const sourceFile = process.argv[2];
const interestedValues = new Set(process.argv.slice(3));

const source = fs.readFileSync(sourceFile, "utf8");
const lines = source.split("\n");

const map = {};

for (const line of lines) {
  if (/^#/u.test(line) || !/;\x20/u.test(line)) {
    continue;
  }
  const data = line.trim().split(";");
  const category = data[1].split("#")[0].trim();
  const [begin, end = begin] = data[0].trim().split("..").map(str => parseInt(str, 16));

  for (const i of range(begin, end)) {
    if (!map[category]) {
      if (interestedValues.size === 0 || interestedValues.has(category)) {
        map[category] = [];
      } else {
        continue;
      }
    }
    map[category].push(i);
  }
}

process.stdout.write(JSON.stringify(map));
process.stdout.write("\n");

function* range(begin, end) {
  for (let i = begin; i <= end; i++) {
    yield i;
  }
}

"use strict";

const fs = require("fs");
const path = require("path");
const { unicodeVersion } = require("../package.json");
const { STATUS_MAPPING } = require("../lib/statusMapping.js");

main().catch(e => {
  console.error(e);
  process.exit(1);
});

async function main() {
  const response = await fetch(`https://unicode.org/Public/idna/${unicodeVersion}/IdnaMappingTable.txt`);
  const body = await response.text();

  const lines = [];

  body.split("\n").forEach(l => {
    l = l.split("#")[0]; // Remove comments
    const cells = l.split(";").map(c => {
      return c.trim();
    });
    if (cells.length === 1) {
      return;
    }

    // Parse ranges to int[2] array
    const range = cells[0].split("..");
    const start = parseInt(range[0], 16);
    const end = parseInt(range[1] || range[0], 16);
    cells[0] = end === start ? start : [start, end - start];

    cells[1] = STATUS_MAPPING[cells[1]];

    if (cells[1] === STATUS_MAPPING.valid) {
      lines.push(cells.slice(0, 2));
      return;
    }

    if (cells[2] !== undefined) {
      // Parse replacement to int[] array
      let replacement = cells[2].split(" ");
      if (replacement[0] === "") { // Empty array
        replacement = [];
      }

      replacement = replacement.map(r => {
        return parseInt(r, 16);
      });

      cells[2] = String.fromCodePoint(...replacement);
    }

    lines.push(cells);
  });

  // We could drop valid chars, but those are only ~1000 ranges and
  // binary search is way to quick to even notice that

  fs.writeFileSync(path.resolve(__dirname, "../lib/mappingTable.json"), JSON.stringify(lines));
}

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
  const response = await fetch(`https://unicode.org/Public/${unicodeVersion}/idna/IdnaMappingTable.txt`);
  if (!response.ok) {
    throw new Error(`Failed to fetch IdnaMappingTable.txt: ${response.status}`);
  }
  const body = await response.text();

  const ranges = [];
  const statuses = [];
  const mappings = [];

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
    cells[0] = [start, end - start];
    ranges.push(cells.shift());

    const status = STATUS_MAPPING[cells.shift()];
    statuses.push(status);

    if (status !== STATUS_MAPPING.mapped && status !== STATUS_MAPPING.deviation) {
      return;
    }

    if (cells[0] !== undefined) {
      // Parse replacement to int[] array
      let replacement = cells[0].split(" ");
      if (replacement[0] === "") { // Empty array
        replacement = [];
      }

      replacement = replacement.map(r => {
        return parseInt(r, 16);
      });

      mappings.push(String.fromCodePoint(...replacement));
    } else {
      throw new Error("Unexpected");
    }
  });

  // We could drop valid chars, but those are only ~1000 ranges and
  // binary search is way to quick to even notice that

  // Delta-code starts
  let last = 0;
  for (const range of ranges) {
    range[0] -= last;
    last += range[0];
  }

  // Condense repeats of N consecutive [1, 0] in ranges to -N, flatten the rest
  const rangesCondensed = [];
  let repeats = 0;
  for (const row of ranges) {
    if (row[0] === 1 && row[1] === 0) {
      repeats++;
      continue;
    }

    if (repeats > 0) {
      rangesCondensed.push(-repeats);
      repeats = 0;
    }

    rangesCondensed.push(...row);
  }

  if (repeats > 0) {
    rangesCondensed.push(-repeats);
    repeats = 0;
  }

  // Condense repeats of N consecutive STATUS_MAPPING.mapped to -N
  const statusesCondensed = [];
  for (const status of statuses) {
    if (status === STATUS_MAPPING.mapped) {
      repeats++;
      continue;
    }

    if (repeats > 0) {
      statusesCondensed.push(repeats === 1 ? STATUS_MAPPING.mapped : -repeats);
      repeats = 0;
    }

    statusesCondensed.push(status);
  }

  if (repeats > 0) {
    statusesCondensed.push(repeats === 1 ? STATUS_MAPPING.mapped : -repeats);
    repeats = 0;
  }

  const tablesRaw = [rangesCondensed, statusesCondensed, mappings];
  fs.writeFileSync(path.resolve(__dirname, "../lib/mappingTable.json"), JSON.stringify(tablesRaw));
}

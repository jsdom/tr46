"use strict";

const fs = require("fs");
const path = require("path");
const request = require("request");

request.get("http://www.unicode.org/Public/idna/10.0.0/IdnaMappingTable.txt", (err, res, body) => {
  if (err) {
    throw err;
  }

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
    cells[0] = [start, end];

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
});

"use strict";

const fs = require("fs");
const path = require("path");
const regenerate = require("regenerate");
const { unicodeVersion } = require("../package.json");

main().catch(e => {
  console.error(e);
  process.exit(1);
});

async function main() {
  const cp = {
    Mark: require(`@unicode/unicode-${unicodeVersion}/General_Category/Mark/code-points.js`),
    JT: await generateUnicodeCodePoints(`https://unicode.org/Public/${unicodeVersion}/ucd/extracted/DerivedJoiningType.txt`, ["L", "R", "D", "T"]),
    CombiningClassVirama: (await generateUnicodeCodePoints(`https://unicode.org/Public/${unicodeVersion}/ucd/extracted/DerivedCombiningClass.txt`, ["9"]))["9"],

    // https://tools.ietf.org/html/rfc5893#section-1.4
    L: require(`@unicode/unicode-${unicodeVersion}/Bidi_Class/Left_To_Right/code-points.js`),
    R: require(`@unicode/unicode-${unicodeVersion}/Bidi_Class/Right_To_Left/code-points.js`),
    AL: require(`@unicode/unicode-${unicodeVersion}/Bidi_Class/Arabic_Letter/code-points.js`),
    EN: require(`@unicode/unicode-${unicodeVersion}/Bidi_Class/European_Number/code-points.js`),
    ES: require(`@unicode/unicode-${unicodeVersion}/Bidi_Class/European_Separator/code-points.js`),
    ET: require(`@unicode/unicode-${unicodeVersion}/Bidi_Class/European_Terminator/code-points.js`),
    AN: require(`@unicode/unicode-${unicodeVersion}/Bidi_Class/Arabic_Number/code-points.js`),
    CS: require(`@unicode/unicode-${unicodeVersion}/Bidi_Class/Common_Separator/code-points.js`),
    NSM: require(`@unicode/unicode-${unicodeVersion}/Bidi_Class/Nonspacing_Mark/code-points.js`),
    BN: require(`@unicode/unicode-${unicodeVersion}/Bidi_Class/Boundary_Neutral/code-points.js`),
    ON: require(`@unicode/unicode-${unicodeVersion}/Bidi_Class/Other_Neutral/code-points.js`)
  };

  function r(strings, ...regs) {
    let output = "";
    for (const [i, reg] of regs.entries()) {
      output += strings[i];
      output += reg.toString({ hasUnicodeFlag: true });
    }
    output += strings[strings.length - 1];
    return output;
  }

  const regexes = {
    // Validity criteria
    // https://unicode.org/reports/tr46/#Validity_Criteria

    // Step 5
    combiningMarks: r`${regenerate(cp.Mark)}`,

    // CONTEXTJ
    // https://tools.ietf.org/html/rfc5892#appendix-A

    // A.1. ZWNJ, Rule 2 / A.2. ZWJ, Rule 2
    combiningClassVirama: r`${regenerate(cp.CombiningClassVirama)}`,

    // A.1. ZWNJ, Rule 3
    // eslint-disable-next-line prefer-template
    validZWNJ: r`${regenerate([...cp.JT.L, ...cp.JT.D])}${regenerate(cp.JT.T)}*` +
              "\\u200C" +
              r`${regenerate(cp.JT.T)}*${regenerate([...cp.JT.R, ...cp.JT.D])}`,

    // BIDI Rule
    // https://tools.ietf.org/html/rfc5893#section-2

    bidiDomain: r`${regenerate([...cp.R, ...cp.AL, ...cp.AN])}`,

    // Step 1
    bidiS1LTR: r`${regenerate(cp.L)}`,
    bidiS1RTL: r`${regenerate([...cp.R, ...cp.AL])}`,

    // Step 2
    bidiS2: r`^${
      regenerate([
        ...cp.R,
        ...cp.AL,
        ...cp.AN,
        ...cp.EN,
        ...cp.ES,
        ...cp.CS,
        ...cp.ET,
        ...cp.ON,
        ...cp.BN,
        ...cp.NSM
      ])
    }*$`,

    // Step 3
    bidiS3: r`${
      regenerate([
        ...cp.R,
        ...cp.AL,
        ...cp.EN,
        ...cp.AN
      ])
    }${regenerate(cp.NSM)}*$`,

    // Step 4
    bidiS4EN: r`${regenerate(cp.EN)}`,
    bidiS4AN: r`${regenerate(cp.AN)}`,

    // Step 5
    bidiS5: r`^${
      regenerate([
        ...cp.L,
        ...cp.EN,
        ...cp.ES,
        ...cp.CS,
        ...cp.ET,
        ...cp.ON,
        ...cp.BN,
        ...cp.NSM
      ])
    }*$`,

    // Step 6
    bidiS6: r`${regenerate([...cp.L, ...cp.EN])}${regenerate(cp.NSM)}*$`
  };

  let out = `"use strict";\n\n`;

  for (const name of Object.keys(regexes)) {
    out += `const ${name} = /${regexes[name]}/u;\n`;
  }
  out += `\nmodule.exports = {
    ${Object.keys(regexes).join(",\n  ")}
  };\n`;

  fs.writeFileSync(path.resolve(__dirname, "../lib/regexes.js"), out);
}

async function generateUnicodeCodePoints(url, interestedValues) {
  interestedValues = new Set(interestedValues);

  const source = await (await fetch(url)).text();
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

  return map;
}

function* range(begin, end) {
  for (let i = begin; i <= end; i++) {
    yield i;
  }
}

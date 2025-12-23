"use strict";

const punycode = require("punycode/");
const regexes = require("./lib/regexes.js");
const tablesRaw = require("./lib/mappingTable.json");
const { STATUS_MAPPING } = require("./lib/statusMapping.js");

function containsNonASCII(str) {
  return /[^\x00-\x7F]/u.test(str);
}

let rangesTable,
  mappingTable;

function unpackMappingTable() {
  if (mappingTable) {
    return;
  }

  // Destroying the originals, for mem

  rangesTable = [];
  let current = 0;
  const [rangesRaw, statusesRaw, mappingRaw] = tablesRaw;
  while (rangesRaw.length > 0) {
    if (rangesRaw[0] < 0) {
      const repeats = -rangesRaw.shift(); // Treat as this many repeats of [1, 0]
      for (let i = 0; i < repeats; i++) {
        rangesTable.push([++current, 0]);
      }
    } else {
      const row = rangesRaw.splice(0, 2);
      row[0] = current += row[0];
      rangesTable.push(row);
    }
  }

  mappingTable = [];
  for (const status of statusesRaw) {
    if (status < 0) {
      // Threat this as many repeats of STATUS_MAPPING.mapped
      for (let i = 0; i < -status; i++) {
        mappingTable.push([STATUS_MAPPING.mapped, mappingRaw.shift()]);
      }
    } else if (status === STATUS_MAPPING.mapped || status === STATUS_MAPPING.deviation) {
      mappingTable.push([status, mappingRaw.shift()]);
    } else {
      mappingTable.push([status]);
    }
  }

  statusesRaw.length = 0; // Destroy for mem
}

function findStatus(val) {
  unpackMappingTable();

  let start = 0;
  let end = rangesTable.length - 1;

  while (start <= end) {
    const mid = Math.floor((start + end) / 2);

    const target = rangesTable[mid];
    const min = target[0];
    const max = min + target[1];

    if (min <= val && max >= val) {
      return mappingTable[mid];
    } else if (min > val) {
      end = mid - 1;
    } else {
      start = mid + 1;
    }
  }

  return null;
}

function mapChars(domainName, { transitionalProcessing }) {
  let processed = "";

  for (const ch of domainName) {
    const row = findStatus(ch.codePointAt(0)); // [status, mapping]

    switch (row[0]) {
      case STATUS_MAPPING.disallowed:
        processed += ch;
        break;
      case STATUS_MAPPING.ignored:
        break;
      case STATUS_MAPPING.mapped:
        if (transitionalProcessing && ch === "ẞ") {
          processed += "ss";
        } else {
          processed += row[1];
        }
        break;
      case STATUS_MAPPING.deviation:
        if (transitionalProcessing) {
          processed += row[1];
        } else {
          processed += ch;
        }
        break;
      case STATUS_MAPPING.valid:
        processed += ch;
        break;
    }
  }

  return processed;
}

function validateLabel(label, {
  checkHyphens,
  checkBidi,
  checkJoiners,
  transitionalProcessing,
  useSTD3ASCIIRules,
  isBidi
}) {
  // "must be satisfied for a non-empty label"
  if (label.length === 0) {
    return true;
  }

  // "1. The label must be in Unicode Normalization Form NFC."
  if (label.normalize("NFC") !== label) {
    return false;
  }

  const codePoints = Array.from(label);

  // "2. If CheckHyphens, the label must not contain a U+002D HYPHEN-MINUS character in both the
  // third and fourth positions."
  //
  // "3. If CheckHyphens, the label must neither begin nor end with a U+002D HYPHEN-MINUS character."
  if (checkHyphens) {
    if ((codePoints[2] === "-" && codePoints[3] === "-") ||
        (label.startsWith("-") || label.endsWith("-"))) {
      return false;
    }
  }

  // "4. If not CheckHyphens, the label must not begin with “xn--”."
  if (!checkHyphens) {
    if (label.startsWith("xn--")) {
      return false;
    }
  }

  // "5. The label must not contain a U+002E ( . ) FULL STOP."
  if (label.includes(".")) {
    return false;
  }

  // "6. The label must not begin with a combining mark, that is: General_Category=Mark."
  if (regexes.combiningMarks.test(codePoints[0])) {
    return false;
  }

  // "7. Each code point in the label must only have certain Status values according to Section 5"
  for (const ch of codePoints) {
    const codePoint = ch.codePointAt(0);
    const [status] = findStatus(codePoint);
    if (transitionalProcessing) {
      // "For Transitional Processing (deprecated), each value must be valid."
      if (status !== STATUS_MAPPING.valid) {
        return false;
      }
    } else if (status !== STATUS_MAPPING.valid && status !== STATUS_MAPPING.deviation) {
      // "For Nontransitional Processing, each value must be either valid or deviation."
      return false;
    }
    // "In addition, if UseSTD3ASCIIRules=true and the code point is an ASCII code point (U+0000..U+007F), then it must
    // be a lowercase letter (a-z), a digit (0-9), or a hyphen-minus (U+002D). (Note: This excludes uppercase ASCII
    // A-Z which are mapped in UTS #46 and disallowed in IDNA2008.)"
    if (useSTD3ASCIIRules && codePoint <= 0x7F) {
      if (!/^(?:[a-z]|[0-9]|-)$/u.test(ch)) {
        return false;
      }
    }
  }

  // "8. If CheckJoiners, the label must satisify the ContextJ rules"
  // https://tools.ietf.org/html/rfc5892#appendix-A
  if (checkJoiners) {
    let last = 0;
    for (const [i, ch] of codePoints.entries()) {
      if (ch === "\u200C" || ch === "\u200D") {
        if (i > 0) {
          if (regexes.combiningClassVirama.test(codePoints[i - 1])) {
            continue;
          }
          if (ch === "\u200C") {
            // TODO: make this more efficient
            const next = codePoints.indexOf("\u200C", i + 1);
            const test = next < 0 ? codePoints.slice(last) : codePoints.slice(last, next);
            if (regexes.validZWNJ.test(test.join(""))) {
              last = i + 1;
              continue;
            }
          }
        }
        return false;
      }
    }
  }

  // "9. If CheckBidi, and if the domain name is a Bidi domain name, then the label must satisfy..."
  // https://tools.ietf.org/html/rfc5893#section-2
  if (checkBidi && isBidi) {
    let rtl;

    // 1
    if (regexes.bidiS1LTR.test(codePoints[0])) {
      rtl = false;
    } else if (regexes.bidiS1RTL.test(codePoints[0])) {
      rtl = true;
    } else {
      return false;
    }

    if (rtl) {
      // 2-4
      if (!regexes.bidiS2.test(label) ||
          !regexes.bidiS3.test(label) ||
          (regexes.bidiS4EN.test(label) && regexes.bidiS4AN.test(label))) {
        return false;
      }
    } else if (!regexes.bidiS5.test(label) ||
               !regexes.bidiS6.test(label)) { // 5-6
      return false;
    }
  }

  return true;
}

function isBidiDomain(labels) {
  const domain = labels.map(label => {
    if (label.startsWith("xn--")) {
      try {
        return punycode.decode(label.substring(4));
      } catch {
        return "";
      }
    }
    return label;
  }).join(".");
  return regexes.bidiDomain.test(domain);
}

function processing(domainName, options) {
  // 1. Map.
  let string = mapChars(domainName, options);

  // 2. Normalize.
  string = string.normalize("NFC");

  // 3. Break.
  const labels = string.split(".");
  const isBidi = isBidiDomain(labels);

  // 4. Convert/Validate.
  let error = false;
  for (const [i, origLabel] of labels.entries()) {
    let label = origLabel;
    let transitionalProcessingForThisLabel = options.transitionalProcessing;
    if (label.startsWith("xn--")) {
      if (containsNonASCII(label)) {
        error = true;
        continue;
      }

      try {
        label = punycode.decode(label.substring(4));
      } catch {
        if (!options.ignoreInvalidPunycode) {
          error = true;
          continue;
        }
      }
      labels[i] = label;

      if (label === "" || !containsNonASCII(label)) {
        error = true;
      }

      transitionalProcessingForThisLabel = false;
    }

    // No need to validate if we already know there is an error.
    if (error) {
      continue;
    }
    const validation = validateLabel(label, {
      ...options,
      transitionalProcessing: transitionalProcessingForThisLabel,
      isBidi
    });
    if (!validation) {
      error = true;
    }
  }

  return {
    string: labels.join("."),
    error
  };
}

function toASCII(domainName, {
  checkHyphens = false,
  checkBidi = false,
  checkJoiners = false,
  useSTD3ASCIIRules = false,
  verifyDNSLength = false,
  transitionalProcessing = false,
  ignoreInvalidPunycode = false
} = {}) {
  const result = processing(domainName, {
    checkHyphens,
    checkBidi,
    checkJoiners,
    useSTD3ASCIIRules,
    transitionalProcessing,
    ignoreInvalidPunycode
  });
  let labels = result.string.split(".");
  labels = labels.map(l => {
    if (containsNonASCII(l)) {
      try {
        return `xn--${punycode.encode(l)}`;
      } catch {
        result.error = true;
      }
    }
    return l;
  });

  if (verifyDNSLength) {
    const total = labels.join(".").length;
    if (total > 253 || total === 0) {
      result.error = true;
    }

    for (let i = 0; i < labels.length; ++i) {
      if (labels[i].length > 63 || labels[i].length === 0) {
        result.error = true;
        break;
      }
    }
  }

  if (result.error) {
    return null;
  }
  return labels.join(".");
}

function toUnicode(domainName, {
  checkHyphens = false,
  checkBidi = false,
  checkJoiners = false,
  useSTD3ASCIIRules = false,
  transitionalProcessing = false,
  ignoreInvalidPunycode = false
} = {}) {
  const result = processing(domainName, {
    checkHyphens,
    checkBidi,
    checkJoiners,
    useSTD3ASCIIRules,
    transitionalProcessing,
    ignoreInvalidPunycode
  });

  return {
    domain: result.string,
    error: result.error
  };
}

module.exports = {
  toASCII,
  toUnicode
};

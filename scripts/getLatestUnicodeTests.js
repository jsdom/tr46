"use strict";

if (process.env.NO_UPDATE) {
  process.exit(0);
}

var fs = require("fs");
var request = require("request");

var target = fs.createWriteStream(__dirname + "/../test/unicode/IdnaTest.txt");
request.get("http://www.unicode.org/Public/idna/latest/IdnaTest.txt")
  .pipe(target);

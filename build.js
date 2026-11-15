#!/usr/bin/env node
// Run manually: node build.js
// Fills the <!--X_START/END--> markers in index.html and the #embeddedGames
// JSON from games_embedded.json. Writes index.html directly; no deploy-time
// build step.
"use strict";

const fs = require("fs");
const path = require("path");
const R = require("./render.js");

const ROOT = __dirname;
const games = JSON.parse(fs.readFileSync(path.join(ROOT, "games_embedded.json"), "utf8"));
let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

function replaceBetween(html, marker, inner) {
  const re = new RegExp(
    "(<!--" + marker + "_START-->)[\\s\\S]*?(<!--" + marker + "_END-->)"
  );
  if (!re.test(html)) throw new Error("Marker not found: " + marker);
  return html.replace(re, "$1" + inner + "$2");
}

html = replaceBetween(html, "STATS", R.statsHtml(games, null));
html = replaceBetween(html, "TABS", R.tabsHtml(games, "all"));
html = replaceBetween(html, "GRID", R.gridHtml(games, "all", ""));

const jsonRe = /(<script type="application\/json" id="embeddedGames">)[\s\S]*?(<\/script>)/;
if (!jsonRe.test(html)) throw new Error("embeddedGames script tag not found");
const json = JSON.stringify(games).replace(/<\/script/gi, "<\\/script");
html = html.replace(jsonRe, "$1" + json + "$2");

fs.writeFileSync(path.join(ROOT, "index.html"), html);
console.log("index.html rebuilt — " + games.length + " games pre-rendered.");

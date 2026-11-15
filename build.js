#!/usr/bin/env node
// Pre-render step — run manually (`node build.js`) after games_embedded.json
// changes. Not a build step Vercel runs: it writes index.html directly, which
// then deploys as a plain static file like everything else here.
//
// It fills the <!--X_START/END--> markers in index.html with real HTML
// (so the grid/tabs/stats are visible to a crawler, or anyone, before any JS
// runs) and replaces the #embeddedGames JSON so the browser needs no fetch
// for the initial render.
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
// </script> can never legally appear inside the JSON string we embed, but
// escape the slash defensively anyway — browsers scan for it while parsing.
const json = JSON.stringify(games).replace(/<\/script/gi, "<\\/script");
html = html.replace(jsonRe, "$1" + json + "$2");

fs.writeFileSync(path.join(ROOT, "index.html"), html);
console.log("index.html rebuilt — " + games.length + " games pre-rendered.");

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

const newest = games
  .slice()
  .sort((a, b) => (b.addedAt || "") < (a.addedAt || "") ? -1 : (b.addedAt || "") > (a.addedAt || "") ? 1 : 0)
  .slice(0, 10);
html = replaceBetween(html, "NEWEST", newest.map((g) => R.cardHtml(g, { badge: true })).join(""));

// Số lượng game trong description/OG/Twitter đổi theo dữ liệu thật, tránh
// lệch dần với số liệu hiển thị trên trang mỗi khi sheet có game mới/bị xoá.
html = html.replace(/\d+(?= game offline PC, Mobile, Java, Web Flash)/g, games.length);

const jsonRe = /(<script type="application\/json" id="embeddedGames">)[\s\S]*?(<\/script>)/;
if (!jsonRe.test(html)) throw new Error("embeddedGames script tag not found");
const json = JSON.stringify(games).replace(/<\/script/gi, "<\\/script");
html = html.replace(jsonRe, "$1" + json + "$2");

fs.writeFileSync(path.join(ROOT, "index.html"), html);
console.log("index.html rebuilt — " + games.length + " games pre-rendered.");

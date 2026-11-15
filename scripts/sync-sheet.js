#!/usr/bin/env node
// Run manually: node scripts/sync-sheet.js
// Fetches every sheet tab and overwrites games_embedded.json. If any tab
// fails, exits without writing so a transient Google Sheets outage can't
// wipe out the last known-good snapshot.
"use strict";

const fs = require("fs");
const path = require("path");
const R = require("../render.js");

const ROOT = path.join(__dirname, "..");

async function fetchTab(tab) {
  const res = await fetch(R.sheetCsvUrl(tab.key));
  if (!res.ok) throw new Error("HTTP " + res.status);
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed || trimmed.charAt(0) === "<") {
    throw new Error("không trả về CSV (có thể sheet đã đổi quyền riêng tư)");
  }
  return R.parseGamesCsv(text, tab);
}

async function main() {
  const results = await Promise.allSettled(R.SHEET_TABS.map(fetchTab));
  const failed = [];
  let games = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") games = games.concat(r.value);
    else failed.push(R.SHEET_TABS[i].key + ": " + r.reason.message);
  });

  if (failed.length) {
    console.error("Sync aborted, giữ snapshot cũ:\n  " + failed.join("\n  "));
    process.exit(1);
  }
  if (!games.length) {
    console.error("Sync aborted: sheet trả về 0 game.");
    process.exit(1);
  }

  fs.writeFileSync(path.join(ROOT, "games_embedded.json"), JSON.stringify(games));
  console.log("games_embedded.json updated — " + games.length + " game.");
}

main();

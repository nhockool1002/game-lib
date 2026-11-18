#!/usr/bin/env node
// Run manually: node scripts/indexnow.js
// Pushes every URL in sitemap.xml to the IndexNow API (used by Bing, Yandex,
// Naver, Seznam...) so changed/new pages get picked up without waiting for
// the next scheduled crawl. Called automatically by the sync workflow after
// a successful data sync.
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname + "/..";
const HOST = "www.khomienphi.io.vn";
const KEY = "d1d50a7dc0ed2ecb9db51468bcc0099d";
const KEY_LOCATION = "https://" + HOST + "/" + KEY + ".txt";

function urlsFromSitemap() {
  const xml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
  return matches.map((m) => m.replace(/<\/?loc>/g, ""));
}

async function main() {
  const urlList = urlsFromSitemap();
  if (!urlList.length) {
    console.error("sitemap.xml trống, không có gì để gửi tới IndexNow.");
    process.exit(1);
  }

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urlList }),
  });

  if (res.status === 200 || res.status === 202) {
    console.log("IndexNow: đã gửi " + urlList.length + " URL (HTTP " + res.status + ").");
  } else {
    const body = await res.text().catch(() => "");
    console.error("IndexNow: gửi thất bại — HTTP " + res.status + " " + body);
    process.exit(1);
  }
}

main();

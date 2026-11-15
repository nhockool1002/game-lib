#!/usr/bin/env node
// Run manually: node build-pages.js
// Generates one static page per game under g/<slug>.html, each with its own
// title/description/canonical and a VideoGame JSON-LD block, so a search for
// one specific game's name has a page to match instead of competing with 271
// others on the homepage. Also rewrites sitemap.xml to list every page.
"use strict";

const fs = require("fs");
const path = require("path");
const R = require("./render.js");

const ROOT = __dirname;
const SITE = "https://khomienphi.io.vn";
const OUT_DIR = path.join(ROOT, "g");

const games = JSON.parse(fs.readFileSync(path.join(ROOT, "games_embedded.json"), "utf8"));
fs.mkdirSync(OUT_DIR, { recursive: true });

const validFiles = new Set(games.map((g) => g.slug + ".html"));
for (const f of fs.readdirSync(OUT_DIR)) {
  if (!validFiles.has(f)) fs.unlinkSync(path.join(OUT_DIR, f));
}

function relatedGames(game, all) {
  const sameType = all.filter((g) => g.type === game.type && g.slug !== game.slug);
  const startIndex = all.indexOf(game) % Math.max(sameType.length, 1);
  const picked = [];
  for (let i = 0; i < sameType.length && picked.length < 6; i++) {
    picked.push(sameType[(startIndex + i) % sameType.length]);
  }
  return picked;
}

function hasThumb(slug) {
  return fs.existsSync(path.join(ROOT, "thumbs", slug + ".jpg"));
}

function pageHtml(game, related) {
  const e = R.escapeHtml;
  const tab = R.TAB_BY_KEY[game.type] || { label: game.type };
  const statusCls = R.statusClass(game.status);
  const statusTxt = R.statusText(game.status);
  const thumbSrc = hasThumb(game.slug) ? "../thumbs/" + encodeURIComponent(game.slug) + ".jpg" : "../og-image.png";
  const title = "Tải " + game.title + " Offline – Mật Khẩu, Link Tải | Thư Viện Game";
  const desc = "Tải " + game.title + " (" + tab.label + ") bản offline, mật khẩu giải nén “" +
    game.pass + "”, trạng thái link: " + statusTxt + ". Xem thêm game offline khác tại Thư Viện Game.";
  const url = SITE + "/g/" + game.slug;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    url: url,
    image: SITE + "/" + thumbSrc.replace("../", ""),
    applicationCategory: tab.label,
    inLanguage: "vi",
  };

  const relatedHtml = related.length
    ? '<section class="related"><h2>Game cùng danh mục</h2><ul>' +
      related.map((g) => '<li><a href="../g/' + encodeURIComponent(g.slug) + '">' + e(g.title) + "</a></li>").join("") +
      "</ul></section>"
    : "";

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="monetag" content="a82dc692295bcf83018432dad9c3a952">
  <title>${e(title)}</title>
  <meta name="description" content="${e(desc)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/${thumbSrc.replace("../", "")}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${e(title)}">
  <meta name="twitter:image" content="${SITE}/${thumbSrc.replace("../", "")}">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Be+Vietnam+Pro:wght@700;800&display=swap">
  <link rel="stylesheet" href="../style.css">
  <style>
    .gpage{max-width:640px; margin:0 auto; padding:24px 20px 48px}
    .gpage .back{font-size:13px; color:var(--txt-dim); text-decoration:none}
    .gpage .thumb{aspect-ratio:16/9; border-radius:var(--radius-card); overflow:hidden; margin-block:16px; background:var(--input)}
    .gpage .thumb img{width:100%; height:100%; object-fit:cover; display:block}
    .gpage h1{font-size:22px; margin:0 0 8px}
    .gpage .pass-row{display:flex; align-items:center; gap:8px; font-family:ui-monospace,monospace; font-size:14px; color:var(--txt-sec); background:var(--card); border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px 12px; margin-block:14px}
    .gpage .pass-row button{margin-left:auto; background:none; border:0; color:var(--txt-dim); cursor:pointer; display:flex}
    .gpage .dl{display:inline-flex; align-items:center; gap:8px; background:var(--accent); color:var(--accent-ink); text-decoration:none; font-weight:700; padding:12px 18px; border-radius:var(--radius-chip)}
    .related{margin-top:32px; border-top:1px solid var(--border-soft); padding-top:16px}
    .related h2{font-size:13px; text-transform:uppercase; letter-spacing:.04em; color:var(--txt-dim); margin:0 0 10px}
    .related ul{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px}
    .related a{color:var(--txt-sec); font-size:13.5px; text-decoration:none}
    .related a:hover{color:var(--accent)}
  </style>
</head>
<body>
  <div class="gpage">
    <a class="back" href="../">← Thư Viện Game</a>
    <div class="thumb"><img src="${thumbSrc}" alt="${e(game.title)}" loading="lazy"></div>
    <div class="eyebrow">
      <span class="eyebrow-cat">${e(tab.label)}</span>
      <span class="eyebrow-status ${statusCls}"><i></i>${e(statusTxt)}</span>
    </div>
    <h1>${e(game.title)}</h1>
    <div class="pass-row">
      <span>Mật khẩu: <strong>${e(game.pass)}</strong></span>
      <button type="button" class="copy-pass" data-pass="${e(game.pass)}" title="Sao chép mật khẩu">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
      </button>
    </div>
    ${game.link ? '<a class="dl" href="' + e(game.link) + '" target="_blank" rel="noopener">Tải xuống</a>' : "<p>Chưa có link tải.</p>"}
    ${game.yt ? '<p><a href="https://www.youtube.com/watch?v=' + game.yt + '" target="_blank" rel="noopener">Xem trailer trên YouTube →</a></p>' : ""}
    <div class="disclaimer">Trang này không trực tiếp lưu trữ bất kỳ dữ liệu, file hay nội dung game nào — chỉ hiển thị thông tin tổng hợp, link tải trên dẫn đến máy chủ của bên thứ ba.</div>
    ${relatedHtml}
  </div>
  <script>
    document.querySelectorAll(".copy-pass").forEach(function(btn){
      btn.addEventListener("click", function(){
        var pass = btn.getAttribute("data-pass");
        (navigator.clipboard ? navigator.clipboard.writeText(pass) : Promise.reject()).then(function(){
          var old = btn.innerHTML;
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13l4 4L19 7"/></svg>';
          setTimeout(function(){ btn.innerHTML = old; }, 1200);
        }, function(){});
      });
    });
  </script>
</body>
</html>
`;
}

for (const game of games) {
  const related = relatedGames(game, games);
  fs.writeFileSync(path.join(OUT_DIR, game.slug + ".html"), pageHtml(game, related));
}

const urls = [SITE + "/"].concat(games.map((g) => SITE + "/g/" + g.slug));
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => "  <url><loc>" + u + "</loc></url>").join("\n") +
  "\n</urlset>\n";
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);

console.log(games.length + " game pages written to g/, sitemap.xml updated (" + urls.length + " URLs).");

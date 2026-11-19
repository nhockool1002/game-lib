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
const SITE = "https://www.khomienphi.io.vn";
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

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Thư Viện Game", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: game.title, item: url },
    ],
  };

  const relatedHtml = related.length
    ? '<section class="related"><h2>Game cùng danh mục</h2><div class="related-grid">' +
      related.map((g) => R.cardHtml(g, { basePath: "../" })).join("") +
      "</div></section>"
    : "";

  const breadcrumbHtml =
    '<nav class="gpage-breadcrumb" aria-label="Breadcrumb">' +
    '<a href="../">Thư Viện Game</a><span>/</span>' +
    '<span>' + e(tab.label) + "</span><span>/</span>" +
    '<span aria-current="page">' + e(game.title) + "</span>" +
    "</nav>";

  const reviewHtml = game.review
    ? '<div class="gpage-review"><h2>Giới thiệu</h2><p>' + e(game.review) + "</p></div>"
    : "";

  return `<!doctype html>
<html lang="vi">
<head>
  <script src="https://quge5.com/88/tag.min.js" data-zone="310676" async data-cfasync="false"></script>
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
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Be+Vietnam+Pro:wght@700;800&display=swap">
  <link rel="stylesheet" href="../style.css">
  <style>
    .gpage{max-width:640px; margin:0 auto; padding:24px 20px 48px}
    .gpage .back{font-size:13px; color:var(--txt-dim); text-decoration:none}
    .gpage-breadcrumb{font-size:11.5px; color:var(--txt-dim); display:flex; gap:6px; align-items:center; margin:10px 0 2px; flex-wrap:wrap}
    .gpage-breadcrumb a{color:var(--txt-dim); text-decoration:none}
    .gpage-breadcrumb a:hover{color:var(--accent)}
    .gpage-breadcrumb span[aria-current]{color:var(--txt-sec)}
    .gpage .thumb{aspect-ratio:16/9; border-radius:var(--radius-card); overflow:hidden; margin-block:16px; background:var(--input)}
    .gpage .thumb img{width:100%; height:100%; object-fit:cover; display:block}
    .gpage h1{font-size:22px; margin:0 0 8px}
    .gpage .pass-row{display:flex; align-items:center; gap:8px; font-family:ui-monospace,monospace; font-size:14px; color:var(--txt-sec); background:var(--card); border:1px solid var(--border); border-radius:var(--radius-sm); padding:10px 12px; margin-block:14px}
    .gpage .pass-row button{margin-left:auto; background:none; border:0; color:var(--txt-dim); cursor:pointer; display:flex}
    .gpage-actions{display:flex; gap:8px; align-items:center}
    .gpage .dl{flex:1; display:inline-flex; align-items:center; justify-content:center; gap:8px; background:var(--accent); color:var(--accent-ink); text-decoration:none; font-weight:700; padding:12px 18px; border-radius:var(--radius-chip)}
    .gpage .dl.disabled{background:var(--input); color:var(--txt-dim); pointer-events:none}
    .gpage-actions .fav-btn{width:46px; height:46px}
    .gpage-review{margin-block:16px; padding:14px 16px; background:var(--card); border:1px solid var(--border-soft); border-radius:var(--radius-sm)}
    .gpage-review h2{font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--txt-dim); margin:0 0 6px}
    .gpage-review p{font-size:13.5px; color:var(--txt-sec); line-height:1.6; margin:0; white-space:pre-line}
    .yt-embed{position:relative; aspect-ratio:16/9; border-radius:var(--radius-card); overflow:hidden; background:var(--input); margin-block:14px; cursor:pointer}
    .yt-embed img{width:100%; height:100%; object-fit:cover; display:block}
    .yt-embed iframe{width:100%; height:100%; border:0; display:block}
    .yt-play{position:absolute; inset:0; margin:auto; width:56px; height:56px; border-radius:50%; border:0; background:rgba(10,9,7,.55); color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; backdrop-filter:blur(2px)}
    .yt-play svg{width:22px; height:22px; margin-left:3px}
    .yt-embed:hover .yt-play{background:var(--accent); color:var(--accent-ink)}
    .related{margin-top:32px; border-top:1px solid var(--border-soft); padding-top:16px}
    .related h2{font-size:13px; text-transform:uppercase; letter-spacing:.04em; color:var(--txt-dim); margin:0 0 12px}
    .related-grid{display:grid; grid-template-columns:repeat(2, 1fr); gap:12px}
  </style>
</head>
<body>
  <div class="gpage">
    <a class="back" href="../">← Thư Viện Game</a>
    ${breadcrumbHtml}
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
    <div class="gpage-actions">
      ${game.link ? '<a class="dl" href="' + e(game.link) + '" target="_blank" rel="noopener">Tải xuống</a>' : '<span class="dl disabled">Chưa có link tải</span>'}
      <button type="button" class="fav-btn" data-slug="${e(game.slug)}" title="Lưu vào yêu thích" aria-label="Lưu vào yêu thích">
        <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.5-4.6-10-9.3C.6 8.4 2.2 5 5.6 5c2 0 3.3 1 4.4 2.6C11.1 6 12.4 5 14.4 5c3.4 0 5 3.4 3.6 6.7C19.5 16.4 12 21 12 21z"/></svg>
      </button>
    </div>
    ${game.yt ? '<div class="yt-embed" data-yt="' + game.yt + '"><img src="https://i.ytimg.com/vi/' + game.yt + '/hqdefault.jpg" alt="Trailer ' + e(game.title) + '" loading="lazy"><button type="button" class="yt-play" aria-label="Phát trailer"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></button></div>' : ""}
    ${reviewHtml}
    <div class="disclaimer"><span><strong>Lưu ý:</strong> Trang này không trực tiếp lưu trữ bất kỳ dữ liệu, file hay nội dung game nào — chỉ hiển thị thông tin tổng hợp, link tải trên dẫn đến máy chủ của bên thứ ba.</span></div>
    ${relatedHtml}
  </div>

  <button type="button" class="bmc-fab" id="bmcFab" title="Ủng hộ một ly cà phê">
    <span class="emoji">☕</span><span>Donate</span>
  </button>
  <div class="bmc-modal" id="bmcModal" hidden>
    <div class="bmc-modal-backdrop" data-close></div>
    <div class="bmc-modal-card">
      <button type="button" class="bmc-modal-close" data-close aria-label="Đóng">&times;</button>
      <img class="bmc-qr" src="../bmc-qr.png" alt="Mã QR Buy Me a Coffee">
      <h3>Ủng hộ một ly cà phê</h3>
      <p>Nếu trang hữu ích, bạn có thể mời một ly cà phê để duy trì server và cập nhật dữ liệu.</p>
      <a class="bmc-btn" href="https://www.buymeacoffee.com/nhutnm" target="_blank" rel="noopener">☕ Buy Me a Coffee</a>
    </div>
  </div>

  <script>
    (function () {
      var KEY = "gameLibrary.favorites.v1";
      function getFavs() {
        try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; }
      }
      function setFavs(list) {
        try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
      }
      document.querySelectorAll(".fav-btn").forEach(function (btn) {
        var slug = btn.getAttribute("data-slug");
        if (getFavs().indexOf(slug) !== -1) btn.classList.add("active");
        btn.addEventListener("click", function () {
          var list = getFavs();
          var i = list.indexOf(slug);
          if (i === -1) { list.push(slug); btn.classList.add("active"); }
          else { list.splice(i, 1); btn.classList.remove("active"); }
          setFavs(list);
        });
      });
    })();
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
    document.querySelectorAll(".yt-embed").forEach(function(box){
      box.addEventListener("click", function(){
        var id = box.getAttribute("data-yt");
        var iframe = document.createElement("iframe");
        iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        box.innerHTML = "";
        box.appendChild(iframe);
      }, { once: true });
    });
  </script>
  <script src="../bmc.js"></script>
</body>
</html>
`;
}

for (const game of games) {
  const related = relatedGames(game, games);
  fs.writeFileSync(path.join(OUT_DIR, game.slug + ".html"), pageHtml(game, related));
}

const urls = [SITE + "/"].concat(games.map((g) => SITE + "/g/" + g.slug));
const lastmod = new Date().toISOString().slice(0, 10);
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => "  <url><loc>" + u + "</loc><lastmod>" + lastmod + "</lastmod></url>").join("\n") +
  "\n</urlset>\n";
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);

console.log(games.length + " game pages written to g/, sitemap.xml updated (" + urls.length + " URLs).");

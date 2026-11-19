// Shared by app.js (browser) and build.js (Node). No DOM access here.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GameRender = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SHEET_ID = "1EUtWgw48fTqmgkcHmZjqpW32h06C6JiB";
  var SHEET_TABS = [
    { key: "Game PC", label: "Game PC" },
    { key: "Game Mobile", label: "Game Mobile" },
    { key: "Game Mobile Java", label: "Mobile Java" },
    { key: "Game Web Flash", label: "Web Flash" },
    { key: "Game Web H5", label: "Web H5" },
  ];
  var TAB_BY_KEY = {};
  SHEET_TABS.forEach(function (t) { TAB_BY_KEY[t.key] = t; });

  var CAT_ICONS = {
    "Game PC": '<path d="M3 4.5h18v12H3z"/><path d="M8.5 20.5h7M12 16.5v4"/>',
    "Game Mobile": '<path d="M8 2.5h8v19H8z"/><path d="M11 18.5h2"/>',
    "Game Mobile Java": '<path d="M5.5 9h11.5v3.5a5 5 0 01-5 5h-1.5a5 5 0 01-5-5V9z"/><path d="M17 10h1.6a2 2 0 010 4H17"/><path d="M8 5c0 1-1.2 1-1.2 2.2M12 5c0 1-1.2 1-1.2 2.2"/>',
    "Game Web Flash": '<path d="M13 2 4.5 14h5.5l-1 8L18 10h-5.5z"/>',
    "Game Web H5": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/>',
  };
  var CAT_ICON_FALLBACK = '<circle cx="12" cy="12" r="9"/>';
  function catIconSvg(key, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      (CAT_ICONS[key] || CAT_ICON_FALLBACK) + "</svg>";
  }

  var DEFAULT_PASSWORD = "pgaming";
  var TITLE_OPTS = ["ten game", "title", "ten", "name"];
  var LINK_OPTS = ["link"];
  var REVIEW_OPTS = ["review"];
  var PASS_OPTS = ["mat khau", "password", "pass"];
  var STATUS_OPTS = ["tinh trang", "trang thai", "status"];

  var PLACEHOLDER_GRADIENTS = [
    ["#7a5330", "#c48a3f"], ["#2f4a42", "#5c8a76"], ["#6b3630", "#a85c43"],
    ["#454024", "#8a7a3f"], ["#3a3d2e", "#6f7a52"],
  ];

  function stripDiacritics(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D");
  }
  function norm(s) { return stripDiacritics(String(s || "")).toLowerCase().trim(); }
  function slugify(title) {
    return stripDiacritics(String(title || "")).replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
  }

  function pickCol(header, options) {
    var normHeader = header.map(norm);
    for (var i = 0; i < options.length; i++) {
      var idx = normHeader.indexOf(norm(options[i]));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  // Minimal RFC4180 CSV parser (quoted fields, "" escapes, CRLF).
  function parseCSV(text) {
    var rows = [], row = [], field = "", inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else if (c === "\r") { /* skip */ }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.length > 1 || (r[0] && r[0].trim()); });
  }

  function sheetCsvUrl(tabName) {
    return "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(SHEET_ID) +
      "/gviz/tq?tqx=out:csv&sheet=" + encodeURIComponent(tabName);
  }

  function extractYoutubeId(text) {
    if (!text) return null;
    var m = String(text).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function parseGamesCsv(csvText, typeInfo) {
    var rows = parseCSV(csvText);
    if (!rows.length) return [];
    var header = rows[0];
    var iTitle = pickCol(header, TITLE_OPTS);
    var iLink = pickCol(header, LINK_OPTS);
    var iReview = pickCol(header, REVIEW_OPTS);
    var iPass = pickCol(header, PASS_OPTS);
    var iStatus = pickCol(header, STATUS_OPTS);
    var games = [];
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      var title = iTitle !== -1 ? (row[iTitle] || "").trim() : "";
      if (!title) continue;
      var review = iReview !== -1 ? (row[iReview] || "").trim() : "";
      games.push({
        type: typeInfo.key,
        title: title,
        slug: slugify(title),
        link: iLink !== -1 ? (row[iLink] || "").trim() : "",
        review: review,
        pass: (iPass !== -1 ? (row[iPass] || "").trim() : "") || DEFAULT_PASSWORD,
        status: iStatus !== -1 ? (row[iStatus] || "").trim() : "",
        yt: extractYoutubeId(review),
      });
    }
    return games;
  }

  function statusClass(status) {
    var n = norm(status);
    if (!n) return "status-unknown";
    if (/(^0$|het han|die|hong|loi|chet|off)/.test(n)) return "status-bad";
    if (/(^1$|hoat dong|con|ok|tot|song|on)/.test(n)) return "status-ok";
    return "status-unknown";
  }
  function statusText(status) {
    var cls = statusClass(status);
    if (cls === "status-bad") return "Hết hạn";
    if (cls === "status-ok") return "Hoạt động";
    return status ? status : "Chưa rõ";
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function gradientFor(title) {
    var h = 0;
    for (var i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
    var pair = PLACEHOLDER_GRADIENTS[h % PLACEHOLDER_GRADIENTS.length];
    return "linear-gradient(135deg," + pair[0] + "," + pair[1] + ")";
  }

  function cardHtml(game, opts) {
    opts = opts || {};
    var basePath = opts.basePath || "";
    var tab = TAB_BY_KEY[game.type] || { label: game.type || "Khác" };
    var hasLink = !!game.link;
    var linkHref = hasLink ? escapeHtml(game.link) : "#";
    var gameUrl = basePath + "g/" + encodeURIComponent(game.slug);
    return (
      '<div class="card">' +
      '<div class="thumb" style="background:' + gradientFor(game.title) + '">' +
      (opts.badge ? '<span class="badge-new">Mới</span>' : "") +
      '<a class="thumb-link" href="' + gameUrl + '" aria-label="' + escapeHtml(game.title) + '">' +
      '<span class="ph">' + escapeHtml(game.title.charAt(0).toUpperCase()) + "</span>" +
      '<img src="' + basePath + 'thumbs/' + encodeURIComponent(game.slug) + '.jpg" alt="' + escapeHtml(game.title) + '" loading="lazy" onerror="this.style.display=\'none\'">' +
      "</a>" +
      (game.yt ? '<a class="trailer-badge" href="https://www.youtube.com/watch?v=' + game.yt + '" target="_blank" rel="noopener" title="Xem trailer trên YouTube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></a>' : "") +
      "</div>" +
      '<div class="card-body">' +
      '<div class="eyebrow">' +
      '<span class="eyebrow-cat" title="' + escapeHtml(tab.label) + '">' + catIconSvg(game.type, "cat-icon") + '<span class="eyebrow-cat-text">' + escapeHtml(tab.label) + "</span></span>" +
      "</div>" +
      '<a class="card-title" href="' + gameUrl + '">' + escapeHtml(game.title) + "</a>" +
      (game.review ? '<div class="card-review">' + escapeHtml(game.review) + "</div>" : "") +
      '<div class="card-meta">' +
      '<a class="dl-btn' + (hasLink ? "" : " disabled") + '" href="' + linkHref + '" target="_blank" rel="noopener" title="' + (hasLink ? "Tải xuống" : "Không có link") + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-5-5m5 5l5-5"/><path d="M4 19h16"/></svg>' +
      '<span>' + (hasLink ? "Tải xuống" : "Không có link") + "</span>" +
      "</a>" +
      '<button type="button" class="fav-btn" data-slug="' + escapeHtml(game.slug) + '" title="Lưu vào yêu thích" aria-label="Lưu vào yêu thích">' +
      '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.5-4.6-10-9.3C.6 8.4 2.2 5 5.6 5c2 0 3.3 1 4.4 2.6C11.1 6 12.4 5 14.4 5c3.4 0 5 3.4 3.6 6.7C19.5 16.4 12 21 12 21z"/></svg>' +
      "</button>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function gamesByType(games) {
    var map = {};
    games.forEach(function (g) { (map[g.type] = map[g.type] || []).push(g); });
    return map;
  }

  function knownTypesPresent(games) {
    var map = gamesByType(games);
    var present = SHEET_TABS.filter(function (t) { return map[t.key] && map[t.key].length; });
    Object.keys(map).forEach(function (k) {
      if (!TAB_BY_KEY[k]) present.push({ key: k, label: k });
    });
    return present;
  }

  function tabsHtml(games, activeTab) {
    var byType = gamesByType(games);
    var html = '<button type="button" class="tab-btn' + (activeTab === "all" ? " active" : "") +
      '" data-tab="all">Tất cả <span class="n">' + games.length + "</span></button>";
    knownTypesPresent(games).forEach(function (t) {
      var count = (byType[t.key] || []).length;
      html += '<button type="button" class="tab-btn' + (activeTab === t.key ? " active" : "") +
        '" data-tab="' + escapeHtml(t.key) + '">' + catIconSvg(t.key, "tab-icon") + escapeHtml(t.label) +
        ' <span class="n">' + count + "</span></button>";
    });
    return html;
  }

  function statsHtml(games, syncedAt) {
    var txt = "<strong>" + games.length + "</strong> game";
    txt += syncedAt
      ? " · đồng bộ lần cuối " + escapeHtml(new Date(syncedAt).toLocaleString("vi-VN"))
      : " · dữ liệu đóng gói lúc triển khai (chưa đồng bộ lần nào trên máy này)";
    return txt;
  }

  function gridHtml(games, activeTab, search) {
    var list = !activeTab || activeTab === "all" ? games : (gamesByType(games)[activeTab] || []);
    if (search) {
      var q = norm(search);
      list = list.filter(function (g) { return norm(g.title).indexOf(q) !== -1; });
    }
    return list.map(function (g) { return cardHtml(g); }).join("");
  }

  return {
    SHEET_ID: SHEET_ID,
    SHEET_TABS: SHEET_TABS,
    TAB_BY_KEY: TAB_BY_KEY,
    sheetCsvUrl: sheetCsvUrl,
    parseGamesCsv: parseGamesCsv,
    norm: norm,
    slugify: slugify,
    statusClass: statusClass,
    statusText: statusText,
    escapeHtml: escapeHtml,
    cardHtml: cardHtml,
    gamesByType: gamesByType,
    knownTypesPresent: knownTypesPresent,
    tabsHtml: tabsHtml,
    statsHtml: statsHtml,
    gridHtml: gridHtml,
  };
});

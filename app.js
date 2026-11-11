(function () {
  "use strict";

  var SHEET_ID = "1EUtWgw48fTqmgkcHmZjqpW32h06C6JiB";
  var SHEET_TABS = [
    { key: "Game PC", label: "Game PC", icon: "🖥" },
    { key: "Game Mobile", label: "Game Mobile", icon: "📱" },
    { key: "Game Mobile Java", label: "Mobile Java", icon: "☕" },
    { key: "Game Web Flash", label: "Web Flash", icon: "🌊" },
    { key: "Game Web H5", label: "Web H5", icon: "🌐" },
  ];
  var TAB_BY_KEY = {};
  SHEET_TABS.forEach(function (t) { TAB_BY_KEY[t.key] = t; });

  var DEFAULT_PASSWORD = "pgaming";
  var TITLE_OPTS = ["ten game", "title", "ten", "name"];
  var LINK_OPTS = ["link"];
  var REVIEW_OPTS = ["review"];
  var PASS_OPTS = ["mat khau", "password", "pass"];
  var STATUS_OPTS = ["tinh trang", "trang thai", "status"];

  var LOCAL_STORAGE_KEY = "gameLibrary.v1";
  var PLACEHOLDER_GRADIENTS = [
    ["#7c6af7", "#4ca8f5"], ["#3ddc97", "#2f9db8"], ["#f05060", "#b8862f"],
    ["#4ca8f5", "#7c6af7"], ["#e3b341", "#f05060"],
  ];

  // ---- text helpers (mirrors the slugify the original desktop tool used,
  // so thumbnail filenames stay matched across re-syncs regardless of row order) ----
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

  function cardHtml(game) {
    var tab = TAB_BY_KEY[game.type] || { icon: "🎮", label: game.type || "Khác" };
    var sCls = statusClass(game.status);
    var hasLink = !!game.link;
    var linkHref = hasLink ? escapeHtml(game.link) : "#";
    return (
      '<div class="card">' +
      '<div class="thumb" style="background:' + gradientFor(game.title) + '">' +
      '<span class="ph">' + escapeHtml(game.title.charAt(0).toUpperCase()) + "</span>" +
      '<img src="thumbs/' + encodeURIComponent(game.slug) + '.jpg" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
      '<span class="cat-badge" title="' + escapeHtml(tab.label) + '">' + tab.icon + "</span>" +
      '<span class="status-badge ' + sCls + '">' + escapeHtml(statusText(game.status)) + "</span>" +
      (game.yt ? '<a class="trailer-badge" href="https://www.youtube.com/watch?v=' + game.yt + '" target="_blank" rel="noopener" title="Xem trailer trên YouTube">▶</a>' : "") +
      "</div>" +
      '<div class="card-body">' +
      '<div class="card-title">' + escapeHtml(game.title) + "</div>" +
      (game.review ? '<div class="card-review">' + escapeHtml(game.review) + "</div>" : "") +
      '<div class="card-meta">' +
      '<span class="pass-chip" title="Mật khẩu giải nén">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg>' +
      '<span class="val">' + escapeHtml(game.pass) + "</span>" +
      '<button type="button" class="copy-pass" data-pass="' + escapeHtml(game.pass) + '" title="Sao chép mật khẩu">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>' +
      "</button>" +
      "</span>" +
      "</div>" +
      '<a class="dl-btn' + (hasLink ? "" : " disabled") + '" href="' + linkHref + '" target="_blank" rel="noopener">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-5-5m5 5l5-5"/><path d="M4 19h16"/></svg>' +
      (hasLink ? "Tải xuống" : "Không có link") +
      "</a>" +
      "</div>" +
      "</div>"
    );
  }

  // ---- state ----
  var state = { activeTab: "all", search: "", games: [], loadError: null, syncedAt: null };

  var tabsEl = document.getElementById("tabs");
  var gridEl = document.getElementById("grid");
  var bannersEl = document.getElementById("banners");
  var statsLineEl = document.getElementById("statsLine");
  var emptyStateEl = document.getElementById("emptyState");
  var searchInput = document.getElementById("searchInput");
  var syncBtn = document.getElementById("syncBtn");

  function gamesByType() {
    var map = {};
    state.games.forEach(function (g) { (map[g.type] = map[g.type] || []).push(g); });
    return map;
  }
  function knownTypesPresent() {
    var map = gamesByType();
    var present = SHEET_TABS.filter(function (t) { return map[t.key] && map[t.key].length; });
    Object.keys(map).forEach(function (k) {
      if (!TAB_BY_KEY[k]) present.push({ key: k, label: k, icon: "🎮" });
    });
    return present;
  }

  function renderTabs() {
    var byType = gamesByType();
    var html = '<button type="button" class="tab-btn' + (state.activeTab === "all" ? " active" : "") +
      '" data-tab="all">Tất cả <span class="n">' + state.games.length + "</span></button>";
    knownTypesPresent().forEach(function (t) {
      var count = (byType[t.key] || []).length;
      html += '<button type="button" class="tab-btn' + (state.activeTab === t.key ? " active" : "") +
        '" data-tab="' + escapeHtml(t.key) + '">' + t.icon + " " + escapeHtml(t.label) +
        ' <span class="n">' + count + "</span></button>";
    });
    tabsEl.innerHTML = html;
    Array.prototype.forEach.call(tabsEl.querySelectorAll(".tab-btn"), function (btn) {
      btn.addEventListener("click", function () {
        state.activeTab = btn.getAttribute("data-tab");
        renderTabs();
        renderGrid();
      });
    });
  }

  function renderBanner(kind, html) {
    if (!html) { bannersEl.innerHTML = ""; return; }
    bannersEl.innerHTML = '<div class="state-banner ' + kind + '">' + html + "</div>";
  }

  function renderStats() {
    var txt = "<strong>" + state.games.length + "</strong> game";
    txt += state.syncedAt
      ? " · đồng bộ lần cuối " + escapeHtml(new Date(state.syncedAt).toLocaleString("vi-VN"))
      : " · dữ liệu đóng gói lúc triển khai (chưa đồng bộ lần nào trên máy này)";
    statsLineEl.innerHTML = txt;
  }

  function renderGrid() {
    var list = state.activeTab === "all" ? state.games : (gamesByType()[state.activeTab] || []);
    if (state.search) {
      var q = norm(state.search);
      list = list.filter(function (g) { return norm(g.title).indexOf(q) !== -1; });
    }
    if (!list.length) {
      gridEl.innerHTML = "";
      emptyStateEl.hidden = false;
      emptyStateEl.textContent = state.search
        ? "Không có game nào khớp với tìm kiếm của bạn."
        : "Chưa có dữ liệu để hiển thị cho danh mục này.";
      return;
    }
    emptyStateEl.hidden = true;
    gridEl.innerHTML = list.map(cardHtml).join("");
    Array.prototype.forEach.call(gridEl.querySelectorAll(".copy-pass"), function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var pass = btn.getAttribute("data-pass");
        var done = function () {
          var old = btn.innerHTML;
          btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13l4 4L19 7"/></svg>';
          setTimeout(function () { btn.innerHTML = old; }, 1200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(pass).then(done, function () { selectFallback(btn); });
        } else selectFallback(btn);
      });
    });
  }

  function selectFallback(btn) {
    var span = btn.previousElementSibling;
    if (!span) return;
    var range = document.createRange();
    range.selectNodeContents(span);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function renderAll() {
    renderTabs();
    renderStats();
    renderGrid();
  }

  function skeletonCards(n) {
    var html = "";
    for (var i = 0; i < n; i++) {
      html += '<div class="card"><div class="thumb skel"></div><div class="card-body">' +
        '<div class="skel" style="height:14px;border-radius:4px;width:85%"></div>' +
        '<div class="skel" style="height:11px;border-radius:4px;width:60%;margin-top:6px"></div>' +
        "</div></div>";
    }
    return html;
  }

  // ---- initial load: cached sync (localStorage) > bundled snapshot ----
  function loadInitial() {
    try {
      var cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.games) && parsed.games.length) {
          state.games = parsed.games;
          state.syncedAt = parsed.syncedAt || null;
          renderAll();
          return;
        }
      }
    } catch (e) { /* ignore a corrupt or inaccessible cache */ }

    gridEl.innerHTML = skeletonCards(8);
    fetch("games_embedded.json")
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(function (games) {
        state.games = games;
        renderAll();
      })
      .catch(function (err) {
        renderBanner("err", "<strong>Không tải được dữ liệu ban đầu:</strong> " + escapeHtml(err.message || String(err)));
        state.games = [];
        renderAll();
      });
  }

  // ---- live sync against Google Sheets (plain fetch — works on a normal
  // website; Google's gviz endpoint answers CORS preflight for any origin) ----
  function syncNow() {
    syncBtn.disabled = true;
    syncBtn.classList.add("spinning");
    renderBanner(null);

    var tabFetches = SHEET_TABS.map(function (t) {
      return fetch(sheetCsvUrl(t.key))
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .then(function (text) {
          var trimmed = text.trim();
          if (!trimmed || trimmed.charAt(0) === "<") {
            throw new Error("Sheet không trả về CSV cho tab “" + t.key + "”.");
          }
          return { ok: true, games: parseGamesCsv(text, t) };
        })
        .catch(function (err) {
          return { ok: false, tab: t.key, message: err.message || String(err) };
        });
    });

    Promise.all(tabFetches).then(function (results) {
      syncBtn.disabled = false;
      syncBtn.classList.remove("spinning");

      var games = [];
      var failed = [];
      results.forEach(function (r) {
        if (r.ok) games = games.concat(r.games);
        else failed.push(r.tab + ": " + r.message);
      });

      if (!games.length) {
        renderBanner("err", "<strong>Đồng bộ thất bại:</strong> " + escapeHtml(failed.join(" · ") || "không rõ nguyên nhân."));
        return;
      }

      state.games = games;
      state.syncedAt = new Date().toISOString();
      renderAll();

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ games: games, syncedAt: state.syncedAt }));
      } catch (e) { /* storage full or blocked — sync still worked for this view */ }

      if (failed.length) {
        renderBanner("err", "<strong>Đồng bộ một phần:</strong> " + escapeHtml(failed.join(" · ")));
      } else {
        renderBanner("ok", "Đồng bộ xong — " + games.length + " game.");
        setTimeout(function () { renderBanner(null); }, 4000);
      }
    });
  }

  searchInput.addEventListener("input", function () {
    state.search = searchInput.value;
    renderGrid();
  });
  syncBtn.addEventListener("click", syncNow);

  loadInitial();
})();

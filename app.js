(function () {
  "use strict";

  var R = window.GameRender;
  var LOCAL_STORAGE_KEY = "gameLibrary.v1";

  var state = { activeTab: "all", search: "", games: [], syncedAt: null };

  var tabsEl = document.getElementById("tabs");
  var gridEl = document.getElementById("grid");
  var bannersEl = document.getElementById("banners");
  var statsLineEl = document.getElementById("statsLine");
  var emptyStateEl = document.getElementById("emptyState");
  var searchInput = document.getElementById("searchInput");
  var syncBtn = document.getElementById("syncBtn");

  function renderTabs() {
    tabsEl.innerHTML = R.tabsHtml(state.games, state.activeTab);
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
    statsLineEl.innerHTML = R.statsHtml(state.games, state.syncedAt);
  }

  function renderGrid() {
    var html = R.gridHtml(state.games, state.activeTab, state.search);
    if (!html) {
      gridEl.innerHTML = "";
      emptyStateEl.hidden = false;
      emptyStateEl.textContent = state.search
        ? "Không có game nào khớp với tìm kiếm của bạn."
        : "Chưa có dữ liệu để hiển thị cho danh mục này.";
      return;
    }
    emptyStateEl.hidden = true;
    gridEl.innerHTML = html;
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

  function loadInitial() {
    var embeddedEl = document.getElementById("embeddedGames");
    try {
      state.games = embeddedEl ? JSON.parse(embeddedEl.textContent) : [];
    } catch (e) {
      state.games = [];
    }

    try {
      var cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.games) && parsed.games.length) {
          state.games = parsed.games;
          state.syncedAt = parsed.syncedAt || null;
        }
      }
    } catch (e) {}

    renderAll();
  }

  function syncNow() {
    syncBtn.disabled = true;
    syncBtn.classList.add("spinning");
    renderBanner(null);

    var tabFetches = R.SHEET_TABS.map(function (t) {
      return fetch(R.sheetCsvUrl(t.key))
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .then(function (text) {
          var trimmed = text.trim();
          if (!trimmed || trimmed.charAt(0) === "<") {
            throw new Error("Sheet không trả về CSV cho tab “" + t.key + "”.");
          }
          return { ok: true, games: R.parseGamesCsv(text, t) };
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
        renderBanner("err", "<strong>Đồng bộ thất bại:</strong> " + R.escapeHtml(failed.join(" · ") || "không rõ nguyên nhân."));
        return;
      }

      state.games = games;
      state.syncedAt = new Date().toISOString();
      renderAll();

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ games: games, syncedAt: state.syncedAt }));
      } catch (e) {}

      if (failed.length) {
        renderBanner("err", "<strong>Đồng bộ một phần:</strong> " + R.escapeHtml(failed.join(" · ")));
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

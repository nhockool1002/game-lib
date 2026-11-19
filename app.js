(function () {
  "use strict";

  var R = window.GameRender;
  var LOCAL_STORAGE_KEY = "gameLibrary.v1";
  var FAV_KEY = "gameLibrary.favorites.v1";

  var state = { activeTab: "all", search: "", games: [], syncedAt: null };

  function getFavorites() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { return []; }
  }
  function setFavorites(list) {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function isFavorite(slug) { return getFavorites().indexOf(slug) !== -1; }
  function toggleFavorite(slug) {
    var list = getFavorites();
    var i = list.indexOf(slug);
    if (i === -1) list.push(slug); else list.splice(i, 1);
    setFavorites(list);
  }
  function wireFavButtons(container) {
    Array.prototype.forEach.call(container.querySelectorAll(".fav-btn"), function (btn) {
      var slug = btn.getAttribute("data-slug");
      if (isFavorite(slug)) btn.classList.add("active");
      btn.addEventListener("click", function () {
        toggleFavorite(slug);
        btn.classList.toggle("active");
        renderTabs();
        if (state.activeTab === "favorites") renderGrid();
      });
    });
  }

  var tabsEl = document.getElementById("tabs");
  var gridEl = document.getElementById("grid");
  var bannersEl = document.getElementById("banners");
  var statsLineEl = document.getElementById("statsLine");
  var emptyStateEl = document.getElementById("emptyState");
  var searchInput = document.getElementById("searchInput");
  var syncBtn = document.getElementById("syncBtn");
  var discoverEl = document.getElementById("discoverPopup");

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
    return list;
  }

  function renderTabs() {
    tabsEl.innerHTML = R.tabsHtml(state.games, state.activeTab);
    var favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "tab-btn" + (state.activeTab === "favorites" ? " active" : "");
    favBtn.setAttribute("data-tab", "favorites");
    favBtn.innerHTML = "♥ Yêu thích <span class=\"n\">" + getFavorites().length + "</span>";
    tabsEl.appendChild(favBtn);

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
    var html;
    if (state.activeTab === "favorites") {
      var favs = getFavorites();
      var list = state.games.filter(function (g) { return favs.indexOf(g.slug) !== -1; });
      if (state.search) {
        var q = R.norm(state.search);
        list = list.filter(function (g) { return R.norm(g.title).indexOf(q) !== -1; });
      }
      html = list.map(function (g) { return R.cardHtml(g); }).join("");
    } else {
      html = R.gridHtml(state.games, state.activeTab, state.search);
    }
    if (!html) {
      gridEl.innerHTML = "";
      emptyStateEl.hidden = false;
      emptyStateEl.textContent = state.activeTab === "favorites"
        ? "Bạn chưa lưu game yêu thích nào."
        : (state.search
          ? "Không có game nào khớp với tìm kiếm của bạn."
          : "Chưa có dữ liệu để hiển thị cho danh mục này.");
      return;
    }
    emptyStateEl.hidden = true;
    gridEl.innerHTML = html;
    wireFavButtons(gridEl);
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

    shuffle(state.games);
    renderAll();
    startDiscover();

    var newestGrid = document.getElementById("newestGrid");
    if (newestGrid) wireFavButtons(newestGrid);
  }

  function syncNow() {
    syncBtn.disabled = true;
    syncBtn.classList.add("spinning");
    renderBanner(null);

    var tabFetches = R.SHEET_TABS.map(function (t) {
      return fetch(R.sheetCsvUrl(t.key))
        .then(function (res) {
          if (res.status === 404) throw new Error("không tìm thấy — sheet có thể đã bị xoá");
          if (res.status === 403) throw new Error("không có quyền truy cập — sheet có thể đã đổi về riêng tư");
          if (!res.ok) throw new Error("lỗi HTTP " + res.status);
          return res.text();
        })
        .then(function (text) {
          var trimmed = text.trim();
          if (!trimmed || trimmed.charAt(0) === "<") {
            throw new Error("nhận về trang đăng nhập thay vì dữ liệu — sheet có thể đã đổi quyền riêng tư");
          }
          return { ok: true, games: R.parseGamesCsv(text, t) };
        })
        .catch(function (err) {
          var message = err.message || String(err);
          if (/failed to fetch|networkerror|load failed/i.test(message)) {
            message = "không kết nối được tới Google Sheet (mất mạng hoặc bị chặn)";
          }
          return { ok: false, tab: t.key, message: message };
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
        renderBanner("err", "<strong>Đồng bộ thất bại:</strong> " + R.escapeHtml(failed.join(" · ") || "không rõ nguyên nhân.") +
          " Dữ liệu đang hiển thị vẫn là bản lưu gần nhất, chưa bị mất.");
        return;
      }

      state.games = shuffle(games);
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

  var discoverHideTimer = null;
  var lastDiscoverSlug = null;

  function pickRandomGame() {
    var list = state.games;
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    var game;
    do {
      game = list[Math.floor(Math.random() * list.length)];
    } while (game.slug === lastDiscoverSlug);
    return game;
  }

  function hideDiscover() {
    if (!discoverEl) return;
    discoverEl.classList.remove("show");
    setTimeout(function () { discoverEl.hidden = true; }, 250);
  }

  function showDiscover() {
    if (!discoverEl) return;
    var game = pickRandomGame();
    if (!game) return;
    lastDiscoverSlug = game.slug;

    discoverEl.innerHTML =
      '<button type="button" class="discover-close" aria-label="Đóng">&times;</button>' +
      '<a class="discover-body" href="g/' + encodeURIComponent(game.slug) + '">' +
      '<span class="discover-thumb">' +
      '<span class="ph">' + R.escapeHtml(game.title.charAt(0).toUpperCase()) + "</span>" +
      '<img src="thumbs/' + encodeURIComponent(game.slug) + '.jpg" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
      "</span>" +
      '<span class="discover-info">' +
      '<span class="discover-label">✨ Gợi ý ngẫu nhiên</span>' +
      '<span class="discover-title">' + R.escapeHtml(game.title) + "</span>" +
      "</span>" +
      "</a>";

    discoverEl.querySelector(".discover-close").addEventListener("click", function (e) {
      e.preventDefault();
      clearTimeout(discoverHideTimer);
      hideDiscover();
    });

    discoverEl.hidden = false;
    requestAnimationFrame(function () { discoverEl.classList.add("show"); });

    clearTimeout(discoverHideTimer);
    discoverHideTimer = setTimeout(hideDiscover, 12000);
  }

  function startDiscover() {
    if (!discoverEl || !state.games.length) return;
    setInterval(showDiscover, 60000);
  }

  searchInput.addEventListener("input", function () {
    state.search = searchInput.value;
    renderGrid();
  });
  syncBtn.addEventListener("click", syncNow);

  loadInitial();
})();

(function () {
  "use strict";
  var fab = document.getElementById("bmcFab");
  var modal = document.getElementById("bmcModal");
  if (!fab || !modal) return;

  function open() { modal.hidden = false; }
  function close() { modal.hidden = true; }

  fab.addEventListener("click", open);
  Array.prototype.forEach.call(modal.querySelectorAll("[data-close]"), function (el) {
    el.addEventListener("click", close);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) close();
  });
})();

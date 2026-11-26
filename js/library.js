/* Homepage "Browse the library" tabs.
   site.js has already drawn every card; this keeps the first few of each
   grid (data-show), fills in the counts, and switches tabs. A link to
   /#basics, /#fundamentals or /#strategies opens that tab. */
(function () {
  function init() {
    var tabs = document.querySelector(".lib-tabs");
    if (!tabs) return;
    document.querySelectorAll("[data-lib-count]").forEach(function (el) {
      var grid = document.getElementById(el.getAttribute("data-lib-count"));
      if (grid) el.textContent = grid.children.length;
    });
    document.querySelectorAll(".lib-rail[data-show]").forEach(function (grid) {
      var n = +grid.getAttribute("data-show");
      [].slice.call(grid.children, n).forEach(function (c) { c.remove(); });
    });
    var btns = [].slice.call(tabs.querySelectorAll('[role="tab"]'));
    function show(btn, focus) {
      btns.forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        document.getElementById(b.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) btn.focus();
    }
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest('[role="tab"]');
      if (b) show(b);
    });
    tabs.addEventListener("keydown", function (e) {
      var i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === "ArrowRight") { e.preventDefault(); show(btns[(i + 1) % btns.length], true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(btns[(i - 1 + btns.length) % btns.length], true); }
    });
    function fromHash() {
      var id = location.hash.slice(1);
      var b = btns.filter(function (x) { return x.getAttribute("aria-controls") === id; })[0];
      if (!b) return;
      show(b);
      document.getElementById("setups").scrollIntoView();
    }
    window.addEventListener("hashchange", fromHash);
    fromHash();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

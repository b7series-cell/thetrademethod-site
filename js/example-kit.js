/* =====================================================================
   example-kit.js — runs a setup page's chart on made-up example bars
   instead of live market data.

   Load order on the page (all defer):
     /js/examples/<key>.js   sets window.LIVE_EXAMPLE (the made-up data)
     /js/example-kit.js      this file
     /js/<key>-live.js       the page's own chart and indicator, unchanged

   It only acts when the chart section carries data-example. Remove that
   attribute to put the page back on live data; nothing else changes.

   window.LIVE_EXAMPLE = {
     key:    "vwapr",                 the page's LiveKit key (clears its saved symbol / timeframe)
     tf:     2,                       the bar size the example is drawn in (minutes)
     name:   "Example session",       shown in the chart's corner
     note:   "Example chart.",        optional: bold start of the note above the chart (default "Example session.")
     store:  { orb_or: "15" },        optional: other saved page settings the example needs
     routes: [ { match: "span=day", body: {...} },   first route whose text is in the URL wins
               { match: "bars.php", body: {...} } ]  body is what that /api/ endpoint would return
   }
   ===================================================================== */

(function () {
  "use strict";
  var X = window.LIVE_EXAMPLE;
  var root = document.querySelector("[data-example]");
  if (!X || !root || !window.fetch) return;

  try {
    localStorage.removeItem(X.key + "_symbol");
    if (X.tf) localStorage.setItem(X.key + "_tf", String(X.tf)); else localStorage.removeItem(X.key + "_tf");
    for (var k in X.store || {}) localStorage.setItem(k, String(X.store[k]));   // other page settings the example is drawn for
  } catch (e) {}
  root.setAttribute("data-symbol", "EXAMPLE");
  root.classList.add("is-example");

  var css = document.createElement("style");
  css.textContent = "[data-example] .live-symbol{display:none!important}" +
    "[data-example] .live-example-note{margin:0 0 10px;font-size:13px;color:#a1a1a6}" +
    "[data-example] .live-example-note b{color:#f5f5f7;font-weight:600}";
  document.head.appendChild(css);
  var main = root.querySelector(".live-main") || root;
  var note = document.createElement("p");
  note.className = "live-example-note";
  note.innerHTML = "<b>" + (X.note || "Example session.") + "</b> Made-up bars drawn to show this setup clearly, run through the page's own rules. Not market data.";
  var chartEl = root.querySelector(".live-chart");
  if (chartEl && chartEl.parentNode) chartEl.parentNode.insertBefore(note, chartEl); else main.insertBefore(note, main.firstChild);

  /* the live scripts end their status line with "Updated h:mm ET"; that reads as live data, so drop it */
  var status = root.querySelector(".live-status");
  if (status && window.MutationObserver) {
    var tidy = function () {
      var t = status.textContent, u = t.replace(/\s*·\s*Updated [^·]*ET(\s*\([^)]*\))?/g, "");
      if (u !== t) status.textContent = u;
    };
    new MutationObserver(tidy).observe(status, { childList: true, characterData: true, subtree: true });
  }

  function json(body, status) {
    return Promise.resolve(new Response(JSON.stringify(body), { status: status || 200, headers: { "Content-Type": "application/json" } }));
  }
  var real = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input && input.url || "";
    if (url.indexOf("/api/logo.php") >= 0) return json({ name: X.name || "Example session", logo: false });
    if (url.indexOf("/api/") >= 0) {
      var routes = X.routes || [];
      for (var i = 0; i < routes.length; i++) {
        if (url.indexOf(routes[i].match) >= 0) {
          var b = routes[i].body;
          if (b && typeof b === "object" && !Array.isArray(b) && "bars" in b) b.symbol = "EXAMPLE";
          return json(b, routes[i].status);
        }
      }
      if (url.indexOf("/api/bars.php") >= 0 || url.indexOf("/api/gex-levels.php") >= 0) return json({ error: "unavailable" }, 503);
    }
    return real(input, init);
  };
})();

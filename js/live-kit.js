/* =====================================================================
   live-kit.js — shared controls for the live charts on setup pages.

     LiveKit.controls(root, opts)  symbol dropdown (the watchlist) + a box for
                                   any other ticker + a 1 / 2 / 5 / 15-minute
                                   timeframe switch, remembered per page
     LiveKit.brand(chart, el, sym, tf)
                                   the company logo and name in the chart's
                                   corner and the ticker as a watermark
   Logos come from /api/logo.php (ticker reference data, key stays on the
   server); tickers without one (most ETFs) get a monogram.
   ===================================================================== */

(function () {
  "use strict";

  var WATCHLIST = ["AAPL", "AMD", "DELL", "GOOG", "HOOD", "IBM", "INTC", "META", "MSFT", "MU", "NVDA", "QQQ", "SNDK", "SPCX", "SPY", "TSLA"];
  var TFS = [1, 2, 5, 15];
  var RE = /^[A-Z][A-Z.]{0,5}$/;

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function token() {
    var t = new URLSearchParams(location.search).get("preview");
    try { if (t) localStorage.setItem("vp_preview", t); else t = localStorage.getItem("vp_preview"); } catch (e) {}
    return t || "";
  }
  function tfLabel(m) { return m + "-minute"; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- controls ----------
     opts: { key: "fl", symbol: "QQQ", tf: 2, tfs: [1,2,5,15], onChange: function (symbol, tf) {} }
     returns { symbol, tf, set(symbol, tf) } — set() updates the controls without firing onChange */
  function controls(root, opts) {
    var key = opts.key, tfs = opts.tfs || TFS;
    var sym = (store(key + "_symbol") || opts.symbol || "QQQ").toUpperCase();
    if (!RE.test(sym)) sym = (opts.symbol || "QQQ").toUpperCase();
    var tf = +store(key + "_tf") || opts.tf || 2;
    if (tfs.length && tfs.indexOf(tf) < 0) tf = opts.tf || tfs[0];
    if (!tfs.length) tf = opts.tf;

    var main = root.querySelector(".live-main") || root;
    var form = root.querySelector(".live-symbol");
    if (!form) { form = document.createElement("form"); form.className = "live-symbol"; main.insertBefore(form, main.firstChild); }
    var id = key + "-sym";
    form.innerHTML =
      '<label for="' + id + '-pick">Symbol</label>' +
      '<select id="' + id + '-pick" class="live-pick" aria-label="Watchlist symbol"></select>' +
      '<input id="' + id + '" name="sym" autocomplete="off" spellcheck="false" maxlength="6" placeholder="Any ticker" aria-label="Any ticker">' +
      '<button class="pill pill-buy" type="submit">Load</button>' +
      (tfs.length ? '<div class="bt-seg live-tf" role="group" aria-label="Timeframe">' +
      tfs.map(function (m) { return '<button type="button" data-tf="' + m + '" aria-pressed="false">' + m + "m</button>"; }).join("") + "</div>" : "");
    var pick = form.querySelector("select"), input = form.querySelector("input"), seg = form.querySelector(".live-tf");

    var extra = [];                                   // page-supplied tickers (e.g. the ones with GEX levels today)
    function paint() {
      var list = extra.concat(WATCHLIST.filter(function (s) { return extra.indexOf(s) < 0; }));
      if (list.indexOf(sym) < 0) list.unshift(sym);
      pick.innerHTML = list.map(function (s) { return '<option value="' + s + '"' + (s === sym ? " selected" : "") + ">" + s + (extra.indexOf(s) >= 0 && opts.extraTag ? " · " + opts.extraTag : WATCHLIST.indexOf(s) < 0 && extra.indexOf(s) < 0 ? " (typed)" : "") + "</option>"; }).join("");
      if (seg) Array.prototype.forEach.call(seg.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-tf") === tf)); });
      input.value = "";
    }
    function fire() { store(key + "_symbol", sym); store(key + "_tf", String(tf)); paint(); api.symbol = sym; api.tf = tf; opts.onChange(sym, tf); }
    pick.addEventListener("change", function () { sym = pick.value; fire(); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value.trim().toUpperCase();
      if (!v) { sym = pick.value; fire(); return; }
      if (!RE.test(v)) { input.setCustomValidity("Enter a ticker like NVDA"); input.reportValidity(); return; }
      input.setCustomValidity("");
      sym = v; fire();
    });
    input.addEventListener("input", function () { input.setCustomValidity(""); });
    if (seg) seg.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-tf]"); if (!b) return;
      tf = +b.getAttribute("data-tf"); fire();
    });
    var api = {
      symbol: sym, tf: tf,
      set: function (s, t) { if (s) sym = String(s).toUpperCase(); if (t && tfs.indexOf(+t) >= 0) tf = +t; api.symbol = sym; api.tf = tf; paint(); },
      saved: function () { return { symbol: (store(key + "_symbol") || opts.symbol || "QQQ").toUpperCase(), tf: +store(key + "_tf") || opts.tf || 2 }; }
    };
    api.setList = function (arr) { extra = (arr || []).map(function (s) { return String(s).toUpperCase(); }); paint(); };
    paint();
    return api;
  }

  /* ---------- logo, name, watermark ---------- */
  var META = {};
  function meta(sym) {
    if (META[sym]) return META[sym];
    var tok = token();
    META[sym] = fetch("/api/logo.php?symbol=" + encodeURIComponent(sym) + "&meta=1" + (tok ? "&preview=" + encodeURIComponent(tok) : ""))
      .then(function (r) { return r.ok ? r.json() : { name: "", logo: false }; })
      .catch(function () { return { name: "", logo: false }; });
    return META[sym];
  }
  function brand(chart, el, sym, tf) {
    var tfl = typeof tf === "number" ? tf + "m" : String(tf);
    if (!chart || !el) return;
    var small = el.clientWidth < 560;
    chart.applyOptions({ watermark: { visible: true, text: sym, fontSize: small ? 56 : 96, fontStyle: "600",
      color: "rgba(245,245,247,0.06)", horzAlign: "center", vertAlign: "center" } });
    var box = el.querySelector(".live-brand");
    if (!box) { box = document.createElement("div"); box.className = "live-brand"; box.setAttribute("aria-hidden", "true"); el.appendChild(box); }
    if (box.getAttribute("data-k") === sym + "|" + tf) return;
    box.setAttribute("data-k", sym + "|" + tf);
    box.innerHTML = '<span class="mono">' + esc(sym.replace(/\..*$/, "").slice(0, 2)) + "</span><b>" + esc(sym) + "</b><small>" + tfl + "</small>";
    meta(sym).then(function (m) {
      if (box.getAttribute("data-k") !== sym + "|" + tf) return;
      var tok = token();
      if (m.logo) {
        var img = new Image();
        img.alt = ""; img.className = "logo";
        img.onload = function () { var mono = box.querySelector(".mono"); if (mono && box.getAttribute("data-k") === sym + "|" + tf) mono.replaceWith(img); };
        img.src = "/api/logo.php?symbol=" + encodeURIComponent(sym) + (tok ? "&preview=" + encodeURIComponent(tok) : "");
      }
      if (m.name) {
        var s = box.querySelector("small");
        if (s) s.textContent = m.name.replace(/,?\s+(Inc\.?|Corporation|Corp\.?|Holdings?|Ltd\.?|Co\.?|plc)$/i, "") + " · " + tfl;
      }
    });
  }

  window.LiveKit = { WATCHLIST: WATCHLIST, TFS: TFS, controls: controls, brand: brand, tfLabel: tfLabel };
})();

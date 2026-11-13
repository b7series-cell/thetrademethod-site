/* =====================================================================
   em-dash.js — the interactive parts of expected-move-v3.html.

     [data-em-dash]     the Expected Move Dashboard: ticker, reference price,
                        expiration, the options inputs (four methods), upper
                        and lower cards, a daily chart with the range drawn
                        to expiration, and an inside / near / outside alert
     [data-em-vs]       implied vs actual: today's implied move against every
                        past window of the same length (histogram + verdict)
     [data-em-track]    accuracy tracker: how often SPY, QQQ and others
                        finished, and stayed, inside a 1σ weekly range
     [data-em-toc]      sticky contents bar: highlights the section in view
     details.walk       collapsible walkthroughs: redraw when opened

   Live data: daily and 5-minute bars from /api/bars.php (Massive stock
   data, private preview token, delayed). Options prices come from
   /api/em-chain.php when the Massive plan includes options; otherwise
   the visitor types them in. If the bars can't load, the page switches to
   made-up example bars and says so everywhere a number depends on them.

   The odds are a simplified normal model: 68% is the chance of FINISHING
   inside ±1σ at expiration, not of staying inside the whole way (that is
   about 37%). Nothing typed here is sent anywhere.
   ===================================================================== */

(function () {
  "use strict";

  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#64d2ff", gold: "#f4b942", orange: "#ff9f0a",
            ink: "#f5f5f7", dim: "#d1d1d6", mute: "#a1a1a6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e" };
  var STRADDLE_TO_1SD = 1.25;                    // ATM straddle ≈ 0.8σ, so 1σ ≈ straddle × 1.25
  var TRACK = ["SPY", "QQQ", "IWM", "AAPL", "NVDA", "TSLA"];
  var QUICK = ["SPY", "QQQ", "IWM", "AAPL", "NVDA", "TSLA"];
  var RE = /^[A-Z][A-Z.]{0,5}$/;
  /* NYSE full-day closures, for counting trading days to expiration */
  var HOL = { "2026-01-01":1, "2026-01-19":1, "2026-02-16":1, "2026-04-03":1, "2026-05-25":1, "2026-06-19":1, "2026-07-03":1, "2026-09-07":1,
              "2026-11-26":1, "2026-12-25":1, "2027-01-01":1, "2027-01-18":1, "2027-02-15":1, "2027-03-26":1, "2027-05-31":1, "2027-06-18":1,
              "2027-07-05":1, "2027-09-06":1, "2027-11-25":1, "2027-12-24":1 };

  /* ---------- small helpers ---------- */
  function $(root, k) { return root.querySelector('[data-k="' + k + '"]'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function usd(v) { return isFinite(v) ? (v < 0 ? "−$" : "$") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"; }
  function pct(v, d, sign) { if (!isFinite(v)) return "—"; var s = (Math.abs(v) * 100).toFixed(d == null ? 2 : d) + "%"; return sign ? (v > 0 ? "+" : v < 0 ? "−" : "") + s : s; }
  function num(el) { if (!el) return NaN; var v = parseFloat(String(el.value).replace(/[$,%\s]/g, "")); return isFinite(v) ? v : NaN; }
  function ncdf(x) {
    var s = x < 0 ? -1 : 1, z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
    return 0.5 * (1 + s * y);
  }
  function inside(z) { return 2 * ncdf(z) - 1; }                      // odds of finishing within ±z σ
  function stayInside(z) {                                            // odds a driftless walk never leaves ±z σ before expiry
    if (!(z > 0)) return 0;
    var p = 0;
    for (var k = 0; k < 40; k++) { var m = 2 * k + 1; p += (k % 2 ? -1 : 1) / m * Math.exp(-m * m * Math.PI * Math.PI / (8 * z * z)); }
    return Math.max(0, Math.min(1, 4 / Math.PI * p));
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function token() {
    var t = new URLSearchParams(location.search).get("preview");
    try { if (t) localStorage.setItem("vp_preview", t); else t = localStorage.getItem("vp_preview"); } catch (e) {}
    return t || "";
  }

  /* ---------- dates: everything as "YYYY-MM-DD" in New York ---------- */
  function etDate(ms) { return new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/New_York" }); }
  function etTime(ms) { return new Date(ms).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }); }
  function dnum(s) { var p = s.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5; }
  function dstr(n) { return new Date(n * 864e5).toISOString().slice(0, 10); }
  function wday(s) { return new Date(dnum(s) * 864e5).getUTCDay(); }
  function addDays(s, k) { return dstr(dnum(s) + k); }
  function weekKey(s) { return dstr(dnum(s) - ((wday(s) + 6) % 7)); }
  function isTrading(s) { var w = wday(s); return w > 0 && w < 6 && !HOL[s]; }
  function tradingDaysBetween(a, b) { var n = 0; for (var d = addDays(a, 1); d <= b; d = addDays(d, 1)) if (isTrading(d)) n++; return n; }
  function tradingDates(a, b) { var out = []; for (var d = addDays(a, 1); d <= b; d = addDays(d, 1)) if (isTrading(d)) out.push(d); return out; }
  function nextFriday(s) { var d = addDays(s, 1); while (wday(d) !== 5) d = addDays(d, 1); return d; }
  function thirdFriday(y, m) { var d = dstr(Date.UTC(y, m, 1) / 864e5); while (wday(d) !== 5) d = addDays(d, 1); return addDays(d, 14); }
  function monthly(s) {
    var p = s.split("-"), y = +p[0], m = +p[1] - 1;
    for (var k = 0; k < 4; k++) { var f = thirdFriday(y + Math.floor((m + k) / 12), (m + k) % 12); if (dnum(f) - dnum(s) >= 21) return f; }
    return addDays(s, 30);
  }
  function nice(s, withYear) {
    var d = new Date(dnum(s) * 864e5);
    return d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: withYear ? "numeric" : undefined });
  }

  /* ---------- data: live bars, else seeded example bars ---------- */
  var BASE = { SPY: [560, 0.15], QQQ: [480, 0.19], IWM: [220, 0.21], AAPL: [230, 0.25], NVDA: [180, 0.45], TSLA: [300, 0.55] };
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  function exampleBars(sym) {
    var seed = 0; for (var i = 0; i < sym.length; i++) seed = seed * 31 + sym.charCodeAt(i);
    var r = rng(seed + 7), b = BASE[sym] || [100, 0.3], vol = b[1] / Math.sqrt(252), px = b[0] * 0.8, out = [];
    function gauss() { var u = Math.max(1e-9, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    var end = etDate(Date.now()), d = addDays(end, -760), regime = 1;
    for (; d <= end; d = addDays(d, 1)) {
      if (!isTrading(d)) continue;
      if (r() < 0.02) regime = 0.7 + r() * 0.9;                       // volatility comes in spells
      var z = gauss() * (r() < 0.03 ? 2.4 : 1), ret = 0.0003 + z * vol * regime;
      var o = px * (1 + gauss() * vol * 0.25), c = px * (1 + ret);
      var h = Math.max(o, c) * (1 + Math.abs(gauss()) * vol * 0.45), l = Math.min(o, c) * (1 - Math.abs(gauss()) * vol * 0.45);
      out.push({ d: d, o: o, h: h, l: l, c: c });
      px = c;
    }
    return out;
  }
  var CACHE = {};
  function getJSON(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.error) { var e = new Error(j.error || "http_" + r.status); e.code = j.error || r.status; throw e; } return j; });
    });
  }
  function loadDaily(sym) {
    if (CACHE[sym]) return CACHE[sym];
    var tok = token(), to = etDate(Date.now()), from = addDays(to, -760);
    var url = "/api/bars.php?symbol=" + encodeURIComponent(sym) + "&span=day&from=" + from + "&to=" + to + (tok ? "&preview=" + encodeURIComponent(tok) : "");
    CACHE[sym] = getJSON(url).then(function (j) {
      var bars = (j.bars || []).map(function (b) { return { d: etDate(b[0]), o: b[1], h: b[2], l: b[3], c: b[4] }; });
      if (bars.length < 60) throw new Error("too_few_bars");
      return { live: true, bars: bars, delay: j.delay || "", updated: j.updated ? j.updated * 1000 : null, stale: !!j.stale };
    }).catch(function (e) {
      return { live: false, why: String(e.code || e.message || "offline"), bars: exampleBars(sym) };
    });
    return CACHE[sym];
  }
  function loadLatest(sym) {                    // 5-minute bars for the latest delayed price
    var tok = token();
    return getJSON("/api/bars.php?symbol=" + encodeURIComponent(sym) + "&mult=5" + (tok ? "&preview=" + encodeURIComponent(tok) : "")).then(function (j) {
      var b = j.bars || []; if (!b.length) throw new Error("none");
      var last = etDate(b[b.length - 1][0]), day = b.filter(function (x) { return etDate(x[0]) === last; });
      return { d: last, t: b[b.length - 1][0], o: day[0][1], h: Math.max.apply(null, day.map(function (x) { return x[2]; })),
               l: Math.min.apply(null, day.map(function (x) { return x[3]; })), c: b[b.length - 1][4], delay: j.delay || "", delay_s: j.delay_s, stale: !!j.stale };
    });
  }
  function loadChain(sym, exp, px) {
    var tok = token();
    return getJSON("/api/em-chain.php?symbol=" + encodeURIComponent(sym) + "&exp=" + exp + "&px=" + px.toFixed(2) + (tok ? "&preview=" + encodeURIComponent(tok) : ""));
  }

  /* ---------- statistics on daily bars ---------- */
  function hv(bars, end, n) {                   // annualised close-to-close volatility of the n days ending at index end
    if (end - n < 0) return NaN;
    var r = [], i;
    for (i = end - n + 1; i <= end; i++) r.push(Math.log(bars[i].c / bars[i - 1].c));
    var m = r.reduce(function (a, b) { return a + b; }, 0) / r.length;
    var v = r.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (r.length - 1);
    return Math.sqrt(v * 252);
  }
  function windows(bars, n) {                   // non-overlapping n-day windows, newest last
    var out = [];
    for (var e = bars.length - 1; e - n >= 0; e -= n) {
      var s = e - n, hi = -Infinity, lo = Infinity;
      for (var k = s + 1; k <= e; k++) { hi = Math.max(hi, bars[k].h); lo = Math.min(lo, bars[k].l); }
      out.unshift({ s: s, e: e, move: bars[e].c / bars[s].c - 1, up: hi / bars[s].c - 1, dn: lo / bars[s].c - 1 });
    }
    return out;
  }
  function quantile(arr, q) { var a = arr.slice().sort(function (x, y) { return x - y; }); if (!a.length) return NaN; var p = (a.length - 1) * q, i = Math.floor(p); return a[i] + (a[Math.min(a.length - 1, i + 1)] - a[i]) * (p - i); }
  function weeks(bars) {                        // Friday-to-Friday (last session of each week) windows
    var ends = [];
    for (var i = 0; i < bars.length; i++) if (i === bars.length - 1 ? wday(bars[i].d) === 5 : weekKey(bars[i + 1].d) !== weekKey(bars[i].d)) ends.push(i);
    var out = [];
    for (var k = 1; k < ends.length; k++) {
      var s = ends[k - 1], e = ends[k], hi = -Infinity, lo = Infinity;
      for (var j = s + 1; j <= e; j++) { hi = Math.max(hi, bars[j].h); lo = Math.min(lo, bars[j].l); }
      out.push({ s: s, e: e, move: bars[e].c / bars[s].c - 1, up: hi / bars[s].c - 1, dn: lo / bars[s].c - 1, n: e - s });
    }
    return out;
  }

  /* ---------- chain → method inputs ---------- */
  function fromChain(j, px) {
    var C1 = {}, P1 = {}, ks = {};
    function price(r) { return r[2] > 0 ? r[2] : r[4] > 0 ? r[4] : r[5] > 0 ? r[5] : NaN; }
    (j.rows || []).forEach(function (r) { (r[0] === "C" ? C1 : P1)[r[1]] = r; ks[r[1]] = 1; });
    var K = Object.keys(ks).map(Number).filter(function (k) { return C1[k] && P1[k]; }).sort(function (a, b) { return a - b; });
    if (!K.length) return null;
    var atm = K.reduce(function (b, k) { return Math.abs(k - px) < Math.abs(b - px) || (Math.abs(k - px) === Math.abs(b - px) && k > b) ? k : b; }, K[0]);
    var itmC = K.filter(function (k) { return k < px; }).pop(), itmP = K.filter(function (k) { return k > px; })[0];
    function d16(side) {
      var rows = (side === "C" ? Object.keys(C1).map(function (k) { return C1[k]; }) : Object.keys(P1).map(function (k) { return P1[k]; }))
        .filter(function (r) { return isFinite(r[7]) && r[7] !== null; }).sort(function (a, b) { return a[1] - b[1]; });
      var tgt = side === "C" ? 0.16 : -0.16;
      for (var i = 1; i < rows.length; i++) {
        var a = rows[i - 1], b = rows[i];
        if ((a[7] - tgt) * (b[7] - tgt) <= 0 && a[7] !== b[7]) return a[1] + (tgt - a[7]) / (b[7] - a[7]) * (b[1] - a[1]);
      }
      return NaN;
    }
    var ivs = [C1[atm][6], P1[atm][6]].filter(function (v) { return v > 0; });
    return {
      atm: atm, call: price(C1[atm]), put: price(P1[atm]),
      itmC: itmC, itmCall: itmC != null && C1[itmC] ? price(C1[itmC]) : NaN,
      itmP: itmP, itmPut: itmP != null && P1[itmP] ? price(P1[itmP]) : NaN,
      iv: ivs.length ? ivs.reduce(function (a, b) { return a + b; }, 0) / ivs.length : NaN,
      d16c: d16("C"), d16p: d16("P"), basis: (j.rows || []).some(function (r) { return r[2] > 0; }) ? "ask" : "mid / last"
    };
  }

  /* =====================================================================
     the dashboard
     ===================================================================== */
  function dashboard(root) {
    var F = $(root, "form"), svg = $(root, "chart").querySelector("svg"), tip = $(root, "tip");
    var S = {
      sym: (store("em3_sym") || "SPY").toUpperCase(), refMode: "friday", exp: "", method: store("em3_method") || "straddle",
      data: null, latest: null, bars: [], chainState: "idle", watch: false, lastZone: null
    };
    if (!RE.test(S.sym)) S.sym = "SPY";
    var inputs = {}; ["sym", "ref", "exp", "call", "put", "itmCall", "itmPut", "iv", "d16c", "d16p"].forEach(function (k) { inputs[k] = F.querySelector('[name="' + k + '"]'); });
    inputs.sym.value = S.sym;
    var listeners = [];
    var api = { state: S, on: function (f) { listeners.push(f); }, result: null };

    /* quick tickers */
    var q = $(root, "quick");
    q.innerHTML = QUICK.map(function (s) { return '<button type="button" data-sym="' + s + '">' + s + "</button>"; }).join("");
    q.addEventListener("click", function (e) { var b = e.target.closest("button[data-sym]"); if (!b) return; inputs.sym.value = b.getAttribute("data-sym"); setSymbol(); });
    F.addEventListener("submit", function (e) { e.preventDefault(); setSymbol(); });
    function setSymbol() {
      var v = inputs.sym.value.trim().toUpperCase();
      if (!RE.test(v)) { inputs.sym.setCustomValidity("Enter a ticker like SPY"); inputs.sym.reportValidity(); return; }
      inputs.sym.setCustomValidity("");
      if (v !== S.sym) { ["call", "put", "itmCall", "itmPut", "iv", "d16c", "d16p"].forEach(function (k) { inputs[k].value = ""; }); S.exp = ""; }
      S.sym = v; store("em3_sym", v); load();
    }

    /* segmented controls */
    function seg(name, val, cb) {
      var el = F.querySelector('[data-seg="' + name + '"]');
      function paint(v) { el.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === v)); }); }
      el.addEventListener("click", function (e) { var b = e.target.closest("button[data-v]"); if (!b) return; paint(b.getAttribute("data-v")); cb(b.getAttribute("data-v")); });
      paint(val);
      return paint;
    }
    var paintRef = seg("ref", S.refMode, function (v) { S.refMode = v; if (v !== "custom") inputs.ref.value = ""; else inputs.ref.focus(); S.exp = ""; render(); });
    seg("method", S.method, function (v) { S.method = v; store("em3_method", v); showMethod(); render(); });
    function showMethod() {
      F.querySelectorAll("[data-for]").forEach(function (el) { el.hidden = el.getAttribute("data-for").split(" ").indexOf(S.method) < 0; });
    }
    showMethod();
    inputs.ref.addEventListener("input", function () { if (inputs.ref.value !== "") { S.refMode = "custom"; paintRef("custom"); } render(); });
    inputs.exp.addEventListener("change", function () { S.exp = inputs.exp.value; render(); });
    F.querySelector('[data-k="expchips"]').addEventListener("click", function (e) {
      var b = e.target.closest("button[data-e]"); if (!b || !api.ref) return;
      var r = api.ref.date, k = b.getAttribute("data-e");
      S.exp = k === "w1" ? nextFriday(r) : k === "w2" ? nextFriday(nextFriday(r)) : monthly(r);
      render();
    });
    ["call", "put", "itmCall", "itmPut", "iv", "d16c", "d16p"].forEach(function (k) { inputs[k].addEventListener("input", render); });
    $(root, "fill").addEventListener("click", fillChain);
    $(root, "copy").addEventListener("click", function () {
      var r = api.result; if (!r) return;
      var t = S.sym + " expected move to " + S.exp + ": top " + r.hi.toFixed(2) + ", bottom " + r.lo.toFixed(2) + ", reference " + r.ref.toFixed(2);
      var b = $(root, "copy");
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = "Copied"; }, function () { b.textContent = t; })
        .then(function () { setTimeout(function () { b.textContent = "Copy levels"; }, 2200); });
    });
    $(root, "watch").addEventListener("click", function () {
      S.watch = !S.watch;
      $(root, "watch").setAttribute("aria-pressed", String(S.watch));
      $(root, "watch").textContent = S.watch ? "Watching" : "Alert me";
      if (S.watch && "Notification" in window && Notification.permission === "default") { try { Notification.requestPermission(); } catch (e) {} }
      S.lastZone = null; render();
    });
    setInterval(function () { if (S.watch && S.data && S.data.live && !document.hidden) refreshLatest(); }, 60000);

    /* ---------- loading ---------- */
    function load() {
      var sym = S.sym;
      $(root, "badge").className = "dash-badge"; $(root, "badge").textContent = "Loading " + sym + "…";
      S.chainState = "idle";
      loadDaily(sym).then(function (d) {
        if (sym !== S.sym) return;
        S.data = d; S.latest = null; merge();
        render();
        if (d.live) { refreshLatest(); tryChain(true); }
        listeners.forEach(function (f) { f(); });
      });
    }
    function refreshLatest() {
      var sym = S.sym;
      loadLatest(sym).then(function (L) { if (sym !== S.sym) return; S.latest = L; merge(); render(); }, function () {});
    }
    function merge() {                           // daily bars with today's 5-minute bars folded in
      var b = S.data.bars.slice(), L = S.latest;
      if (L && b.length) {
        var last = b[b.length - 1];
        if (L.d === last.d) b[b.length - 1] = { d: last.d, o: last.o, h: Math.max(last.h, L.h), l: Math.min(last.l, L.l), c: L.c };
        else if (L.d > last.d) b.push({ d: L.d, o: L.o, h: L.h, l: L.l, c: L.c });
      }
      S.bars = b;
    }
    function tryChain(auto) {
      if (!api.ref || !S.data || !S.data.live) return;
      var sym = S.sym, exp = S.exp || nextFriday(api.ref.date);
      S.chainState = "loading"; paintChain();
      loadChain(sym, exp, api.ref.price).then(function (j) {
        if (sym !== S.sym) return;
        var x = fromChain(j, api.ref.price);
        if (!x) throw new Error("no_contracts");
        S.chain = x; S.chainState = "ok"; S.chainTime = j.updated ? j.updated * 1000 : Date.now(); S.chainDelay = j.delay || "";
        if (!auto || [inputs.call, inputs.put, inputs.iv, inputs.d16c].every(function (el) { return el.value === ""; })) apply(x);
        paintChain(); render();
      }).catch(function (e) {
        S.chainState = String(e.code || e.message) === "no_options_plan" ? "noplan" : "err"; paintChain();
      });
    }
    function fillChain() { if (S.chain && S.chainState === "ok") { apply(S.chain); render(); } else tryChain(false); }
    function apply(x) {
      function put(el, v, d) { if (isFinite(v)) el.value = v.toFixed(d == null ? 2 : d); }
      put(inputs.call, x.call); put(inputs.put, x.put); put(inputs.itmCall, x.itmCall); put(inputs.itmPut, x.itmPut);
      put(inputs.iv, x.iv * 100, 1); put(inputs.d16c, x.d16c); put(inputs.d16p, x.d16p);
    }
    function paintChain() {
      var el = $(root, "chain"), btn = $(root, "fill");
      var live = S.data && S.data.live;
      btn.hidden = !live || S.chainState === "noplan";
      el.textContent = !live ? "Type the prices from your broker's options chain. Nothing you type leaves this page."
        : S.chainState === "loading" ? "Checking for a live options chain…"
        : S.chainState === "ok" ? "Filled from the live options chain (" + S.chain.basis + " prices, strike " + S.chain.atm + ") · " + etTime(S.chainTime) + " ET" + (S.chainDelay ? " · " + S.chainDelay.toLowerCase() : "") + ". Edit any box to override."
        : S.chainState === "noplan" ? "The site's data plan has stock prices but no options chain, so type these from your broker's chain. Nothing you type leaves this page."
        : S.chainState === "err" ? "The options chain didn't load. Type the prices from your broker's chain, or try again."
        : "Type the prices from your broker's options chain, or fill them from the live chain.";
    }

    /* ---------- the calculation ---------- */
    function reference() {
      var b = S.bars; if (!b.length) return null;
      var last = b[b.length - 1], today = etDate(Date.now());
      if (S.refMode === "custom" && num(inputs.ref) > 0) return { price: num(inputs.ref), date: last.d, idx: b.length - 1, label: "Your price" };
      if (S.refMode === "latest" || S.refMode === "custom") return { price: last.c, date: last.d, idx: b.length - 1, label: last.d === today ? "Latest price" : "Last close" };
      for (var i = b.length - 1; i >= 0; i--) {
        var done = i < b.length - 1 ? weekKey(b[i + 1].d) !== weekKey(b[i].d) : (wday(b[i].d) === 5 || weekKey(today) !== weekKey(b[i].d));
        if (done) return { price: b[i].c, date: b[i].d, idx: i, label: "Friday close" };
      }
      return { price: last.c, date: last.d, idx: b.length - 1, label: "Last close" };
    }
    function calc(ref, cal, tdays) {
      var P = ref.price, out = { rows: [] };
      var call = num(inputs.call), put = num(inputs.put), ic = num(inputs.itmCall), ip = num(inputs.itmPut), iv = num(inputs.iv) / 100,
          uc = num(inputs.d16c), lp = num(inputs.d16p);
      /* IV is quoted from the moment the chain is read, so count its days from today (a weekend read of a Friday close
         gets the broker's 6 days, not 7); straddle and 16 delta prices already carry their own time */
      var today = etDate(Date.now()), calIV = Math.max(1, dnum(S.exp) - dnum(today > ref.date ? today : ref.date)), t = Math.sqrt(calIV / 365);
      var str = call > 0 && put > 0 ? call + put : NaN;
      var sd = str > 0 ? str * STRADDLE_TO_1SD : iv > 0 ? P * iv * t : NaN;     // best 1σ in dollars, for the odds column
      if (str > 0) out.rows.push({ m: "straddle", name: "ATM straddle × 1.25", em: str * STRADDLE_TO_1SD, hi: P + str * STRADDLE_TO_1SD, lo: P - str * STRADDLE_TO_1SD, odds: inside(1),
                                   note: "straddle $" + str.toFixed(2) + " alone ≈ 0.8σ, about " + pct(inside(0.8), 0) + " odds" });
      if (str > 0 && ic > 0 && ip > 0) { var m2 = (str + ic + ip) / 2;
        out.rows.push({ m: "m2", name: "Straddle + ITM strangle ÷ 2", em: m2, hi: P + m2, lo: P - m2, odds: sd > 0 ? inside(m2 / sd) : NaN, note: "platform-style figure, a rule of thumb" }); }
      if (iv > 0) out.rows.push({ m: "iv", name: "Implied volatility", em: P * iv * t, hi: P + P * iv * t, lo: P - P * iv * t, odds: inside(1), note: (iv * 100).toFixed(1) + "% × √(" + calIV + " days from today ÷ 365)" });
      if (uc > P && lp > 0 && lp < P) out.rows.push({ m: "d16", name: "16 delta strikes", em: (uc - lp) / 2, hi: uc, lo: lp, odds: 0.68, note: "shows the skew: +" + usd(uc - P) + " / −" + usd(P - lp) });
      var pick = out.rows.filter(function (r) { return r.m === S.method; })[0];
      if (pick) { out.main = pick; out.source = "implied"; }
      else if (out.rows.length) { out.main = out.rows[0]; out.source = "implied"; }
      else {
        var h = hv(S.bars, ref.idx, 20), e = P * h * Math.sqrt(Math.max(1, tdays) / 252);
        out.main = { m: "hv", name: "20-day realized volatility", em: e, hi: P + e, lo: P - e, odds: inside(1), note: "realized " + (h * 100).toFixed(1) + "% · not the options market's number" };
        out.source = "hv";
      }
      out.sd = out.main.m === "d16" || out.main.m === "m2" ? (sd > 0 ? sd : out.main.em) : out.main.em;
      out.iv = out.sd / (P * t);
      return out;
    }

    /* ---------- render ---------- */
    function render() {
      if (!S.data) return;
      var d = S.data, ref = reference(); api.ref = ref;
      if (!ref) return;
      if (!S.exp || S.exp <= ref.date) S.exp = nextFriday(ref.date);
      inputs.exp.value = S.exp; inputs.exp.min = addDays(ref.date, 1);
      if (S.refMode !== "custom") inputs.ref.placeholder = ref.price.toFixed(2);
      var cal = dnum(S.exp) - dnum(ref.date), tdays = tradingDaysBetween(ref.date, S.exp);
      var r = calc(ref, cal, tdays), m = r.main;
      api.result = { ref: ref.price, hi: m.hi, lo: m.lo, em: m.em, sd: r.sd, iv: r.iv, cal: cal, tdays: tdays, refIdx: ref.idx, refDate: ref.date, source: r.source, method: m };

      /* badge + source line */
      var badge = $(root, "badge"), last = S.bars[S.bars.length - 1];
      if (d.live) {
        var stale = d.stale || (S.latest && S.latest.stale);
        badge.className = "dash-badge " + (stale ? "is-stale" : "is-live");
        badge.textContent = (stale ? "Stale" : "Live") + " · " + ((S.latest && S.latest.delay) || d.delay || "delayed");
        var asof = S.latest ? etTime(S.latest.t + 5 * 60000) + " ET, " + nice(S.latest.d) : "close of " + nice(last.d);
        $(root, "foot").textContent = "Prices: Massive stock data, " + (((S.latest && S.latest.delay) || d.delay || "delayed").toLowerCase()) + ", as of " + asof +
          (stale ? " (the last good copy; the data feed didn't answer)" : "") + ". Options inputs: " + (S.chainState === "ok" ? "live chain, editable." : "typed in by you.") + " Odds use a simplified normal model.";
      } else {
        badge.className = "dash-badge is-example"; badge.textContent = "Example data";
        $(root, "foot").textContent = "Live prices are a private preview for now (data license), so the chart and history use made-up example bars, not " + S.sym +
          "'s real prices. The calculator works the same on any numbers you type. Odds use a simplified normal model.";
      }

      /* cards */
      $(root, "sym").textContent = S.sym;
      $(root, "refv").textContent = usd(ref.price);
      $(root, "refl").textContent = ref.label + " · " + nice(ref.date);
      $(root, "dte").textContent = cal + (cal === 1 ? " day" : " days");
      $(root, "dtel").textContent = nice(S.exp, true) + " · " + tdays + " trading " + (tdays === 1 ? "day" : "days");
      $(root, "hi").textContent = usd(m.hi); $(root, "hip").textContent = pct(m.hi / ref.price - 1, 2, true) + " · +" + usd(m.hi - ref.price);
      $(root, "lo").textContent = usd(m.lo); $(root, "lop").textContent = pct(m.lo / ref.price - 1, 2, true) + " · −" + usd(ref.price - m.lo);
      $(root, "basis").innerHTML = r.source === "hv"
        ? '<b class="em-warn">Estimate only:</b> no options prices entered yet, so this is ' + esc(S.sym) + "'s 20-day realized volatility scaled to " + tdays + " trading days (" + esc(m.note.replace(" · not the options market's number", "")) + "). Enter the chain prices below for the options market's number."
        : "<b>" + esc(m.name) + "</b> · " + esc(m.note) + ". About " + pct(m.odds, 0) + " odds " + esc(S.sym) + " finishes inside on " + esc(nice(S.exp)) + " in a simplified model; about " + pct(stayInside(m.em / r.sd), 0) + " that it never trades outside before then.";

      /* the comparison table */
      var tb = $(root, "rows");
      tb.innerHTML = r.rows.length ? r.rows.map(function (x) {
        return '<tr' + (x === m ? ' class="on"' : "") + '><th>' + esc(x.name) + '</th><td>±' + usd(x.em) + '</td><td>' + usd(x.lo) + " – " + usd(x.hi) + '</td><td>' + (isFinite(x.odds) ? "≈" + pct(x.odds, 0) : "—") + "</td></tr>";
      }).join("") : '<tr><td colspan="4" class="txt">Enter the at-the-money call and put to compare the methods.</td></tr>';

      status(ref, m);
      chart(ref, m, r);
      paintChain();
      listeners.forEach(function (f) { f("render"); });
    }

    function status(ref, m) {
      var el = $(root, "status"), last = S.bars[S.bars.length - 1], L = last.c, zone, txt;
      var expired = last.d >= S.exp;
      var pos = (L - ref.price) / ((L >= ref.price ? m.hi : m.lo) - ref.price);
      if (last.d === ref.date && S.refMode !== "custom") {
        zone = "set"; txt = "Range set from " + (ref.label === "Friday close" ? "Friday's close" : ref.label.toLowerCase()) + " of " + usd(ref.price) + ". Alerts compare each new price with these two levels.";
      } else if (expired) {
        var inR = L <= m.hi && L >= m.lo;
        zone = inR ? "in" : "out"; txt = "Expiration has passed: " + S.sym + " finished at " + usd(L) + ", " + (inR ? "inside" : "outside") + " the range.";
      } else if (pos > 1) { zone = "out"; txt = (L > ref.price ? "Above the top" : "Below the bottom") + " of the expected move: " + usd(L) + ". A new entry this way is a chase. That's not a reversal signal on its own; trends and news can run further.";
      } else if (pos > 0.75) { zone = "near"; txt = "Near the " + (L > ref.price ? "top" : "bottom") + ": " + usd(L) + " is " + pct(Math.abs((L > ref.price ? m.hi : m.lo) / L - 1), 2) + " from " + usd(L > ref.price ? m.hi : m.lo) + ".";
      } else { zone = "in"; txt = "Inside the range: " + usd(L) + ", " + pct(Math.abs(L / ref.price - 1), 2) + " " + (L >= ref.price ? "above" : "below") + " the reference. An ordinary move so far."; }
      el.className = "dash-status z-" + zone;
      el.textContent = txt + (S.watch ? (S.data.live ? " Checking every minute while this page is open." : " (Alerts need live prices.)") : "");
      if (S.watch && S.lastZone && zone !== S.lastZone && (zone === "near" || zone === "out")) {
        el.classList.add("flash");
        if ("Notification" in window && Notification.permission === "granted") { try { new Notification(S.sym + " expected move", { body: txt }); } catch (e) {} }
      }
      S.lastZone = zone;
    }

    /* ---------- the chart ---------- */
    function chart(ref, m, r) {
      var d = S.data, box = $(root, "chart"), w = box.clientWidth || 900, narrow = w < 620;
      var W = Math.max(320, Math.round(w)), H = narrow ? 300 : 360;
      var padL = narrow ? 8 : 12, padR = narrow ? 76 : 120, padT = 18, padB = 30;
      var b = S.bars, show = narrow ? 22 : 44, i0 = Math.max(0, Math.min(ref.idx - 3, b.length - show)), seen = b.slice(i0);
      var fut = tradingDates(b[b.length - 1].d, S.exp), N = seen.length + fut.length;
      var expI = seen.length - 1 + fut.length, refI = ref.idx - i0;
      if (b[b.length - 1].d >= S.exp) { expI = seen.length - 1; for (var q = 0; q < seen.length; q++) if (seen[q].d >= S.exp) { expI = q; break; } }
      var lo = Math.min(m.lo, Math.min.apply(null, seen.map(function (x) { return x.l; }))), hi = Math.max(m.hi, Math.max.apply(null, seen.map(function (x) { return x.h; })));
      var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      /* past bars on the left, the days to expiration on the right with at least ~30% of the width, so the range reads */
      var x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB, nP = seen.length, nF = Math.max(0, expI - (nP - 1));
      var futW = nF ? Math.max((x1 - x0) * nF / N, (x1 - x0) * (narrow ? 0.34 : 0.3)) : 0, cw = (x1 - x0 - futW) / Math.max(nP, 2), cwF = nF ? (futW - cw / 2) / nF : cw;
      function X(i) { return i <= nP - 1 ? x0 + cw * (i + 0.5) : x0 + cw * (nP - 0.5) + cwF * (i - nP + 1); }
      function Y(p) { return y1 - (p - lo) / (hi - lo) * (y1 - y0); }
      var s = '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>';
      /* grid */
      var step = niceStep((hi - lo) / (narrow ? 4 : 6));
      for (var g = Math.ceil(lo / step) * step; g <= hi; g += step) {
        s += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(g).toFixed(1) + '" y2="' + Y(g).toFixed(1) + '" stroke="rgba(255,255,255,0.06)"/>';
        s += t(x1 + 6, Y(g) + 4, g.toFixed(step < 1 ? 2 : 0), C.faint, 11, "start");
      }
      /* the range: a √time cone from the reference to expiration, and the two flat levels */
      if (expI > refI) {
        var pts = [], ptsB = [];
        for (var k = refI; k <= expI; k++) { var f = Math.sqrt((k - refI) / (expI - refI)); pts.push(X(k).toFixed(1) + "," + Y(ref.price + (m.hi - ref.price) * f).toFixed(1)); ptsB.unshift(X(k).toFixed(1) + "," + Y(ref.price - (ref.price - m.lo) * f).toFixed(1)); }
        s += '<rect x="' + X(refI).toFixed(1) + '" y="' + Y(m.hi).toFixed(1) + '" width="' + (X(expI) - X(refI)).toFixed(1) + '" height="' + (Y(m.lo) - Y(m.hi)).toFixed(1) + '" fill="' + C.up + '" opacity="0.06"/>';
        s += '<polygon points="' + pts.concat(ptsB).join(" ") + '" fill="' + C.up + '" opacity="0.12"/>';
        s += '<line x1="' + X(expI).toFixed(1) + '" x2="' + X(expI).toFixed(1) + '" y1="' + y0 + '" y2="' + y1 + '" stroke="rgba(255,255,255,0.22)" stroke-dasharray="3 4"/>';
      }
      var xa = X(refI) - cw / 2;
      s += '<line x1="' + xa.toFixed(1) + '" x2="' + x1 + '" y1="' + Y(m.hi).toFixed(1) + '" y2="' + Y(m.hi).toFixed(1) + '" stroke="' + C.up + '" stroke-width="2" stroke-dasharray="7 5"/>';
      s += '<line x1="' + xa.toFixed(1) + '" x2="' + x1 + '" y1="' + Y(m.lo).toFixed(1) + '" y2="' + Y(m.lo).toFixed(1) + '" stroke="' + C.dn + '" stroke-width="2" stroke-dasharray="7 5"/>';
      s += '<line x1="' + xa.toFixed(1) + '" x2="' + x1 + '" y1="' + Y(ref.price).toFixed(1) + '" y2="' + Y(ref.price).toFixed(1) + '" stroke="rgba(255,255,255,0.4)" stroke-dasharray="3 4"/>';
      /* candles */
      var bw = Math.max(2, Math.min(11, cw * 0.62));
      seen.forEach(function (c, i) {
        var col = c.c >= c.o ? C.up : C.dn, x = X(i);
        s += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + Y(c.h).toFixed(1) + '" y2="' + Y(c.l).toFixed(1) + '" stroke="' + col + '" stroke-width="1.2"/>';
        s += '<rect x="' + (x - bw / 2).toFixed(1) + '" y="' + Y(Math.max(c.o, c.c)).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1.2, Math.abs(Y(c.o) - Y(c.c))).toFixed(1) + '" fill="' + col + '" rx="1"/>';
      });
      var L = seen[seen.length - 1];
      s += '<circle cx="' + X(seen.length - 1).toFixed(1) + '" cy="' + Y(L.c).toFixed(1) + '" r="4" fill="' + C.ink + '" stroke="' + C.bg + '" stroke-width="2"/>';
      /* labels on the right */
      s += tagR(x1 + 4, Y(m.hi), usd(m.hi), C.up, narrow);
      s += tagR(x1 + 4, Y(m.lo), usd(m.lo), C.dn, narrow);
      if (Math.abs(Y(ref.price) - Y(m.hi)) > 26 && Math.abs(Y(ref.price) - Y(m.lo)) > 26) s += tagR(x1 + 4, Y(ref.price), usd(ref.price), C.box, narrow, C.ink);
      if (!narrow) {
        s += t(X(refI) + cw / 2 + 8, Y(m.hi) - 7, "upper expected move " + pct(m.hi / ref.price - 1, 2, true), C.up, 12, "start", 600);
        s += t(X(refI) + cw / 2 + 8, Y(m.lo) + 17, "lower expected move " + pct(m.lo / ref.price - 1, 2, true), C.dn, 12, "start", 600);
      }
      /* x labels */
      if (X(expI) - X(refI) > 70 || expI <= refI) s += t(X(refI), y1 + 19, narrow ? short(ref.date) : "ref " + short(ref.date), C.mute, 11, "middle");
      if (expI > refI) s += t(Math.min(X(expI), x1 - 4), y1 + 19, (narrow ? "" : "expiration ") + short(S.exp), C.ink, 11, narrow ? "end" : "middle", 600);
      s += t(X(0), y1 + 19, short(seen[0].d), C.faint, 11, "start");
      if (!d.live) s += t(x0 + 8, y0 + 14, "EXAMPLE DATA · made-up bars", C.orange, 11, "start", 700);
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.setAttribute("aria-label", S.sym + " daily chart with the expected move from " + usd(m.lo) + " to " + usd(m.hi) + " drawn from " + ref.date + " to the " + S.exp + " expiration" + (d.live ? "" : " (example data)"));
      svg.innerHTML = s;
      chart.map = { X: X, seen: seen, x0: x0, cw: cw, W: W, H: H };
    }
    function niceStep(v) { var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p; }
    function short(s) { var d = new Date(dnum(s) * 864e5); return d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" }); }
    function t(x, y, s, col, size, anchor, weight) { return '<text x="' + (+x).toFixed(1) + '" y="' + (+y).toFixed(1) + '" fill="' + col + '" font-size="' + size + '" text-anchor="' + (anchor || "start") + '"' + (weight ? ' font-weight="' + weight + '"' : "") + ">" + s + "</text>"; }
    function tagR(x, y, s, col, narrow, ink) {
      var w = narrow ? 70 : 82;
      return '<rect x="' + x.toFixed(1) + '" y="' + (y - 11).toFixed(1) + '" width="' + w + '" height="22" rx="6" fill="' + col + '"/>' + t(x + w / 2, y + 4.5, s, ink || "#000", narrow ? 11.5 : 12.5, "middle", 700);
    }
    /* hover: date and OHLC of the candle under the pointer */
    svg.addEventListener("pointermove", function (e) {
      var M = chart.map; if (!M) return;
      var rc = svg.getBoundingClientRect(), x = (e.clientX - rc.left) / rc.width * M.W, i = Math.floor((x - M.x0) / M.cw);
      if (i < 0 || i >= M.seen.length) { tip.hidden = true; return; }
      var c = M.seen[i];
      tip.hidden = false;
      tip.textContent = nice(c.d, true) + " · O " + c.o.toFixed(2) + " H " + c.h.toFixed(2) + " L " + c.l.toFixed(2) + " C " + c.c.toFixed(2);
    });
    svg.addEventListener("pointerleave", function () { tip.hidden = true; });

    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(render, 150); });
    load();
    return api;
  }

  /* =====================================================================
     implied vs actual
     ===================================================================== */
  function versus(root, dash) {
    var svg = root.querySelector("svg");
    function draw() {
      var S = dash.state, R = dash.result; if (!R || !S.bars.length) return;
      var bars = S.bars.slice(0, R.refIdx + 1), n = Math.max(1, R.tdays), W = windows(bars, n);
      var emP = R.em / R.ref, sdP = R.sd / R.ref;
      var moves = W.map(function (w) { return w.move; }), abs = moves.map(Math.abs);
      var med = quantile(abs, 0.5), p68 = quantile(abs, 0.68);
      var fin = W.filter(function (w) { return Math.abs(w.move) <= emP; }).length, stay = W.filter(function (w) { return w.up <= emP && w.dn >= -emP; }).length;
      var h20 = hv(bars, bars.length - 1, 20), h60 = hv(bars, bars.length - 1, 60);
      var ratio = emP / p68, live = S.data.live, implied = R.source === "implied";
      var verdict = !implied ? "Enter options prices to compare" : ratio > 1.15 ? "Options are pricing a bigger move than usual" : ratio < 0.87 ? "Options are pricing a smaller move than usual" : "Options are pricing about a normal move";
      root.querySelector('[data-k="em"]').textContent = "±" + pct(emP, 2);
      root.querySelector('[data-k="eml"]').textContent = (implied ? "implied, " : "realized-vol estimate, ") + n + " trading " + (n === 1 ? "day" : "days");
      root.querySelector('[data-k="p68"]').textContent = "±" + pct(p68, 2);
      root.querySelector('[data-k="p68l"]').textContent = "68% of past " + n + "-day moves were smaller · median " + pct(med, 2);
      root.querySelector('[data-k="ratio"]').textContent = implied ? ratio.toFixed(2) + "×" : "—";
      root.querySelector('[data-k="ratiol"]').textContent = verdict;
      root.querySelector('[data-k="vol"]').textContent = (implied ? (R.iv * 100).toFixed(1) + "%" : "—") + " vs " + (h20 * 100).toFixed(1) + "%";
      root.querySelector('[data-k="voll"]').textContent = "implied vol vs 20-day realized · 60-day " + (h60 * 100).toFixed(1) + "%";
      root.querySelector('[data-k="sum"]').innerHTML = (live ? "" : '<b class="em-warn">Example data.</b> ') +
        "Over the last " + W.length + " non-overlapping " + n + "-day windows of " + esc(S.sym) + ", <b>" + fin + " (" + pct(fin / W.length, 0) + ") finished inside ±" + pct(emP, 2) +
        "</b> and <b>" + stay + " (" + pct(stay / W.length, 0) + ") stayed inside the whole way</b>. The normal model says about " + pct(inside(emP / sdP), 0) + " and " + pct(stayInside(emP / sdP), 0) + ". " +
        (implied ? (ratio > 1.15 ? "The options market is asking for more movement than " + esc(S.sym) + " has usually delivered, so premium is relatively rich: a better week to sell it than to buy it, unless you know about a catalyst." :
                    ratio < 0.87 ? "The options market is asking for less movement than " + esc(S.sym) + " has usually delivered, so premium is relatively cheap. Moves past the range are likelier than the 68% suggests." :
                    "The options market's price is close to what " + esc(S.sym) + " has usually delivered over this length of time.") +
          " Implied volatility usually runs a little above realized; that gap is what option sellers are paid for." : "");
      hist(svg, moves, emP, n);
    }
    function hist(svg, moves, emP, n) {
      var box = svg.parentNode, w = box.clientWidth || 900, narrow = w < 620, W = Math.max(320, Math.round(w)), H = narrow ? 240 : 260;
      var x0 = 14, x1 = W - 14, y0 = 26, y1 = H - 34;
      var m = Math.max(emP * 2.2, quantile(moves.map(Math.abs), 0.98)), B = narrow ? 24 : 40, bins = [], k;
      for (k = 0; k < B; k++) bins.push(0);
      moves.forEach(function (v) { var i = Math.floor((v + m) / (2 * m) * B); bins[Math.max(0, Math.min(B - 1, i))]++; });
      var top = Math.max.apply(null, bins) || 1;
      function X(v) { return x0 + (v + m) / (2 * m) * (x1 - x0); }
      var s = '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>';
      s += '<rect x="' + X(-emP).toFixed(1) + '" y="' + y0 + '" width="' + (X(emP) - X(-emP)).toFixed(1) + '" height="' + (y1 - y0) + '" fill="' + C.up + '" opacity="0.1"/>';
      bins.forEach(function (c, i) {
        var a = -m + 2 * m * i / B, b = a + 2 * m / B, mid = (a + b) / 2, h = c / top * (y1 - y0 - 8);
        s += '<rect x="' + (X(a) + 1).toFixed(1) + '" y="' + (y1 - h).toFixed(1) + '" width="' + Math.max(1, X(b) - X(a) - 2).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="2" fill="' + (Math.abs(mid) <= emP ? C.up : C.dn) + '" opacity="0.85"/>';
      });
      [[-emP, C.dn], [emP, C.up]].forEach(function (q) { s += '<line x1="' + X(q[0]).toFixed(1) + '" x2="' + X(q[0]).toFixed(1) + '" y1="' + (y0 - 6) + '" y2="' + y1 + '" stroke="' + q[1] + '" stroke-width="2" stroke-dasharray="6 4"/>'; });
      s += '<line x1="' + x0 + '" x2="' + x1 + '" y1="' + y1 + '" y2="' + y1 + '" stroke="rgba(255,255,255,0.25)"/>';
      s += txt(X(0), y1 + 20, "0%", C.faint, 11, "middle") + txt(X(-emP), y1 + 20, pct(-emP, 1, true), C.dn, 11.5, "middle", 700) + txt(X(emP), y1 + 20, pct(emP, 1, true), C.up, 11.5, "middle", 700);
      s += txt(x0, 16, "Past " + n + "-day moves · " + moves.length + " windows", C.faint, 11.5, "start");
      s += txt(x1, 16, "inside the range", C.up, 11.5, "end", 600);
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.innerHTML = s;
    }
    function txt(x, y, s, col, size, anchor, weight) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + size + '" text-anchor="' + anchor + '"' + (weight ? ' font-weight="' + weight + '"' : "") + ">" + s + "</text>"; }
    dash.on(function () { draw(); });
  }

  /* =====================================================================
     accuracy tracker: weekly 1σ ranges from realized volatility, scored
     ===================================================================== */
  function tracker(root, dash) {
    var tb = root.querySelector("tbody"), note = document.querySelector("[data-em-note]") || document.createElement("p"), started = false;
    function row(sym, d) {
      var b = d.bars, W = weeks(b).filter(function (w) { return w.s >= 21; }).slice(-104);
      var fin = 0, stay = 0, absm = 0, fc = 0;
      W.forEach(function (w) {
        var e = hv(b, w.s, 20) * Math.sqrt(w.n / 252);
        if (Math.abs(w.move) <= e) fin++;
        if (w.up <= e && w.dn >= -e) stay++;
        absm += Math.abs(w.move); fc += e;
      });
      var n = W.length || 1;
      return "<tr><th>" + esc(sym) + (d.live ? "" : ' <small class="em-warn">example</small>') + "</th><td>" + W.length + "</td><td class=\"hl\">" + pct(fin / n, 0) + "</td><td>" + pct(stay / n, 0) +
             "</td><td>±" + pct(fc / n, 2) + "</td><td>" + pct(absm / n, 2) + "</td></tr>";
    }
    function run() {
      if (started) return; started = true;
      var syms = TRACK.slice(); if (syms.indexOf(dash.state.sym) < 0) syms.push(dash.state.sym);
      tb.innerHTML = syms.map(function (s) { return '<tr data-s="' + s + '"><th>' + s + '</th><td colspan="5" class="txt">Loading…</td></tr>'; }).join("");
      var anyExample = false, p = Promise.resolve();
      syms.forEach(function (s) {
        p = p.then(function () { return loadDaily(s); }).then(function (d) {
          if (!d.live) anyExample = true;
          var tr = tb.querySelector('[data-s="' + s + '"]'); if (tr) tr.outerHTML = row(s, d);
        });
      });
      p.then(function () {
        note.innerHTML = (anyExample ? '<b class="em-warn">Example data:</b> live prices are a private preview for now, so these rows are scored on made-up bars and only show how the tracker works. ' : "") +
          "Each row scores up to 104 Friday-to-Friday weeks. The range at the start of each week is a 1σ move from the prior 20 days' realized volatility, because past option prices aren't in the data feed. " +
          "Theory says about 68% finish inside and about 37% stay inside all week. Real markets have fat tails: quiet weeks bunch up inside, and the misses that do happen tend to be big.";
      });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); run(); } }, { rootMargin: "300px" });
      io.observe(root);
    } else run();
  }

  /* =====================================================================
     sticky contents bar + collapsible walkthroughs
     ===================================================================== */
  function toc(nav) {
    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var map = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
    function onScroll() {
      var y = 140, k = 0;
      map.forEach(function (el, i) { if (el && el.getBoundingClientRect().top <= y) k = i; });
      links.forEach(function (a, i) {
        var on = i === k;
        if (on !== (a.getAttribute("aria-current") === "true")) {
          a.setAttribute("aria-current", on ? "true" : "false");
          if (on && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - 16, behavior: "smooth" });
        }
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
  document.querySelectorAll("details.walk").forEach(function (d) {
    d.addEventListener("toggle", function () { if (d.open) window.dispatchEvent(new Event("resize")); });
  });

  var root = document.querySelector("[data-em-dash]");
  if (root) {
    var dash = dashboard(root);
    var vs = document.querySelector("[data-em-vs]"); if (vs) versus(vs, dash);
    var tr = document.querySelector("[data-em-track]"); if (tr) tracker(tr, dash);
    window.EMDash = dash;                        // exposed for checks in testing
  }
  var nav = document.querySelector("[data-em-toc]"); if (nav) toc(nav);
})();

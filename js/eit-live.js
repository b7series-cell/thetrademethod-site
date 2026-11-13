/* =====================================================================
   eit-live.js — live Energy in the Tank chart on daily bars.

   Pulls about 1,000 calendar days of daily bars from /api/bars.php (the
   API key stays on the server; the extra history warms the measure
   and the weekly check) and runs the page's rules in the browser:
     · the measure    = 2 × standard deviation of the last 20 closes
                        ÷ ATR(14)  (ATR = simple 14-day average of true
                        range, as the page's walkthrough computes it)
     · squeeze        = the measure below 1.5; expansion = above 6
     · the level      = the top of the coil: the highest CLOSE of the 20
                        days the measure was reading when the squeeze
                        began and of every day since (simplest objective
                        "top of the range"; mirrored: the lowest close)
     · the setup stays armed while the squeeze is on and for 10 trading
                        days after the measure last read below 1.5
     · outlier volume = volume ≥ average + 2 standard deviations of the 20
                        days before the bar (the page's 2σ line)
     · BUY            = an armed day CLOSES above the level on outlier
                        volume; buy that close. SELL is the mirror (the
                        measure is direction-agnostic, so a squeeze can
                        resolve either way)
     · skipped        = a close through the level on ordinary volume ("low
                        vol"), an outlier-volume day that only wicks
                        through the level ("poke"), and an outlier-volume
                        close beyond the 20-day closing range with no
                        squeeze behind it ("no squeeze"). Only the first
                        low-volume close per side of each squeeze is marked
     · stop           = a CLOSE back below the level (above it, short),
                        exited at that close, never the breakout bar's
                        intrabar low. Results are in % (the close that
                        stops it can land well past the level, so R off
                        the level would mislead)
     · trim cue       = the first close after entry with the measure above
                        6: the tracked trade ends there (managing the rest
                        is discretionary)
     · stop checked before the trim; one trade at a time
     · weekly check   = the same measure on weekly bars built from the
                        dailies, below 1.5 in any of the 8 completed weeks
                        before the signal. Reported, not required.
   Signals are taken on CLOSED daily bars only; during the session today's
   bar is drawn but ignored until it has closed.

   Mount: <section data-eit-live data-symbol="NVDA">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { n: 20, k: 2, atr: 14, sq: 1.5, ex: 6, grace: 10, vn: 20, vk: 2, wkLook: 8 };

  /* ---------- the rules (pure: bars in, lines and events out) ----------
     B: [{ d: "YYYY-MM-DD", o, h, l, c, v }] oldest first; nClosed: bars that have closed */
  function measure(H, L, C, o) {
    var out = [], i, j;
    for (i = 0; i < C.length; i++) {
      if (i < Math.max(o.n - 1, o.atr)) { out.push(null); continue; }
      var mu = 0; for (j = i - o.n + 1; j <= i; j++) mu += C[j]; mu /= o.n;
      var vr = 0; for (j = i - o.n + 1; j <= i; j++) vr += (C[j] - mu) * (C[j] - mu);
      var tr = 0; for (j = i - o.atr + 1; j <= i; j++) tr += Math.max(H[j] - L[j], Math.abs(H[j] - C[j - 1]), Math.abs(L[j] - C[j - 1]));
      var atr = tr / o.atr;
      out.push(atr > 0 ? o.k * Math.sqrt(vr / o.n) / atr : null);
    }
    return out;
  }
  function weekKey(d) {
    var p = d.split("-"), t = Date.UTC(+p[0], +p[1] - 1, +p[2]), wd = (new Date(t).getUTCDay() + 6) % 7;
    return new Date(t - wd * 864e5).toISOString().slice(0, 10);
  }
  function signals(B, opt, nClosed) {
    var o = {}, key; for (key in OPT) o[key] = OPT[key]; if (opt) for (key in opt) o[key] = opt[key];
    var n = nClosed == null ? B.length : nClosed, t, j;
    var H = B.map(function (b) { return b.h; }), L = B.map(function (b) { return b.l; }), C = B.map(function (b) { return b.c; });
    var M = measure(H, L, C, o);
    /* the 2-sigma volume line from the 20 days before each bar */
    var VL = B.map(function (b, i) {
      if (i < o.vn) return null;
      var mu = 0, s = 0; for (j = i - o.vn; j < i; j++) mu += B[j].v; mu /= o.vn;
      for (j = i - o.vn; j < i; j++) s += (B[j].v - mu) * (B[j].v - mu);
      return mu + o.vk * Math.sqrt(s / o.vn);
    });
    var VA = B.map(function (b, i) { if (i < o.vn) return null; var s = 0; for (j = i - o.vn; j < i; j++) s += B[j].v; return s / o.vn; });
    /* weekly bars from the closed dailies, and the higher-time-frame check per day */
    var wk = [], wIdx = [];
    for (t = 0; t < n; t++) {
      var k = weekKey(B[t].d), w = wk[wk.length - 1];
      if (!w || w.k !== k) { w = { k: k, h: B[t].h, l: B[t].l, c: B[t].c }; wk.push(w); }
      else { w.h = Math.max(w.h, B[t].h); w.l = Math.min(w.l, B[t].l); w.c = B[t].c; }
      wIdx[t] = wk.length - 1;
    }
    var WM = measure(wk.map(function (x) { return x.h; }), wk.map(function (x) { return x.l; }), wk.map(function (x) { return x.c; }), o);
    function htf(ti) {                                 // completed weeks only: the ones before this day's week
      var wi = wIdx[ti], best = null;
      for (j = Math.max(0, wi - o.wkLook); j < wi; j++) if (WM[j] != null && (best === null || WM[j] < best)) best = WM[j];
      return { ok: best !== null && best < o.sq, min: best };
    }

    var setup = null, tr = null, setups = [], sigs = [], trades = [], rejects = [], busy = [], state = [];
    function close(x, xt, px, why) { var c = {}; for (var q in x) c[q] = x[q]; c.xt = xt; c.x = px; c.why = why;
      c.r = (x.side === "L" ? px - x.e : x.e - px) / x.risk; c.pct = (x.side === "L" ? px / x.e - 1 : 1 - px / x.e) * 100; return c; }
    for (t = 0; t < n; t++) {
      var b = B[t];
      /* exits first, from the day after entry: a close back through the level, then the trim cue */
      if (tr && t > tr.t) {
        var back = tr.side === "L" ? b.c < tr.lvl : b.c > tr.lvl;
        if (back) { trades.push(close(tr, t, b.c, "stop")); tr = null; }
        else if (M[t] != null && M[t] > o.ex) { trades.push(close(tr, t, b.c, "trim")); tr = null; }
      }
      if (M[t] == null) { state[t] = ""; continue; }
      var out = VL[t] != null && b.v >= VL[t];
      if (setup) {
        var up = b.c > setup.hi, dn = b.c < setup.lo;
        if (up || dn) {
          var side = up ? "L" : "S", lvl = up ? setup.hi : setup.lo;
          if (out) {
            setup.end = t; setup.out = side; setup.lvl = lvl;
            if (!tr) {
              var hc = htf(t);
              tr = { t: t, side: side, e: b.c, lvl: lvl, risk: Math.abs(b.c - lvl), vx: b.v / VA[t], vl: VL[t], m: M[t], htf: hc.ok, wkMin: hc.min, s0: setup.t0 };
              sigs.push(tr);
            } else busy.push({ t: t, side: side });
            setup = null;
          } else if (!setup["v" + side]) { setup["v" + side] = 1; rejects.push({ t: t, side: side, why: "v", lvl: lvl, vx: VA[t] ? b.v / VA[t] : null }); }
        } else if (out && (b.h > setup.hi || b.l < setup.lo)) {
          rejects.push({ t: t, side: b.h > setup.hi ? "L" : "S", why: "p", lvl: b.h > setup.hi ? setup.hi : setup.lo });
        }
      } else if (out && !tr && t >= o.n) {
        var hi20 = -Infinity, lo20 = Infinity;
        for (j = t - o.n; j < t; j++) { hi20 = Math.max(hi20, C[j]); lo20 = Math.min(lo20, C[j]); }
        if (b.c > hi20) rejects.push({ t: t, side: "L", why: "n", lvl: hi20 });
        else if (b.c < lo20) rejects.push({ t: t, side: "S", why: "n", lvl: lo20 });
      }
      /* carry the setup: start on a squeeze reading, ratchet the range, lapse after the grace period */
      var inSq = M[t] < o.sq;
      if (setup) {
        setup.hi = Math.max(setup.hi, b.c); setup.lo = Math.min(setup.lo, b.c);
        if (inSq) setup.last = t;
        else if (t - setup.last > o.grace) { setup.end = t; setup.out = "lapsed"; setup = null; }
      } else if (inSq && !(setups.length && setups[setups.length - 1].end === t)) {
        var hi = -Infinity, lo = Infinity;
        for (j = Math.max(0, t - o.n + 1); j <= t; j++) { hi = Math.max(hi, C[j]); lo = Math.min(lo, C[j]); }
        setup = { t0: t, from: Math.max(0, t - o.n + 1), hi: hi, lo: lo, last: t, end: null, out: null };
        setups.push(setup);
      }
      state[t] = inSq ? "q" : setup ? "g" : "";
    }
    var all = trades.slice();
    if (tr) all.push(close(tr, n - 1, B[n - 1].c, "open"));
    var lastW = wk.length ? (wIdx[n - 1] === wk.length - 1 ? wk.length - 2 : wk.length - 1) : -1;   // newest completed week
    return { m: M, vl: VL, va: VA, state: state, setups: setups, signals: sigs, trades: trades, all: all, rejects: rejects, busy: busy,
             open: tr, setup: setup, htfNow: n ? htf(n - 1) : { ok: false, min: null }, wkM: lastW >= 0 ? WM[lastW] : null, opt: o };
  }

  /* ---------- page plumbing ---------- */
  var DAYS = 1000, SHOW = 260, POLL_MS = 5 * 60000;
  var COL = { m: "#64d2ff", sq: "#f4b942", ex: "#30d158", lvl: "#f4b942", entry: "#2997ff", sl: "#ff453a", buy: "#30d158", sell: "#ff453a",
              rej: "#8e8e93", volUp: "rgba(48,209,88,0.40)", volDn: "rgba(255,69,58,0.40)", volHit: "#f4b942", vl: "rgba(245,245,247,0.55)",
              shadeQ: "rgba(244,185,66,0.13)", shadeG: "rgba(244,185,66,0.05)" };
  var root = document.querySelector("[data-eit-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var els = { chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"), status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate") };
  var KIT = LiveKit.controls(root, { key: "eit", symbol: (root.getAttribute("data-symbol") || "NVDA").toUpperCase(), tf: 1, tfs: [],
    onChange: function (sym) { SYMBOL = sym; render.fitted = false; load(); } });
  var SYMBOL = KIT.symbol;

  function previewToken() {
    var t = new URLSearchParams(location.search).get("preview");
    try { if (t) localStorage.setItem("vp_preview", t); else t = localStorage.getItem("vp_preview"); } catch (e) {}
    return t || "";
  }
  function money(x) { return x == null || isNaN(x) ? "—" : x.toFixed(2); }
  function vol(x) { return x == null ? "—" : x >= 1e9 ? (x / 1e9).toFixed(2) + "B" : x >= 1e6 ? (x / 1e6).toFixed(1) + "M" : x >= 1e3 ? Math.round(x / 1e3) + "K" : String(Math.round(x)); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function day(d, yr) { var p = d.split("-"); return MON[+p[1] - 1] + " " + (+p[2]) + (yr ? ", " + p[0] : ""); }
  function pc(x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(1) + "%"; }
  var dfmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
  var tfmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
  function etMin(ms) { var p = tfmt.format(new Date(ms)).split(":"); return (+p[0] % 24) * 60 + (+p[1]); }
  function isoDay(d) { return d.toISOString().slice(0, 10); }

  /* ---------- chart ---------- */
  var chart = null, candles, volS, vlS, mS, shade, lineS = [], RUNS = [], NB = 0;
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "rgba(0,0,0,0)" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.06, bottom: 0.42 } },
      timeScale: { borderVisible: false, rightOffset: 6 }, crosshair: { mode: 0 }
    });
    els.chart.style.background = "#1d1d1f"; els.chart.style.zIndex = "0";
    shade = document.createElement("canvas");
    shade.setAttribute("aria-hidden", "true");
    shade.style.cssText = "position:absolute;left:0;top:0;z-index:-1;pointer-events:none";
    els.chart.appendChild(shade);
    var pending = false;
    function soon() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; drawShade(); }); }
    chart.timeScale().subscribeVisibleLogicalRangeChange(soon);
    window.addEventListener("resize", soon);
    volS = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false });
    vlS = chart.addLineSeries({ priceScaleId: "vol", color: COL.vl, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.62, bottom: 0.25 }, visible: false });
    mS = chart.addLineSeries({ priceScaleId: "ind", color: COL.m, lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      autoscaleInfoProvider: function (orig) { var r = orig(); if (!r) return r; r.priceRange.minValue = 0; r.priceRange.maxValue = Math.max(7, r.priceRange.maxValue); return r; } });
    chart.priceScale("ind").applyOptions({ scaleMargins: { top: 0.79, bottom: 0.02 }, visible: false });
    mS.createPriceLine({ price: OPT.sq, color: COL.sq, lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    mS.createPriceLine({ price: OPT.ex, color: COL.ex, lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
  }
  function drawShade() {
    if (!shade) return;
    var ts = chart.timeScale(), paneW = els.chart.clientWidth - chart.priceScale("right").width();
    var H = els.chart.clientHeight - ts.height(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    shade.style.width = paneW + "px"; shade.style.height = H + "px";
    shade.width = Math.max(1, paneW * dpr); shade.height = Math.max(1, H * dpr);
    var ctx = shade.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, paneW, H);
    var half = (ts.options().barSpacing || 6) / 2;
    RUNS.forEach(function (r) {
      var a = ts.logicalToCoordinate(r.i0), b = ts.logicalToCoordinate(r.i1);
      if (a == null || b == null) return;
      ctx.fillStyle = r.s === "q" ? COL.shadeQ : COL.shadeG;
      ctx.fillRect(a - half, 0, b - a + 2 * half, H);
    });
    /* the lower pane: a divider and its name */
    var y = Math.round(H * 0.77) + 0.5;
    ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(paneW, y); ctx.stroke();
    ctx.fillStyle = "#8e8e93"; ctx.font = "11px -apple-system, BlinkMacSystemFont, Inter, sans-serif";
    ctx.fillText("2σ of 20 closes ÷ ATR(14)", 8, y + 14);
    ctx.textAlign = "right";
    [[OPT.ex, COL.ex, "Expansion " + OPT.ex + "×"], [OPT.sq, COL.sq, "Squeeze " + OPT.sq + "×"]].forEach(function (q) {
      var yy = mS.priceToCoordinate(q[0]);
      if (yy == null) return;
      ctx.fillStyle = q[1]; ctx.fillText(q[2], paneW - 6, yy - 4);
    });
    ctx.textAlign = "left";
  }
  function runsOf(state, n) {
    var out = [], cur = null;
    for (var i = 0; i < n; i++) {
      var s = state[i] || "";
      if (s && cur && cur.s === s && cur.i1 === i - 1) cur.i1 = i;
      else if (s) { cur = { s: s, i0: i, i1: i }; out.push(cur); }
      else cur = null;
    }
    return out;
  }
  function seg(d0, d1, p, color, style, title, live, width) {
    var s = chart.addLineSeries({ color: color, lineWidth: width || 1, lineStyle: style, title: title || "", priceLineVisible: false, lastValueVisible: !!live,
      crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
    s.setData(d0 === d1 ? [{ time: d0, value: p }] : [{ time: d0, value: p }, { time: d1, value: p }]);
    lineS.push(s);
  }

  /* ---------- side panel ---------- */
  function renderSide(r, B, forming, nClosed) {
    var li = nClosed - 1, last = B[li], m = r.m[li], o = r.opt, tr = r.open, S = r.setup;
    var lastSig = r.signals.length ? r.signals[r.signals.length - 1] : null, sigNow = lastSig && lastSig.t === li;
    var zone = m == null ? "—" : m < o.sq ? "Squeeze" : m > o.ex ? "Expansion" : "Middle";
    var status = m == null ? "Warming up the measure"
      : sigNow ? (lastSig.side === "L" ? "BUY: breakout close on outlier volume" : "SELL: breakdown close on outlier volume")
      : tr ? (tr.side === "L" ? "LONG open" : "SHORT open")
      : S && m < o.sq ? "Squeeze on · day " + (li - S.t0 + 1)
      : S ? "Squeeze released · level still armed"
      : m > o.ex ? "Expansion: energy mostly spent"
      : "No squeeze · the fuzzy middle";
    var play = "";
    if (tr) {
      var nowP = (tr.side === "L" ? last.c / tr.e - 1 : 1 - last.c / tr.e) * 100;
      play = "In from the " + money(tr.e) + " close on " + day(B[tr.t].d) + " (volume " + tr.vx.toFixed(1) + "× average). Stop: a close back " + (tr.side === "L" ? "below " : "above ") + money(tr.lvl) +
        ". Trim when the measure closes above " + o.ex + " (now " + (m == null ? "—" : m.toFixed(2)) + "). " + pc(nowP) + " on the last close.";
    } else if (S) {
      play = "Coiled between closes of " + money(S.lo) + " and " + money(S.hi) + " since " + day(B[S.from].d) + ". A close above " + money(S.hi) + " (or below " + money(S.lo) +
        ") on volume of at least " + vol(r.vl[li] == null ? null : r.vl[li]) + " (average + 2σ) is the trade. A wick through the level doesn't count.";
    } else if (m != null && m > o.ex) {
      play = "The measure is past " + o.ex + "×: the move has spent much of its stored energy. Nothing to buy here; expect some mean reversion.";
    } else if (m != null) {
      play = "No stored energy right now. The setup starts when the measure closes below " + o.sq + " (it reads " + m.toFixed(2) + ").";
    }
    var tradeBox = "";
    if (tr) {
      tradeBox = '<div class="live-trade' + (tr.side === "S" ? " short" : "") + '"><b>' + (tr.side === "L" ? "Long" : "Short") + " from " + money(tr.e) + " · " + day(B[tr.t].d, true) +
        "</b><span>Level " + money(tr.lvl) + " · risk " + money(tr.risk) + " · weekly squeeze " + (tr.htf ? "yes" : "no") + "</span></div>";
    }
    var yearAgo = B[Math.max(0, li - 251)].d;
    var sigs = r.all.filter(function (x) { return B[x.t].d >= yearAgo; }).slice(-8).reverse();
    function outcome(x) {
      if (x.why === "open") return '<span class="open">open ' + pc(x.pct) + "</span>";
      return '<span class="' + (x.pct > 0 ? "pos" : "neg") + '">' + (x.why === "trim" ? "trim " : "stop ") + pc(x.pct) + "</span>";
    }
    var skipped = { v: 0, p: 0, n: 0 };
    r.rejects.forEach(function (x) { if (B[x.t].d >= yearAgo) skipped[x.why]++; });
    var trims = 0, stops = 0, sqz = 0;
    r.trades.forEach(function (t) { if (B[t.t].d >= yearAgo) { if (t.why === "trim") trims++; else stops++; } });
    r.setups.forEach(function (s) { if (B[s.t0].d >= yearAgo) sqz++; });
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · daily · last close " + day(last.d, true) + "</p>" +
      '<p class="v">' + status + "</p>" + (play ? '<p class="play">' + play + "</p>" : "") + tradeBox +
      '<dl class="lv"><div><dt>Measure</dt><dd class="' + (zone === "Squeeze" ? "pdh" : zone === "Expansion" ? "up" : "") + '">' + (m == null ? "—" : m.toFixed(2)) + "</dd></div>" +
      "<div><dt>Cycle</dt><dd>" + zone + "</dd></div>" +
      '<div><dt>Weekly</dt><dd class="' + (r.htfNow.ok ? "pdh" : "") + '">' + (r.wkM == null ? "—" : r.wkM.toFixed(2)) + (r.htfNow.ok ? " ✓" : "") + "</dd></div>" +
      '<div><dt>Level ▲</dt><dd class="pdh">' + money(tr ? (tr.side === "L" ? tr.lvl : null) : S ? S.hi : null) + "</dd></div>" +
      '<div><dt>Level ▼</dt><dd class="pdl">' + money(tr ? (tr.side === "S" ? tr.lvl : null) : S ? S.lo : null) + "</dd></div>" +
      "<div><dt>Vol line</dt><dd>" + vol(r.vl[li]) + "</dd></div></dl>" +
      (forming ? '<p class="k">Today\'s bar is still forming. Signals wait for the close.</p>' : "") +
      '<p class="k">Signals, last 12 months</p>' + (sigs.length ? '<ul class="trades">' + sigs.map(function (x) {
        return "<li><span>" + day(B[x.t].d) + " · " + (x.side === "L" ? "BUY " : "SELL ") + money(x.e) + " · " + x.vx.toFixed(1) + "× vol" + (x.htf ? " · wk ✓" : "") + "</span>" + outcome(x) + "</li>";
      }).join("") + "</ul>" : '<p class="quiet">None in the last 12 months.</p>') +
      '<p class="k">12 months: ' + sqz + " squeeze" + (sqz === 1 ? "" : "s") + " · trims " + trims + " · stops " + stops + " · skipped " + skipped.v + " low-volume breaks, " + skipped.p + " pokes, " + skipped.n + " with no squeeze</p>";
  }

  /* ---------- data ---------- */
  function setGate(msg) {
    root.classList.add("gated"); els.gate.hidden = false;
    els.status.textContent = SYMBOL + " · daily · not loaded";
    els.gate.innerHTML = msg.replace(/<\/b>\s*([\s\S]+)$/, "</b><span>$1</span>");
  }
  function load() {
    var tok = previewToken(), to = new Date(), from = new Date(to.getTime() - DAYS * 864e5), mine = SYMBOL;
    var url = "/api/bars.php?symbol=" + encodeURIComponent(SYMBOL) + "&span=day&from=" + isoDay(from) + "&to=" + dfmt.format(to) + (tok ? "&preview=" + encodeURIComponent(tok) : "");
    return fetch(url, { cache: "no-store" }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, body: j }; });
    }).then(function (res) {
      if (mine !== SYMBOL) return false;
      if (!res.ok) {
        var e = res.body && res.body.error;
        if (e === "private") setGate("<b>Live chart in private preview.</b> Open this page once with your preview link to unlock it in this browser.");
        else if (e === "not_configured") setGate("<b>Live chart not configured yet.</b> Add <code>api/config.php</code> on the server.");
        else if (e === "symbol_not_allowed") setGate("<b>" + SYMBOL + " isn't on the allowed list.</b> Add it to <code>symbols</code> in <code>api/config.php</code>, or use <code>'*'</code> to allow any ticker.");
        else if (e === "bad_symbol") setGate("<b>That doesn't look like a ticker.</b>");
        else setGate("<b>Live data unavailable right now.</b> Try again in a minute.");
        return false;
      }
      render(res.body); return true;
    }).catch(function () { setGate("<b>Live data unavailable right now.</b> Try again in a minute."); return false; });
  }

  function render(data) {
    var B = [], seen = {};
    data.bars.forEach(function (a) { var d = dfmt.format(new Date(a[0])); if (!seen[d]) { seen[d] = 1; B.push({ d: d, o: a[1], h: a[2], l: a[3], c: a[4], v: a[5] || 0 }); } });
    if (B.length < 60) { setGate("<b>Not enough history for " + SYMBOL + ".</b> The measure needs a few months of daily bars."); return; }
    /* today's bar is forming until 4:00 pm ET (on the data's clock) */
    var asOf = ((data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900)) * 1000;
    var forming = B[B.length - 1].d === dfmt.format(new Date(asOf)) && etMin(asOf) < 960;
    var nClosed = forming ? B.length - 1 : B.length;
    var r = signals(B, null, nClosed);
    NB = B.length;

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, "Daily");
    candles.setData(B.map(function (b) { return { time: b.d, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    var hit = {}; r.signals.forEach(function (s) { hit[s.t] = 1; });
    volS.setData(B.map(function (b, i) { return { time: b.d, value: b.v, color: hit[i] ? COL.volHit : b.c >= b.o ? COL.volUp : COL.volDn }; }));
    vlS.setData(B.map(function (b, i) { return r.vl[i] == null ? { time: b.d } : { time: b.d, value: r.vl[i] }; }));
    mS.setData(B.map(function (b, i) { return r.m[i] == null || i >= nClosed ? { time: b.d } : { time: b.d, value: r.m[i] }; }));
    RUNS = runsOf(r.state, nClosed);

    /* markers: trades, exits, skipped breaks */
    var marks = [];
    r.signals.forEach(function (s) {
      var L = s.side === "L";
      marks.push({ time: B[s.t].d, position: L ? "belowBar" : "aboveBar", shape: L ? "arrowUp" : "arrowDown", color: L ? COL.buy : COL.sell, text: (L ? "BUY " : "SELL ") + s.vx.toFixed(1) + "×" });
    });
    r.busy.forEach(function (s) { marks.push({ time: B[s.t].d, position: s.side === "L" ? "belowBar" : "aboveBar", shape: "circle", color: COL.rej, text: "in trade" }); });
    var RJ = { v: "low vol", p: "poke", n: "no squeeze" };
    r.rejects.forEach(function (x) { marks.push({ time: B[x.t].d, position: x.side === "L" ? "aboveBar" : "belowBar", shape: "circle", color: COL.rej, text: RJ[x.why] }); });
    r.trades.forEach(function (t) {
      var trim = t.why === "trim";
      marks.push({ time: B[t.xt].d, position: t.side === "L" ? "aboveBar" : "belowBar", shape: "square", color: trim ? COL.ex : COL.sl, text: (trim ? "Trim " : "Stop ") + pc(t.pct) });
    });
    marks.sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
    candles.setMarkers(marks);

    /* levels: every squeeze's range top (and bottom), entry and stop for the recent trades */
    lineS.forEach(function (s) { chart.removeSeries(s); }); lineS = [];
    var lastD = B[nClosed - 1].d, from = Math.max(0, nClosed - SHOW - 40);
    r.setups.forEach(function (s) {
      var end = s.end == null ? nClosed - 1 : s.end;
      if (end < from) return;
      var live = s.end == null;
      if (s.out === "L") seg(B[s.from].d, B[end].d, s.lvl, COL.lvl, 2, "", false);
      else if (s.out === "S") seg(B[s.from].d, B[end].d, s.lvl, COL.lvl, 2, "", false);
      else {
        seg(B[s.from].d, B[end].d, s.hi, COL.lvl, live ? 0 : 2, live ? "Level ▲" : "", live, live ? 1.5 : 1);
        seg(B[s.from].d, B[end].d, s.lo, "rgba(100,210,255,0.8)", live ? 0 : 2, live ? "Level ▼" : "", live, live ? 1.5 : 1);
      }
    });
    var show = r.all.slice(-4);
    show.forEach(function (t) {
      var d0 = B[t.t].d, d1 = B[t.xt].d === d0 ? lastD : B[t.xt].d, live = t.why === "open";
      seg(d0, live ? lastD : d1, t.e, COL.entry, 0, live ? "Entry" : "", live, 1.5);
      seg(d0, live ? lastD : d1, t.lvl, COL.sl, 2, live ? "Stop: close " + (t.side === "L" ? "<" : ">") : "", live, 1.5);
    });

    if (!render.fitted) {
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, B.length - SHOW), to: B.length - 1 + 6 });
      render.fitted = true;
    }
    requestAnimationFrame(drawShade);
    renderSide(r, B, forming, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · daily · 2σ of 20 closes ÷ ATR(14) below, squeeze < " + OPT.sq + " shaded, expansion > " + OPT.ex +
      " · level = highest (lowest) close of the coil · volume with its average + 2σ line" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  window.EITLive = { signals: signals };
  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();

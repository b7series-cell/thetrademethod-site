/* =====================================================================
   crt-live.js — live Three-Candle CRT chart (New York AM).

   Pulls regular-session bars (1-minute by default; 1 / 2 / 5 / 15 selectable) from /api/bars.php (API key
   stays on the server) and runs the logic of pine/three-candle-crt.pine
   in the browser, with the script's default inputs:
     · CRT candles built from 15m / 30m / 1H (aggregated from 1m, 9:30-aligned)
     · C1 marks the range, C2 sweeps one side and closes back inside,
       C3 triggers on the break of C2's extreme
     · entry method: Rebreak (first break → close back inside → second break)
     · TP = C1's opposite extreme, SL placed for a fixed 1.5R
     · 1H bias from key-level sweeps; trades only in the 09:30–12:00 window,
       one trade per session, held to TP or SL

   Mount: <section data-crt-live data-symbol="QQQ">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = {
    winStart: 570, winEnd: 720,         // 09:30 – 12:00 ET
    tfs: [15, 30, 60],
    maxTrades: 1, rr: 1.5, pbTicks: 0, minTgtTk: 8, cancelThru: true,
    entryMode: "Rebreak",
    pivLen: 3, levelLook: 48, acceptN: 2, neutral: "Allow both",
    tick: 0.01
  };
  var RTH_OPEN = 570, RTH_CLOSE = 960, POLL_MS = 60000;

  var root = document.querySelector("[data-crt-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;
  var MULT = 1;
  var KIT = LiveKit.controls(root, { key: "crt", symbol: (root.getAttribute("data-symbol") || "QQQ").toUpperCase(), tf: 1,
    onChange: function (sym, tf) { SYMBOL = sym; MULT = tf; render.fitted = false; load(); } });
  var SYMBOL = KIT.symbol; MULT = KIT.tf;
  var els = {
    chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"),
    status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate")
  };

  function previewToken() {
    var t = new URLSearchParams(location.search).get("preview");
    try { if (t) localStorage.setItem("vp_preview", t); else t = localStorage.getItem("vp_preview"); } catch (e) {}
    return t || "";
  }
  var fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  function etParts(ms) {
    var p = {};
    fmt.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    var h = (+p.hour) % 24;
    return { date: p.year + "-" + p.month + "-" + p.day, min: h * 60 + (+p.minute), wall: Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute) / 1000 };
  }
  function money(x) { return x == null || isNaN(x) ? "—" : x.toFixed(2); }
  function clock(min) { var h = Math.floor(min / 60), m = min % 60; return (h > 12 ? h - 12 : h) + ":" + (m < 10 ? "0" : "") + m; }

  /* ---------- aggregate 1m → HTF bars (buckets anchored at 09:30) ---------- */
  function aggregate(bars, tf) {
    var out = [], cur = null;
    bars.forEach(function (b) {
      var start = RTH_OPEN + Math.floor((b.min - RTH_OPEN) / tf) * tf;
      if (!cur || cur.date !== b.date || cur.start !== start) {
        cur = { date: b.date, start: start, time: b.time, o: b.o, h: b.h, l: b.l, c: b.c };
        out.push(cur);
      } else { cur.h = Math.max(cur.h, b.h); cur.l = Math.min(cur.l, b.l); cur.c = b.c; }
    });
    return out;
  }

  /* ---------- 1H bias: key-level sweep → reclaim / acceptance (port of calcBias) ---------- */
  function biasSeries(h1) {
    var L = OPT.pivLen, pH = [], pHb = [], pL = [], pLb = [];
    var bias = 0, swL = false, swH = false, cntL = 0, cntH = 0, lvlL = null, lvlH = null, res = [];
    for (var i = 0; i < h1.length; i++) {
      var c = i - L;
      if (c - L >= 0) {
        var isH = true, isL = true;
        for (var k = c - L; k <= c + L; k++) {
          if (k === c) continue;
          if (!(h1[c].h > h1[k].h)) isH = false;
          if (!(h1[c].l < h1[k].l)) isL = false;
        }
        if (isH) { pH.push(h1[c].h); pHb.push(c); }
        if (isL) { pL.push(h1[c].l); pLb.push(c); }
      }
      while (pH.length && i - pHb[0] > OPT.levelLook) { pH.shift(); pHb.shift(); }
      while (pL.length && i - pLb[0] > OPT.levelLook) { pL.shift(); pLb.shift(); }
      var keyH = pH.length ? Math.max.apply(null, pH) : null, keyL = pL.length ? Math.min.apply(null, pL) : null;
      var b = h1[i];
      if (!swL && keyL != null && b.l < keyL) { swL = true; lvlL = keyL; cntL = 0; pL = []; pLb = []; }
      if (swL) { if (b.c > lvlL) { bias = 1; swL = false; } else if (++cntL >= OPT.acceptN) { bias = -1; swL = false; } }
      if (!swH && keyH != null && b.h > keyH) { swH = true; lvlH = keyH; cntH = 0; pH = []; pHb = []; }
      if (swH) { if (b.c < lvlH) { bias = -1; swH = false; } else if (++cntH >= OPT.acceptN) { bias = 1; swH = false; } }
      res.push({ bias: bias, keyH: keyH, keyL: keyL });
    }
    return res;
  }

  /* ---------- engine (port of arm / step / manage) ---------- */
  function run(all, today) {
    var htf = {}; OPT.tfs.forEach(function (tf) { htf[tf] = aggregate(all, tf); });
    var h1 = htf[60], bias = biasSeries(h1);
    var cur = all.filter(function (b) { return b.date === today; });
    var setups = [], live = {}, active = null, trades = 0, markers = [], tradeLog = [];
    function htfIndex(tf, b) {
      var arr = htf[tf], start = RTH_OPEN + Math.floor((b.min - RTH_OPEN) / tf) * tf;
      for (var k = arr.length - 1; k >= 0; k--) if (arr[k].date === b.date && arr[k].start === start) return k;
      return -1;
    }
    function fade(s, why, b) { s.state = 4; s.why = why; s.end = b.time; }
    var lastBias = { bias: 0, keyH: null, keyL: null };

    for (var i = 0; i < cur.length; i++) {
      var b = cur[i], inWin = b.min >= OPT.winStart && b.min < OPT.winEnd;
      var hk = htfIndex(60, b);
      var bz = hk > 0 ? bias[hk - 1] : { bias: 0, keyH: null, keyL: null };   // last CONFIRMED 1H bar
      lastBias = bz;

      /* 1 · new HTF candle → expire the old armed setup, look for a fresh C1/C2 */
      OPT.tfs.forEach(function (tf) {
        var k = htfIndex(tf, b), isNew = i === 0 || htfIndex(tf, cur[i - 1]) !== k;
        if (!isNew) return;
        var old = live[tf];
        if (old && old.state < 3) fade(old, "expired: C3 closed", b);
        live[tf] = null;
        if (!inWin || trades >= OPT.maxTrades || k < 2) return;
        var c1 = htf[tf][k - 2], c2 = htf[tf][k - 1];
        if (c1.date !== today || c1.start < OPT.winStart) return;            // C1 opens in today's window
        var d = 0;
        if (c2.l < c1.l && c2.c > c1.l && c2.c < c1.h && c2.h < c1.h) d = 1;
        else if (c2.h > c1.h && c2.c < c1.h && c2.c > c1.l && c2.l > c1.l) d = -1;
        if (!d) return;
        if (bz.bias !== 0 && bz.bias !== d) return;
        if (bz.bias === 0 && OPT.neutral !== "Allow both") return;
        var lvl = d === 1 ? c2.h : c2.l, tp = d === 1 ? c1.h : c1.l;
        if (Math.abs(tp - lvl) < OPT.minTgtTk * OPT.tick) return;
        var s = { tf: tf, dir: d, state: 0, level: lvl, tp: tp, c1: c1, c2: c2, born: b.time, bornMin: b.min, start: c2.time, end: null, why: "" };
        live[tf] = s; setups.push(s);
      });

      /* 2 · manage the open trade (same bar as entry: TP only if SL untouched) */
      if (active) {
        var hitSL = active.dir === 1 ? b.l <= active.sl : b.h >= active.sl;
        var hitTP = active.dir === 1 ? b.h >= active.tp : b.l <= active.tp;
        var res = 0;
        if (i === active.idx) { if (hitTP && !hitSL) res = 1; }
        else if (hitSL) res = -1; else if (hitTP) res = 1;
        if (res) {
          active.r = res === 1 ? OPT.rr : -1; active.exitTime = b.time; active.setup.state = 5; active.setup.end = b.time;
          markers.push({ time: b.time, position: active.dir === 1 ? "aboveBar" : "belowBar", shape: "circle", color: res === 1 ? "#30d158" : "#ff453a", text: (res === 1 ? "+" : "") + active.r.toFixed(1) + "R" });
          active = null;
        }
      }

      /* 3 · trigger state machines, 15m → 30m → 1H, first to fire wins */
      OPT.tfs.forEach(function (tf) {
        var s = live[tf];
        if (!s || s.state >= 3) return;
        var lvl = s.level, provSL = lvl - (s.tp - lvl) / OPT.rr, pb = OPT.pbTicks * OPT.tick;
        var broke = s.dir === 1 ? b.h > lvl : b.l < lvl, pulled = s.dir === 1 ? b.c < lvl - pb : b.c > lvl + pb;
        var thruSL = s.dir === 1 ? b.l <= provSL : b.h >= provSL, ranTP = s.dir === 1 ? b.h >= s.tp : b.l <= s.tp;
        var trig = false;
        if (OPT.cancelThru && thruSL) fade(s, "cancelled: stop traded before entry", b);
        else if (s.state === 0) {
          if (broke) { if (OPT.entryMode === "Direct Break") trig = true; else { s.state = pulled ? 2 : 1; s.firstBreak = b.time; } }
        } else if (s.state === 1) {
          if (pulled) s.state = 2; else if (ranTP) fade(s, "ran to target with no rebreak", b);
        } else if (s.state === 2) { if (broke) trig = true; }
        if (trig) {
          var canEnter = inWin && !active && trades < OPT.maxTrades;
          if (!canEnter) { fade(s, "skipped: " + (active ? "already in a trade" : trades >= OPT.maxTrades ? "session trade limit" : "outside the window"), b); return; }
          var e = s.dir === 1 ? Math.max(lvl, b.o) : Math.min(lvl, b.o);
          if ((s.dir === 1 && e >= s.tp) || (s.dir === -1 && e <= s.tp)) { fade(s, "no room to target", b); return; }
          s.state = 3; s.end = null;
          active = { setup: s, dir: s.dir, tf: tf, entry: e, sl: e - (s.tp - e) / OPT.rr, tp: s.tp, idx: i, time: b.time, min: b.min, r: null };
          tradeLog.push(active); trades++;
          markers.push({ time: b.time, position: s.dir === 1 ? "belowBar" : "aboveBar", shape: s.dir === 1 ? "arrowUp" : "arrowDown", color: s.dir === 1 ? "#30d158" : "#ff453a", text: (tf === 60 ? "1H" : tf + "m") + " CRT" });
        }
      });
    }
    markers.sort(function (a, b) { return a.time - b.time; });
    return { cur: cur, setups: setups, trades: tradeLog, active: active, markers: markers, bias: lastBias };
  }

  /* ---------- chart ---------- */
  var chart, candles, win, extras = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "#1d1d1f" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 8 },
      crosshair: { mode: 0 }
    });
    win = chart.addAreaSeries({ priceScaleId: "win", lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false,
                                lineColor: "rgba(0,0,0,0)", lineWidth: 1, topColor: "rgba(41,151,255,0.08)", bottomColor: "rgba(41,151,255,0.08)",
                                autoscaleInfoProvider: function () { return { priceRange: { minValue: 0, maxValue: 1 } }; } });
    chart.priceScale("win").applyOptions({ scaleMargins: { top: 0, bottom: 0 }, visible: false });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
  }
  function segment(color, style, width, from, to, price, title) {
    if (to <= from) to = from + 60;
    var s = chart.addLineSeries({ color: color, lineStyle: style, lineWidth: width, priceLineVisible: false, lastValueVisible: !!title, title: title || "", crosshairMarkerVisible: false });
    s.setData([{ time: from, value: price }, { time: to, value: price }]);
    extras.push(s);
  }

  /* ---------- side panel ---------- */
  function tfName(tf) { return tf === 60 ? "1H" : tf + "m"; }
  function stateText(s) {
    switch (s.state) {
      case 0: return "armed: waiting for the break of " + money(s.level);
      case 1: return "first break: waiting for a close back inside";
      case 2: return "pulled back: waiting for the rebreak of " + money(s.level);
      case 3: return "in the trade";
      case 5: return "closed";
      default: return s.why;
    }
  }
  function renderSide(r, now) {
    var bz = r.bias;
    var biasTxt = bz.bias === 1 ? "Bullish: longs only" : bz.bias === -1 ? "Bearish: shorts only" : "No key-level sweep yet: both sides allowed";
    var winOpen = now != null && now >= OPT.winStart && now < OPT.winEnd;
    var list = r.setups.map(function (s) {
      var t = s.trade;
      return '<li><span class="crt-tag ' + (s.dir === 1 ? "l" : "s") + '">' + tfName(s.tf) + (s.dir === 1 ? " ▲" : " ▼") + "</span>" +
        '<span class="crt-txt"><b>' + clock(s.bornMin) + "</b> " + stateText(s) + "</span></li>";
    }).join("");
    var tr = r.trades[0], trade = "";
    if (tr) {
      trade = '<div class="live-trade ' + (tr.dir === 1 ? "long" : "short") + '"><b>' + (tr.dir === 1 ? "Long" : "Short") + " · " + tfName(tr.tf) + " CRT · " +
        (tr.r == null ? "open" : (tr.r > 0 ? "+" : "") + tr.r.toFixed(1) + "R") + "</b><span>Entry " + money(tr.entry) + " · Stop " + money(tr.sl) + " · Target " + money(tr.tp) + "</span></div>";
    }
    els.side.innerHTML =
      '<p class="k">1H bias</p><p class="v">' + biasTxt + "</p>" +
      '<dl class="lv"><div><dt>Key high</dt><dd>' + money(bz.keyH) + "</dd></div><div><dt>Key low</dt><dd>" + money(bz.keyL) + "</dd></div><div><dt>Window</dt><dd>" + (winOpen ? "Open" : "Closed") + "</dd></div></dl>" +
      trade +
      '<p class="k">CRT setups today</p>' + (list ? '<ul class="crt-list">' + list + "</ul>" : '<p class="quiet">None qualified yet. The first possible 15-minute CRT arms at 10:00.</p>');
  }

  /* ---------- data ---------- */
  function setGate(msg) { root.classList.add("gated"); els.gate.hidden = false; els.gate.innerHTML = msg.replace(/<\/b>\s*([\s\S]+)$/, "</b><span>$1</span>"); }

  function load() {
    var tok = previewToken();
    var url = "/api/bars.php?symbol=" + encodeURIComponent(SYMBOL) + "&mult=" + MULT + "&rth=1" + (tok ? "&preview=" + encodeURIComponent(tok) : "");
    return fetch(url, { cache: "no-store" }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, body: j }; });
    }).then(function (res) {
      if (!res.ok) {
        var e = res.body && res.body.error;
        if (e === "private") setGate("<b>Live chart in private preview.</b> Open this page once with your preview link to unlock it in this browser.");
        else if (e === "not_configured") setGate("<b>Live chart not configured yet.</b> Add <code>api/config.php</code> on the server.");
        else if (e === "symbol_not_allowed") setGate("<b>" + SYMBOL + " isn't on the allowed list.</b> Add it to <code>symbols</code> in <code>api/config.php</code>, or use <code>'*'</code> to allow any ticker.");
        else setGate("<b>Live data unavailable right now.</b> Try again in a minute.");
        return false;
      }
      render(res.body); return true;
    }).catch(function () { setGate("<b>Live data unavailable right now.</b> Try again in a minute."); return false; });
  }

  function render(data) {
    var all = [];
    data.bars.forEach(function (a) {
      var t = etParts(a[0]);
      if (t.min >= RTH_OPEN && t.min < RTH_CLOSE) all.push({ date: t.date, min: t.min, time: t.wall, o: a[1], h: a[2], l: a[3], c: a[4] });
    });
    if (!all.length) { setGate("<b>No data yet.</b>"); return; }
    var today = all[all.length - 1].date;
    var r = run(all, today);
    r.trades.forEach(function (t) { t.setup.trade = t; });

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(r.cur.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));
    win.setData(r.cur.map(function (b) { return b.min >= OPT.winStart && b.min < OPT.winEnd ? { time: b.time, value: 1 } : { time: b.time }; }));
    candles.setMarkers(r.markers);
    extras.forEach(function (s) { chart.removeSeries(s); });
    extras = [];
    var first = r.cur[0].time, last = r.cur[r.cur.length - 1].time;
    if (r.bias.keyH != null) segment("rgba(255,105,97,0.55)", 1, 1, first, last, r.bias.keyH, "Key high");
    if (r.bias.keyL != null) segment("rgba(48,209,88,0.55)", 1, 1, first, last, r.bias.keyL, "Key low");
    r.setups.forEach(function (s) {
      var col = s.state === 4 ? "rgba(142,142,147,0.6)" : s.dir === 1 ? "#5fe3a1" : "#ff8a80";
      segment(col, 2, 1, s.start, s.end || last, s.level, s.state < 4 ? tfName(s.tf) + " trigger" : "");
    });
    r.trades.forEach(function (t) {
      var end = t.exitTime || last;
      segment("#30d158", 0, 2, t.time, end, t.tp, t.r == null ? "TP" : "");
      segment("#ff453a", 0, 2, t.time, end, t.sl, t.r == null ? "SL" : "");
    });
    if (!render.fitted) { chart.timeScale().fitContent(); render.fitted = true; }
    renderSide(r, r.cur[r.cur.length - 1].min);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · Session " + today + " · CRT candles from 15m / 30m / 1H" +
      (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  window.CRTLive = {
    _run: run                             // exposed for testing
  };

  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();

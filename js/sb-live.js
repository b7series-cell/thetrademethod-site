/* =====================================================================
   sb-live.js — live Silver Bullet chart (Silver Bullet [GBB]).

   Pulls bars with the pre-market and after-hours included (5-minute by
   default; 1 / 2 / 5 / 15 selectable) from /api/bars.php (the API key
   stays on the server) and runs pine/silver-bullet.pine in the browser
   at its default inputs:
     · windows: 03:00, 10:00 and 14:00 New York, one hour each (or every
       clock hour in Hour Scan)
     · liquidity: swing highs / lows (5 left, 5 right, kept 300 bars),
       Asia 20:00–24:00, London 02:00–05:00, the previous day and the
       previous clock hour
     · sweep: the window's first bar to trade a tick through a level
     · displacement: a three-candle fair value gap the other way, middle
       body >= 1 ATR(14), gap >= 0.1 ATR and 2 ticks, all inside the
       window, not starting before the sweep; first one per side
     · entry: a limit at the gap's near edge, filled when price trades a
       tick through it before the window ends
     · stop: a tick beyond the sweep's extreme; target: the nearest
       unswept level on the other side, skipped under 1.5R, 2R if none
     · exit: target, stop (both in one bar = stop) or window end + 60 min
     · one trade per window; results in R after 2 ticks of slippage
   Every decision is taken on a CLOSED bar; the newest bar is drawn but
   ignored until it has closed.

   Two differences from the Pine, both forced by the data: the chart
   loads one or two weeks, so it skips one warm-up day instead of five,
   and it charges slippage only. The Pine's $4.50 commission is per
   futures contract; on a stock it would be read as $4.50 a share.

   Mount: <section data-sb-live data-symbol="QQQ">…</section>
   ===================================================================== */

(function () {
  "use strict";

  var OPT = { hourScan: false, ldn: true, am: true, pm: true,
              useSwing: true, pivL: 5, pivR: 5, pivLook: 300, useAsia: true, useLdn: true, usePd: true, usePre: true,
              sweepReq: true, closeBk: false, atrLen: 14, kBody: 1.0, gapAtr: 0.1, gapTicks: 2,
              ce: false, touch: false, grace: 0, onePerWin: true, stopSweep: true, bufTicks: 1,
              minPts: 0, minR: 1.5, fbR: 2.0, ts: "win", tsMin: 120,
              slipTicks: 2, comm: 0, pointValue: 1, tick: 0.01, warmDays: 1 };
  var K = { PIV: 0, ASIA: 1, LDN: 2, PDAY: 3, PRE: 4 }, NEVER = 2e9;
  var OUT = { TP: 1, SL: 2, TIME: 3, NOFILL: 4, SKIP: 5, CANCEL: 6, LOST: 7 };
  var HOUR = 3600000, DAY = 86400000;

  var etFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  function etParts(ms) {
    var p = {};
    etFmt.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    var h = (+p.hour) % 24;
    return { date: p.year + "-" + p.month + "-" + p.day, min: h * 60 + (+p.minute), wall: Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute) / 1000 };
  }
  function lvlName(kind, side) {
    var hl = side > 0 ? "high" : "low";
    return kind === K.PDAY ? (side > 0 ? "PDH" : "PDL") : kind === K.ASIA ? "Asia " + hl : kind === K.LDN ? "London " + hl : kind === K.PRE ? "1H " + hl : "swing " + hl;
  }
  function rowName(row) { return row === 3 ? "LDN" : row === 10 ? "AM" : row === 14 ? "PM" : (row < 10 ? "0" : "") + row + ":00"; }

  /* ---------- the rules, bar by bar: a line-for-line twin of the Pine script ----------
     B: [{ ms, o, h, l, c }] in time order (any session); tfMin: bar size in minutes */
  function run(B, nClosed, tfMin, opt) {
    var O = opt || OPT, n = nClosed == null ? B.length : nClosed, tick = O.tick, half = tick / 2, tfMs = tfMin * 60000;
    var costPts = O.slipTicks * tick + O.comm / O.pointValue;
    var S = { curWin: -1, swBear: null, swBull: null, armBear: false, armBull: false, winTraded: false, tdKey: null,
              dayHi: null, dayLo: null, dayMin: 0, pdHi: null, pdLo: null, asiaHi: null, asiaLo: null, asiaPub: true,
              ldnHi: null, ldnLo: null, ldnPub: true, hourStart: null, hourHi: null, hourLo: null, nDays: 0 };
    var levels = [], live = [], all = [], windows = [], sweeps = [], win = null;
    var stats = {}, atr = [], trSum = 0, wk = [], t, i, b;

    function stat(row) { return stats[row] || (stats[row] = { n: 0, w: 0, net: 0, gross: 0 }); }
    function publish(price, side, kind, t) {
      for (var k = levels.length - 1; k >= 0; k--) if (levels[k].kind === kind && levels[k].side === side) levels.splice(k, 1);
      if (price != null) levels.push({ price: price, side: side, fromBar: t, knownBar: t, expBar: NEVER, kind: kind, origin: t });
    }
    function finish(s, outcome, px, xt) {
      s.status = 2; s.outcome = outcome; s.exitPx = px; s.exitBar = xt;
      if (outcome === OUT.TP || outcome === OUT.SL || outcome === OUT.TIME) {
        var R = Math.abs(s.entry - s.stop), gross = s.dir * (px - s.fillPx);
        s.netR = (gross - costPts) / R; s.grossR = gross / R;
        var st = stat(s.row); st.n++; st.w += s.netR > 0 ? 1 : 0; st.net += s.netR; st.gross += s.grossR;
      }
    }
    function fill(s, fp, t) {
      s.status = 1; s.fillPx = fp; s.fillBar = t;
      var tm = B[t].ms;
      s.deadline = O.ts === "win" ? s.dlWin : O.ts === "min" ? Math.min(tm + O.tsMin * 60000, s.dayEnd) : s.dayEnd;
      if (s.winStart === S.curWin) S.winTraded = true;
      if (O.onePerWin) live.forEach(function (o) { if (o.status === 0 && o.winStart === s.winStart && o.dir !== s.dir) finish(o, OUT.LOST, null, t); });
    }
    function step(s, t) {
      var q = B[t], tm = q.ms, tc = tm + tfMs, d = s.dir, sh, th;
      if (s.status === 0) {
        if (tm >= s.fillEnd) { finish(s, OUT.NOFILL, null, t - 1); return; }
        if (d < 0 ? q.l <= s.target + half : q.h >= s.target - half) { finish(s, OUT.CANCEL, null, t); return; }
        var fp = null, thr = O.touch ? 0 : tick;
        if (d < 0) { if (q.o > s.entry + half) fp = q.o; else if (q.h >= s.entry - half + thr) fp = s.entry; }
        else { if (q.o < s.entry - half) fp = q.o; else if (q.l <= s.entry + half - thr) fp = s.entry; }
        if (fp != null) {
          fill(s, fp, t);
          sh = d < 0 ? q.h >= s.stop - half : q.l <= s.stop + half;
          if (sh) finish(s, OUT.SL, d < 0 ? Math.max(s.stop, fp) : Math.min(s.stop, fp), t);
          else if (tc >= s.deadline) finish(s, OUT.TIME, q.c, t);
        }
      } else if (s.status === 1) {
        if (tm >= s.deadline) { finish(s, OUT.TIME, B[t - 1].c, t - 1); return; }
        sh = d < 0 ? q.h >= s.stop - half : q.l <= s.stop + half;
        th = d < 0 ? q.l <= s.target + half : q.h >= s.target - half;
        if (sh) finish(s, OUT.SL, d < 0 ? Math.max(s.stop, q.o) : Math.min(s.stop, q.o), t);
        else if (th) finish(s, OUT.TP, s.target, t);
        else if (tc >= s.deadline) finish(s, OUT.TIME, q.c, t);
      }
    }
    function target(d, entry, R, t) {
      var best = null, bk = -1;
      levels.forEach(function (lv) {
        if (lv.knownBar > t) return;
        if (d < 0 && lv.side === -1 && lv.price < entry - 1e-9) { if (best == null || lv.price > best) { best = lv.price; bk = lv.kind; } }
        else if (d > 0 && lv.side === 1 && lv.price > entry + 1e-9) { if (best == null || lv.price < best) { best = lv.price; bk = lv.kind; } }
      });
      if (best == null) return { tg: entry + d * O.fbR * Math.abs(R), kind: -1, skip: false };
      return { tg: best, kind: bk, skip: Math.abs(best - entry) < Math.max(O.minPts, O.minR * R) - 1e-9 };
    }
    function arm(d, t, c) {
      var q = B[t], a = B[t - 2], sw = d < 0 ? S.swBear : S.swBull;
      var entry = d < 0 ? q.h : q.l;
      if (O.ce) {
        var mid = d < 0 ? (a.l + q.h) / 2 : (a.h + q.l) / 2;
        entry = d < 0 ? Math.ceil(mid / tick - 1e-9) * tick : Math.floor(mid / tick + 1e-9) * tick;
      }
      var buf = O.bufTicks * tick, stop = d < 0 ? a.h + buf : a.l - buf;
      if (O.stopSweep && sw != null) {
        var ext = d < 0 ? q.h : q.l;
        for (var k = sw; k <= t; k++) ext = d < 0 ? Math.max(ext, B[k].h) : Math.min(ext, B[k].l);
        stop = d < 0 ? ext + buf : ext - buf;
      }
      var R = Math.abs(entry - stop), tg = target(d, entry, R, t);
      var s = { winStart: c.winStart, winEnd: c.winEnd, row: c.row, dir: d, armBar: t, sweepBar: sw, gapTop: d < 0 ? a.l : q.l, gapBot: d < 0 ? q.h : a.h,
                entry: entry, stop: stop, target: tg.tg, tkind: tg.kind, fillEnd: c.winEnd + O.grace * tfMs,
                dlWin: Math.min(c.winEnd + HOUR, c.dayEnd), dayEnd: c.dayEnd, status: 0, outcome: 0 };
      var lost = !tg.skip && O.onePerWin && S.winTraded;
      if (tg.skip) { finish(s, OUT.SKIP, null, t); all.push(s); }
      else if (lost) { s.status = 2; s.outcome = OUT.LOST; }
      else { live.push(s); all.push(s); }
    }

    for (t = 0; t < n; t++) {
      b = B[t];
      var tr = t ? Math.max(b.h - b.l, Math.abs(b.h - B[t - 1].c), Math.abs(b.l - B[t - 1].c)) : b.h - b.l;
      if (t < O.atrLen) { trSum += tr; atr[t] = t === O.atrLen - 1 ? trSum / O.atrLen : null; }
      else atr[t] = (atr[t - 1] * (O.atrLen - 1) + tr) / O.atrLen;
      var e = b.et || (b.et = etParts(b.ms)), tdk = b.tdk || (b.tdk = etParts(b.ms + 6 * HOUR).date);
      var tod = e.min, hNY = Math.floor(tod / 60), hrStart = b.ms - (tod % 60) * 60000;
      var dayEnd = b.ms + (1020 - tod) * 60000 + (tod >= 1080 ? DAY : 0);
      var sbHour = (O.ldn && hNY === 3) || (O.am && hNY === 10) || (O.pm && hNY === 14);
      var c = { winStart: null, winEnd: null, row: -1, dayEnd: dayEnd };
      if (O.hourScan ? hNY !== 17 : sbHour) { c.winStart = hrStart; c.winEnd = hrStart + HOUR; c.row = hNY; }
      var inWin = c.winStart != null && tfMin >= 1 && tfMin <= 15, winKey = inWin ? c.winStart : -1;
      wk[t] = winKey;
      if (hNY === 17) continue;                                  // the study's data has no 17:00 bars

      /* 1. live setups: fill, cancel, exit */
      live.forEach(function (s) { if (s.status !== 2) step(s, t); });
      live = live.filter(function (s) { return s.status !== 2; });

      /* 2. session levels (from bars before this one), then this bar joins the running ranges */
      if (S.tdKey == null || tdk !== S.tdKey) {
        if (S.tdKey != null && S.dayMin >= 300) { S.pdHi = S.dayHi; S.pdLo = S.dayLo; }
        if (O.usePd && S.pdHi != null) { publish(S.pdHi, 1, K.PDAY, t); publish(S.pdLo, -1, K.PDAY, t); }
        S.tdKey = tdk; S.nDays++; S.dayHi = S.dayLo = null; S.dayMin = 0;
        S.asiaHi = S.asiaLo = null; S.asiaPub = false; S.ldnHi = S.ldnLo = null; S.ldnPub = false;
      }
      if (!S.asiaPub && tod < 1080 && S.asiaHi != null) { if (O.useAsia) { publish(S.asiaHi, 1, K.ASIA, t); publish(S.asiaLo, -1, K.ASIA, t); } S.asiaPub = true; }
      if (!S.ldnPub && tod >= 300 && tod < 1080 && S.ldnHi != null) { if (O.useLdn) { publish(S.ldnHi, 1, K.LDN, t); publish(S.ldnLo, -1, K.LDN, t); } S.ldnPub = true; }
      if (S.hourStart == null || hrStart !== S.hourStart) {
        if (O.usePre) {
          var contiguous = S.hourStart != null && hrStart - S.hourStart === HOUR;
          if (hNY !== 18 && contiguous && S.hourHi != null) { publish(S.hourHi, 1, K.PRE, t); publish(S.hourLo, -1, K.PRE, t); }
          else { publish(null, 1, K.PRE, t); publish(null, -1, K.PRE, t); }
        }
        S.hourStart = hrStart; S.hourHi = S.hourLo = null;
      }
      S.dayHi = S.dayHi == null ? b.h : Math.max(S.dayHi, b.h); S.dayLo = S.dayLo == null ? b.l : Math.min(S.dayLo, b.l);
      S.dayMin += tfMin;
      if (tod >= 1200) { S.asiaHi = S.asiaHi == null ? b.h : Math.max(S.asiaHi, b.h); S.asiaLo = S.asiaLo == null ? b.l : Math.min(S.asiaLo, b.l); }
      if (tod >= 120 && tod < 300) { S.ldnHi = S.ldnHi == null ? b.h : Math.max(S.ldnHi, b.h); S.ldnLo = S.ldnLo == null ? b.l : Math.min(S.ldnLo, b.l); }
      S.hourHi = S.hourHi == null ? b.h : Math.max(S.hourHi, b.h); S.hourLo = S.hourLo == null ? b.l : Math.min(S.hourLo, b.l);

      /* 3. window change */
      if (winKey !== S.curWin) {
        S.curWin = winKey; S.swBear = S.swBull = null; S.armBear = S.armBull = false; S.winTraded = false;
        win = inWin ? { start: c.winStart, end: c.winEnd, row: c.row, i0: t, i1: t, hi: b.h, lo: b.l } : null;
        if (win) windows.push(win);
      } else if (inWin && win) { win.i1 = t; win.hi = Math.max(win.hi, b.h); win.lo = Math.min(win.lo, b.l); }

      /* 4. sweeps: a level is spent by the first bar that trades through it by a tick */
      var bearHit = false, bullHit = false, maxSw = null, minSw = null, topLv = null, botLv = null;
      for (i = levels.length - 1; i >= 0; i--) {
        var lv = levels[i];
        if (lv.expBar < t) { levels.splice(i, 1); continue; }
        if (lv.fromBar > t) continue;
        if (lv.side === 1 && b.h > lv.price + half) { bearHit = true; if (maxSw == null || lv.price > maxSw) { maxSw = lv.price; topLv = lv; } levels.splice(i, 1); }
        else if (lv.side === -1 && b.l < lv.price - half) { bullHit = true; if (minSw == null || lv.price < minSw) { minSw = lv.price; botLv = lv; } levels.splice(i, 1); }
      }

      /* 5. a swing pivot confirmed at this bar's close (strict on both sides) */
      if (O.useSwing && t >= O.pivL + O.pivR) {
        var ph = true, pl = true, hj = B[t - O.pivR].h, lj = B[t - O.pivR].l;
        for (var q = 0; q <= O.pivL + O.pivR; q++) if (q !== O.pivR) { if (B[t - q].h >= hj) ph = false; if (B[t - q].l <= lj) pl = false; }
        if (ph) levels.push({ price: hj, side: 1, fromBar: t + 1, knownBar: t, expBar: t - O.pivR + O.pivLook, kind: K.PIV, origin: t - O.pivR });
        if (pl) levels.push({ price: lj, side: -1, fromBar: t + 1, knownBar: t, expBar: t - O.pivR + O.pivLook, kind: K.PIV, origin: t - O.pivR });
      }

      /* 6. the window's first sweep per side */
      var warm = S.nDays > O.warmDays;
      if (inWin && warm) {
        if (bearHit && S.swBear == null && (!O.closeBk || b.c < maxSw)) { S.swBear = t; sweeps.push({ bar: t, price: maxSw, side: 1, name: lvlName(topLv.kind, 1), origin: topLv.origin }); }
        if (bullHit && S.swBull == null && (!O.closeBk || b.c > minSw)) { S.swBull = t; sweeps.push({ bar: t, price: minSw, side: -1, name: lvlName(botLv.kind, -1), origin: botLv.origin }); }
      }

      /* 7. displacement FVG with candle 3 = this bar; all three candles inside the window */
      if (inWin && warm && t >= 2 && wk[t - 2] === winKey && atr[t - 2] > 0) {
        var A = atr[t - 2], minGap = Math.max(O.gapAtr * A, O.gapTicks * tick) - 1e-9;
        if (Math.abs(B[t - 1].c - B[t - 1].o) >= O.kBody * A - 1e-9) {
          if (!S.armBear && B[t - 2].l - b.h >= minGap && (!O.sweepReq || (S.swBear != null && t - 2 >= S.swBear))) { arm(-1, t, c); S.armBear = true; }
          if (!S.armBull && b.l - B[t - 2].h >= minGap && (!O.sweepReq || (S.swBull != null && t - 2 >= S.swBull))) { arm(1, t, c); S.armBull = true; }
        }
      }
    }

    /* the orders that never filled: would they have reached the target before the stop by the time stop? */
    all.forEach(function (s) {
      if (s.outcome === OUT.CANCEL) { s.missed = "won"; return; }
      if (s.outcome !== OUT.NOFILL) return;
      s.missed = "open";
      for (var k = s.armBar + 1; k < n && B[k].ms < s.dlWin; k++) {
        var q = B[k], sh = s.dir < 0 ? q.h >= s.stop - half : q.l <= s.stop + half, th = s.dir < 0 ? q.l <= s.target + half : q.h >= s.target - half;
        if (sh) { s.missed = "lost"; break; }
        if (th) { s.missed = "won"; break; }
      }
    });
    var levelsLeft = levels.filter(function (lv) { return lv.kind !== K.PIV; });
    return { setups: all, live: live, stats: stats, windows: windows, sweeps: sweeps, levels: levelsLeft, atr: atr[n - 1], nDays: S.nDays, cost: costPts };
  }

  window.SBLive = { _run: run, OPT: OPT, OUT: OUT, _rowName: rowName };

  /* ===================================================================== */
  var root = typeof document !== "undefined" && document.querySelector("[data-sb-live]");
  if (!root || typeof LightweightCharts === "undefined" || typeof LiveKit === "undefined") return;

  var POLL_MS = 60000, MULT = 1, SHOW_DAYS = 3;
  var COL = { up: "#30d158", dn: "#ff453a", stop: "#ff453a", tgt: "#30d158", entry: "#f5f5f7", sweep: "#f4b942", dim: "#8e8e93",
              ldn: "rgba(167,139,250,0.10)", am: "rgba(34,211,238,0.10)", pm: "rgba(255,197,61,0.10)", hour: "rgba(142,142,147,0.07)" };
  var els = { chart: root.querySelector(".live-chart"), side: root.querySelector(".live-side"), status: root.querySelector(".live-status"), gate: root.querySelector(".live-gate") };
  var MODE = "sb";
  try { MODE = localStorage.getItem("sb_mode") === "hour" ? "hour" : "sb"; } catch (e) {}
  var KIT = LiveKit.controls(root, { key: "sb", symbol: (root.getAttribute("data-symbol") || "QQQ").toUpperCase(), tf: MULT,
    onChange: function (sym, tf) { SYMBOL = sym; MULT = tf; render.fitted = false; load(); } });
  var SYMBOL = KIT.symbol; MULT = KIT.tf;

  /* Silver Bullet windows or every hour */
  var form = root.querySelector(".live-symbol"), modeSeg = document.createElement("div");
  modeSeg.className = "bt-seg live-mode"; modeSeg.setAttribute("role", "group"); modeSeg.setAttribute("aria-label", "Mode");
  modeSeg.innerHTML = '<button type="button" data-m="sb">SB hours</button><button type="button" data-m="hour">Every hour</button>';
  if (form) form.appendChild(modeSeg);
  function paintMode() { modeSeg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-m") === MODE)); }); }
  paintMode();
  modeSeg.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-m]"); if (!b || b.getAttribute("data-m") === MODE) return;
    MODE = b.getAttribute("data-m"); paintMode();
    try { localStorage.setItem("sb_mode", MODE); } catch (x) {}
    if (LAST) render(LAST);
  });

  function previewToken() {
    var t = new URLSearchParams(location.search).get("preview");
    try { if (t) localStorage.setItem("vp_preview", t); else t = localStorage.getItem("vp_preview"); } catch (e) {}
    return t || "";
  }
  function money(x) { return x == null || isNaN(x) ? "—" : x.toFixed(2); }
  function clock(min) { var h = Math.floor(min / 60) % 24, m = min % 60; return ((h + 11) % 12 + 1) + ":" + (m < 10 ? "0" : "") + m + (h >= 12 ? " pm" : " am"); }
  function rTxt(r) { return (r > 0 ? "+" : "") + r.toFixed(2) + "R"; }

  /* ---------- chart ---------- */
  var chart = null, candles, glow, lineS = [];
  function makeChart() {
    chart = LightweightCharts.createChart(els.chart, {
      autoSize: true,
      layout: { background: { type: "solid", color: "#1d1d1f" }, textColor: "#a1a1a6", fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif", fontSize: 12, attributionLogo: true },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 8 },
      crosshair: { mode: 0 }
    });
    glow = chart.addHistogramSeries({ priceScaleId: "glow", priceLineVisible: false, lastValueVisible: false, base: 0 });
    chart.priceScale("glow").applyOptions({ scaleMargins: { top: 0, bottom: 0 }, visible: false });
    candles = chart.addCandlestickSeries({ upColor: "#30d158", downColor: "#ff453a", borderVisible: false, wickUpColor: "#30d158", wickDownColor: "#ff453a", priceLineVisible: false });
  }
  function seg(B, i0, i1, price, col, style, width, label) {
    var t0 = B[Math.max(0, i0)].time, t1 = i1 < B.length ? B[i1].time : B[B.length - 1].time + (i1 - B.length + 1) * MULT * 60;
    if (t1 <= t0) t1 = t0 + MULT * 60;
    var s = chart.addLineSeries({ color: col, lineWidth: width || 1, lineStyle: style || 0, priceLineVisible: false, lastValueVisible: !!label,
      title: label || "", crosshairMarkerVisible: false, autoscaleInfoProvider: function () { return null; } });
    s.setData([{ time: t0, value: price }, { time: t1, value: price }]);
    lineS.push(s);
  }
  function glowCol(row) { return MODE === "hour" && row !== 3 && row !== 10 && row !== 14 ? COL.hour : row === 3 ? COL.ldn : row === 10 ? COL.am : row === 14 ? COL.pm : COL.hour; }

  /* ---------- side panel ---------- */
  function renderSide(r, B, forming, nClosed) {
    var last = B[nClosed - 1], cur = B[B.length - 1], tod = last.et.min, hNY = Math.floor(tod / 60);
    var open = r.live.filter(function (s) { return s.status === 1; })[0], armed = r.live.filter(function (s) { return s.status === 0; })[0];
    var inSb = hNY === 10 || hNY === 14 || hNY === 3, status, play = "";
    if (open) {
      var u = open.dir * (last.c - open.fillPx) / Math.abs(open.entry - open.stop);
      status = (open.dir > 0 ? "Long" : "Short") + " · in the trade · " + rTxt(u);
      play = "Filled at " + money(open.fillPx) + ". Stop " + money(open.stop) + ", target " + money(open.target) + ". Out by " + clock(etParts(open.deadline).min) + " at the latest.";
    } else if (armed) {
      status = (armed.dir > 0 ? "Long" : "Short") + " · limit armed at " + money(armed.entry);
      play = "A gap formed after the sweep. The order fills only if price trades a tick through " + money(armed.entry) + " before the window ends. Stop " + money(armed.stop) + ", target " + money(armed.target) + ".";
    } else if (MODE === "sb" ? inSb : hNY !== 17) {
      status = rowName(hNY) + " window live";
      play = r.sweeps.some(function (w) { return w.bar >= nClosed - 12 && Math.floor(B[w.bar].et.min / 60) === hNY && B[w.bar].et.date === last.et.date; })
        ? "A level has been swept. Waiting for a gap the other way." : "Waiting for a sweep of a level that hasn't been hit yet.";
    } else {
      var next = [10, 14].map(function (h) { return (h * 60 - tod + 1440) % 1440; }).filter(function (m) { return m > 0; }).sort(function (a, b) { return a - b; })[0];
      status = "No window open";
      play = "Next window " + (next >= 60 ? Math.floor(next / 60) + "h " : "") + (next % 60) + "m from the last closed bar. The 3 am window needs overnight futures data; stocks have no bars then.";
    }
    var rows = MODE === "sb" ? [3, 10, 14] : Object.keys(r.stats).map(Number).sort(function (a, b) { return a - b; });
    var tN = 0, tW = 0, tNet = 0, tGross = 0;
    var tbl = rows.map(function (row) {
      var st = r.stats[row] || { n: 0, w: 0, net: 0, gross: 0 };
      tN += st.n; tW += st.w; tNet += st.net; tGross += st.gross;
      var avg = st.n ? st.net / st.n : null;
      return "<li><span>" + rowName(row) + " · " + st.n + " trade" + (st.n === 1 ? "" : "s") + (st.n ? " · " + Math.round(100 * st.w / st.n) + "% won" : "") + "</span>" +
        (avg == null ? "<span>—</span>" : '<span class="' + (avg > 0 ? "pos" : "neg") + '">' + rTxt(avg) + "</span>") + "</li>";
    }).join("");
    var miss = r.setups.filter(function (s) { return s.missed; }), missWon = miss.filter(function (s) { return s.missed === "won"; }).length;
    var today = r.setups.filter(function (s) { return B[s.armBar].et.date === last.et.date; }).slice(-6).reverse();
    function outcome(s) {
      if (s.outcome === OUT.TP || s.outcome === OUT.SL || s.outcome === OUT.TIME)
        return '<span class="' + (s.netR > 0 ? "pos" : "neg") + '">' + (s.outcome === OUT.TP ? "target " : s.outcome === OUT.SL ? "stop " : "time ") + rTxt(s.netR) + "</span>";
      if (s.status === 1) return '<span class="open">in trade</span>';
      if (s.status === 0) return '<span class="open">armed</span>';
      if (s.outcome === OUT.SKIP) return "<span>skipped</span>";
      return "<span>no fill" + (s.missed === "won" ? " · ran to target" : "") + "</span>";
    }
    els.side.innerHTML =
      '<p class="k">' + SYMBOL + " · last closed bar · " + clock(tod) + "</p>" +
      '<p class="v">' + status + "</p>" + (play ? '<p class="play">' + play + "</p>" : "") +
      '<dl class="lv"><div><dt>Trades</dt><dd>' + tN + "</dd></div>" +
      '<div><dt>Won</dt><dd>' + (tN ? Math.round(100 * tW / tN) + "%" : "—") + "</dd></div>" +
      '<div><dt>Net R</dt><dd class="' + (tN ? (tNet > 0 ? "up" : "dn") : "") + '">' + (tN ? (tNet > 0 ? "+" : "") + tNet.toFixed(1) : "—") + "</dd></div>" +
      '<div><dt>Before costs</dt><dd>' + (tN ? (tGross > 0 ? "+" : "") + tGross.toFixed(1) : "—") + "</dd></div>" +
      '<div><dt>No fill</dt><dd>' + miss.length + "</dd></div>" +
      '<div><dt>…ran to target</dt><dd>' + (miss.length ? missWon : "—") + "</dd></div></dl>" +
      '<p class="k">' + (MODE === "sb" ? "By window" : "By hour") + ", average net R · " + Math.max(0, r.nDays - 1 - OPT.warmDays) + " days tested</p>" +
      '<ul class="trades">' + tbl + "</ul>" +
      (forming ? '<p class="k">The ' + clock(cur.et.min) + " bar is still forming. Signals wait for its close.</p>" : "") +
      '<p class="k">Setups today</p>' + (today.length ? '<ul class="trades">' + today.map(function (s) {
        return "<li><span>" + clock(B[s.armBar].et.min) + " · " + (s.dir > 0 ? "long" : "short") + " @ " + money(s.entry) + "</span>" + outcome(s) + "</li>";
      }).join("") + "</ul>" : '<p class="quiet">None yet today.</p>');
  }

  /* ---------- data ---------- */
  var LAST = null;
  function setGate(msg) {
    root.classList.add("gated"); els.gate.hidden = false;
    els.status.textContent = SYMBOL + " · " + LiveKit.tfLabel(MULT) + " · not loaded";
    els.gate.innerHTML = msg.replace(/<\/b>\s*([\s\S]+)$/, "</b><span>$1</span>");
  }
  function load() {
    var tok = previewToken();
    var url = "/api/bars.php?symbol=" + encodeURIComponent(SYMBOL) + "&mult=" + MULT + (tok ? "&preview=" + encodeURIComponent(tok) : "");
    return fetch(url, { cache: "no-store" }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, body: j }; });
    }).then(function (res) {
      if (!res.ok) {
        var e = res.body && res.body.error;
        if (e === "private") setGate("<b>Chart in private preview.</b> Open this page once with your preview link to unlock it in this browser.");
        else if (e === "not_configured") setGate("<b>Chart not configured yet.</b> Add <code>api/config.php</code> on the server.");
        else if (e === "symbol_not_allowed") setGate("<b>" + SYMBOL + " isn't on the allowed list.</b> Add it to <code>symbols</code> in <code>api/config.php</code>, or use <code>'*'</code> to allow any ticker.");
        else if (e === "bad_symbol") setGate("<b>That doesn't look like a ticker.</b>");
        else setGate("<b>Chart data unavailable right now.</b> Try again in a minute.");
        return false;
      }
      LAST = res.body; render(res.body); return true;
    }).catch(function () { setGate("<b>Chart data unavailable right now.</b> Try again in a minute."); return false; });
  }

  function render(data) {
    var B = data.bars.map(function (a) {
      var e = etParts(a[0]);
      return { ms: a[0], et: e, date: e.date, time: e.wall, o: a[1], h: a[2], l: a[3], c: a[4] };
    });
    if (B.length < 60) { setGate("<b>Not enough data yet for " + SYMBOL + ".</b>"); return; }
    var asOf = (data.updated || Date.now() / 1000) - (data.delay_s != null ? data.delay_s : 900);
    var forming = !data.date && B[B.length - 1].ms / 1000 + MULT * 60 > asOf;
    var nClosed = forming ? B.length - 1 : B.length;
    var opt = Object.assign({}, OPT, { hourScan: MODE === "hour" });
    var r = run(B, nClosed, MULT, opt);

    els.gate.hidden = true; root.classList.remove("gated");
    if (!chart) makeChart();
    LiveKit.brand(chart, els.chart, SYMBOL, MULT);
    candles.setData(B.map(function (b) { return { time: b.time, open: b.o, high: b.h, low: b.l, close: b.c }; }));

    /* the windows, as a full-height tint */
    var days = [];
    B.forEach(function (b) { if (days[days.length - 1] !== b.date) days.push(b.date); });
    var from = days[Math.max(0, days.length - SHOW_DAYS)], first = 0;
    while (first < B.length - 1 && B[first].date < from) first++;
    var tint = {};
    r.windows.forEach(function (w) { for (var k = w.i0; k <= w.i1; k++) tint[k] = glowCol(w.row); });
    glow.setData(B.map(function (b, k) { return tint[k] ? { time: b.time, value: 1, color: tint[k] } : { time: b.time }; }));

    lineS.forEach(function (s) { chart.removeSeries(s); }); lineS = [];
    var marks = [];
    r.sweeps.forEach(function (w) {
      if (w.bar < first) return;
      seg(B, Math.max(w.origin, w.bar - 40), w.bar, w.price, COL.sweep, 2, 1, "");
      marks.push({ time: B[w.bar].time, position: w.side > 0 ? "aboveBar" : "belowBar", shape: "circle", color: COL.sweep, text: "Sweep" });
    });
    r.setups.forEach(function (s) {
      if (s.armBar < first || s.outcome === OUT.SKIP) return;
      var col = s.dir > 0 ? COL.up : COL.dn, traded = s.fillBar != null;
      var end = s.status === 2 ? s.exitBar : nClosed - 1 + 4;
      var gEnd = traded ? s.fillBar : (s.status === 2 ? s.exitBar : nClosed - 1 + 2);
      seg(B, s.armBar - 2, gEnd, s.gapTop, col, 1, 1, "");
      seg(B, s.armBar - 2, gEnd, s.gapBot, col, 1, 1, "");
      marks.push({ time: B[s.armBar - 1].time, position: s.dir > 0 ? "belowBar" : "aboveBar", shape: "square", color: col, text: "FVG" });
      if (!traded && s.status === 2) return;
      var openNow = s.status !== 2, t0 = traded ? s.fillBar : s.armBar;
      seg(B, t0, end, s.entry, COL.entry, 0, 1, openNow ? (traded ? "Entry" : "Limit") : "");
      seg(B, t0, end, s.stop, COL.stop, 0, 2, openNow ? "Stop" : "");
      seg(B, t0, end, s.target, COL.tgt, 0, 2, openNow ? "Target" : "");
      if (traded) marks.push({ time: B[s.fillBar].time, position: s.dir > 0 ? "belowBar" : "aboveBar", shape: s.dir > 0 ? "arrowUp" : "arrowDown", color: col, text: s.dir > 0 ? "Long" : "Short" });
      if (s.status === 2 && traded) marks.push({ time: B[s.exitBar].time, position: s.outcome === OUT.TP ? (s.dir > 0 ? "aboveBar" : "belowBar") : (s.dir > 0 ? "belowBar" : "aboveBar"),
        shape: "circle", color: s.netR > 0 ? COL.up : COL.dn, text: (s.outcome === OUT.TP ? "TP " : s.outcome === OUT.SL ? "SL " : "Time ") + (s.netR > 0 ? "+" : "") + s.netR.toFixed(1) + "R" });
    });
    /* the levels still waiting to be swept (session levels only, near the price) */
    var lastC = B[nClosed - 1].c, band = 6 * (r.atr || 0);
    r.levels.forEach(function (lv) {
      if (!band || Math.abs(lv.price - lastC) > band) return;
      seg(B, Math.max(lv.origin, nClosed - 60), nClosed - 1 + 6, lv.price, COL.dim, 2, 1, lvlName(lv.kind, lv.side));
    });
    marks.sort(function (a, b) { return a.time - b.time; });
    candles.setMarkers(marks);

    var span = MULT >= 15 ? 150 : MULT >= 5 ? 200 : 260;
    if (!render.fitted) {
      /* open on the latest trading day's windows, not on the after-hours tail */
      var lw = r.windows.filter(function (w) { return w.row === 10 || w.row === 14; }), wl = lw[lw.length - 1];
      var wd = wl ? lw.filter(function (w) { return B[w.i0].date === B[wl.i0].date; })[0] : null;
      var to = wl ? Math.min(B.length - 1 + 8, wl.i1 + Math.round(90 / MULT)) : B.length - 1 + 8;
      var fromI = wd ? Math.max(0, wd.i0 - Math.round(60 / MULT)) : Math.max(0, B.length - span);
      if (to - fromI > span * 2.2) fromI = to - span;
      chart.timeScale().setVisibleLogicalRange({ from: fromI, to: to });
      render.fitted = true;
    }
    renderSide(r, B, forming, nClosed);
    var upd = new Date(data.updated * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
    els.status.textContent = data.symbol + " · " + LiveKit.tfLabel(MULT) + " · pre-market and after-hours included · " + (MODE === "sb" ? "Silver Bullet windows" : "every hour") +
      " · sweeps, gaps, limit, stop and target · net of 2 ticks slippage" + (data.delay ? " · " + data.delay : "") + " · Updated " + upd + " ET" + (data.stale ? " (last good copy)" : "");
  }

  load().then(function () { setInterval(function () { if (!document.hidden) load(); }, POLL_MS); });
})();

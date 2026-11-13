/* =====================================================================
   fl-anim.js — animated walkthrough of the Fashionably Late entry.

   Plays the page's RKLB example (low 115.50, 9 EMA × VWAP cross 120.00,
   stop 118.50, target 124.50) through six stages: find the stock → the
   low, and the pivot it arms → momentum back toward VWAP → the cross,
   inside a window → entry on the close → stop and target off the
   measured move.

   The price path is scripted and labelled "Illustrative"; the levels are
   the page's own numbers. The 9 EMA and VWAP are computed from the
   scripted bars, so the cross lands where the math puts it. No market data.
   Mount: <section data-fl-anim>…</section>
   ===================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-fl-anim]");
  if (!root) return;
  var svg = root.querySelector("svg");
  var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
  var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay");
  var chips = root.querySelector(".anim-chips");
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- the example ---------- */
  var LOW = 115.50, ENTRY = 120.00, UNIT = ENTRY - LOW, TP = ENTRY + UNIT, SL = ENTRY - UNIT / 3;
  var COL = { ema: "#f5f5f7", vwap: "#2ec4b6", winA: "#2ec4b6", winB: "#bf5af2", entry: "#2997ff", tp: "#30d158", sl: "#ff453a", piv: "#30d158" };

  /* 2-minute closes from 10:10 (scripted), then OHLC around them */
  var path = [];
  function seg(a, b, n, curve) { for (var i = 1; i <= n; i++) { var f = i / n; path.push(a + (b - a) * (curve === "out" ? 1 - Math.pow(1 - f, 2) : curve === "in" ? f * f : f)); } }
  path.push(121.9);
  seg(121.9, 116.1, 14, "out");        // 1-14  the sell-off
  var LOWBAR = path.length; path.push(116.1);   // 15 the low bar
  path.push(116.3, 116.2, 116.6);      // 16-18 the base; bar 18 confirms the pivot
  var ARM = LOWBAR + 3;
  seg(116.6, 119.55, 22);              // 19-40 the steady push
  var CROSS = path.length; path.push(ENTRY);    // 41 the cross bar closes at 120.00
  seg(ENTRY, 124.7, 13);               // 42-54 run to the target
  seg(124.7, 127.6, 13, "out");        // 55-67 keeps going
  var N = path.length;
  var rng = (function () { var s = 11; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  var BARS = path.map(function (c, i) {
    var o = i ? path[i - 1] + (rng() - 0.5) * 0.18 : 122.15;
    var hi = Math.max(o, c) + 0.05 + rng() * 0.22, lo = Math.min(o, c) - 0.05 - rng() * 0.22;
    return [o, hi, lo, c];
  });
  BARS[LOWBAR] = [116.35, 116.5, LOW, 116.1];
  for (var q = LOWBAR - 3; q <= ARM; q++) if (q !== LOWBAR) BARS[q][2] = Math.max(BARS[q][2], LOW + 0.18);
  BARS[CROSS] = [119.6, 120.12, 119.5, ENTRY];
  var VOL = path.map(function (c, i) { return i <= 14 ? 2.2 : i <= ARM ? 0.9 : i < CROSS ? 1.0 : i === CROSS ? 1.8 : 1.3; });
  /* the 9 EMA and session VWAP (the 9:30–10:10 bars are folded in as a starting balance) */
  var EMA = [], VW = [];
  (function () {
    var e = 122.1, pv = 0, v = 0, k;
    for (k = 0; k < 20; k++) { pv += (122.3 - 0.02 * k); v += 1; }
    path.forEach(function (c, i) { e = e + (c - e) * 0.2; EMA.push(e); pv += c * VOL[i]; v += VOL[i]; VW.push(pv / v); });
  })();
  var TPBAR = -1;
  for (q = CROSS + 1; q < N; q++) if (TPBAR < 0 && BARS[q][1] >= TP) TPBAR = q;
  function minute(i) { return 610 + 2 * i; }
  function clock(m) { var h = Math.floor(m / 60), mm = m % 60; return (h > 12 ? h - 12 : h) + ":" + (mm < 10 ? "0" : "") + mm; }
  var LASTA = 0; for (q = 0; q < N; q++) if (minute(q) < 645) LASTA = q;

  /* ---------- timeline ---------- */
  var STAGES = [
    { at: 0,    title: "Find the stock", text: "On the daily chart: a strong stock pulling back to its 5 and 10-day moving averages. That's the watchlist. Everything after this happens on 2-minute bars." },
    { at: 4.4,  title: "The stock turns off the low", text: "It sells off to " + LOW.toFixed(2) + " and stops going down. Not a buy. Three bars later, with three higher lows on each side, the indicator confirms it as today's pivot low, and that pivot arms the long side." },
    { at: 10.0, title: "Momentum builds toward VWAP", text: "Price grinds back toward VWAP, steady rather than violent. The 9 EMA (white) turns up and closes the gap on VWAP (teal)." },
    { at: 15.4, title: "The 9 EMA crosses VWAP", text: "At " + clock(minute(CROSS)) + " the 9 EMA crosses over VWAP, inside window B (10:46 to 1:30), with a same-day pivot low armed. That's the signal: BUY B." },
    { at: 18.6, title: "Enter on the cross", text: "Buy at the cross bar's close, " + ENTRY.toFixed(2) + ". Don't wait for a pullback. The move is already proving itself, and the entry is still close to the low." },
    { at: 21.6, title: "Stop and target off the move", text: "Low to cross is one unit: " + UNIT.toFixed(2) + ". Target one unit up, " + TP.toFixed(2) + ". Stop a third of a unit back, " + SL.toFixed(2) + ". Risk " + (UNIT / 3).toFixed(2) + " to make " + UNIT.toFixed(2) + ": 3R." }
  ];
  var TB = [];
  for (var i = 0; i < N; i++) {
    if (i <= ARM) TB[i] = [4.6 + i * 0.27, 4.6 + i * 0.27 + 0.3];
    else if (i < CROSS) TB[i] = [10.2 + (i - ARM - 1) * 0.22, 10.2 + (i - ARM - 1) * 0.22 + 0.25];
    else if (i === CROSS) TB[i] = [15.6, 17.4];
    else TB[i] = [23.4 + (i - CROSS - 1) * 0.34, 23.4 + (i - CROSS - 1) * 0.34 + 0.3];
  }
  var END = TB[N - 1][1] + 1.6;

  /* ---------- geometry ---------- */
  var W = 1180, H = 500, YT = 40, YB = 440, PMIN = 112.5, PMAX = 129.5, XTAG = 1012, XAX = 1172, XEND = 1000;
  function y(p) { return YB - (p - PMIN) / (PMAX - PMIN) * (YB - YT); }
  function x(i) { return 70 + i * 13.6; }

  /* ---------- helpers ---------- */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function txt(xx, yy, s, col, size, anchor, weight, op) {
    return '<text x="' + xx + '" y="' + yy + '" fill="' + col + '" font-size="' + (size || 13) + '" text-anchor="' + (anchor || "start") + '"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  function hline(x1, x2, p, col, dash, w, op) {
    return '<line x1="' + x1 + '" x2="' + x2 + '" y1="' + y(p).toFixed(1) + '" y2="' + y(p).toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function tag(p, label, col, op, dy, ink) {
    if (op <= 0) return "";
    var yy = y(p) + (dy || 0);
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + XTAG + '" y="' + (yy - 10) + '" width="122" height="20" rx="5" fill="' + col + '"/>' +
      txt(XTAG + 8, yy + 4.5, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function candle(xx, b, prog, wBody, op, yf) {
    if (prog <= 0) return "";
    yf = yf || y;
    var o = b[0], h = b[1], l = b[2], c = b[3], up = c >= o;
    var pth = up ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
    var cur = prog >= 1 ? c : pth[idx] + (pth[idx + 1] - pth[idx]) * f;
    var hi = o, lo = o;
    for (var k = 0; k <= idx; k++) { hi = Math.max(hi, pth[k]); lo = Math.min(lo, pth[k]); }
    hi = Math.max(hi, cur); lo = Math.min(lo, cur);
    var col = cur >= o ? "#30d158" : "#ff453a", top = yf(Math.max(o, cur)), bh = Math.max(1.5, Math.abs(yf(o) - yf(cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + xx + '" x2="' + xx + '" y1="' + yf(hi).toFixed(1) + '" y2="' + yf(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.2"/>' +
      '<rect x="' + (xx - wBody / 2) + '" y="' + top.toFixed(1) + '" width="' + wBody + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }
  function callout(xx, yy, lines, col, op, anchorRight) {
    if (op <= 0) return "";
    var w = 14 + Math.max.apply(null, lines.map(function (s) { return s.length; })) * 7.1, h = 10 + lines.length * 17;
    var x0 = anchorRight ? xx - w : xx;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0.toFixed(0) + '" y="' + yy.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h + '" rx="8" fill="#2c2c2e" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, k) { s += txt((x0 + 10).toFixed(0), (yy + 20 + k * 17).toFixed(0), ln, k === 0 ? col : "#d1d1d6", 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  function line(arr, i0, i1, col, w, op) {
    if (i1 < i0) return "";
    var pts = [];
    for (var k = i0; k <= i1; k++) pts.push(x(k).toFixed(1) + "," + y(arr[k]).toFixed(1));
    return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round" opacity="' + op.toFixed(3) + '"/>';
  }

  /* ---------- stage 1: the daily chart inset ---------- */
  var DAILY = (function () {
    var r = (function () { var s = 5; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
    var c = 84, out = [];
    for (var d = 0; d < 30; d++) {
      var step = d < 25 ? 1.65 + (r() - 0.45) * 2.6 : d < 29 ? -2.4 + (r() - 0.5) * 1.2 : 0;
      var o = c + (r() - 0.5) * 1.2; c = d === 29 ? 118.6 : c + step;
      out.push([o, Math.max(o, c) + 0.4 + r() * 1.6, Math.min(o, c) - 0.4 - r() * 1.6, c]);
    }
    out[29] = [119.3, 120.4, 115.5, 118.6];
    return out;
  })();
  function sma(n, i) { var s = 0, k = 0; for (var j = Math.max(0, i - n + 1); j <= i; j++) { s += DAILY[j][3]; k++; } return s / k; }
  function inset(T) {
    var op = fade(T, 0.1, 0.5) * (1 - fade(T, 4.0, 0.5));
    if (op <= 0) return "";
    var X0 = 170, X1 = 900, Y0 = 70, Y1 = 410, lo = 78, hi = 134;
    function yd(p) { return Y1 - 22 - (p - lo) / (hi - lo) * (Y1 - Y0 - 60); }
    function xd(d) { return X0 + 40 + d * 21.5; }
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + X0 + '" y="' + Y0 + '" width="' + (X1 - X0) + '" height="' + (Y1 - Y0) + '" rx="14" fill="#161617" stroke="#3a3a3c"/>';
    s += txt(X0 + 22, Y0 + 28, "Daily bars", "#86868b", 12) + txt(X1 - 22, Y0 + 28, "Illustrative", "#6e6e73", 11, "end");
    var shown = Math.min(30, Math.floor(clamp01((T - 0.3) / 2.2) * 30) + 1);
    for (var d = 0; d < shown; d++) s += candle(xd(d), DAILY[d], 1, 9, 1, yd);
    [[5, "#ffd60a", "5 SMA"], [10, "#ff9f0a", "10 SMA"]].forEach(function (m) {
      var pts = [];
      for (var k = 0; k < shown; k++) pts.push(xd(k).toFixed(1) + "," + yd(sma(m[0], k)).toFixed(1));
      s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + m[1] + '" stroke-width="1.8"/>';
      if (shown === 30) s += txt(xd(29) + 14, yd(sma(m[0], 29)) + (m[0] === 5 ? -4 : 12), m[2], m[1], 12, "start", 600);
    });
    var a = fade(T, 2.6, 0.4);
    if (a > 0) {
      s += '<circle cx="' + xd(29) + '" cy="' + yd(116.8).toFixed(1) + '" r="16" fill="none" stroke="#f5f5f7" stroke-width="1.5" stroke-dasharray="3 3" opacity="' + a.toFixed(3) + '"/>';
      s += callout(xd(29) - 26, Y0 + 50, ["Strong stock, pulling back", "into the 5 and 10 SMA: today's scalp"], "#f5f5f7", a, true);
    }
    return s + "</g>";
  }

  /* ---------- one frame ---------- */
  function frame(T) {
    var s = '<rect width="' + W + '" height="' + H + '" fill="#1d1d1f"/>';
    var main = fade(T, 4.2, 0.5);
    /* windows A and B, shaded the way the indicator shades them */
    var wa = main * (0.6 + 0.4 * fade(T, 15.4, 0.4) * (1 - fade(T, 18.6, 0.5)));
    s += '<rect x="' + (x(0) - 7) + '" y="' + YT + '" width="' + (x(LASTA) + 7 - x(0) + 7) + '" height="' + (YB - YT) + '" fill="' + COL.winA + '" opacity="' + (0.07 * main).toFixed(3) + '"/>';
    s += '<rect x="' + (x(LASTA) + 7) + '" y="' + YT + '" width="' + (XEND - x(LASTA) - 7) + '" height="' + (YB - YT) + '" fill="' + COL.winB + '" opacity="' + (0.07 * wa).toFixed(3) + '"/>';
    s += txt(x(0) - 2, YT + 16, "Window A · until 10:45", COL.winA, 12, "start", 600, main * 0.9);
    s += txt(x(LASTA) + 14, YT + 16, "Window B · 10:46 – 1:30", COL.winB, 12, "start", 600, wa);
    for (var p = 114; p <= 128; p += 2) s += hline(56, XEND, p, "rgba(255,255,255,0.05)", null, 1) + txt(XAX, y(p) + 4, p.toFixed(2), "#6e6e73", 11, "end");
    [10, 25, 40, 55].forEach(function (k) { s += txt(x(k), YB + 22, clock(minute(k)), "#6e6e73", 11, "middle", null, main); });
    s += txt(60, 26, "2-minute bars", "#86868b", 12, "start", null, main);
    s += txt(XAX, 488, "Illustrative", "#6e6e73", 11, "end");

    /* bars, and the EMA / VWAP growing with them */
    var last = -1;
    for (var k = 0; k < N; k++) if (T >= TB[k][0]) last = k;
    var after = function (j) { return TPBAR >= 0 && j > TPBAR; };
    if (last >= 1) {
      s += line(VW, 0, last, COL.vwap, 2.4, main) + line(EMA, 0, last, COL.ema, 2, main);
      if (last >= 6) s += txt(x(6), y(VW[6]) - 10, "VWAP", COL.vwap, 12, "start", 600, main) + txt(x(6), y(EMA[6]) + 22, "9 EMA", COL.ema, 12, "start", 600, main);
    }
    BARS.forEach(function (b, j) {
      var pr = clamp01((T - TB[j][0]) / (TB[j][1] - TB[j][0]));
      if (pr > 0) s += candle(x(j), b, pr, 8, after(j) ? 0.35 : 1);
    });

    /* stage 2: the low, then the pivot it arms */
    var aLow = fade(T, TB[LOWBAR][1], 0.3), aArm = fade(T, TB[ARM][1], 0.3);
    if (aLow > 0) {
      s += '<circle cx="' + x(LOWBAR) + '" cy="' + (y(LOW) + 10).toFixed(1) + '" r="4" fill="' + COL.piv + '" opacity="' + aArm.toFixed(3) + '"/>';
      var dimLow = 1 - fade(T, 15.4, 0.5);
      s += callout(x(LOWBAR) + 4, y(LOW) + 18, aArm > 0 ? ["Pivot low armed · " + LOW.toFixed(2), "3 higher lows on each side"] : ["Low of day " + LOW.toFixed(2), "Not a buy. Just mark it."],
        COL.piv, aLow * dimLow);
    }
    /* stage 3: the push */
    s += callout(x(21), y(125.4), ["Momentum builds into VWAP", "Steady, not a vertical spike"], "#f5f5f7", fade(T, 11.4, 0.4) * (1 - fade(T, 15.6, 0.5)));

    /* stage 4: the cross */
    var aX = fade(T, TB[CROSS][1], 0.3);
    if (aX > 0) {
      var cy = y((EMA[CROSS] + VW[CROSS]) / 2);
      s += '<circle cx="' + x(CROSS) + '" cy="' + cy.toFixed(1) + '" r="9" fill="none" stroke="' + COL.tp + '" stroke-width="2" opacity="' + aX.toFixed(3) + '"/>';
      s += '<g opacity="' + aX.toFixed(3) + '"><path d="M' + x(CROSS) + ' ' + (y(BARS[CROSS][2]) + 12) + ' l-6 10 h12 z" fill="' + COL.tp + '"/>' +
        txt(x(CROSS), y(BARS[CROSS][2]) + 36, "BUY B", COL.tp, 12, "middle", 700) + "</g>";
      s += callout(x(CROSS) - 18, y(124.2), ["9 EMA × VWAP · " + clock(minute(CROSS)), "Inside window B", "Pivot low armed → BUY B"], COL.tp, aX * (1 - fade(T, 21.6, 0.5)), true);
    }

    /* stage 5: entry */
    var xe = x(CROSS), aE = fade(T, 18.7, 0.4);
    s += hline(xe, XEND, ENTRY, COL.entry, null, 1.6, aE) + tag(ENTRY, "Entry " + ENTRY.toFixed(2), COL.entry, aE, 0, "#fff");
    s += callout(xe + 22, y(117.6), ["Buy the cross bar's close", "No waiting for a pullback"], COL.entry, fade(T, 19.0, 0.4) * (1 - fade(T, 21.6, 0.5)));

    /* stage 6: the measured move */
    var aM = fade(T, 21.7, 0.4), aT = fade(T, 22.3, 0.4);
    if (aM > 0) {
      s += hline(x(LOWBAR), XEND, LOW, "#8e8e93", "2 4", 1.2, aM) + tag(LOW, "Pivot " + LOW.toFixed(2), "#48484a", aM, 0, "#f5f5f7");
      var bx = XEND - 34;
      s += '<g opacity="' + aM.toFixed(3) + '"><line x1="' + bx + '" x2="' + bx + '" y1="' + y(LOW) + '" y2="' + y(ENTRY) + '" stroke="#f5f5f7" stroke-width="1.5"/>' +
        '<line x1="' + (bx - 5) + '" x2="' + (bx + 5) + '" y1="' + y(LOW) + '" y2="' + y(LOW) + '" stroke="#f5f5f7" stroke-width="1.5"/>' +
        '<line x1="' + (bx - 5) + '" x2="' + (bx + 5) + '" y1="' + y(ENTRY) + '" y2="' + y(ENTRY) + '" stroke="#f5f5f7" stroke-width="1.5"/>' +
        txt(bx - 10, y((LOW + SL) / 2) + 4, "1 unit = " + UNIT.toFixed(2), "#f5f5f7", 12, "end", 600) + "</g>";
    }
    if (aT > 0) {
      var bx2 = XEND - 34;
      s += '<g opacity="' + aT.toFixed(3) + '"><line x1="' + bx2 + '" x2="' + bx2 + '" y1="' + y(ENTRY) + '" y2="' + y(TP) + '" stroke="' + COL.tp + '" stroke-width="1.5" stroke-dasharray="4 3"/>' +
        txt(bx2 - 10, y((ENTRY + TP) / 2) + 4, "+1 unit", COL.tp, 12, "end", 600) + "</g>";
    }
    s += hline(xe, XEND, TP, COL.tp, "5 4", 1.6, aT) + tag(TP, "Target " + TP.toFixed(2), COL.tp, aT);
    s += hline(xe, XEND, SL, COL.sl, "5 4", 1.6, aT) + tag(SL, "Stop " + SL.toFixed(2), COL.sl, aT, 0, "#fff");
    s += callout(xe + 110, y(117.0), ["Risk " + (UNIT / 3).toFixed(2) + " · reward " + UNIT.toFixed(2), "Stop = unit ÷ 3 · 3R"], COL.sl, fade(T, 22.6, 0.4) * (1 - fade(T, TB[Math.min(N - 1, TPBAR)][1] + 1.5, 0.5)));
    if (TPBAR >= 0) {
      var aH = fade(T, TB[TPBAR][1], 0.3);
      if (aH > 0) s += '<circle cx="' + x(TPBAR) + '" cy="' + y(TP).toFixed(1) + '" r="7" fill="none" stroke="' + COL.tp + '" stroke-width="2" opacity="' + aH.toFixed(3) + '"/>';
      s += callout(x(TPBAR) - 14, y(TP) - 70, ["Target hit · " + TP.toFixed(2), "+3R in " + ((TPBAR - CROSS) * 2) + " minutes"], COL.tp, aH, true);
      s += txt(x(N - 1), y(path[N - 1]) - 18, "kept running", "#86868b", 12, "end", null, fade(T, TB[N - 1][1], 0.4));
    }
    svg.innerHTML = s + inset(T);
  }

  /* ---------- captions + controls ---------- */
  function stageAt(T) { var k = 0; STAGES.forEach(function (st, i) { if (T >= st.at) k = i; }); return k; }
  var shown = -1;
  function caption(T) {
    var k = stageAt(T);
    if (k === shown) return;
    shown = k;
    cap.n.textContent = (k + 1) + " / " + STAGES.length;
    cap.t.textContent = STAGES[k].title;
    cap.b.textContent = STAGES[k].text;
    chips.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-current", i === k ? "step" : "false"); });
  }
  chips.innerHTML = STAGES.map(function (st, i) { return '<button type="button" data-i="' + i + '">' + (i + 1) + ". " + st.title + "</button>"; }).join("");

  var T = END, playing = false, lastNow = 0, raf = 0;
  var scroller = root.querySelector(".anim-scroll");
  function follow() {
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 2) return;
    var last = 0;
    for (var k = 0; k < N; k++) if (T >= TB[k][0]) last = k;
    var sw = scroller.scrollWidth, cw = scroller.clientWidth;
    if (T < 4.4) scroller.scrollLeft = Math.max(0, 640 / W * sw - cw * 0.75);
    else if (T < 18.6) scroller.scrollLeft = Math.max(0, (x(last) + 90) / W * sw - cw * 0.8);
    else scroller.scrollLeft = (x(CROSS) - 22) / W * sw;            // the cross, the levels and their tags
  }
  function draw() { frame(T); caption(T); follow(); }
  function tick(now) {
    if (!playing) return;
    var dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
    T += dt;
    if (T >= END) { T = END; setPlaying(false); }
    draw();
    if (playing) raf = requestAnimationFrame(tick);
  }
  function setPlaying(on) {
    playing = on;
    btnPlay.textContent = on ? "Pause" : (T >= END ? "Play" : "Resume");
    btnPlay.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) { lastNow = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  }
  btnPlay.addEventListener("click", function () { if (playing) { setPlaying(false); return; } if (T >= END) T = 0; setPlaying(true); });
  btnReplay.addEventListener("click", function () { T = 0; draw(); setPlaying(true); });
  chips.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var k = +b.getAttribute("data-i");
    if (REDUCED) { T = k === 0 ? 3.6 : k + 1 < STAGES.length ? STAGES[k + 1].at - 0.01 : END; draw(); return; }
    T = STAGES[k].at; draw(); setPlaying(true);
  });

  draw();
  if (!REDUCED && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); T = 0; draw(); setPlaying(true); }
    }, { threshold: 0.5 });
    io.observe(svg.parentNode || svg);
  }
})();

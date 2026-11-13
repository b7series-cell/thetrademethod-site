/* =====================================================================
   qm-anim.js — the animations on the Qullamaggie page.

   1. [data-qm-anim]  one Qullamaggie breakout on a daily chart, start
      to finish, in six stages: the big move → the base, tightening
      and surfing the 10 and 20-day averages → breakout day, bought
      over the opening range high (a 5-minute inset) → the stop at the
      low of the day, checked against the ADR and sized to 0.5% risk →
      a third sold on day four, stop to breakeven → the rest trailed on
      the 10-day, out on the first close below it.
   2. [data-qm-steps] the six steps as a click-through stepper with a
      small chart of the same trade that changes with each step.
   3. [data-qm-two]   the other two setups on a loop: an episodic pivot
      and a parabolic short.
   4. [data-qm-calc]  position size from the account, the risk, the
      entry, the low of day and the ADR.
   5. [data-qm-ten]   ten trades at a 30% win rate, on a loop.

   Like gg-anim.js the walkthrough redraws for the space it has: under
   640px of drawing width it uses a tall, narrow layout with larger text.
   The bars are scripted and labelled "Illustrative". No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#22d3ee", gold: "#f4b942", orange: "#ff9f0a", purple: "#bf5af2",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e" };
  var FS = 1;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function txt(x, y, s, col, size, anchor, weight, op) {
    if (op != null && op <= 0) return "";
    return '<text x="' + (+x).toFixed(1) + '" y="' + (+y).toFixed(1) + '" fill="' + col + '" font-size="' + ((size || 13) * FS).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  function hl(x1, x2, y, col, dash, w, op) {
    if (op != null && op <= 0) return "";
    return '<line x1="' + x1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function rect(x, y, w, h, fill, op, stroke) {
    if (op <= 0) return "";
    return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-dasharray="4 3"' : "") + ' opacity="' + op.toFixed(3) + '"/>';
  }
  function callout(x, y, lines, col, op) {
    if (op <= 0) return "";
    var w = 18 + Math.max.apply(null, lines.map(function (s) { return s.replace(/&[a-z#0-9]+;/g, "x").length; })) * 7.2 * FS, h = 10 + lines.length * 18 * FS;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" rx="8" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, k) { s += txt(x + 10, y + 21 * FS + k * 18 * FS, ln, k === 0 ? col : C.dim, 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  function candle(x, yf, b, prog, wBody, op, paint) {
    if (prog <= 0) return "";
    var o = b[0], h = b[1], l = b[2], c = b[3];
    var pth = c >= o ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
    var cur = prog >= 1 ? c : pth[idx] + (pth[idx + 1] - pth[idx]) * f;
    var hi = o, lo = o;
    for (var k = 0; k <= idx; k++) { hi = Math.max(hi, pth[k]); lo = Math.min(lo, pth[k]); }
    hi = Math.max(hi, cur); lo = Math.min(lo, cur);
    var col = paint || (cur >= o ? C.up : C.dn), top = yf(Math.max(o, cur)), bh = Math.max(1.5, Math.abs(yf(o) - yf(cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + yf(hi).toFixed(1) + '" y2="' + yf(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.3"/>' +
      '<rect x="' + (x - wBody / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + wBody.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1" fill="' + col + '"/></g>';
  }
  function tag(xTag, y, label, col, op, ink) {
    if (op <= 0) return "";
    var w = (label.length * 7 + 16) * FS, h = 20 * FS;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xTag.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="' + col + '"/>' +
      txt(xTag + 8 * FS, y + 4.5 * FS, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function ring(x, y, r, col, op, w) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2) + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function poly(pts, col, w, op, dash) {
    if (pts.length < 2 || (op != null && op <= 0)) return "";
    return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2) + '" stroke-linejoin="round" stroke-linecap="round"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function f2(v) { return v.toFixed(2); }
  function sma(bars, n) {
    return bars.map(function (b, i) {
      if (i < n - 1) return null;
      var a = 0; for (var k = i - n + 1; k <= i; k++) a += bars[k][3];
      return a / n;
    });
  }

  /* ---------------------------------------------------------------------
     The trade, shared by the walkthrough and the stepper: daily bars,
     volume in thousands of shares.
     --------------------------------------------------------------------- */
  var BARS = [
    [20,20.38,19.31,19.5,884],[19.5,20.49,19.3,20.23,1101],[20.23,20.52,19.92,20.26,1054],[20.26,20.49,20.04,20.32,1083],[20.32,20.43,19.89,20.2,987],
    [20.2,20.76,20.06,20.42,1005],[20.42,20.73,20.13,20.42,1031],[20.42,20.8,20.2,20.41,934],[20.41,20.61,20.19,20.34,919],[20.34,20.53,19.55,19.93,1023],
    /* 10-27  the move: +87% in 18 days */
    [20.09,21.93,19.78,21.69,2785],[21.75,22.71,21.18,22.4,2077],[22.38,24,21.81,23.4,2721],[23.28,24.91,22.94,24.54,2594],[24.5,26.29,24.21,25.72,3269],
    [25.75,27.71,25.3,27.13,2723],[27.18,28.68,26.83,27.92,2992],[27.85,29.19,27.51,28.78,2548],[28.98,30.37,28.45,30.1,2109],[30.1,30.44,29.5,30.19,2308],
    [30.31,31.6,29.87,31.13,2193],[31.39,33.69,30.84,32.96,3271],[33.14,33.37,32.84,33.16,2106],[32.96,34.84,32.46,34.5,2685],[34.64,35.69,34.35,34.96,2524],
    [35.21,36.23,35.01,35.73,3278],[35.85,37.4,35.29,37,2263],[37,37.6,36.5,37.2,2312],
    /* 28-45  the base: higher lows, tighter, quieter, under 37.60 */
    [37.2,37.48,36.2,37,1381],[37,37.51,35,35.8,1584],[35.8,36.2,33.9,34.6,1299],[34.6,35.17,33.4,33.8,1451],[33.8,35.16,33.6,34.6,1456],
    [34.6,36.14,34.3,35.6,1415],[35.6,37.57,35.4,36.4,1280],[36.4,36.95,34.6,35.2,1072],[35.2,35.56,34.2,34.6,1108],[34.6,35.94,34.38,35.6,1096],
    [35.6,37.56,35.42,36.6,900],[36.6,36.92,35.4,36,1033],[36,36.45,35.1,35.4,950],[35.4,36.48,35.17,36.2,725],[36.2,37.57,35.95,36.9,826],
    [36.9,37.29,36.1,36.4,673],[36.4,37.07,36.17,36.8,627],[36.8,37.52,36.6,37.1,603],
    /* 46  breakout day */
    [37.3,40.1,36.95,39.85,4200],
    /* 47-50  days two to five */
    [39.9,41.6,39.5,41.3,3100],[41.3,42.6,40.7,42.2,2500],[42.2,44.4,41.9,44,2900],[44,44.9,42.8,43.3,2000],
    /* 51-74  riding the 10-day, then the first close under it */
    [43.26,44.47,42.94,44.26,2033],[44.17,45.4,43.88,45.06,2128],[45.04,45.62,43.94,44.47,1649],[44.59,45.27,43.75,43.96,1557],[43.99,45.93,43.78,45.28,1709],
    [45.16,46.24,44.95,46,2084],[46.13,46.98,45.85,46.71,2140],[46.63,47.33,45.75,46.12,1504],[46.2,46.61,45.33,45.56,1238],[45.65,47.52,45.08,47.24,2007],
    [47.13,48.61,46.86,48.11,1662],[48.04,49.48,47.65,49,2395],[48.87,49.8,48.67,49.44,1605],[49.41,49.73,47.88,48.45,1566],[48.53,49.16,47.22,47.8,1581],
    [47.85,49.55,47.49,49.18,1998],[49.18,50.77,48.71,50.21,2106],[50.27,51.85,49.68,51.23,1950],[51.22,51.91,50.76,51.11,1148],[51.06,51.61,49.52,50.01,1673],
    [50.1,50.42,47.86,48.38,1162],[48.51,49.02,46.74,47.23,1422],[47.21,48.04,46.66,47.56,1816],[47.61,48.01,46.81,47.09,1453]
  ];
  /* the first 5-minute bars of breakout day: the opening range is the first bar */
  var M5 = [[37.30, 37.78, 36.95, 37.62], [37.62, 37.76, 37.48, 37.55], [37.55, 38.12, 37.52, 38.04], [38.04, 38.36, 37.96, 38.30],
            [38.30, 38.52, 38.18, 38.44], [38.44, 38.80, 38.36, 38.72], [38.72, 38.86, 38.58, 38.66], [38.66, 39.10, 38.62, 39.02]];
  var N = BARS.length, MOVE0 = 10, MOVE1 = 27, B0 = 28, B1 = 45, BO = 46, SELL = 49, D5 = 50;
  var MA10 = sma(BARS, 10), MA20 = sma(BARS, 20);
  var BASEHI = 0, BASELO = 1e9;
  for (var bi = B0 - 1; bi <= B1; bi++) { BASEHI = Math.max(BASEHI, BARS[bi][1]); if (bi >= B0) BASELO = Math.min(BASELO, BARS[bi][2]); }
  var ORH = M5[0][1], ORL = M5[0][2], ENTRY = +(ORH + 0.02).toFixed(2), LOD = BARS[BO][2], STOP = LOD, RISK = ENTRY - STOP;
  var ADRP = 0; for (bi = BO - 20; bi < BO; bi++) ADRP += BARS[bi][1] / BARS[bi][2] - 1;
  ADRP = ADRP / 20 * 100;
  var ADR = ENTRY * ADRP / 100;
  var EXIT = -1; for (bi = BO + 1; bi < N; bi++) if (BARS[bi][3] < MA10[bi]) { EXIT = bi; break; }
  var SELLPX = BARS[SELL][3], EXITPX = BARS[EXIT][3];
  var R_SELL = (SELLPX - ENTRY) / RISK, R_EXIT = (EXITPX - ENTRY) / RISK, R_ALL = R_SELL / 3 + R_EXIT * 2 / 3;
  var MOVEPCT = (BARS[MOVE1][3] / BARS[MOVE0 - 1][3] - 1) * 100;
  var ACCT = 100000, RISKPCT = 0.5, SHARES = Math.floor(ACCT * RISKPCT / 100 / RISK), POSPCT = SHARES * ENTRY / ACCT * 100;

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-qm-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;

    var STAGES = [
      { at: 0,    title: "The move", text: "First, a stock has to move. This one runs " + Math.round(MOVEPCT) + "% in 18 days on heavy volume, which puts it in the top 1 to 2% of the market over the past month. Qullamaggie only looks for breakouts in stocks like this." },
      { at: 5.2,  title: "The base", text: "Then it rests. It pulls back, makes higher lows and tightens up under " + f2(BASEHI) + " for 18 days while volume dries up. The 10 and 20-day averages catch up and price surfs on top of them. That's the setup." },
      { at: 11.0, title: "Breakout day: buy the opening range high", text: "On the day it breaks, he doesn't buy the daily close. He waits for the first 5 minutes to set a range (" + f2(ORL) + " to " + f2(ORH) + "), then buys as price takes out the opening range high, at " + f2(ENTRY) + ". It closes the day at " + f2(BARS[BO][3]) + " on " + (BARS[BO][4] / 1000).toFixed(1) + "M shares, the biggest volume in two months." },
      { at: 15.2, title: "The stop: the low of the day", text: "The stop is the low of the day, " + f2(STOP) + ": " + f2(RISK) + " a share, or " + (RISK / ENTRY * 100).toFixed(1) + "%. That's less than the average daily range (" + ADRP.toFixed(1) + "%, about " + f2(ADR) + "), so the trade is allowed. Risking 0.5% of a $100,000 account buys " + SHARES + " shares." },
      { at: 18.6, title: "Days 3 to 5: sell a third", text: "It works right away. On day four, at " + f2(SELLPX) + " (+" + R_SELL.toFixed(1) + "R), sell a third of the position and move the stop on the rest up to breakeven. From here the trade can't lose money." },
      { at: 21.8, title: "Trail the rest on the 10-day", text: "Hold the rest as long as price closes above the 10-day average. Dips that hold it are fine. The first close below it, at " + f2(EXITPX) + ", is the exit: +" + R_EXIT.toFixed(1) + "R on the last two thirds, about +" + R_ALL.toFixed(1) + "R on the whole trade. Most breakouts won't go like this. The few that do pay for all the ones that don't." }
    ];
    var TB = [];
    for (var i = 0; i < N; i++) {
      if (i <= MOVE1) TB[i] = [0.4 + i * 0.16, 0.4 + i * 0.16 + 0.14];
      else if (i <= B1) TB[i] = [5.5 + (i - B0) * 0.3, 5.5 + (i - B0) * 0.3 + 0.26];
      else if (i === BO) TB[i] = [13.7, 14.7];
      else if (i <= D5) TB[i] = [18.9 + (i - BO - 1) * 0.55, 18.9 + (i - BO - 1) * 0.55 + 0.48];
      else TB[i] = [22.1 + (i - D5 - 1) * 0.3, 22.1 + (i - D5 - 1) * 0.3 + 0.26];
    }
    var END = TB[N - 1][1] + 1.6;
    var IN0 = 11.4;    // the inset's 5-minute bars start printing

    function size(n) {
      return n ? { W: 440, H: 820, x0: 14, x1: 300, yt: 124, yb: 650, vt: 676, vb: 750, xAx: 434, xTag: 306, cx: 14, cy: 14, ix: 14, iy: 104, iw: 412, ih: 150, first: 8 }
               : { W: 1180, H: 600, x0: 60, x1: 1000, yt: 96, yb: 452, vt: 476, vb: 552, xAx: 1172, xTag: 1010, cx: 60, cy: 18, ix: 60, iy: 112, iw: 330, ih: 150, first: 0 };
    }
    var PMIN = 18, PMAX = 53;

    /* the 5-minute opening range on breakout day, in a box */
    function inset(T, L, op) {
      if (op <= 0) return "";
      var x0 = L.ix, y0 = L.iy, w = L.iw, h = L.ih, mn = 36.8, mx = 39.25, n = 10;
      var dx = (w - 120 * FS) / n, wB = dx * 0.55;
      function x(i) { return x0 + 12 + dx * (i + 0.5); }
      function y(p) { return y0 + h - 14 - (p - mn) / (mx - mn) * (h - 40); }
      var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" rx="10" fill="#141416" stroke="' + C.blue + '" stroke-width="1"/>';
      s += txt(x0 + 12, y0 + 20 * FS, "Breakout day · 5-minute bars", C.blue, 12, "start", 600);
      var shown = 0, pr = 0;
      for (var k = 0; k < M5.length; k++) { var p = clamp01((T - (IN0 + k * 0.28)) / 0.24); if (p > 0) { shown = k; pr = p; } }
      s += rect(x(0) - dx / 2, y(ORH), dx * (shown + 1), y(ORL) - y(ORH), C.blue, 0.10);
      s += hl(x(0) - dx / 2, x0 + w - 110 * FS, y(ORH), C.blue, "4 3", 1.4);
      s += hl(x(0) - dx / 2, x0 + w - 110 * FS, y(ORL), C.dn, "4 3", 1.4);
      s += txt(x0 + w - 104 * FS, y(ORH) + 4, "ORH " + f2(ORH), C.blue, 11, "start", 600);
      s += txt(x0 + w - 104 * FS, y(ORL) + 4, "Low " + f2(ORL), C.dn, 11, "start", 600);
      for (k = 0; k < M5.length; k++) {
        var pk = clamp01((T - (IN0 + k * 0.28)) / 0.24);
        if (pk > 0) s += candle(x(k), y, M5[k], pk, wB, 1);
      }
      if (T >= IN0 + 2 * 0.28 + 0.12) {
        s += ring(x(2), y(ENTRY), 7 * FS, C.ink, fade(T, IN0 + 0.7, 0.3));
        s += txt(x(2) + 10, y(ENTRY) - 10, "Buy " + f2(ENTRY), C.ink, 12, "start", 700, fade(T, IN0 + 0.7, 0.3));
      }
      return s + "</g>";
    }

    /* the stop against the ADR, and the size it allows */
    function riskBox(L, op) {
      if (op <= 0) return "";
      var x0 = L.ix, y0 = L.iy, w = L.iw, h = L.ih, bx = x0 + 70 * FS, bw = w - 84 * FS, sc = bw / (ADR * 1.15);
      var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0 + '" y="' + y0 + '" width="' + w + '" height="' + h + '" rx="10" fill="#141416" stroke="' + C.dn + '" stroke-width="1"/>';
      s += txt(x0 + 12, y0 + 20 * FS, "The stop against the ADR", C.dn, 12, "start", 600);
      var r1 = y0 + 40 * FS, r2 = y0 + 72 * FS;
      s += txt(x0 + 12, r1 + 13, "Risk", C.dim, 12, "start", 600) + rect(bx, r1, RISK * sc, 18, C.dn, 0.9) + txt(bx + RISK * sc + 6, r1 + 13, f2(RISK), C.dn, 12, "start", 700);
      s += txt(x0 + 12, r2 + 13, "ADR", C.dim, 12, "start", 600) + rect(bx, r2, ADR * sc, 18, C.gold, 0.85) + txt(bx + ADR * sc - 6, r2 + 13, f2(ADR), "#000", 12, "end", 700);
      s += txt(x0 + 12, y0 + h - 14, "Inside the ADR ✓ · " + SHARES + " shares · " + Math.round(POSPCT) + "% of the account", C.ink, 12, "start", 600);
      return s + "</g>";
    }

    function frame(T, L) {
      var first = L.first, n = N - first;
      var dx = (L.x1 - L.x0) / (n - 0.5), wB = Math.max(2.2, dx * 0.6);
      function x(i) { return L.x0 + dx * (i - first + 0.5); }
      function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
      var VMAX = 4400; function vy(v) { return L.vb - v / VMAX * (L.vb - L.vt); }
      var s = "", p, k;
      for (p = 20; p <= 52 + 1e-9; p += 4) s += hl(L.x0, L.x1, y(p), "rgba(255,255,255,0.05)", null, 1) + (L.narrow ? "" : txt(L.xAx, y(p) + 4, p.toFixed(0), C.faint, 11, "end"));
      s += txt(L.x0, L.vt - 6, "Volume", C.faint, 11, "start");
      s += txt(L.W - 8, L.H - 6, "Illustrative · daily bars", C.faint, 11, "end");
      var last = -1; for (k = 0; k < N; k++) if (T >= TB[k][0]) last = k;

      /* the base: box and the line it has to clear */
      var aB = fade(T, TB[B1][1], 0.4);
      if (aB > 0) {
        var bEnd = T >= TB[BO][0] ? x(BO) - dx / 2 : x(B1) + dx / 2;
        s += rect(x(B0) - dx / 2, y(BASEHI), bEnd - x(B0) + dx / 2, y(BASELO) - y(BASEHI), C.dim, 0.08 * aB, C.dim);
        if (!L.narrow || T < 11.0) s += txt((x(B0) + bEnd) / 2, y(BASELO) + 18 * FS, "The base · 18 days", C.dim, 12, "middle", 700, aB * (1 - 0.6 * fade(T, 21.8, 0.4)));
      }
      var aR = fade(T, TB[B0][0] + 1.4, 0.5);
      if (aR > 0) {
        var broke = T >= TB[BO][1];
        s += hl(x(MOVE1), broke ? x(BO) : L.x1, y(BASEHI), broke ? C.up : C.dim, "5 4", 1.5, aR);
        s += tag(L.xTag, y(BASEHI), (L.narrow ? "Base " : "Base high ") + f2(BASEHI), broke ? C.up : C.dim, aR * (T >= 15.2 ? 0 : 1));
      }
      /* the higher lows */
      var aHL = fade(T, TB[B1][1], 0.4) * (1 - fade(T, 13.7, 0.4));
      if (aHL > 0) s += poly([31, 36, 40, 43].map(function (i) { return x(i).toFixed(1) + "," + (y(BARS[i][2]) + 4).toFixed(1); }), C.gold, 2, aHL, "3 4") +
        txt(x(43) + 8, y(BARS[43][2]) + 18 * FS, "higher lows", C.gold, 11, "start", 600, aHL);

      /* the 10 and 20-day averages, drawn as the bars print */
      var aM = fade(T, 2.8, 0.6);
      if (aM > 0 && last >= 10) {
        var p10 = [], p20 = [];
        for (k = Math.max(first, 9); k <= last; k++) { if (MA10[k] != null) p10.push(x(k).toFixed(1) + "," + y(MA10[k]).toFixed(1)); if (MA20[k] != null) p20.push(x(k).toFixed(1) + "," + y(MA20[k]).toFixed(1)); }
        var hot = T >= 21.8;
        s += poly(p20, C.orange, 1.8, 0.75 * aM * (hot ? 0.5 : 1));
        s += poly(p10, C.cyan, hot ? 2.6 : 1.8, 0.9 * aM);
        var lx = L.narrow ? L.x0 : L.x1 - 190;
        var ly = L.narrow ? L.yt - 16 : L.yt - 6;
        if (!(L.narrow && T >= 11.0 && T < 18.6)) {
          s += hl(lx, lx + 18, ly - 4, C.cyan, null, 2.4, aM) + txt(lx + 24, ly, "10-day", C.cyan, 12, "start", 600, aM);
          s += hl(lx + 90 * FS, lx + 90 * FS + 18, ly - 4, C.orange, null, 2.4, aM) + txt(lx + 90 * FS + 24, ly, "20-day", C.orange, 12, "start", 600, aM);
        }
      }

      /* candles and volume */
      for (k = first; k < N; k++) {
        var pr = clamp01((T - TB[k][0]) / (TB[k][1] - TB[k][0]));
        if (pr <= 0) continue;
        s += candle(x(k), y, BARS[k], pr, wB, 1, k === BO && T >= TB[BO][1] ? "#3ef08a" : null);
        var vc = k === BO ? C.up : (k >= B0 && k <= B1) ? "rgba(209,209,214,0.38)" : BARS[k][3] >= BARS[k][0] ? "rgba(48,209,88,0.45)" : "rgba(255,69,58,0.45)";
        var vv = BARS[k][4] * clamp01(pr * 1.6);
        s += rect(x(k) - wB / 2, vy(vv), wB, L.vb - vy(vv), vc, 0.9);
      }
      var aDry = fade(T, TB[B1][1], 0.3) * (1 - fade(T, 13.7, 0.3));
      if (aDry > 0) s += txt(x(41), vy(1700), "volume dries up", C.dim, 11, "middle", 600, aDry);
      var aBV = fade(T, TB[BO][1], 0.3) * (1 - fade(T, 18.6, 0.3));
      if (aBV > 0) s += txt(x(BO) + wB, vy(BARS[BO][4]) + 10, (BARS[BO][4] / 1000).toFixed(1) + "M", C.up, 12, "start", 700, aBV);

      /* the opening range inset on breakout day */
      s += inset(T, L, fade(T, 11.1, 0.4) * (1 - fade(T, 15.2, 0.4)));

      /* entry and stop */
      var aE = fade(T, TB[BO][1], 0.4), xs = x(BO);
      if (aE > 0) {
        var be = T >= TB[SELL][1] + 0.3;
        var xEnd = T >= TB[EXIT][1] ? x(EXIT) : L.x1;
        s += rect(xs, y(ENTRY), xEnd - xs, y(STOP) - y(ENTRY), C.dn, 0.12 * aE * (be ? 0.3 : 1));
        s += hl(xs, xEnd, y(ENTRY), C.ink, null, 1.8, aE);
        s += hl(xs, be ? x(SELL) : xEnd, y(STOP), C.dn, null, 2, aE);
        s += tag(L.xTag, y(ENTRY) - 8 * FS, (be ? "Breakeven " : "Buy ") + f2(ENTRY), be ? C.gold : C.ink, aE);
        s += tag(L.xTag, y(STOP) + 10 * FS, "Stop " + f2(STOP), C.dn, aE * (1 - fade(T, TB[SELL][1] + 0.3, 0.3)), "#000");
        s += ring(x(BO), y(ENTRY), 8 * FS, C.ink, aE);
      }
      /* the ADR check, in the same box the opening range used */
      s += riskBox(L, fade(T, 15.5, 0.4) * (1 - fade(T, 18.6, 0.4)));
      /* sell a third on day four */
      var aS = fade(T, TB[SELL][1], 0.3);
      if (aS > 0) {
        s += ring(x(SELL), y(SELLPX), 8 * FS, C.gold, aS, 2.2);
        if (!L.narrow || T < 21.8) s += txt(x(SELL), y(BARS[SELL][1]) - 14 * FS, "Sell ⅓ · +" + R_SELL.toFixed(1) + "R", C.gold, 12, "middle", 700, aS);
        else s += txt(x(SELL), y(BARS[SELL][1]) - 12 * FS, "⅓", C.gold, 13, "middle", 700, aS);
      }
      /* the exit: the first close under the 10-day */
      var aX = fade(T, TB[EXIT][1], 0.3);
      if (aX > 0) {
        s += ring(x(EXIT), y(EXITPX), 8 * FS, C.cyan, aX, 2.4);
        s += txt(x(EXIT), y(BARS[EXIT][2]) + 22 * FS, L.narrow ? "Out +" + R_EXIT.toFixed(1) + "R" : "Close under the 10-day · out +" + R_EXIT.toFixed(1) + "R", C.cyan, 12, "middle", 700, aX);
      }

      /* one caption box at a time */
      var cx = L.cx, cy = L.cy;
      s += callout(cx, cy, ["The move: +" + Math.round(MOVEPCT) + "% in 18 days", "Top 1–2% of stocks over the month"], C.up, fade(T, 1.6, 0.4) * (1 - fade(T, 5.2, 0.3)));
      s += callout(cx, cy, ["The base: 18 days under " + f2(BASEHI), "Higher lows, tighter ranges, less volume", "Surfing the 10 and 20-day"], C.dim, fade(T, TB[B1][1], 0.3) * (1 - fade(T, 11.0, 0.3)));
      s += callout(cx, cy, ["Opening range " + f2(ORL) + "–" + f2(ORH), "Buy the break of the ORH: " + f2(ENTRY)], C.blue, fade(T, 11.3, 0.3) * (1 - fade(T, 15.2, 0.3)));
      s += callout(cx, cy, ["Stop: low of day " + f2(STOP) + " · risk " + f2(RISK), "ADR " + ADRP.toFixed(1) + "% = " + f2(ADR) + " · risk is smaller ✓", "0.5% of $100k ÷ " + f2(RISK) + " = " + SHARES + " shares"], C.dn, fade(T, 15.4, 0.3) * (1 - fade(T, 18.6, 0.3)));
      s += callout(cx, cy, ["Day 4: sell ⅓ at " + f2(SELLPX) + " = +" + R_SELL.toFixed(1) + "R", "Stop on the rest to breakeven, " + f2(ENTRY)], C.gold, fade(T, TB[SELL][1], 0.3) * (1 - fade(T, 21.8, 0.3)));
      s += callout(cx, cy, ["Out on the first close under the 10-day", "⅔ out at " + f2(EXITPX) + " = +" + R_EXIT.toFixed(1) + "R", "Whole trade ≈ +" + R_ALL.toFixed(1) + "R"], C.cyan, fade(T, 22.1, 0.3));
      return s;
    }

    var svg = root.querySelector("svg");
    var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
    var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay"), chips = root.querySelector(".anim-chips");
    var box = root.querySelector(".anim-scroll") || svg.parentNode;
    var T = END, playing = false, lastNow = 0, raf = 0, shown = -1, L = null;
    function layout() {
      var narrow = box.clientWidth > 0 && box.clientWidth < NARROW_BELOW;
      if (L && L.narrow === narrow) return false;
      L = size(narrow); L.narrow = narrow;
      svg.setAttribute("viewBox", "0 0 " + L.W + " " + L.H);
      root.classList.toggle("is-narrow", narrow);
      return true;
    }
    function stageAt(t) { var k = 0; STAGES.forEach(function (s, i) { if (t >= s.at) k = i; }); return k; }
    function caption() {
      var k = stageAt(T);
      if (k === shown) return;
      shown = k;
      cap.n.textContent = (k + 1) + " / " + STAGES.length;
      cap.t.textContent = STAGES[k].title;
      cap.b.textContent = STAGES[k].text;
      chips.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-current", i === k ? "step" : "false"); });
    }
    function draw() { FS = L.narrow ? 1.18 : 1; svg.innerHTML = '<rect width="' + L.W + '" height="' + L.H + '" fill="' + C.bg + '"/>' + frame(T, L); caption(); }
    function tick(now) {
      if (!playing) return;
      T += Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
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
    chips.innerHTML = STAGES.map(function (s, i) { return '<button type="button" data-i="' + i + '">' + (i + 1) + ". " + s.title.replace(/:.*$/, "") + "</button>"; }).join("");
    btnPlay.addEventListener("click", function () { if (playing) { setPlaying(false); return; } if (T >= END) T = 0; setPlaying(true); });
    btnReplay.addEventListener("click", function () { T = 0; draw(); setPlaying(true); });
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var k = +b.getAttribute("data-i");
      if (REDUCED) { T = k + 1 < STAGES.length ? STAGES[k + 1].at - 0.01 : END; draw(); return; }
      T = STAGES[k].at; draw(); setPlaying(true);
    });
    layout(); draw();
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (layout()) draw(); }, 120); });
    if (!REDUCED && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); T = 0; draw(); setPlaying(true); }
      }, { threshold: 0.45 });
      io.observe(svg.parentNode || svg);
    }
    window.QMAnim = { _bars: BARS, _levels: { BASEHI: BASEHI, ORH: ORH, ENTRY: ENTRY, STOP: STOP, RISK: RISK, ADRP: ADRP, ADR: ADR, SELL: SELLPX, EXIT: EXIT, EXITPX: EXITPX,
                      R_SELL: R_SELL, R_EXIT: R_EXIT, R_ALL: R_ALL, MOVEPCT: MOVEPCT, SHARES: SHARES, POSPCT: POSPCT } };   // exposed for testing
  })();

  /* =====================================================================
     2. The six steps as a stepper: one step at a time, with a small
        chart of the same trade that changes with each step.
        Without the script the six steps simply show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-qm-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 6) return;
    var INFO = [
      { k: "The leaders",   c: C.up,      tag: "Scan · every day",       legs: [9, MOVE1] },
      { k: "The base",      c: "#8e8e93", tag: "Watchlist · wait",       legs: [MOVE1, B1] },
      { k: "The entry",     c: C.blue,    tag: "Act · opening range high", legs: [B1, BO] },
      { k: "The stop",      c: C.dn,      tag: "Act · low of the day",   legs: [BO, BO] },
      { k: "Sell a third",  c: C.gold,    tag: "Manage · day 3 to 5",    legs: [BO, SELL] },
      { k: "Trail the 10",  c: C.cyan,    tag: "Manage · close under the MA", legs: [SELL, EXIT] }
    ];
    var cur = 0;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "The six steps");
    bar.innerHTML = '<span class="gs-line"><i></i></span>' + INFO.map(function (s, i) {
      return '<button type="button" role="tab" class="gs-step" data-i="' + i + '"><b>' + (i + 1) + "</b><span>" + s.k + "</span></button>";
    }).join("");
    var body = document.createElement("div"); body.className = "gs-body";
    var left = document.createElement("div"); left.className = "gs-left";
    var tg = document.createElement("p"); tg.className = "gs-tag";
    var nav = document.createElement("div"); nav.className = "gs-nav";
    nav.innerHTML = '<button type="button" class="pill gs-prev">&lsaquo; Back</button><button type="button" class="pill pill-buy gs-next"></button>';
    var fig = document.createElement("div"); fig.className = "gs-chart";
    fig.innerHTML = '<svg viewBox="0 0 560 300" role="img" aria-label="The walkthrough trade with the current step highlighted"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    function chart(k) {
      FS = 1;
      var W = 560, H = 300, pad = 22, first = 6, mn = 18.5, mx = 53, n = N - first, s = "";
      function x(i) { return pad + (i - first) * (W - pad * 2 - 64) / (n - 1); }
      function y(p) { return H - 30 - (p - mn) / (mx - mn) * (H - 62); }
      var st = INFO[k], i, pts = [];
      /* the 10 and 20-day, lit on the base and the trail */
      var m10 = [], m20 = [];
      for (i = Math.max(first, 19); i < N; i++) { m10.push(x(i).toFixed(1) + "," + y(MA10[i]).toFixed(1)); m20.push(x(i).toFixed(1) + "," + y(MA20[i]).toFixed(1)); }
      var maOn = k === 1 || k === 5;
      s += poly(m20, C.orange, 1.5, maOn ? 0.8 : 0.18);
      s += poly(m10, C.cyan, maOn ? 2.2 : 1.5, maOn ? 0.95 : 0.18);
      /* the base box */
      s += rect(x(B0), y(BASEHI), x(B1) - x(B0), y(BASELO) - y(BASEHI), C.dim, k === 1 ? 0.12 : 0.04, k === 1 ? C.dim : null);
      s += hl(x(B0 - 1), x(k >= 2 ? BO : B1 + 4), y(BASEHI), k >= 2 ? C.up : C.dim, "4 4", 1.4, k >= 1 ? 0.9 : 0.25);
      /* the closes, with this step's leg lit */
      for (i = first; i < N; i++) pts.push(x(i).toFixed(1) + "," + y(BARS[i][3]).toFixed(1));
      s += poly(pts, "#3a3a3c", 3);
      pts = [];
      for (i = st.legs[0]; i <= st.legs[1]; i++) pts.push(x(i).toFixed(1) + "," + y(BARS[i][3]).toFixed(1));
      s += poly(pts, st.c, 4);
      /* each step's mark */
      if (k === 0) s += txt(x(18), y(33), "+" + Math.round(MOVEPCT) + "% in 18 days", C.up, 13, "end", 700);
      if (k === 1) s += txt((x(B0) + x(B1)) / 2, y(BASELO) + 18, "18-day base, higher lows", C.dim, 12, "middle", 600);
      if (k === 2) { s += ring(x(BO), y(ENTRY), 8, C.blue, 1, 2.4); s += txt(x(BO) - 12, y(ENTRY) - 12, "Buy the ORH " + f2(ENTRY), C.blue, 12, "end", 700); }
      if (k === 3) {
        s += hl(x(BO) - 8, W - pad - 60, y(STOP), C.dn, null, 2, 1) + hl(x(BO) - 8, W - pad - 60, y(ENTRY), C.ink, null, 1.6, 1);
        s += rect(x(BO) - 8, y(ENTRY), W - pad - 60 - x(BO) + 8, y(STOP) - y(ENTRY), C.dn, 0.25);
        s += txt(W - pad - 60, y(STOP) + 18, "Stop " + f2(STOP) + " · risk " + f2(RISK), C.dn, 12, "end", 700) + txt(W - pad - 60, y(ENTRY) - 8, "Buy " + f2(ENTRY), C.ink, 12, "end", 700);
      }
      if (k === 4) {
        s += ring(x(SELL), y(SELLPX), 8, C.gold, 1, 2.4);
        s += txt(x(SELL), y(SELLPX) - 14, "Sell ⅓ · +" + R_SELL.toFixed(1) + "R", C.gold, 12, "middle", 700);
        s += hl(x(SELL), W - pad - 60, y(ENTRY), C.gold, "4 3", 1.6, 1) + txt(W - pad - 60, y(ENTRY) + 16, "stop to breakeven", C.gold, 11, "end", 600);
      }
      if (k === 5) { s += ring(x(EXIT), y(EXITPX), 8, C.cyan, 1, 2.4); s += txt(x(EXIT), y(EXITPX) + 26, "out +" + R_EXIT.toFixed(1) + "R", C.cyan, 12, "middle", 700); }
      /* legend */
      s += hl(W - pad - 150, W - pad - 134, 16, C.cyan, null, 2.4, maOn ? 1 : 0.4) + txt(W - pad - 128, 20, "10-day", C.cyan, 11, "start", 600, maOn ? 1 : 0.5);
      s += hl(W - pad - 76, W - pad - 60, 16, C.orange, null, 2.4, maOn ? 1 : 0.4) + txt(W - pad - 54, 20, "20-day", C.orange, 11, "start", 600, maOn ? 1 : 0.5);
      s += txt(pad, H - 8, "Illustrative · the walkthrough above, daily closes", C.faint, 11);
      return s;
    }
    function show(k, focus) {
      cur = k;
      steps.forEach(function (st, i) { st.hidden = i !== k; });
      bar.querySelectorAll(".gs-step").forEach(function (b, i) {
        b.classList.toggle("is-done", i < k); b.classList.toggle("is-on", i === k);
        b.setAttribute("aria-selected", i === k ? "true" : "false");
        b.querySelector("b").textContent = i < k ? "✓" : String(i + 1);
      });
      bar.querySelector(".gs-line i").style.width = (k / 5 * 100) + "%";
      root.style.setProperty("--gs", INFO[k].c);
      tg.textContent = "Step " + (k + 1) + " of 6 · " + INFO[k].tag;
      nav.querySelector(".gs-prev").disabled = k === 0;
      nav.querySelector(".gs-next").innerHTML = k < 5 ? "Next: " + INFO[k + 1].k + " &rsaquo;" : "Start over &rsaquo;";
      svg.innerHTML = chart(k);
      if (focus) bar.querySelectorAll(".gs-step")[k].focus();
    }
    bar.addEventListener("click", function (e) { var b = e.target.closest(".gs-step"); if (b) show(+b.getAttribute("data-i")); });
    bar.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" && cur < 5) { e.preventDefault(); show(cur + 1, true); }
      if (e.key === "ArrowLeft" && cur > 0) { e.preventDefault(); show(cur - 1, true); }
    });
    nav.querySelector(".gs-prev").addEventListener("click", function () { if (cur > 0) show(cur - 1); });
    nav.querySelector(".gs-next").addEventListener("click", function () { show(cur < 5 ? cur + 1 : 0); });
    show(0);
  })();

  /* =====================================================================
     3. The other two setups, on a loop: an episodic pivot and a
        parabolic short. Daily bars with volume.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-qm-two]");
    if (!root) return;
    var svgs = root.querySelectorAll("svg");
    if (svgs.length < 2) return;
    var SET = [
      { /* episodic pivot: months of nothing, then a gap on news and 10x volume */
        bars: [[10.1,10.3,9.9,10.0,100],[10.0,10.2,9.8,10.1,90],[10.1,10.3,9.95,9.98,110],[9.98,10.15,9.8,10.05,95],[10.05,10.25,9.9,10.2,100],
               [10.2,10.3,9.95,10.0,90],[10.0,10.12,9.78,9.9,105],[9.9,10.1,9.8,10.06,95],[10.06,10.3,10.0,10.2,100],[10.2,10.26,9.94,10.02,90],
               [11.6,12.7,11.4,12.5,1150],[12.5,13.2,12.2,13.0,620],[13.0,13.4,12.6,13.3,430],[13.3,14.2,13.1,14.0,520],[14.0,14.3,13.6,13.8,330],
               [13.8,14.6,13.7,14.5,400],[14.5,15.2,14.3,15.0,420],[15.0,15.4,14.6,14.9,300]],
        mn: 9.2, mx: 15.8, key: 10, head: "Episodic pivot", col: C.up },
      { /* parabolic short: a run, then four huge green days, short the opening range low */
        bars: [[10,10.6,9.8,10.4,100],[10.4,11.0,10.2,10.9,110],[10.9,11.3,10.6,11.1,100],[11.1,11.9,11.0,11.8,130],[11.8,12.2,11.4,12.0,120],
               [12.0,12.9,11.9,12.7,150],[12.7,13.1,12.4,13.0,140],[13.2,16.4,13.1,16.2,420],[16.4,20.8,16.2,20.5,640],[20.9,26.3,20.6,25.9,900],
               [26.4,33.4,26.1,32.8,1150],[33.6,34.4,28.4,29.0,1300],[29.0,29.6,25.3,25.8,820],[25.8,26.4,22.0,22.6,640],[22.6,24.2,21.4,21.9,520],
               [21.9,22.6,19.6,20.2,430],[20.2,21.4,19.8,20.6,300],[20.6,21.0,18.9,19.2,280]],
        mn: 8.5, mx: 36, key: 11, head: "Parabolic short", col: C.dn }
    ];
    var NB = 18, W = 560, H = 340, x0 = 22, x1 = 430, yt = 74, yb = 262, vt = 274, vb = 318;
    var T = 0, LOOP = NB * 0.42 + 3.2, raf = 0, lastNow = 0, on = false;

    function frame(T, which) {
      FS = svgs[0].clientWidth > 0 && svgs[0].clientWidth < 440 ? 1.45 : 1.15;
      var S = SET[which], B = S.bars, dx = (x1 - x0) / (NB - 0.5), wB = dx * 0.6, s = "";
      var ma = sma(B, 10);
      function x(i) { return x0 + dx * (i + 0.5); }
      function y(p) { return yb - (p - S.mn) / (S.mx - S.mn) * (yb - yt); }
      var vmax = 0; B.forEach(function (b) { vmax = Math.max(vmax, b[4]); });
      function vy(v) { return vb - v / vmax * (vb - vt); }
      var shown = Math.min(NB, Math.floor(T / 0.42) + 1), pr = (T % 0.42) / 0.42;
      if (REDUCED) { shown = NB; pr = 1; }
      var K = S.key, kb = B[K], hit = shown > K;
      s += '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>';
      if (which === 1) {
        var mp = []; for (var m = 9; m < shown; m++) mp.push(x(m).toFixed(1) + "," + y(ma[m]).toFixed(1));
        s += poly(mp, C.cyan, 1.8, 0.8);
      }
      if (hit) {
        var lvl = which ? kb[1] : kb[2], ent = which ? +(kb[0] - 0.9).toFixed(2) : +(kb[0] + 0.3).toFixed(2);
        s += hl(x(K) - wB, x1, y(ent), C.ink, null, 1.6, 1);
        s += hl(x(K) - wB, x1, y(lvl), C.dn, null, 1.6, 1);
        s += tag(x1 + 6, y(ent) + (which ? 12 : -10), which ? "Short ORL" : "Buy ORH", C.ink, 1);
        s += tag(x1 + 6, y(lvl) + (which ? -10 : 12), which ? "Stop HOD" : "Stop LOD", C.dn, 1, "#000");
      }
      for (var k = 0; k < shown; k++) {
        var p = k === shown - 1 ? pr : 1;
        s += candle(x(k), y, B[k], p, wB, 1, k === K && k < shown - 1 ? (which ? "#ff6b61" : "#3ef08a") : null);
        var vv = B[k][4] * clamp01(p * 1.6);
        s += rect(x(k) - wB / 2, vy(vv), wB, vb - vy(vv), k === K ? S.col : B[k][3] >= B[k][0] ? "rgba(48,209,88,0.45)" : "rgba(255,69,58,0.45)", 0.9);
      }
      if (hit) s += ring(x(K), y(which ? kb[0] - 0.9 : kb[0] + 0.3), 9, C.ink, 1);
      if (which === 0 && shown > K) s += txt(x(K) - 10, vy(B[K][4]) + 12, "~11× volume", C.up, 12, "end", 700);
      if (which === 0 && shown > 4) s += txt(x(4), y(10.6), "months of nothing", C.dim, 12, "middle", 600);
      if (which === 1 && shown > 10) s += txt(x(9) - 16, y(30), "+152% in 4 days", C.dn, 12, "end", 700);
      var done = shown >= NB;
      var sub = which ? (hit ? (done ? "Cover as it falls back to the 10-day." : "Day 5: short the opening range low.") : "Never short day one. Wait…")
                      : (hit ? (done ? "Stop under the low of day, then trail." : "Gap up 16% on news: buy the ORH.") : "Neglected, sideways, ignored…");
      s += txt(16, 26, S.head, S.col, 15, "start", 700);
      s += txt(16, 26 + 22 * FS, sub, C.dim, 13, "start", done ? 600 : null);
      s += txt(W - 8, H - 8, "Illustrative · daily", C.faint, 11, "end");
      return s;
    }
    function draw() { svgs[0].innerHTML = frame(T, 0); svgs[1].innerHTML = frame(T, 1); }
    function tick(now) {
      if (!on) return;
      T += Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
      if (T > LOOP) T = 0;
      draw(); raf = requestAnimationFrame(tick);
    }
    svgs.forEach(function (s) { s.setAttribute("viewBox", "0 0 " + W + " " + H); });
    T = REDUCED ? LOOP : 0; draw();
    if (!REDUCED && "IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        var vis = en.some(function (e) { return e.isIntersecting; });
        if (vis && !on) { on = true; lastNow = performance.now(); raf = requestAnimationFrame(tick); }
        else if (!vis && on) { on = false; cancelAnimationFrame(raf); }
      }, { threshold: 0.3 }).observe(root);
    } else { T = LOOP; draw(); }
  })();

  /* =====================================================================
     4. Position size: the stop at the low of day, checked against the ADR
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-qm-calc]");
    if (!root) return;
    var ins = {}, out = root.querySelector(".qm-out");
    root.querySelectorAll("input").forEach(function (el) { ins[el.name] = el; });
    function num(k) { var v = parseFloat(ins[k].value); return isFinite(v) ? v : NaN; }
    function money(v) { return "$" + Math.round(v).toLocaleString("en-US"); }
    function run() {
      var acct = num("acct"), rp = num("risk"), entry = num("entry"), low = num("low"), adrp = num("adr");
      if (!(acct > 0 && rp > 0 && entry > 0 && low > 0 && entry > low && adrp > 0)) { out.innerHTML = '<div class="row"><span>Enter an account size, a risk, an entry above the low of day and the ADR.</span></div>'; return; }
      var risk = entry - low, dollars = acct * rp / 100, sh = Math.floor(dollars / risk), pos = sh * entry, adr = entry * adrp / 100, ok = risk <= adr;
      out.innerHTML =
        '<div class="row"><span>Risk a share: ' + entry.toFixed(2) + ' &minus; ' + low.toFixed(2) + '</span><b>' + risk.toFixed(2) + ' (' + (risk / entry * 100).toFixed(1) + '%)</b></div>' +
        '<div class="row"><span>ADR ' + adrp + '% of the entry</span><b>' + adr.toFixed(2) + '</b></div>' +
        '<div class="row"><span>Stop inside the ADR?</span><b class="' + (ok ? "pos" : "neg") + '">' + (ok ? "Yes, take it" : "No, skip it") + '</b></div>' +
        '<div class="row"><span>' + rp + '% of ' + money(acct) + '</span><b>' + money(dollars) + ' at risk</b></div>' +
        '<div class="row"><span>Position</span><b>' + money(pos) + ' (' + (pos / acct * 100).toFixed(0) + '%)</b></div>' +
        '<div class="row tot"><span>Shares to buy</span><b>' + (ok ? sh.toLocaleString("en-US") : "0, the stop is too wide") + '</b></div>';
    }
    root.addEventListener("input", run);
    run();
  })();

  /* =====================================================================
     5. Ten trades at a 30% win rate, on a loop
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-qm-ten]");
    if (!root) return;
    var svg = root.querySelector("svg");
    var RS = [-1, -1, 2.5, -1, -0.6, -1, 11, -1, -0.4, 4];
    var T = 0, STEP = 0.7, LOOP = RS.length * STEP + 3, raf = 0, lastNow = 0, on = false;
    function frame(T) {
      var narrow = svg.clientWidth > 0 && svg.clientWidth < 520;
      FS = narrow ? 1.5 : 1;
      var W = narrow ? 440 : 1180, H = narrow ? 420 : 320, top = narrow ? 92 : 64, x0 = narrow ? 18 : 60, x1 = W - (narrow ? 18 : 60);
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      var mn = -6, mx = 14, bot = H - 40;
      function y(v) { return bot - (v - mn) / (mx - mn) * (bot - top); }
      var dx = (x1 - x0) / RS.length, s = '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>';
      s += hl(x0, x1, y(0), "rgba(255,255,255,0.25)", null, 1);
      var shown = REDUCED ? RS.length : Math.min(RS.length, Math.floor(T / STEP) + 1), pr = REDUCED ? 1 : clamp01((T % STEP) / (STEP * 0.6));
      var cum = 0, pts = [(x0).toFixed(1) + "," + y(0).toFixed(1)], wins = 0;
      for (var i = 0; i < shown; i++) {
        var p = i === shown - 1 ? pr : 1, r = RS[i] * p, cx = x0 + dx * (i + 0.5), bw = dx * 0.56;
        s += rect(cx - bw / 2, Math.min(y(0), y(r)), bw, Math.abs(y(r) - y(0)), RS[i] > 0 ? C.up : C.dn, 0.85);
        s += txt(cx, RS[i] > 0 ? y(r) - 8 : y(r) + 18 * FS, (RS[i] > 0 ? "+" : "") + RS[i] + "R", RS[i] > 0 ? C.up : C.dn, narrow ? 8.5 : 12, "middle", 700, p);
        cum += r; if (RS[i] > 0 && p >= 1) wins++;
        pts.push(cx.toFixed(1) + "," + y(cum).toFixed(1));
      }
      s += poly(pts, C.gold, 2.4, 0.95);
      s += '<circle cx="' + pts[pts.length - 1].split(",")[0] + '" cy="' + pts[pts.length - 1].split(",")[1] + '" r="4" fill="' + C.gold + '"/>';
      var total = 0; RS.slice(0, shown).forEach(function (v, i) { total += i === shown - 1 ? v * pr : v; });
      s += txt(x0, 28 * FS, "Trades " + shown + " of 10 · " + wins + " winners", C.ink, 14, "start", 700);
      s += txt(narrow ? x0 : x1, narrow ? 28 * FS + 24 * FS : 28, "Running total " + (total >= 0 ? "+" : "") + total.toFixed(1) + "R", C.gold, 14, narrow ? "start" : "end", 700);
      s += txt(W - 8, H - 8, "Illustrative", C.faint, 11, "end");
      return s;
    }
    function draw() { svg.innerHTML = frame(T); }
    function tick(now) {
      if (!on) return;
      T += Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
      if (T > LOOP) T = 0;
      draw(); raf = requestAnimationFrame(tick);
    }
    T = REDUCED ? LOOP : 0; draw();
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 120); });
    if (!REDUCED && "IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        var vis = en.some(function (e) { return e.isIntersecting; });
        if (vis && !on) { on = true; lastNow = performance.now(); raf = requestAnimationFrame(tick); }
        else if (!vis && on) { on = false; cancelAnimationFrame(raf); }
      }, { threshold: 0.3 }).observe(root);
    } else { T = LOOP; draw(); }
  })();
})();

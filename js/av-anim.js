/* =====================================================================
   av-anim.js — the animations on the Anchored VWAP page.

   1. [data-av-anim]  one earnings swing, start to finish, in eight
      stages: the long base on the daily chart → the report after the
      close and its after-hours volume → the VWAP anchored on the release
      candle (from the lows, with the normal one beside it) → after hours
      and premarket holding it → a messy day one that still holds →
      the day-two dip and reclaim → the stop under the line → the move.
      A daily panel sits beside the 15-minute chart, and the daily
      candles for day one and day two grow as the 15-minute bars print.
   2. [data-av-two]   the trail on the daily chart, on a loop: one stock
      holds the line for weeks, one closes below it (cut half).
   3. [data-av-grade] after-hours volume as a share of average volume.
   4. [data-av-calc]  the stop under the line, the size, and the half.
   5. [data-av-steps] the six steps as a click-through stepper with a
      small chart that lights up the part each step is about.

   Like tc-anim.js the walkthrough redraws for the space it has: under
   640px of drawing width it uses a tall, narrow layout with larger text.
   The bars are scripted and labelled "Illustrative". No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#22d3ee", gold: "#f4b942", orange: "#ff9f0a", purple: "#bf5af2",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e", av: "#5ac8fa", avn: "#8e8e93" };
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
  function vl(x, y1, y2, col, dash, w, op) {
    if (op != null && op <= 0) return "";
    return '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + y1.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function rect(x, y, w, h, fill, op, stroke) {
    if (op <= 0) return "";
    return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-dasharray="4 3"' : "") + ' opacity="' + op.toFixed(3) + '"/>';
  }
  function ring(x, y, r, col, w, op) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2) + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function poly(pts, col, w, op, dash) {
    if (pts.length < 2 || (op != null && op <= 0)) return "";
    return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
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
      '<rect x="' + (x - wBody / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + wBody.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }
  function tag(xTag, y, label, col, op, ink) {
    if (op <= 0) return "";
    var w = (label.length * 7 + 16) * FS, h = 20 * FS;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xTag.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="' + col + '"/>' +
      txt(xTag + 8 * FS, y + 4.5 * FS, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function f2(v) { return v.toFixed(2); }

  /* the anchored VWAP of a list of bars [o,h,l,c,v] from bar `from`,
     using the bar's low ("low") or its typical price ("hlc3") */
  function avwap(bars, from, src) {
    var out = [], sv = 0, spv = 0;
    for (var i = 0; i < bars.length; i++) {
      if (i < from) { out.push(null); continue; }
      var b = bars[i], p = src === "low" ? b[2] : (b[1] + b[2] + b[3]) / 3;
      sv += b[4]; spv += p * b[4]; out.push(spv / sv);
    }
    return out;
  }

  /* ---------------------------------------------------------------------
     The shared numbers. Made up: a stock with a long base under 47.20
     reports after the close, trades up after hours on 62% of its average
     daily volume, has a messy day one, then dips toward the low-source
     anchored VWAP off the day-two open and reclaims.
     --------------------------------------------------------------------- */
  var BASE = 47.20, ADV = 4.2, AHV = 2.6, AHP = Math.round(AHV / ADV * 100);
  /* daily closes over the base; three days test the top of it */
  var DCL = [43.1, 42.4, 41.6, 42.3, 43.5, 44.8, 46.1, 46.9, 45.8, 44.6, 43.2, 42.5, 43.4, 44.9, 46.2, 47.0, 46.1, 44.9, 43.8, 42.9,
             43.6, 44.7, 45.9, 46.6, 47.05, 46.2, 45.3, 45.8, 46.4, 46.9];
  var TESTS = { 7: 47.12, 15: 47.18, 24: 47.15 };
  var DB = DCL.map(function (c, i) {
    var o = i ? DCL[i - 1] : 43.6, h = TESTS[i] || Math.min(47.0, Math.max(o, c) + 0.32), l = Math.min(o, c) - 0.36;
    return [o, h, l, c];
  });
  /* 15-minute bars with extended hours, volume in thousands */
  var BARS = [
    [46.70, 46.94, 46.58, 46.82, 140], [46.82, 46.94, 46.62, 46.74, 120], [46.74, 47.00, 46.62, 46.88, 160], [46.88, 47.02, 46.76, 46.90, 220],   // 0-3   the last hour before the report
    [46.90, 50.45, 46.80, 50.10, 1150],                                                                                                         // 4     the release candle: the anchor
    [50.10, 50.82, 49.90, 50.62, 520], [50.62, 50.82, 50.20, 50.40, 360], [50.40, 51.15, 50.20, 50.95, 300], [50.95, 51.30, 50.75, 51.10, 220],   // 5-9   after hours
    [51.10, 51.30, 50.70, 50.90, 160],
    [50.90, 51.35, 50.75, 51.20, 90], [51.20, 51.35, 50.90, 51.05, 80], [51.05, 51.60, 50.90, 51.45, 110], [51.45, 51.75, 51.30, 51.60, 140],     // 10-13 premarket
    [51.75, 53.32, 51.53, 53.10, 1900], [53.10, 54.42, 52.88, 54.20, 1500], [54.20, 54.77, 53.98, 54.55, 1100], [54.55, 54.77, 53.68, 53.90, 900], // 14-39 day one: the drive, then the chop
    [53.90, 54.12, 53.18, 53.40, 820], [53.40, 53.97, 53.18, 53.75, 700], [53.75, 53.97, 52.83, 53.05, 760], [53.05, 53.27, 52.48, 52.70, 720],
    [52.70, 53.42, 52.48, 53.20, 600], [53.20, 53.42, 52.73, 52.95, 560], [52.95, 53.17, 52.33, 52.55, 600], [52.55, 53.07, 52.33, 52.85, 480],
    [52.85, 53.07, 52.18, 52.40, 520], [52.40, 52.92, 52.18, 52.70, 450], [52.70, 52.92, 52.08, 52.30, 500], [52.30, 52.77, 52.08, 52.55, 430],
    [52.55, 52.77, 51.98, 52.20, 480], [52.20, 52.82, 51.98, 52.60, 420], [52.60, 52.82, 52.23, 52.45, 400], [52.45, 53.07, 52.23, 52.85, 450],
    [52.85, 53.07, 52.28, 52.50, 480], [52.50, 52.72, 52.08, 52.30, 520], [52.30, 52.87, 52.08, 52.65, 560], [52.65, 52.87, 52.13, 52.35, 640],
    [52.35, 52.57, 52.00, 52.10, 780], [52.10, 52.62, 52.03, 52.40, 900],
    [52.40, 52.67, 52.28, 52.55, 70], [52.55, 52.82, 52.43, 52.70, 60], [52.70, 52.82, 52.50, 52.62, 55], [52.62, 52.92, 52.50, 52.80, 80],      // 40-43 overnight and premarket
    [52.85, 52.95, 52.06, 52.30, 1300],                                                                                                         // 44    the day-two dip
    [52.30, 53.25, 52.10, 53.05, 1400],                                                                                                         // 45    the reclaim: buy
    [53.05, 53.75, 52.85, 53.55, 1100], [53.55, 53.75, 53.20, 53.40, 700], [53.40, 54.10, 53.20, 53.90, 800], [53.90, 54.55, 53.70, 54.35, 760],  // 46-57 day two runs
    [54.35, 54.55, 53.95, 54.15, 560], [54.15, 54.80, 53.95, 54.60, 620], [54.60, 55.25, 54.40, 55.05, 700], [55.05, 55.25, 54.70, 54.90, 500],
    [54.90, 55.50, 54.70, 55.30, 560], [55.30, 55.90, 55.10, 55.70, 640], [55.70, 55.90, 55.35, 55.55, 480], [55.55, 56.15, 55.35, 55.95, 620]
  ];
  var ANC = 4, AH = [5, 9], PM1 = [10, 13], D1 = [14, 39], PM2 = [40, 43], D2 = [44, 57], DIP = 44, REC = 45;
  var AVL = avwap(BARS, ANC, "low"), AVN = avwap(BARS, ANC, "hlc3");
  var OPEN2 = BARS[DIP][0], DIPLO = BARS[DIP][2], LINE2 = AVL[DIP], GAPC = Math.round((DIPLO - LINE2) * 100);
  var ENTRY = 52.90, STOP = 51.90, RISK = +(ENTRY - STOP).toFixed(2), CLOSE2 = BARS[D2[1]][3], WIN = CLOSE2 - ENTRY, RMULT = WIN / RISK;
  var D1HI = -1e9; for (var di = D1[0]; di <= D1[1]; di++) D1HI = Math.max(D1HI, BARS[di][1]);
  var D1CL = BARS[D1[1]][3], D1LINE = AVL[D1[1]], SPREAD = AVN[D2[1]] - AVL[D2[1]];
  var CL = BARS.map(function (b) { return b[3]; });
  function dayCandle(a, b) {
    var h = -1e9, l = 1e9; for (var i = a; i <= b; i++) { h = Math.max(h, BARS[i][1]); l = Math.min(l, BARS[i][2]); }
    return [BARS[a][0], h, l, BARS[b][3]];
  }

  /* the trail on the daily chart: day one, day two, then two different months (volume is relative) */
  var DA = [[51.75, 54.77, 51.53, 52.40, 300], [52.85, 56.15, 52.06, 55.95, 180], [55.9, 58.15, 55.45, 57.6, 100], [57.6, 59.25, 57.25, 58.9, 100],
    [58.9, 59.35, 56.45, 57.0, 100], [57.0, 57.55, 53.38, 54.4, 100], [54.4, 56.55, 54.05, 56.2, 100], [56.2, 58.75, 55.65, 58.3, 100],
    [58.3, 60.65, 57.85, 60.1, 100], [60.1, 61.85, 59.75, 61.5, 100], [61.5, 61.95, 59.45, 60.0, 100], [60.0, 60.55, 57.95, 58.4, 100],
    [58.4, 58.75, 54.98, 56.3, 100], [56.3, 58.65, 55.75, 58.2, 100], [58.2, 61.15, 57.75, 60.6, 100], [60.6, 62.95, 60.25, 62.6, 100],
    [62.6, 64.65, 62.05, 64.2, 100], [64.2, 64.75, 62.55, 63.0, 100], [63.0, 63.35, 60.65, 61.0, 100], [61.0, 61.45, 56.28, 58.0, 100],
    [58.0, 60.75, 57.55, 60.2, 100], [60.2, 62.95, 59.85, 62.6, 100], [62.6, 65.25, 62.05, 64.8, 100], [64.8, 67.15, 64.35, 66.6, 100],
    [66.6, 66.95, 65.05, 65.4, 100], [65.4, 65.85, 62.05, 62.6, 100], [62.6, 63.15, 57.36, 59.9, 100], [59.9, 62.75, 59.55, 62.4, 100],
    [62.4, 65.45, 61.85, 65.0, 100], [65.0, 67.95, 64.55, 67.4, 100]];
  var DBR = [[51.75, 54.77, 51.53, 52.40, 300], [52.85, 56.15, 52.06, 55.95, 180], [55.9, 59.05, 55.54, 58.6, 160], [58.6, 62.07, 58.33, 61.8, 150],
    [61.8, 65.26, 61.35, 64.9, 150], [64.9, 67.95, 64.54, 67.5, 140], [67.5, 70.07, 67.23, 69.8, 130], [69.8, 70.16, 67.75, 68.2, 110],
    [68.2, 68.65, 65.64, 66.0, 110], [66.0, 67.87, 65.73, 67.6, 110], [67.6, 67.96, 65.95, 66.4, 110], [66.4, 66.85, 63.84, 64.2, 110],
    [64.2, 65.57, 63.93, 65.3, 110], [65.3, 65.66, 63.15, 63.6, 110], [63.6, 64.05, 61.54, 61.9, 110], [61.9, 63.07, 61.63, 62.8, 110],
    [62.8, 63.16, 60.15, 60.6, 110], [60.6, 61.05, 58.04, 58.4, 110], [58.4, 58.67, 56.73, 57.0, 110], [57.0, 57.36, 55.15, 55.6, 110],
    [55.6, 56.55, 55.24, 56.1, 110], [56.1, 56.37, 54.73, 55.0, 110], [55.0, 55.36, 54.15, 54.6, 110], [54.6, 55.65, 54.24, 55.2, 110],
    [55.2, 55.47, 53.83, 54.1, 110], [54.1, 54.46, 53.35, 53.8, 110]];
  var HOLDS = [5, 12, 19, 26], BREAK = (function () { var a = avwap(DBR, 0, "low"); for (var i = 2; i < DBR.length; i++) if (DBR[i][3] < a[i]) return i; return -1; })();

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-av-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;
    var N = BARS.length, ND = DB.length;

    var STAGES = [
      { at: 0,    title: "A long base on the daily", text: "Months of going nowhere under " + f2(BASE) + ", three tries at the top and three failures. A clean, long base is what you want under an earnings breakout. It needs a catalyst, on volume." },
      { at: 3.6,  title: "Earnings, after the close", text: "The report hits after the bell and the stock jumps. After hours it trades " + AHV + " million shares, " + AHP + "% of its " + ADV + " million average day. At least 20% is the bar; 50 to 70% is better. This report matters." },
      { at: 6.4,  title: "Anchor the VWAP on the release", text: "Start the VWAP on the release candle: that's where the buyers came in and the move began. Set its source to the low of each bar. It runs under the normal VWAP (dashed) and often marks support better in a strong stock." },
      { at: 9.0,  title: "After hours and premarket hold it", text: "From the release on, every bar holds above the line. That's the read: as long as price holds the VWAP from the report, buyers are in control." },
      { at: 11.2, title: "Day one: messy, but holding", text: "Day one drives to " + f2(D1HI) + " at the open, then chops lower all day and closes at " + f2(D1CL) + ". That close isn't fun. Zoom out: the daily chart is breaking out of a long base, and every bar is still above the line." },
      { at: 18.4, title: "Day two: the dip and reclaim", text: "Day two dips off the " + f2(OPEN2) + " open to " + f2(DIPLO) + ", " + GAPC + " cents above the line, and reclaims right away. Lots of traders buy a dip and reclaim at the open. Into the VWAP from the report, it's a much better trade. Buy " + f2(ENTRY) + "." },
      { at: 21.2, title: "It has to hold here", text: "The line tells you where you're wrong. If the stock is going to stay strong it has to hold the VWAP from the report. Stop " + f2(STOP) + ", a dime under the line: " + f2(RISK) + " of risk." },
      { at: 23.2, title: "Let it work", text: "Day two trends higher off the line and closes at " + f2(CLOSE2) + ": +" + f2(WIN) + ", about " + RMULT.toFixed(1) + "R. From here the line becomes the trailing stop. A daily close below it means cut at least half." }
    ];
    var TB = [];
    function seg(a, b, t0, step, dur) { for (var i = a; i <= b; i++) TB[i] = [t0 + (i - a) * step, t0 + (i - a) * step + dur]; }
    seg(0, 3, 3.9, 0.3, 0.26);
    TB[ANC] = [5.0, 6.0];
    seg(AH[0], AH[1], 6.9, 0.3, 0.26);
    seg(PM1[0], PM1[1], 9.3, 0.3, 0.26);
    seg(D1[0], D1[1], 11.5, 0.24, 0.2);
    seg(PM2[0], PM2[1], 18.6, 0.16, 0.14);
    TB[DIP] = [19.4, 20.2];
    TB[REC] = [20.3, 21.0];
    seg(REC + 1, D2[1], 23.5, 0.32, 0.28);
    var TD = DB.map(function (b, i) { return [0.4 + i * 0.09, 0.4 + i * 0.09 + 0.08]; });
    var END = TB[N - 1][1] + 1.6;

    function size(n) {
      return n ? { W: 440, H: 990, dx0: 14, dx1: 330, dyt: 220, dyb: 400, dTag: 334, x0: 14, x1: 330, yt: 476, yb: 820, vt: 846, vb: 920, xAx: 434, xTag: 334, cx: 14, cy: 14, bx: 14, by: 140 }
               : { W: 1180, H: 620, dx0: 24, dx1: 290, dyt: 220, dyb: 560, dTag: 296, x0: 380, x1: 1040, yt: 172, yb: 470, vt: 496, vb: 570, xAx: 1172, xTag: 1046, cx: 24, cy: 14, bx: 1046, by: 30 };
    }
    var PMIN = 46.3, PMAX = 56.6, DMIN = 40.6, DMAX = 57.2;

    function frame(T, L) {
      var s = "", k, p;
      /* ---- the daily panel ---- */
      var ddx = (L.dx1 - L.dx0) / (ND + 2.5), dwB = Math.max(3, ddx * 0.6);
      function dxf(i) { return L.dx0 + ddx * (i + 0.5); }
      function dy(p) { return L.dyb - (p - DMIN) / (DMAX - DMIN) * (L.dyb - L.dyt); }
      s += txt(L.dx0, L.dyt - 16 * FS, "Daily · the long base", C.dim, 12, "start", 600);
      var aDL = fade(T, 0.3, 0.5), broke = T >= TB[D1[0]][0];
      if (aDL > 0) {
        s += hl(dxf(2), L.dx1, dy(BASE), broke ? C.up : C.gold, "5 4", 1.6, aDL);
        s += tag(L.dTag, dy(BASE), f2(BASE), broke ? C.up : C.gold, aDL);
      }
      for (k = 0; k < ND; k++) {
        var pd = clamp01((T - TD[k][0]) / (TD[k][1] - TD[k][0]));
        if (pd > 0) s += candle(dxf(k), dy, DB[k], pd, dwB, T >= 3.6 ? 0.55 : 1);
        if (TESTS[k] && T >= TD[k][1]) s += ring(dxf(k), dy(TESTS[k]), 6 * FS, C.gold, 1.8, 1 - 0.6 * fade(T, 3.6, 0.4));
      }
      if (T >= TD[ND - 1][1]) s += txt((L.dx0 + L.dx1) / 2, dy(BASE) - 14 * FS, "3 tries, 3 fails", C.gold, 12, "middle", 600, fade(T, TD[ND - 1][1], 0.3) * (1 - 0.5 * fade(T, 3.6, 0.4)));
      if (T >= TB[ANC][0]) s += txt(dxf(ND - 1), L.dyb + 18 * FS, "Report", C.purple, 11, "end", 700, fade(T, TB[ANC][0], 0.3));
      /* day one and day two on the daily chart, built from the 15-minute bars printed so far */
      [[D1, ND + 0.4, "1"], [D2, ND + 1.6, "2"]].forEach(function (d) {
        var last = -1; for (var j = d[0][0]; j <= d[0][1]; j++) if (T >= TB[j][0]) last = j;
        if (last < 0) return;
        var dc = dayCandle(d[0][0], last);
        s += candle(dxf(d[1]), dy, dc, 1, dwB + 1, 1);
        s += txt(dxf(d[1]), L.dyb + 18 * FS, d[2], C.ink, 11, "middle", 600);
      });

      /* ---- the 15-minute panel ---- */
      var aM = fade(T, 3.6, 0.4);
      if (aM <= 0) return s;
      var dx = (L.x1 - L.x0) / (N - 0.5), wB = Math.max(2.6, dx * 0.62);
      function x(i) { return L.x0 + dx * (i + 0.5); }
      function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
      var VMAX = 1950; function vy(v) { return L.vb - v / VMAX * (L.vb - L.vt); }
      s += '<g opacity="' + aM.toFixed(3) + '">';
      s += txt(L.x0, L.yt - 34 * FS, "15-minute · extended hours on", C.dim, 12, "start", 600);
      for (p = 47; p <= 56 + 1e-9; p += 1) s += hl(L.x0, L.x1, y(p), "rgba(255,255,255,0.05)", null, 1) + (L.narrow ? "" : txt(L.xAx, y(p) + 4, p.toFixed(2), C.faint, 11, "end"));
      s += txt(L.x0, L.vt - 6, "Volume", C.faint, 11, "start");
      /* the sessions: extended hours shaded, a label over each */
      [[AH[0], PM1[1], L.narrow ? "AH · pre" : "After hours · pre", true], [D1[0], D1[1], "Day one", false], [PM2[0], PM2[1], L.narrow ? "" : "Pre", true], [D2[0], D2[1], "Day two", false]].forEach(function (g) {
        if (T < TB[g[0]][0]) return;
        var xa = x(g[0]) - dx / 2, xb = x(g[1]) + dx / 2, a = fade(T, TB[g[0]][0], 0.3);
        if (g[3]) s += rect(xa, L.yt - 6, xb - xa, L.vb - L.yt + 6, "#ffffff", 0.035 * a);
        s += vl(xa, L.yt - 6, L.vb, "rgba(255,255,255,0.12)", "2 4", 1, a);
        if (g[2]) s += txt((xa + xb) / 2, L.yt - 12 * FS, g[2], g[3] ? C.faint : C.dim, 11, "middle", 600, a);
      });

      /* the anchored VWAPs: the normal one dashed, the low-source one solid */
      var aV = fade(T, 6.6, 0.5), lastV = -1;
      for (k = ANC; k < N; k++) if (T >= TB[k][0]) lastV = k;
      if (aV > 0 && lastV > ANC) {
        var pn = [], pl = [];
        for (k = ANC; k <= lastV; k++) { pn.push(x(k).toFixed(1) + "," + y(AVN[k]).toFixed(1)); pl.push(x(k).toFixed(1) + "," + y(AVL[k]).toFixed(1)); }
        s += poly(pn, C.avn, 1.6, aV * 0.8, "5 4");
        s += poly(pl, C.av, 2.8, aV);
        /* a legend instead of labels on the lines, so nothing sits on the candles */
        var lgx = L.narrow ? L.x0 : L.x0 + 250, lgy = L.narrow ? L.vb + 26 : L.yt - 38;
        s += '<line x1="' + lgx + '" x2="' + (lgx + 22) + '" y1="' + lgy + '" y2="' + lgy + '" stroke="' + C.av + '" stroke-width="3" opacity="' + aV.toFixed(3) + '"/>';
        s += txt(lgx + 28, lgy + 4 * FS, "AVWAP, source low", C.av, 11, "start", 700, aV);
        var lgx2 = lgx + 28 + 140 * FS;
        s += '<line x1="' + lgx2 + '" x2="' + (lgx2 + 22) + '" y1="' + lgy + '" y2="' + lgy + '" stroke="' + C.avn + '" stroke-width="1.6" stroke-dasharray="5 4" opacity="' + aV.toFixed(3) + '"/>';
        s += txt(lgx2 + 28, lgy + 4 * FS, "normal VWAP", C.avn, 11, "start", 600, aV);
      }

      /* candles and volume */
      for (k = 0; k < N; k++) {
        var pr = clamp01((T - TB[k][0]) / (TB[k][1] - TB[k][0]));
        if (pr <= 0) continue;
        var ext = (k >= AH[0] && k <= PM1[1]) || (k >= PM2[0] && k <= PM2[1]);
        s += candle(x(k), y, BARS[k], pr, wB, ext ? 0.7 : 1, k === ANC ? C.purple : null);
        var vc = k === ANC ? C.purple : BARS[k][3] >= BARS[k][0] ? "rgba(48,209,88,0.45)" : "rgba(255,69,58,0.45)";
        if (k >= AH[0] && k <= AH[1]) vc = "rgba(191,90,242,0.5)";
        var vv = BARS[k][4] * clamp01(pr * 1.6);
        s += rect(x(k) - wB / 2, vy(vv), wB, L.vb - vy(vv), vc, 0.9);
      }
      /* the anchor */
      var aA = fade(T, TB[ANC][1], 0.3);
      if (aA > 0) {
        s += ring(x(ANC), y(BARS[ANC][2]), 8 * FS, C.purple, 2.2, aA);
        s += txt(x(ANC) + 10 * FS, y(BARS[ANC][2]) + 18 * FS, "anchor", C.purple, 12, "start", 700, aA * (1 - 0.5 * fade(T, 11.2, 0.4)));
      }
      var aAH = fade(T, TB[AH[1]][1], 0.3) * (1 - 0.6 * fade(T, 11.2, 0.4));
      if (aAH > 0) s += txt(x(AH[0]), vy(BARS[ANC][4]) + 12 * FS, AHP + "% of avg vol", C.purple, 11, "start", 700, aAH);
      /* day one's high and close */
      var aD1 = fade(T, TB[D1[1]][1], 0.3) * (1 - fade(T, 18.4, 0.4));
      if (aD1 > 0) {
        s += ring(x(D1[1]), y(D1CL), 7 * FS, C.gold, 1.8, aD1);
        s += txt(x(D1[1]), y(D1CL) + 22 * FS, "ugly close, still above", C.gold, 11, "end", 600, aD1);
      }
      /* the dip and reclaim */
      var aDp = fade(T, TB[DIP][1], 0.3);
      if (aDp > 0) {
        s += ring(x(DIP), y(DIPLO), 8 * FS, C.cyan, 2, aDp * (1 - 0.6 * fade(T, 23.2, 0.4)));
        s += txt(x(DIP) - 10 * FS, y(DIPLO) + 26 * FS, "dip", C.cyan, 12, "end", 700, aDp * (1 - fade(T, 23.2, 0.4)));
      }
      var aE = fade(T, TB[REC][1], 0.4);
      if (aE > 0) {
        s += hl(x(REC), L.x1, y(ENTRY), C.ink, null, 1.6, aE);
        s += tag(L.xTag, y(ENTRY) - (L.narrow ? 14 * FS : 0), "Buy " + f2(ENTRY), C.ink, aE);
        s += ring(x(REC), y(ENTRY), 9 * FS, C.ink, 2, aE);
      }
      var aS = fade(T, 21.2, 0.4);
      if (aS > 0) {
        s += rect(x(REC), y(ENTRY), L.x1 - x(REC), y(STOP) - y(ENTRY), C.dn, 0.12 * aS * (1 - 0.6 * fade(T, 23.2, 0.4)));
        s += hl(x(REC), L.x1, y(STOP), C.dn, null, 2, aS);
        s += tag(L.xTag, y(STOP) + (L.narrow ? 12 * FS : 6), "Stop " + f2(STOP), C.dn, aS, "#000");
      }
      if (T >= TB[N - 1][1]) {
        var aX = fade(T, TB[N - 1][1], 0.3);
        s += tag(L.xTag, y(CLOSE2), "Close " + f2(CLOSE2), C.up, aX);
      }
      s += "</g>";

      /* badges */
      s += tag(L.bx, L.by, "AH vol " + AHP + "%", C.purple, fade(T, 5.4, 0.3), "#fff");
      s += tag(L.bx, L.by + 28 * FS, "Source: low", C.av, fade(T, 7.0, 0.3), "#000");

      /* one caption box at a time */
      var cx = L.cx, cy = L.cy;
      s += callout(cx, cy, ["A long base under " + f2(BASE), "Three tries at the top, three fails", "It needs a catalyst, on volume"], C.gold, fade(T, 1.4, 0.4) * (1 - fade(T, 3.6, 0.3)));
      s += callout(cx, cy, ["Earnings after the close", "After hours: " + AHV + "M shares", AHP + "% of a " + ADV + "M average day", "20% minimum · 50 to 70% better"], C.purple, fade(T, 5.4, 0.3) * (1 - fade(T, 6.4, 0.3)));
      s += callout(cx, cy, ["Anchor on the release candle", "Where the buyers came in", "Source: the low of each bar", "Solid line under the dashed one"], C.av, fade(T, 6.7, 0.3) * (1 - fade(T, 9.0, 0.3)));
      s += callout(cx, cy, ["Every bar holds the line", "Price over the VWAP from the report:", "buyers are in control"], C.av, fade(T, 9.2, 0.3) * (1 - fade(T, 11.2, 0.3)));
      s += callout(cx, cy, ["Day one: high " + f2(D1HI) + ", close " + f2(D1CL), "Messy, and the close isn't fun", "Zoom out: a daily breakout,", "and the line at " + f2(D1LINE) + " still holds"], C.gold, fade(T, 11.6, 0.3) * (1 - fade(T, 18.4, 0.3)));
      s += callout(cx, cy, ["Day two: dip and reclaim", "Off the " + f2(OPEN2) + " open to " + f2(DIPLO), "Doesn't quite tag it: " + GAPC + "¢ above", "Reclaims the open: buy " + f2(ENTRY)], C.cyan, fade(T, TB[DIP][1], 0.3) * (1 - fade(T, 21.2, 0.3)));
      s += callout(cx, cy, ["It has to hold here", "Stop " + f2(STOP) + ", a dime under the line", "Risk " + f2(RISK) + " a share"], C.dn, fade(T, 21.4, 0.3) * (1 - fade(T, 23.2, 0.3)));
      s += callout(cx, cy, ["Day two closes " + f2(CLOSE2), "+" + f2(WIN) + " · about " + RMULT.toFixed(1) + "R", "Now the line is the trailing stop:", "daily close below = cut half"], C.up, fade(T, 23.5, 0.3));
      s += txt(L.W - 8, L.H - 6, "Illustrative · made-up bars", C.faint, 11, "end");
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
    chips.innerHTML = STAGES.map(function (s, i) { return '<button type="button" data-i="' + i + '">' + (i + 1) + ". " + s.title + "</button>"; }).join("");
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
      }, { threshold: 0.4 });
      io.observe(svg.parentNode || svg);
    }
    window.AVAnim = { _bars: BARS, _daily: DB, seek: function (t) { setPlaying(false); T = t; draw(); },
                      _levels: { AVL: AVL, AVN: AVN, ENTRY: ENTRY, STOP: STOP, RISK: RISK, LINE2: LINE2, DIPLO: DIPLO, CLOSE2: CLOSE2, RMULT: RMULT, SPREAD: SPREAD, BREAK: BREAK } };   // exposed for testing
  })();

  /* =====================================================================
     2. The trail on the daily chart: one holds, one closes below
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-av-two]");
    if (!root) return;
    var svgs = root.querySelectorAll("svg");
    if (svgs.length < 2) return;
    var SETS = [{ bars: DA, av: avwap(DA, 0, "low") }, { bars: DBR, av: avwap(DBR, 0, "low") }];
    var W = 560, H = 340, x0 = 22, x1 = 452, yt = 84, yb = 318, PMIN = 50.5, PMAX = 71.5;
    var T = 0, STEP = 0.32, LOOP = DA.length * STEP + 3.2, raf = 0, lastNow = 0, on = false;

    function frame(T, which) {
      FS = svgs[0].clientWidth > 0 && svgs[0].clientWidth < 440 ? 1.45 : 1.15;
      var set = SETS[which], bars = set.bars, NB = bars.length, n = DA.length;
      var dx = (x1 - x0) / (n - 0.5), wB = dx * 0.6, s = "";
      function x(i) { return x0 + dx * (i + 0.5); }
      function y(p) { return yb - (p - PMIN) / (PMAX - PMIN) * (yb - yt); }
      var shown = Math.min(NB, Math.floor(T / STEP) + 1), pr = (T % STEP) / STEP;
      if (REDUCED) { shown = NB; pr = 1; }
      var done = shown >= NB;
      s += '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>';
      var pts = []; for (var k = 0; k < shown; k++) pts.push(x(k).toFixed(1) + "," + y(set.av[k]).toFixed(1));
      for (k = 0; k < shown; k++) {
        var cut = which === 1 && k >= BREAK;
        s += candle(x(k), y, bars[k], k === shown - 1 ? pr : 1, wB, cut ? 0.75 : 1);
      }
      s += poly(pts, C.av, 2.6, 1);
      if (shown > 1) s += tag(x(shown - 1) + 10, y(set.av[shown - 1]), "AVWAP", C.av, 1);
      if (which === 0) {
        HOLDS.forEach(function (i) { if (shown > i + 1) { s += ring(x(i), y(bars[i][2]), 8, C.up, 2); s += txt(x(i), y(bars[i][2]) + 22 * FS, "held", C.up, 11, "middle", 700); } });
      } else if (shown > BREAK) {
        s += ring(x(BREAK), y(bars[BREAK][3]), 9, C.orange, 2.4);
        s += txt(x(BREAK) - 12, y(bars[BREAK][3]) + 4, "close below", C.orange, 12, "end", 700);
        if (shown > BREAK + 3) s += txt(x(BREAK + 4), y(set.av[BREAK + 4]) + 28 * FS, "still under it", C.dim, 11, "start", 600);
      }
      var head = which ? "A close below the line: cut half" : "The best ones hold the line";
      var sub = which ? (shown > BREAK ? (done ? "Under the line for days. Back on only if it reclaims." : "Daily close under the AVWAP: cut at least half.") : "Up fast, then lower highs…")
                      : (done ? "Weeks of pullbacks, every one held. Keep the runner." : "Pullbacks come back to the line and hold.");
      s += txt(16, 26, head, which ? C.orange : C.up, 15, "start", 700);
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
     3. Grade the report: after-hours volume as a share of the average day
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-av-grade]");
    if (!root) return;
    var ins = {}, out = root.querySelector(".av-gout"), meter = root.querySelector(".av-meter i");
    root.querySelectorAll("input").forEach(function (el) { ins[el.name] = el; });
    function run() {
      var adv = parseFloat(ins.adv.value), ah = parseFloat(ins.ah.value);
      if (!(adv > 0 && ah >= 0)) { out.className = "chk-out av-gout"; out.innerHTML = "<b>&ndash;</b><p>Enter the average daily volume and the after-hours volume, both in millions of shares.</p>"; return; }
      var p = ah / adv * 100, v;
      if (p < 20) v = ["no", "Thin", "Under 20% of an average day. The report didn't pull in much size, so the anchor carries less weight. Lower your expectations or pass."];
      else if (p < 50) v = ["b", "It counts", "At least 20% of an average day printed after hours. A real reaction, worth anchoring and watching."];
      else v = ["a", "Strong", "50% or more of a normal day, after hours alone. A report this big brings the participants who move a stock for weeks."];
      out.className = "chk-out av-gout is-" + v[0];
      out.innerHTML = "<b>" + p.toFixed(0) + "% &middot; " + v[1] + "</b><p>" + v[2] + "</p>";
      if (meter) meter.style.width = Math.min(100, p / 80 * 100) + "%";
    }
    root.addEventListener("input", run);
    run();
  })();

  /* =====================================================================
     4. The stop under the line, the size, and the half
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-av-calc]");
    if (!root) return;
    var ins = {}, out = root.querySelector(".av-out");
    root.querySelectorAll("input").forEach(function (el) { ins[el.name] = el; });
    function num(k) { var v = parseFloat(ins[k].value); return isFinite(v) ? v : NaN; }
    function run() {
      var entry = num("entry"), line = num("line"), buf = num("buf"), risk = num("risk");
      if (!(entry > 0 && line > 0 && entry > line && buf >= 0 && risk > 0)) { out.innerHTML = '<div class="row"><span>Enter an entry above the line, a buffer and a dollar risk.</span></div>'; return; }
      var stop = line - buf, ps = entry - stop, sh = Math.floor(risk / ps), half = Math.ceil(sh / 2), room = (entry - line) / ps * 100;
      out.innerHTML =
        '<div class="row"><span>Stop: the line less ' + buf.toFixed(2) + '</span><b>' + stop.toFixed(2) + '</b></div>' +
        '<div class="row"><span>Risk a share, from ' + entry.toFixed(2) + '</span><b>' + ps.toFixed(2) + '</b></div>' +
        '<div class="row"><span>Shares for $' + risk.toFixed(0) + ' at risk</span><b>' + sh.toLocaleString() + ' sh</b></div>' +
        '<div class="row"><span>Entry above the line</span><b>' + (entry - line).toFixed(2) + (room > 85 ? " &middot; far" : "") + '</b></div>' +
        '<div class="row tot"><span>Daily close below: cut at least</span><b>' + half.toLocaleString() + ' sh</b></div>';
    }
    root.addEventListener("input", run);
    run();
  })();

  /* =====================================================================
     5. The six steps as a stepper: one step at a time, with a small chart
        of the walkthrough (the base on the left, the report and the two
        days on the right; the trail on the daily for the last step).
        Without the script the six steps simply show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-av-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 6) return;
    var INFO = [
      { k: "The catalyst", c: C.purple, tag: "Before · a report that matters" },
      { k: "The anchor",   c: C.av,     tag: "Set up · anchor it, source low" },
      { k: "Who's in control", c: C.up, tag: "Read · above the line or not" },
      { k: "The entry",    c: C.cyan,   tag: "Execute · dip and reclaim" },
      { k: "The stop",     c: C.dn,     tag: "Execute · it has to hold" },
      { k: "The trail",    c: C.orange, tag: "Manage · cut half on a close below" }
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
    fig.innerHTML = '<svg viewBox="0 0 560 300" role="img" aria-label="The walkthrough, the daily base and the 15-minute chart after the report, with the current step highlighted"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    var W = 560, H = 300, dxa = 22, dxb = 176, mxa = 214, mxb = 500, PMN = 41, PMX = 57;
    function dX(i) { return dxa + i * (dxb - dxa) / (DCL.length - 1); }
    function mX(i) { return mxa + i * (mxb - mxa) / (CL.length - 1); }
    function Y(p) { return 262 - (p - PMN) / (PMX - PMN) * 214; }
    var SF = 1;
    function t(x, y, s, col, anchor, w) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + (13 * SF).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' + (w ? ' font-weight="' + w + '"' : "") + ">" + s + "</text>"; }
    function path(a, b, arr, xf) { var p = []; for (var i = a; i <= b; i++) if (arr[i] != null) p.push(xf(i).toFixed(1) + "," + Y(arr[i]).toFixed(1)); return p; }

    function chart(k) {
      var c = INFO[k].c, s = "";
      if (k === 5) {
        /* the trail: the daily chart after the report */
        var av = avwap(DBR, 0, "low"), n = DBR.length;
        function tx(i) { return 30 + i * (500 - 30) / (n - 1); }
        function ty(p) { return 262 - (p - 51) / (71 - 51) * 214; }
        s += t(30, 22, "Daily · after the report", C.faint);
        var pc = [], pa = [];
        for (var i = 0; i < n; i++) { pc.push(tx(i).toFixed(1) + "," + ty(DBR[i][3]).toFixed(1)); pa.push(tx(i).toFixed(1) + "," + ty(av[i]).toFixed(1)); }
        s += poly(pc, "#8e8e93", 2.6) + poly(pa, C.av, 2.6);
        s += ring(tx(BREAK), ty(DBR[BREAK][3]), 8, c, 2.4);
        s += t(tx(BREAK) - 4, ty(DBR[BREAK][3]) + 30, "daily close below · cut half", c, "end", 700);
        s += t(tx(3), ty(av[3]) + 20, "AVWAP (low)", C.av, "start", 600);
        s += t(30, H - 8, "Illustrative · the trail, daily", C.faint);
        return s;
      }
      s += t(dxa, 22, "Daily · base", C.faint) + t(mxa, 22, "15-minute · from the report", C.faint);
      s += '<line x1="196" x2="196" y1="34" y2="' + (H - 26) + '" stroke="#2c2c2e"/>';
      s += hl(dxa, dxb, Y(BASE), "#8e8e93", "4 5", 1.2, 0.6);
      s += poly(DCL.map(function (v, i) { return dX(i).toFixed(1) + "," + Y(v).toFixed(1); }), "#3a3a3c", 2.4);
      s += poly(CL.map(function (v, i) { return mX(i).toFixed(1) + "," + Y(v).toFixed(1); }), k === 0 ? "#48484a" : "#636366", 2.6);
      var showV = k >= 1;
      if (showV) {
        if (k === 1) s += poly(path(ANC, CL.length - 1, AVN, mX), C.avn, 1.6, 0.9, "5 4");
        s += poly(path(ANC, CL.length - 1, AVL, mX), k === 1 || k === 2 ? C.av : "#3d6f86", k === 1 || k === 2 ? 3 : 2.2);
      }
      if (k === 0) {
        s += ring(mX(ANC), Y(CL[ANC]), 8, c, 2.4);
        for (var i0 = 0; i0 <= PM1[1]; i0++) { var h = BARS[i0][4] / 1150 * 34; s += rect(mX(i0) - 2.5, 270 - h, 5, h, i0 >= ANC ? c : "#3a3a3c", 1); }
        s += t(mX(ANC) + 12, Y(CL[ANC]) + 4, "the report", c, "start", 700);
        s += t(mX(PM1[1]) + 10, 252, AHP + "% of avg vol after hours", c, "start", 600);
      }
      if (k === 1) {
        s += ring(mX(ANC), Y(BARS[ANC][2]), 7, c, 2.2);
        s += t(mX(ANC) + 10, Y(BARS[ANC][2]) + 18, "anchor here", c, "start", 700);
        s += t(mX(D2[0]) - 6, Y(AVN[D2[0]]) - 28, "normal", C.avn, "end", 600) + t(mxb, Y(AVL[CL.length - 1]) + 20, "source: low", c, "end", 700);
      }
      if (k === 2) {
        var pa2 = path(ANC, CL.length - 1, AVL, mX), pc2 = []; for (var j = CL.length - 1; j >= ANC; j--) pc2.push(mX(j).toFixed(1) + "," + Y(Math.min(BARS[j][2], 56)).toFixed(1));
        s += '<polygon points="' + pa2.concat(pc2).join(" ") + '" fill="' + c + '" opacity="0.14"/>';
        s += t((mxa + mxb) / 2, Y(55.4), "above the line: buyers in control", c, "middle", 700);
      }
      if (k === 3) {
        s += ring(mX(DIP), Y(DIPLO), 7, c, 2.2); s += ring(mX(REC), Y(CL[REC]), 7, C.ink, 2);
        s += t(mX(DIP) - 8, Y(DIPLO) + 22, "dip", c, "end", 700) + t(mX(REC) - 4, Y(CL[REC]) - 40, "reclaim · buy " + f2(ENTRY), C.ink, "end", 700);
      }
      if (k === 4) {
        s += hl(mX(REC), mxb + 6, Y(STOP), c, null, 2.4);
        s += t(mxb + 6, Y(STOP) + 20, "stop " + f2(STOP), c, "end", 700);
        s += ring(mX(REC), Y(ENTRY), 7, C.ink, 2);
      }
      s += t(dxa, H - 8, "Illustrative · the walkthrough above", C.faint);
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
      bar.querySelector(".gs-line i").style.width = (k / (NS - 1) * 100) + "%";
      root.style.setProperty("--gs", INFO[k].c);
      tg.textContent = "Step " + (k + 1) + " of " + NS + " · " + INFO[k].tag;
      nav.querySelector(".gs-prev").disabled = k === 0;
      nav.querySelector(".gs-next").innerHTML = k < NS - 1 ? "Next: " + INFO[k + 1].k + " &rsaquo;" : "Start over &rsaquo;";
      FS = 1; SF = svg.clientWidth > 0 && svg.clientWidth < 440 ? 1.3 : 1;
      svg.innerHTML = chart(k);
      if (focus) bar.querySelectorAll(".gs-step")[k].focus();
    }
    bar.addEventListener("click", function (e) { var b = e.target.closest(".gs-step"); if (b) show(+b.getAttribute("data-i")); });
    bar.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" && cur < NS - 1) { e.preventDefault(); show(cur + 1, true); }
      if (e.key === "ArrowLeft" && cur > 0) { e.preventDefault(); show(cur - 1, true); }
    });
    nav.querySelector(".gs-prev").addEventListener("click", function () { if (cur > 0) show(cur - 1); });
    nav.querySelector(".gs-next").addEventListener("click", function () { show(cur < NS - 1 ? cur + 1 : 0); });
    show(0);
  })();
})();

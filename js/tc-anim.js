/* =====================================================================
   tc-anim.js — the animations on the Technical Catalyst Breakout page.

   1. [data-tc-anim]  one breakout, start to finish, in eight stages: the
      9 out of 10 level on the daily chart → elevated RVOL going in →
      the market check that sets B size → the breakout bar and its volume
      spike → the stop a penny past the round number → the tape
      confirming → adds over the pauses with the stop trailed → the tape
      turning and the exit. A daily panel sits beside the 1-minute chart,
      and today's daily candle grows as the 1-minute bars print.
   2. [data-tc-two]   the same breakout twice, on a loop: once the
      velocity shows up (stay in), once it doesn't (scratch it).
   3. [data-tc-check] the five checks: A size, B size, or no trade.
   4. [data-tc-calc]  the stop a penny past the round number, and size.
   5. [data-tc-steps] the eight steps as a click-through stepper with a
      small chart that lights up the part each step is about.

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
  function ring(x, y, r, col, w, op) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2) + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
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

  /* ---------------------------------------------------------------------
     The shared numbers. Made up, built around the video's own levels:
     ETHA capped under 19.12 for over a month, RVOL over 2×, B size,
     entry as 19.12 clears, out after the run to 19.60.
     --------------------------------------------------------------------- */
  var LEVEL = 19.12;
  /* daily closes over five weeks under the level; four days test it */
  var DCL = [17.30, 17.62, 18.05, 18.48, 18.90, 18.62, 18.35, 18.10, 18.28, 18.55, 18.80, 19.02, 18.70, 18.44, 18.20,
             18.05, 18.32, 18.60, 18.86, 19.00, 18.74, 18.52, 18.66, 18.84, 18.98, 19.04];
  var TESTS = { 4: 19.10, 11: 19.11, 19: 19.09, 25: 19.11 };
  var DB = DCL.map(function (c, i) {
    var o = i ? DCL[i - 1] : 17.10, h = TESTS[i] || Math.min(19.06, Math.max(o, c) + 0.08), l = Math.min(o, c) - 0.10;
    return [o, h, l, c];
  });
  /* the breakout day, 1-minute bars, volume in thousands */
  var BARS = [
    [18.92, 18.98, 18.89, 18.96, 60], [18.96, 19.01, 18.94, 18.99, 48], [18.99, 19.04, 18.97, 19.02, 44],   // 0-8  the drift up under the level
    [19.02, 19.06, 18.99, 19.00, 40], [19.00, 19.05, 18.98, 19.04, 38], [19.04, 19.09, 19.02, 19.07, 46],
    [19.07, 19.11, 19.05, 19.06, 52], [19.06, 19.10, 19.04, 19.08, 42], [19.08, 19.11, 19.06, 19.10, 45],
    [19.10, 19.22, 19.06, 19.20, 310],                                                                      // 9  the breakout bar
    [19.20, 19.27, 19.18, 19.25, 220],                                                                      // 10
    [19.25, 19.29, 19.21, 19.23, 120], [19.23, 19.31, 19.22, 19.29, 150],                                   // 11-12 a shallow dip, lighter volume
    [19.29, 19.31, 19.25, 19.27, 90],  [19.27, 19.30, 19.24, 19.28, 70],  [19.28, 19.30, 19.25, 19.29, 65],  // 13-15 pause one
    [19.29, 19.40, 19.28, 19.38, 240],                                                                      // 16 add one
    [19.38, 19.45, 19.36, 19.43, 180],
    [19.43, 19.47, 19.40, 19.42, 100], [19.42, 19.46, 19.40, 19.44, 80],  [19.44, 19.47, 19.41, 19.45, 75],  // 18-20 pause two
    [19.45, 19.56, 19.44, 19.54, 260],                                                                      // 21 add two
    [19.54, 19.60, 19.51, 19.58, 230],                                                                      // 22 the high
    [19.58, 19.60, 19.52, 19.55, 190],                                                                      // 23 the tape turns: out
    [19.55, 19.57, 19.48, 19.50, 170], [19.50, 19.53, 19.44, 19.47, 120], [19.47, 19.50, 19.41, 19.45, 90]
  ];
  var BRK = 9, DIP = 11, P1 = [13, 15], ADD1 = 16, P2 = [18, 20], ADD2 = 21, TOP = 22, TURN = 23;
  function lo(a, b) { var m = 1e9; for (var i = a; i <= b; i++) m = Math.min(m, BARS[i][2]); return m; }
  function hi(a, b) { var m = -1e9; for (var i = a; i <= b; i++) m = Math.max(m, BARS[i][1]); return m; }
  var ENTRY = 19.13, BLOW = BARS[BRK][2], OBVIOUS = +(BLOW - 0.01).toFixed(2), STOP = +(OBVIOUS - 0.01).toFixed(2), RISK = +(ENTRY - STOP).toFixed(2);
  var P1HI = hi(P1[0], P1[1]), P1LO = lo(P1[0], P1[1]), P2HI = hi(P2[0], P2[1]), P2LO = lo(P2[0], P2[1]);
  var ADDP1 = +(P1HI + 0.01).toFixed(2), ADDP2 = +(P2HI + 0.01).toFixed(2), TR1 = +(P1LO - 0.01).toFixed(2), TR2 = +(P2LO - 0.01).toFixed(2);
  var EXIT = BARS[TURN][3], HIGH = BARS[TOP][1], RVOL = 2.1;
  var MORN = 0; for (var mi = 0; mi < BRK; mi++) MORN += BARS[mi][4]; MORN /= BRK;
  var SPIKE = BARS[BRK][4] / MORN;
  var WIN1 = EXIT - ENTRY, WIN2 = EXIT - ADDP1, WIN3 = EXIT - ADDP2, R1 = WIN1 / RISK;
  var CL = BARS.map(function (b) { return b[3]; });

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-tc-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;
    var N = BARS.length, ND = DB.length;

    var STAGES = [
      { at: 0,    title: "A 9 out of 10 level", text: "No news, no earnings. What it has is a level: on the daily chart it's been capped under " + f2(LEVEL) + " for five weeks, four tries and four failures. Ask how important that level is on a scale of 1 to 10. This one is a 9." },
      { at: 4.0,  title: "Elevated RVOL", text: "Going into the session, relative volume is running " + RVOL + " times normal. Real order flow is in the name. A stock pressing a monthly ceiling on half its usual volume is a trap." },
      { at: 7.4,  title: "Check the market, pick the size", text: "SPY is near the low end of its range, and Bitcoin and Ethereum haven't broken out of theirs. This breakout would be on its own, so the plan is B size, not full A size." },
      { at: 9.6,  title: "The breakout bar", text: "Price clears " + f2(LEVEL) + " and volume goes vertical: " + BARS[BRK][4] + "k on one bar, about " + Math.round(SPIKE) + " times the morning's average. That's the see-it moment. Buy " + f2(ENTRY) + " as the level clears." },
      { at: 12.2, title: "The stop", text: "The stop goes under the low of the breakout candle, " + f2(BLOW) + ". " + f2(OBVIOUS) + " is a round number, so give it one more penny: " + f2(STOP) + ", " + f2(RISK) + " of risk. If price creeps back under " + f2(LEVEL) + ", the trade is dead." },
      { at: 14.2, title: "The tape confirms", text: "Buyers are paying the offer and the offers clear easily. The first dip is " + Math.round((BARS[DIP - 1][1] - BARS[DIP][2]) * 100) + " cents, on lighter volume, and buyers step right back up. It's going higher, faster than you'd expect. Big money wants it." },
      { at: 17.0, title: "Add to the winner", text: "It holds higher, so add. Each pause on the 1-minute chart gets a buy stop a cent over its wick high: " + f2(ADDP1) + ", then " + f2(ADDP2) + ". The stop trails to a cent under each pause: " + f2(TR1) + ", then " + f2(TR2) + "." },
      { at: 22.4, title: "The exit", text: "Price charges to " + f2(HIGH) + ", then the tape changes: buyers stop lifting offers, sellers hit the bids, and the upward velocity dies. No shorting the top. Flatten at " + f2(EXIT) + ". The first unit made " + f2(WIN1) + ", about " + R1.toFixed(1) + "R; the adds made " + f2(WIN2) + " and " + f2(WIN3) + "." }
    ];
    var TB = [];
    for (var i = 0; i < N; i++) {
      if (i <= 5) TB[i] = [4.4 + i * 0.42, 4.4 + i * 0.42 + 0.36];
      else if (i < BRK) TB[i] = [7.7 + (i - 6) * 0.42, 7.7 + (i - 6) * 0.42 + 0.36];
      else if (i === BRK) TB[i] = [9.9, 11.0];
      else if (i === BRK + 1) TB[i] = [12.5, 13.0];
      else if (i <= 12) TB[i] = [14.6 + (i - 11) * 0.45, 14.6 + (i - 11) * 0.45 + 0.4];
      else if (i <= ADD2) TB[i] = [17.4 + (i - 13) * 0.45, 17.4 + (i - 13) * 0.45 + 0.4];
      else TB[i] = [22.7 + (i - TOP) * 0.45, 22.7 + (i - TOP) * 0.45 + 0.4];
    }
    var TD = DB.map(function (b, i) { return [0.4 + i * 0.09, 0.4 + i * 0.09 + 0.08]; });
    var END = TB[N - 1][1] + 1.6;

    function size(n) {
      return n ? { W: 440, H: 930, dx0: 14, dx1: 300, dyt: 212, dyb: 372, dTag: 306, x0: 14, x1: 300, yt: 450, yb: 790, vt: 816, vb: 890, xAx: 434, xTag: 306, cx: 14, cy: 14, bx: 306, by: 404 }
               : { W: 1180, H: 620, dx0: 24, dx1: 300, dyt: 172, dyb: 560, dTag: 306, x0: 380, x1: 1000, yt: 172, yb: 470, vt: 496, vb: 570, xAx: 1172, xTag: 1010, cx: 24, cy: 14, bx: 1010, by: 30 };
    }
    var PMIN = 18.84, PMAX = 19.68, DMIN = 17.0, DMAX = 19.78;

    function frame(T, L) {
      var s = "", k, p;
      /* ---- the daily panel ---- */
      var ddx = (L.dx1 - L.dx0) / (ND + 1), dwB = Math.max(3, ddx * 0.6);
      function dxf(i) { return L.dx0 + ddx * (i + 0.5); }
      function dy(p) { return L.dyb - (p - DMIN) / (DMAX - DMIN) * (L.dyb - L.dyt); }
      s += txt(L.dx0, L.dyt - 16 * FS, "Daily · five weeks", C.dim, 12, "start", 600);
      var aDL = fade(T, 0.3, 0.5), broke = T >= TB[BRK][0] + 0.4;
      if (aDL > 0) {
        s += hl(dxf(3), L.dx1, dy(LEVEL), broke ? C.up : C.gold, "5 4", 1.6, aDL);
        s += tag(L.dTag, dy(LEVEL), f2(LEVEL), broke ? C.up : C.gold, aDL);
      }
      for (k = 0; k < ND; k++) {
        var pd = clamp01((T - TD[k][0]) / (TD[k][1] - TD[k][0]));
        if (pd > 0) s += candle(dxf(k), dy, DB[k], pd, dwB, T >= 4.0 ? 0.55 : 1);
        if (TESTS[k] && T >= TD[k][1]) s += ring(dxf(k), dy(TESTS[k]), 6 * FS, C.gold, 1.8, 1 - 0.6 * fade(T, 4.0, 0.4));
      }
      if (T >= TD[ND - 1][1]) s += txt((L.dx0 + L.dx1) / 2, dy(LEVEL) - 14 * FS, "4 tries, 4 fails", C.gold, 12, "middle", 600, fade(T, TD[ND - 1][1], 0.3) * (1 - 0.5 * fade(T, 4.0, 0.4)));
      /* today's daily candle, built from the 1-minute bars printed so far */
      var lastM = -1; for (k = 0; k < N; k++) if (T >= TB[k][0]) lastM = k;
      if (lastM >= 0) {
        var dh = -1e9, dl = 1e9;
        for (k = 0; k <= lastM; k++) { dh = Math.max(dh, BARS[k][1]); dl = Math.min(dl, BARS[k][2]); }
        var today = [BARS[0][0], dh, dl, BARS[lastM][3]];
        s += candle(dxf(ND), dy, today, 1, dwB + 1, 1, broke ? "#3ef08a" : null);
        s += txt(dxf(ND), dy(dl) + 16 * FS, "Today", C.ink, 11, "middle", 600);
      }

      /* ---- the 1-minute panel ---- */
      var aM = fade(T, 4.0, 0.4);
      if (aM <= 0) return s;
      var dx = (L.x1 - L.x0) / (N - 0.5), wB = Math.max(4, dx * 0.62);
      function x(i) { return L.x0 + dx * (i + 0.5); }
      function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
      var VMAX = 340; function vy(v) { return L.vb - v / VMAX * (L.vb - L.vt); }
      s += '<g opacity="' + aM.toFixed(3) + '">';
      s += txt(L.x0, L.yt - 16 * FS, "1-minute · breakout day", C.dim, 12, "start", 600);
      for (p = 18.9; p <= 19.6 + 1e-9; p += 0.1) s += hl(L.x0, L.x1, y(p), "rgba(255,255,255,0.05)", null, 1) + (L.narrow ? "" : txt(L.xAx, y(p) + 4, p.toFixed(2), C.faint, 11, "end"));
      s += txt(L.x0, L.vt - 6, "Volume", C.faint, 11, "start");

      /* the level */
      s += hl(L.x0, L.x1, y(LEVEL), broke ? C.up : C.gold, "5 4", 1.6, 0.9);
      s += tag(L.xTag, y(LEVEL), (L.narrow ? "Level " : "9/10 level ") + f2(LEVEL), broke ? C.up : C.gold, 1 - fade(T, TB[BRK][1], 0.3));

      /* the pauses and the adds */
      var aP1 = fade(T, TB[P1[1]][1], 0.3), aP2 = fade(T, TB[P2[1]][1], 0.3), fadeLate = 1 - 0.55 * fade(T, 22.4, 0.4);
      if (aP1 > 0) {
        s += rect(x(P1[0]) - dx / 2, y(P1HI), x(P1[1]) - x(P1[0]) + dx, y(P1LO) - y(P1HI), C.cyan, 0.12 * aP1 * fadeLate, C.cyan);
        s += hl(x(P1[0]) - dx / 2, x(ADD1), y(ADDP1), C.cyan, "3 3", 1.6, aP1 * fadeLate);
      }
      if (aP2 > 0) {
        s += rect(x(P2[0]) - dx / 2, y(P2HI), x(P2[1]) - x(P2[0]) + dx, y(P2LO) - y(P2HI), C.cyan, 0.12 * aP2 * fadeLate, C.cyan);
        s += hl(x(P2[0]) - dx / 2, x(ADD2), y(ADDP2), C.cyan, "3 3", 1.6, aP2 * fadeLate);
      }

      /* candles and volume */
      for (k = 0; k < N; k++) {
        var pr = clamp01((T - TB[k][0]) / (TB[k][1] - TB[k][0]));
        if (pr <= 0) continue;
        s += candle(x(k), y, BARS[k], pr, wB, 1, k === BRK && T >= TB[BRK][1] ? "#3ef08a" : null);
        var vc = k === BRK ? C.up : k === DIP ? "rgba(255,255,255,0.32)" : BARS[k][3] >= BARS[k][0] ? "rgba(48,209,88,0.45)" : "rgba(255,69,58,0.45)";
        var vv = BARS[k][4] * clamp01(pr * 1.6);
        s += rect(x(k) - wB / 2, vy(vv), wB, L.vb - vy(vv), vc, 0.9);
      }
      var aSp = fade(T, TB[BRK][1] - 0.4, 0.3) * (1 - 0.7 * fade(T, 14.2, 0.3));
      if (aSp > 0) s += txt(x(BRK) + wB, vy(BARS[BRK][4]) + 12 * FS, BARS[BRK][4] + "k · see it", C.up, 12, "start", 700, aSp);
      var aDip = fade(T, TB[DIP][1], 0.3) * (1 - fade(T, 17.0, 0.3));
      if (aDip > 0) {
        s += ring(x(DIP), y(BARS[DIP][2]), 7 * FS, C.cyan, 1.8, aDip);
        s += txt(x(DIP) + 11 * FS, y(BARS[DIP][2]) + 16 * FS, "shallow", C.cyan, 11, "start", 600, aDip);
        s += txt(x(DIP) + wB, vy(BARS[DIP][4]) - 6, "lighter", C.dim, 11, "start", 600, aDip);
      }

      /* entry */
      var aE = fade(T, TB[BRK][1], 0.4), xEnd = T >= TB[TURN][1] ? x(TURN) : L.x1;
      if (aE > 0) {
        s += hl(x(BRK), xEnd, y(ENTRY), C.ink, null, 1.6, aE * (1 - 0.5 * fade(T, 17.0, 0.4)));
        s += tag(L.xTag, y(ENTRY) - (T >= 12.2 ? 0 : 0), "Buy " + f2(ENTRY), C.ink, aE * (1 - fade(T, 17.0, 0.4)));
        s += ring(x(BRK), y(ENTRY), 9 * FS, C.ink, 2, aE);
      }
      /* the stop, then the trail */
      var aS = fade(T, 12.2, 0.4);
      if (aS > 0) {
        var t1 = T >= TB[ADD1][1], t2 = T >= TB[ADD2][1];
        var segs = [[x(BRK), t1 ? x(ADD1) : xEnd, STOP]];
        if (t1) segs.push([x(ADD1), t2 ? x(ADD2) : xEnd, TR1]);
        if (t2) segs.push([x(ADD2), xEnd, TR2]);
        if (!t1) s += rect(x(BRK), y(ENTRY), xEnd - x(BRK), y(STOP) - y(ENTRY), C.dn, 0.12 * aS);
        segs.forEach(function (g, j) {
          s += hl(g[0], g[1], y(g[2]), C.dn, null, 2, aS);
          if (j) s += '<line x1="' + g[0].toFixed(1) + '" x2="' + g[0].toFixed(1) + '" y1="' + y(segs[j - 1][2]).toFixed(1) + '" y2="' + y(g[2]).toFixed(1) + '" stroke="' + C.dn + '" stroke-width="2" stroke-dasharray="2 3" opacity="' + aS.toFixed(3) + '"/>';
        });
        var cur = segs[segs.length - 1][2];
        s += tag(L.xTag, y(cur), "Stop " + f2(cur), C.dn, aS, "#000");
        var aOb = fade(T, 12.4, 0.3) * (1 - fade(T, 14.2, 0.3));
        if (aOb > 0) {
          s += hl(x(BRK) - dx, x(BRK + 3), y(OBVIOUS), C.dim, "2 3", 1.2, aOb);
          s += txt(x(BRK + 3) + 6, y(OBVIOUS) + 4, f2(OBVIOUS) + " too round", C.dim, 11, "start", 600, aOb);
        }
      }
      /* add markers */
      if (T >= TB[ADD1][0] + 0.2) {
        var a1 = fade(T, TB[ADD1][0] + 0.2, 0.3) * fadeLate;
        s += ring(x(ADD1), y(ADDP1), 7 * FS, C.cyan, 2, a1);
        s += txt(x(P1[0]) - dx / 2, y(ADDP1) - 7 * FS, "Add " + f2(ADDP1), C.cyan, 11, "start", 700, a1);
      }
      if (T >= TB[ADD2][0] + 0.2) {
        var a2 = fade(T, TB[ADD2][0] + 0.2, 0.3) * fadeLate;
        s += ring(x(ADD2), y(ADDP2), 7 * FS, C.cyan, 2, a2);
        s += txt(x(P2[0]) - dx / 2, y(ADDP2) - 7 * FS, "Add " + f2(ADDP2), C.cyan, 11, "start", 700, a2);
      }
      /* the exit */
      if (T >= TB[TURN][1]) {
        var aX = fade(T, TB[TURN][1], 0.3);
        s += ring(x(TURN), y(EXIT), 9 * FS, C.orange, 2.4, aX);
        s += tag(L.xTag, y(EXIT) - 14 * FS, "Out " + f2(EXIT), C.orange, aX);
        s += txt(x(TOP), y(HIGH) - 12 * FS, "tape turns", C.orange, 12, "middle", 700, aX);
      }
      s += "</g>";

      /* badges: RVOL going in, then the size */
      s += tag(L.bx, L.by, "RVOL " + RVOL + "×", C.purple, fade(T, 4.6, 0.3), "#fff");
      s += tag(L.bx, L.by + 28 * FS, "B size", C.blue, fade(T, 8.0, 0.3), "#fff");

      /* one caption box at a time */
      var cx = L.cx, cy = L.cy;
      s += callout(cx, cy, ["A 9 out of 10 level: " + f2(LEVEL), "Capped under it for five weeks", "Four tries, four fails"], C.gold, fade(T, 1.4, 0.4) * (1 - fade(T, 4.0, 0.3)));
      s += callout(cx, cy, ["RVOL " + RVOL + "× going in", "Real order flow is in the name", "Half its usual volume? A trap."], C.purple, fade(T, 4.6, 0.3) * (1 - fade(T, 7.4, 0.3)));
      s += callout(cx, cy, ["The market check: on its own", "SPY near the low of its range", "BTC and ETH still in their ranges", "So: start with B size"], C.blue, fade(T, 7.8, 0.3) * (1 - fade(T, 9.6, 0.3)));
      s += callout(cx, cy, ["The see-it moment: " + BARS[BRK][4] + "k", "About " + Math.round(SPIKE) + "× the morning's average bar", "Buy " + f2(ENTRY) + " as " + f2(LEVEL) + " clears"], C.up, fade(T, TB[BRK][1], 0.3) * (1 - fade(T, 12.2, 0.3)));
      s += callout(cx, cy, ["Stop under the breakout candle", "Its low " + f2(BLOW) + "; " + f2(OBVIOUS) + " is round", "One more penny: " + f2(STOP) + " · risk " + f2(RISK)], C.dn, fade(T, 12.4, 0.3) * (1 - fade(T, 14.2, 0.3)));
      s += callout(cx, cy, ["The tape on the break", "✓ Paying the offer", "✓ Offers clear without friction", "✓ Shallow dips, lighter volume", "✓ Higher and faster than expected"], C.up, fade(T, 14.4, 0.3) * (1 - fade(T, 17.0, 0.3)));
      s += callout(cx, cy, ["Add over the pauses", "Buy stops a cent over the wicks:", f2(ADDP1) + ", then " + f2(ADDP2), "Stop trails to " + f2(TR1) + ", then " + f2(TR2)], C.cyan, fade(T, 17.4, 0.3) * (1 - fade(T, 22.4, 0.3)));
      s += callout(cx, cy, ["Up to " + f2(HIGH) + ", then the tape turns", "Bids get hit, velocity dies: out " + f2(EXIT), "First unit +" + f2(WIN1) + " · about " + R1.toFixed(1) + "R", "Adds +" + f2(WIN2) + " and +" + f2(WIN3)], C.orange, fade(T, TB[TURN][1], 0.3));
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
    window.TCAnim = { _bars: BARS, _daily: DB, seek: function (t) { setPlaying(false); T = t; draw(); },
                      _levels: { LEVEL: LEVEL, ENTRY: ENTRY, STOP: STOP, RISK: RISK, ADDP1: ADDP1, ADDP2: ADDP2, TR1: TR1, TR2: TR2, EXIT: EXIT, HIGH: HIGH, SPIKE: SPIKE, R1: R1 } };   // exposed for testing
  })();

  /* =====================================================================
     2. Stay in or scratch: the same breakout, two endings, on a loop
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-tc-two]");
    if (!root) return;
    var svgs = root.querySelectorAll("svg");
    if (svgs.length < 2) return;
    var HEAD = BARS.slice(5, BRK + 1).map(function (b) { return b.slice(0, 4); });
    var ENDS = [
      /* the velocity shows up: stay in */
      BARS.slice(BRK + 1, BRK + 11).map(function (b) { return b.slice(0, 4); }),
      /* it pays the new high and nothing happens: scratch it */
      [[19.20, 19.21, 19.15, 19.16], [19.16, 19.18, 19.13, 19.15], [19.15, 19.16, 19.11, 19.12], [19.12, 19.13, 19.05, 19.07],
       [19.07, 19.09, 19.01, 19.03], [19.03, 19.07, 18.99, 19.05], [19.05, 19.06, 18.98, 19.00], [19.00, 19.04, 18.96, 19.02],
       [19.02, 19.05, 18.97, 18.99], [18.99, 19.03, 18.95, 19.01]]
    ];
    var NB = HEAD.length + 10, BI = HEAD.length - 1, OUTI = HEAD.length + 2, STOPI = HEAD.length + 4, SCR = 19.11;
    var PMIN = 18.90, PMAX = 19.50, W = 560, H = 340, x0 = 22, x1 = 420, yt = 78, yb = 316;
    var T = 0, LOOP = 9.5, raf = 0, lastNow = 0, on = false;

    function frame(T, which) {
      FS = svgs[0].clientWidth > 0 && svgs[0].clientWidth < 440 ? 1.45 : 1.15;
      var dx = (x1 - x0) / (NB - 0.5), wB = dx * 0.6, s = "";
      function x(i) { return x0 + dx * (i + 0.5); }
      function y(p) { return yb - (p - PMIN) / (PMAX - PMIN) * (yb - yt); }
      var bars = HEAD.concat(ENDS[which]), shown = Math.min(NB, Math.floor(T / 0.5) + 1), pr = (T % 0.5) / 0.5;
      if (REDUCED) { shown = NB; pr = 1; }
      var bought = shown > BI, out = which === 1 && shown > OUTI, done = shown >= NB;
      s += '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>';
      s += hl(x0, x1, y(LEVEL), C.gold, "5 4", 1.5, 0.85);
      s += tag(x1 + 6, y(LEVEL) - 12, "Level", C.gold, 1);
      if (bought) {
        s += hl(x(BI), out ? x(OUTI) : x1, y(ENTRY), C.ink, null, 1.6, 1);
        s += hl(x(BI), x1, y(STOP), C.dn, which === 1 && out ? "4 4" : null, 1.6, which === 1 && out ? 0.6 : 1);
        s += tag(x1 + 6, y(STOP) + 4, "Stop", C.dn, 1, "#000");
      }
      for (var k = 0; k < shown; k++) s += candle(x(k), y, bars[k], k === shown - 1 ? pr : 1, wB, 1, k === BI && k < shown - 1 ? "#3ef08a" : null);
      if (bought) s += ring(x(BI), y(ENTRY), 9, C.ink, 2);
      if (out) {
        s += ring(x(OUTI), y(SCR), 9, C.orange, 2.4);
        s += tag(x1 + 6, y(SCR) + 18, "Out " + f2(SCR), C.orange, 1);
      }
      if (which === 1 && shown > STOPI) s += txt(x(STOPI), y(18.94), "full stop would hit here", C.dim, 12, "middle", 600);
      var head = which ? "No velocity: scratch it" : "The velocity shows up: stay in";
      var sub = which ? (out ? (done ? "Out at " + f2(SCR) + ": −0.02, not −" + f2(RISK) + "." : "Bids soften, the tape dies. Get flat.") : bought ? "Paid the new high. Now what?" : "Under the level…")
                      : (bought ? (done ? "It works almost immediately." : "Paid the new high. It keeps going.") : "Under the level…");
      s += txt(16, 26, head, which ? C.orange : C.up, 15, "start", 700);
      s += txt(16, 26 + 22 * FS, sub, C.dim, 13, "start", done ? 600 : null);
      s += txt(W - 8, H - 8, "Illustrative", C.faint, 11, "end");
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
     3. The five checks: A size, B size, or no trade
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-tc-check]");
    if (!root) return;
    var out = root.querySelector(".chk-out"), btns = root.querySelectorAll(".chk-b");
    function on(k) { var b = root.querySelector('.chk-b[data-k="' + k + '"]'); return b && b.getAttribute("aria-pressed") === "true"; }
    function run() {
      var v;
      if (!on("level")) v = ["no", "No trade", "It isn't a 9 or 10 level. This is the 6 out of 10 breakout in a sloppy range that chops traders up. Wait for a better one."];
      else if (!on("rvol")) v = ["no", "No trade", "A monthly ceiling on normal or half volume is a trap. Without elevated RVOL there's no big money behind the break."];
      else if (!on("bar")) v = ["wait", "Not yet", "No volume spike on the breakout bar means no see-it moment. Wait for the bar where the character changes."];
      else if (!on("tape")) v = ["wait", "Scratch it", "If you're in and the tape isn't paying the offer, get flat at break even or a couple of cents. The reason you took it is gone."];
      else if (!on("mkt")) v = ["b", "B size", "Everything lines up except the market. Respect the setup, but start smaller and control the first risk. That's what Vince did."];
      else v = ["a", "A size", "The level, the volume, the bar, the tape and the market all line up. That's the green light for full conviction."];
      out.className = "chk-out is-" + v[0];
      out.innerHTML = "<b>" + v[1] + "</b><p>" + v[2] + "</p>";
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true"); run(); });
    });
    run();
  })();

  /* =====================================================================
     4. The stop a penny past the round number, and the size
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-tc-calc]");
    if (!root) return;
    var ins = {}, out = root.querySelector(".tc-out");
    root.querySelectorAll("input").forEach(function (el) { ins[el.name] = el; });
    function num(k) { var v = parseFloat(ins[k].value); return isFinite(v) ? v : NaN; }
    function cents(v) { return Math.round(v * 100); }
    function run() {
      var entry = num("entry"), low = num("low"), risk = num("risk");
      if (!(entry > 0 && low > 0 && entry > low && risk > 0)) { out.innerHTML = '<div class="row"><span>Enter an entry above the breakout candle low, and a dollar risk.</span></div>'; return; }
      var first = cents(low) - 1, stop = first, nudged = false;
      while (stop % 5 === 0) { stop -= 1; nudged = true; }
      var ps = (cents(entry) - stop) / 100, a = Math.floor(risk / ps), b = Math.floor(risk / 2 / ps);
      out.innerHTML =
        '<div class="row"><span>A cent under the low, ' + low.toFixed(2) + '</span><b>' + (first / 100).toFixed(2) + (nudged ? " &middot; round" : "") + '</b></div>' +
        '<div class="row"><span>' + (nudged ? "One more penny" : "Not a round number, keep it") + '</span><b>' + (stop / 100).toFixed(2) + '</b></div>' +
        '<div class="row"><span>Risk a share, from ' + entry.toFixed(2) + '</span><b>' + ps.toFixed(2) + '</b></div>' +
        '<div class="row"><span>A size, $' + risk.toFixed(0) + ' at risk</span><b>' + a.toLocaleString() + ' sh</b></div>' +
        '<div class="row tot"><span>B size, half the risk</span><b>' + b.toLocaleString() + ' sh</b></div>';
    }
    root.addEventListener("input", run);
    run();
  })();

  /* =====================================================================
     5. The eight steps as a stepper: one step at a time, with a small
        chart of the walkthrough (the daily chart on the left, the
        breakout day on the right) and that step's part lit up.
        Without the script the eight steps simply show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-tc-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 8) return;
    var INFO = [
      { k: "The level",  c: C.gold,   tag: "Before · rate the level" },
      { k: "RVOL",       c: C.purple, tag: "Before · check the volume" },
      { k: "The bar",    c: C.up,     tag: "Trigger · the see-it moment" },
      { k: "The tape",   c: C.cyan,   tag: "Confirm · read the tape" },
      { k: "The market", c: C.blue,   tag: "Size · A or B" },
      { k: "The stop",   c: C.dn,     tag: "Execute · the stop" },
      { k: "The add",    c: C.cyan,   tag: "Execute · add to winners" },
      { k: "The exit",   c: C.orange, tag: "Execute · the exit" }
    ];
    var cur = 0;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "The eight steps");
    bar.innerHTML = '<span class="gs-line"><i></i></span>' + INFO.map(function (s, i) {
      return '<button type="button" role="tab" class="gs-step" data-i="' + i + '"><b>' + (i + 1) + "</b><span>" + s.k + "</span></button>";
    }).join("");
    var body = document.createElement("div"); body.className = "gs-body";
    var left = document.createElement("div"); left.className = "gs-left";
    var tg = document.createElement("p"); tg.className = "gs-tag";
    var nav = document.createElement("div"); nav.className = "gs-nav";
    nav.innerHTML = '<button type="button" class="pill gs-prev">&lsaquo; Back</button><button type="button" class="pill pill-buy gs-next"></button>';
    var fig = document.createElement("div"); fig.className = "gs-chart";
    fig.innerHTML = '<svg viewBox="0 0 560 300" role="img" aria-label="The walkthrough, daily chart and breakout day, with the current step highlighted"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    /* the daily closes on the left, the breakout day on the right; both scaled so the level sits at the same height */
    var W = 560, H = 300, YL = 150, DS = 52, MS = 230, dxa = 22, dxb = 196, mxa = 236, mxb = 470;
    function dX(i) { return dxa + i * (dxb - dxa) / (DCL.length - 1); }
    function dY(p) { return YL - (p - LEVEL) * DS; }
    function mX(i) { return mxa + i * (mxb - mxa) / (CL.length - 1); }
    function mY(p) { return YL - (p - LEVEL) * MS; }
    function poly(pts, col, w, op) { return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (op != null ? ' opacity="' + op + '"' : "") + "/>"; }
    function leg(a, b, col) { var p = []; for (var i = a; i <= b; i++) p.push(mX(i).toFixed(1) + "," + mY(CL[i]).toFixed(1)); return poly(p, col, 4); }
    function t(x, y, s, col, anchor, w) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="13" text-anchor="' + (anchor || "start") + '"' + (w ? ' font-weight="' + w + '"' : "") + ">" + s + "</text>"; }

    function chart(k) {
      var c = INFO[k].c, s = "";
      s += t(dxa, 22, "Daily · five weeks", C.faint) + t(mxa, 22, "Breakout day · 1-minute", C.faint);
      s += '<line x1="216" x2="216" y1="34" y2="' + (H - 26) + '" stroke="#2c2c2e"/>';
      s += hl(dxa, mxb + 6, YL, k === 0 ? C.gold : "#8e8e93", "4 5", k === 0 ? 2 : 1.2, k === 0 ? 1 : 0.55);
      s += t(W - 12, YL + 4, f2(LEVEL), k === 0 ? C.gold : "#8e8e93", "end", 600);
      s += poly(DCL.map(function (v, i) { return dX(i).toFixed(1) + "," + dY(v).toFixed(1); }), k === 0 ? "#8e8e93" : "#3a3a3c", 2.4);
      s += poly(CL.map(function (v, i) { return mX(i).toFixed(1) + "," + mY(v).toFixed(1); }), "#3a3a3c", 3);
      if (k === 0) {
        Object.keys(TESTS).forEach(function (i) { s += ring(dX(+i), dY(TESTS[i]), 6, C.gold, 2); });
        s += t((dxa + dxb) / 2, YL - 18, "4 tries, 4 fails", C.gold, "middle", 600);
      }
      if (k === 1) { s += leg(0, BRK - 1, c); s += t(mxa, 252, "RVOL " + RVOL + "× going in", c, "start", 700); }
      if (k === 2) {
        s += leg(BRK - 1, BRK, c); s += ring(mX(BRK), mY(CL[BRK]), 8, c, 2.4);
        var vb = 268; for (var i = 0; i <= BRK + 2; i++) { var h = BARS[i][4] / 310 * 40; s += rect(mX(i) - 3, vb - h, 6, h, i === BRK ? c : "#3a3a3c", 1); }
        s += t(mX(BRK) + 10, vb - 30, BARS[BRK][4] + "k", c, "start", 700);
      }
      if (k === 3) { s += leg(BRK, 12, c); s += ring(mX(DIP), mY(CL[DIP]), 7, c, 2); s += t(mX(DIP), mY(CL[DIP]) + 24, "shallow dip", c, "middle", 600); }
      if (k === 4) {
        s += rect(mxa, 222, 236, 58, C.box, 1);
        s += t(mxa + 12, 244, "SPY: low end of its range", C.dim) + t(mxa + 12, 266, "BTC, ETH: still in range", C.dim);
        s += t(mxb - 6, 256, "B size", c, "end", 700);
        s += leg(0, BRK, c);
      }
      if (k === 5) {
        s += hl(mX(BRK), mxb, mY(STOP), c, null, 2.4);
        s += hl(mX(BRK), mX(BRK + 4), mY(OBVIOUS), "#8e8e93", "2 3", 1.2);
        s += t(mX(BRK + 4) + 6, mY(OBVIOUS) + 4, f2(OBVIOUS) + " ✗", "#8e8e93") + t(mxb, mY(STOP) + 20, "Stop " + f2(STOP), c, "end", 700);
        s += ring(mX(BRK), mY(ENTRY), 7, C.ink, 2);
      }
      if (k === 6) {
        [[P1, ADD1, P1HI, P1LO], [P2, ADD2, P2HI, P2LO]].forEach(function (g) {
          s += rect(mX(g[0][0]) - 4, mY(g[2]), mX(g[0][1]) - mX(g[0][0]) + 8, mY(g[3]) - mY(g[2]), c, 0.18);
          s += ring(mX(g[1]), mY(CL[g[1]]), 7, c, 2.2);
        });
        s += leg(P1[0], ADD2, c);
        s += poly([mX(BRK), mY(STOP), mX(ADD1), mY(STOP), mX(ADD1), mY(TR1), mX(ADD2), mY(TR1), mX(ADD2), mY(TR2), mxb, mY(TR2)].reduce(function (a, v, i, arr) { if (i % 2 === 0) a.push(arr[i].toFixed(1) + "," + arr[i + 1].toFixed(1)); return a; }, []), C.dn, 2, 0.9);
        s += t(mX(ADD2), mY(TR2) + 20, "stop trails up", C.dn, "middle", 600);
      }
      if (k === 7) { s += leg(ADD2, TURN, c); s += ring(mX(TURN), mY(EXIT), 8, c, 2.4); s += t(mX(TURN), mY(HIGH) - 14, "tape turns · out " + f2(EXIT), c, "middle", 700); }
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
      FS = 1;
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

/* =====================================================================
   lr-anim.js — the animations on the Liquidity Refill page.

   1. [data-lr-anim]   one long, start to finish, on 1-minute bars, in
      eight stages: compression → C1, a relatively big candle that
      breaks the trend line → aggression against refill (why price has
      to move) → C2 opens with a quick sell-off that holds in the top of
      C1, drawn second by second with a clock → the flip: buy the break
      of C1's high, stop under the wick → ride it → out after four
      candles → the opposite candle: the imbalance is over.
   2. [data-lr-book]   aggression against refill: set how fast buyers
      take the ask and how fast sellers add it back, and watch the price.
   3. [data-lr-four]   four C2s after the same C1: take it, too deep,
      too late, no break on C2.
   4. [data-lr-wick]   grade a C2 wick (depth and timing) and size the
      trade: entry, stop, risk, contracts, 2R and 3R.
   5. [data-lr-retest] the second chance: the daily C1/C2, and the same
      C2 on the 1-hour chart with the retest of its open.
   6. [data-lr-steps]  the six steps as a click-through stepper with a
      small chart of the walkthrough that lights up per step.

   Like hh-anim.js the walkthrough redraws for the space it has: under
   640px of drawing width it uses a tall, narrow layout with larger text.
   The bars are scripted and labelled "Illustrative". No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#22d3ee", gold: "#f4b942", orange: "#ff9f0a", purple: "#bf5af2", teal: "#64d2ff",
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
  function ln(x1, y1, x2, y2, col, dash, w, op) {
    if (op != null && op <= 0) return "";
    return '<line x1="' + x1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y1="' + y1.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ' stroke-linecap="round"/>';
  }
  function rect(x, y, w, h, fill, op, stroke, rx) {
    if (op <= 0) return "";
    return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '"' + (rx ? ' rx="' + rx + '"' : "") + ' fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="1.4"' : "") + ' opacity="' + op.toFixed(3) + '"/>';
  }
  function ring(x, y, r, col, w, op) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2) + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function dot(x, y, r, col, op) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + col + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function tri(x, y, up, col, sz, op) {
    if (op != null && op <= 0) return "";
    var h = sz * 1.15, p = up ? [x, y - h / 2, x - sz / 2, y + h / 2, x + sz / 2, y + h / 2] : [x, y + h / 2, x - sz / 2, y - h / 2, x + sz / 2, y - h / 2];
    return '<polygon points="' + p.map(function (v) { return v.toFixed(1); }).join(" ") + '" fill="' + col + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function callout(x, y, lines, col, op) {
    if (op <= 0) return "";
    var w = 18 + Math.max.apply(null, lines.map(function (s) { return s.replace(/&[a-z#0-9]+;/g, "x").length; })) * 7.2 * FS, h = 10 + lines.length * 18 * FS;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" rx="8" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (l, k) { s += txt(x + 10, y + 21 * FS + k * 18 * FS, l, k === 0 ? col : C.dim, 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  function tag(xTag, y, label, col, op, ink) {
    if (op <= 0) return "";
    var w = (label.length * 7 + 16) * FS, h = 20 * FS;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xTag.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="' + col + '"/>' +
      txt(xTag + 8 * FS, y + 4.5 * FS, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  /* a candle drawn as far as `prog` (0..1). Default path o → l → h → c (green) or o → h → l → c (red);
     b.path [[0..1, price], …] overrides it, so the early wick of C2 can be scripted. */
  function partial(b, prog) {
    var o = b[0], h = b[1], l = b[2], c = b[3];
    if (prog >= 1) return { hi: h, lo: l, cur: c };
    var pth = b.path || (c >= o ? [[0, o], [1 / 3, l], [2 / 3, h], [1, c]] : [[0, o], [1 / 3, h], [2 / 3, l], [1, c]]);
    var p = clamp01(prog), hi = o, lo = o, cur = o;
    for (var k = 1; k < pth.length; k++) {
      var a = pth[k - 1], z = pth[k];
      if (p >= z[0]) { hi = Math.max(hi, z[1]); lo = Math.min(lo, z[1]); cur = z[1]; continue; }
      cur = a[1] + (z[1] - a[1]) * (p - a[0]) / (z[0] - a[0]);
      break;
    }
    return { hi: Math.max(hi, cur), lo: Math.min(lo, cur), cur: cur };
  }
  function candle(x, yf, b, prog, wBody, op, paint) {
    if (prog <= 0) return "";
    var o = b[0], p = partial(b, prog);
    var col = paint || (p.cur >= o ? C.up : C.dn), top = yf(Math.max(o, p.cur)), bh = Math.max(1.5, Math.abs(yf(o) - yf(p.cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + yf(p.hi).toFixed(1) + '" y2="' + yf(p.lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.4"/>' +
      '<rect x="' + (x - wBody / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + wBody.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }
  function f2(v) { return v.toFixed(2); }
  function px(v) { return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  /* ---------------------------------------------------------------------
     The bars: a made-up index future on 1-minute bars, tick 0.25.
     [o, h, l, c]. Twelve quiet bars with lower highs, then C1 (12),
     C2 (13, scripted second by second), three more green, then red.
     --------------------------------------------------------------------- */
  var BARS = [
    [21494.00, 21496.50, 21490.75, 21491.50], [21491.50, 21495.25, 21489.50, 21493.75], [21493.75, 21494.75, 21488.25, 21489.00], [21489.00, 21493.50, 21487.75, 21492.25],
    [21492.25, 21493.00, 21487.00, 21488.50], [21488.50, 21491.75, 21486.25, 21490.75], [21490.75, 21491.25, 21486.75, 21487.50], [21487.50, 21490.50, 21485.75, 21489.25],
    [21489.25, 21489.75, 21485.50, 21486.25], [21486.25, 21489.25, 21485.25, 21488.00], [21488.00, 21488.75, 21484.75, 21485.50], [21485.50, 21488.00, 21484.50, 21486.00],
    /* C1 */
    [21486.00, 21509.50, 21485.25, 21508.25],
    /* C2 */
    [21508.25, 21517.00, 21506.00, 21515.50],
    /* C3 to C5: the ride */
    [21515.50, 21521.75, 21514.25, 21520.25], [21520.25, 21526.00, 21519.00, 21524.75], [21524.75, 21529.25, 21523.50, 21527.75],
    /* the opposite candle, then a drift */
    [21527.75, 21528.50, 21521.75, 21523.00], [21523.00, 21525.50, 21519.75, 21521.25], [21521.25, 21524.25, 21518.50, 21523.50]
  ];
  var N = BARS.length, TICK = 0.25, C1 = 12, C2 = 13, OUT = 16, OPP = 17;
  /* C2, second by second: the sell-off is done by 0:12, the flip crosses C1's high at 0:31 */
  var C2SEC = [[0, 21508.25], [4, 21507.25], [12, 21506.00], [18, 21507.75], [26, 21509.00], [31, 21509.50], [33, 21510.25], [44, 21514.50], [52, 21517.00], [60, 21515.50]];
  BARS[C2].path = C2SEC.map(function (p) { return [p[0] / 60, p[1]]; });
  var C1H = BARS[C1][1], C1L = BARS[C1][2], C1R = C1H - C1L;
  var WICK = BARS[C2][2], WICK_SEC = 12, WICK_PCT = (C1H - WICK) / C1R * 100;
  var TOP20 = C1H - 0.2 * C1R, MID = C1H - 0.5 * C1R;
  var ENTRY = C1H + TICK, STOP = WICK - 3 * TICK, RISK = ENTRY - STOP;
  var WIDE = C1L - TICK, WIDE_RISK = ENTRY - WIDE;
  var EXIT = BARS[OUT][3], R_MULT = (EXIT - ENTRY) / RISK;
  var TL_A = 0, TL_B = 11, TL_SLOPE = (BARS[TL_B][1] - BARS[TL_A][1]) / (TL_B - TL_A);
  function tlAt(i) { return BARS[TL_A][1] + TL_SLOPE * (i - TL_A); }
  function avgRange(a, b) { var s = 0; for (var i = a; i <= b; i++) s += BARS[i][1] - BARS[i][2]; return s / (b - a + 1); }
  var QUIET = avgRange(0, 11), BIG = C1R / QUIET;

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-lr-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;
    var T_C2A = 8.8, T_C2B = 14.8;
    function secAt(T) { if (T <= T_C2A) return 0; if (T < T_C2A + 3) return (T - T_C2A) * 5; return Math.min(60, 15 + (T - T_C2A - 3) * 15); }
    var T_CROSS = T_C2A + 3 + (31 - 15) / 15;

    var STAGES = [
      { at: 0,    title: "Compression first", text: "Twelve quiet one-minute candles, about " + QUIET.toFixed(1) + " points each, highs drifting lower. A low-volatility state. That's where this works best, because the next big candle stands out against it." },
      { at: 3.6,  title: "C1: a relatively big candle", text: "One candle covers " + f2(C1R) + " points, about " + BIG.toFixed(0) + " times its neighbors, closes near its high and breaks the trend line through the lower highs. Assume buyers just got aggressive. One candle isn't enough, though. The next one decides it." },
      { at: 5.2,  title: "Aggression against refill", text: "Picture buyers crossing the spread and taking 10,000 contracts a second off the ask, while sellers only add back 2,000 a second. The ask refills, just far too slowly. If that keeps up there's only one way price can go: up. That's the imbalance C1 hints at." },
      { at: T_C2A - 0.2, title: "C2 opens: a quick sell-off", text: "In the first " + WICK_SEC + " seconds sellers step in and push it down to " + px(WICK) + ". That's all they get. The wick stays in the top " + Math.round(WICK_PCT) + "% of C1, nowhere near its 50% line. Buyers are already lined up much higher than before and absorb it right away." },
      { at: T_CROSS - 0.1, title: "The flip: buy the break of C1's high", text: "Buyers turn aggressive again and the candle flips green. When price crosses C1's high, " + px(C1H) + ", buy: " + px(ENTRY) + ". Stop just under the wick, " + px(STOP) + ". That's " + f2(RISK) + " points of risk, against " + f2(WIDE_RISK) + " for a stop under C1's low." },
      { at: 15.0, title: "Ride the imbalance", text: "C2 closes at " + px(BARS[C2][3]) + ", then two more green candles, each closing higher than the last. The imbalance is still in place, so you stay in." },
      { at: 17.0, title: "Out after the fourth candle", text: "Three or four candles is the whole play. Out at the close of the fourth, " + px(EXIT) + ": +" + f2(EXIT - ENTRY) + " points, " + R_MULT.toFixed(1) + "R. If a red candle had closed first, you'd have been out on that one." },
      { at: 18.4, title: "Then the opposite candle", text: "The next candle closes red. The imbalance is over and price drifts back. Don't expect 20 green candles from this. It's a quick scalp: a few candles, then done, and on to the next one." }
    ];
    var TB = [];
    function segT(a, b, t0, step, dur) { for (var i = a; i <= b; i++) TB[i] = [t0 + (i - a) * step, t0 + (i - a) * step + dur]; }
    segT(0, 11, 0.3, 0.26, 0.22);
    segT(C1, C1, 3.8, 1, 1.0);
    TB[C2] = [T_C2A, T_C2B];
    segT(14, 16, 15.2, 0.62, 0.52);
    segT(OPP, N - 1, 18.6, 0.6, 0.5);
    var END = TB[N - 1][1] + 1.6;
    function prog(i, T) { if (i === C2) return secAt(T) / 60; return clamp01((T - TB[i][0]) / (TB[i][1] - TB[i][0])); }

    function size(n) {
      return n ? { W: 440, H: 900, x0: 14, x1: 330, yt: 260, yb: 660, st: 724, sb: 772, xTag: 334, cx: 14, cy: 14, bx: 14, by: 138, S: 4 }
               : { W: 1180, H: 640, x0: 24, x1: 1010, yt: 150, yb: 500, st: 556, sb: 592, xTag: 1016, cx: 24, cy: 14, bx: 520, by: 14, S: 0 };
    }
    var PMIN = 21481, PMAX = 21533;

    function frame(T, L) {
      var s = "", i;
      var S0 = L.S, dx = (L.x1 - L.x0) / (N - S0), wB = Math.max(4, dx * 0.56);
      function x(i) { return L.x0 + dx * (i - S0 + 0.5); }
      function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
      s += txt(L.x0, L.yt - 14 * FS, "1-minute · a made-up index future", C.faint, 12);

      /* compression box */
      var cbo = fade(T, 3.2, 0.3) * (1 - fade(T, 5.2, 0.4));
      var cHi = -1e9, cLo = 1e9; for (i = S0; i <= 11; i++) { cHi = Math.max(cHi, BARS[i][1]); cLo = Math.min(cLo, BARS[i][2]); }
      s += rect(x(S0) - dx * 0.45, y(cHi) - 6, x(11) - x(S0) + dx * 0.9, y(cLo) - y(cHi) + 12, C.teal, 0.1 * cbo, null, 6);
      s += txt(x(S0) - dx * 0.45, y(cLo) + 22 * FS, "compression · ~" + QUIET.toFixed(1) + " pts a bar", C.teal, 12, "start", 700, cbo);

      /* trend line through the lower highs */
      var tlo = fade(T, 3.0, 0.4) * (T >= 15 ? 0.35 : 1);
      if (tlo > 0) s += ln(x(Math.max(TL_A, S0)), y(tlAt(Math.max(TL_A, S0))) - 3, x(C1 + 0.6), y(tlAt(C1 + 0.6)) - 3, C.dim, "6 5", 1.4, tlo);

      /* C1's top 20% and 50% */
      var zo = fade(T, T_C2A - 0.2, 0.4) * (1 - fade(T, 15.0, 0.4) * 0.7);
      if (zo > 0) {
        var zx0 = x(C1) - dx * 0.5, zx1 = x(C2) + dx * 1.6;
        s += rect(zx0, y(C1H), zx1 - zx0, y(TOP20) - y(C1H), C.up, 0.16 * zo);
        s += hl(zx0, zx1, y(TOP20), C.up, "3 3", 1.2, zo);
        s += hl(zx0, zx1, y(MID), C.dn, "5 4", 1.4, zo);
        s += txt(zx0 - 8, y(TOP20) + 4, "top 20%", C.up, 12, "end", 700, zo);
        s += txt(zx0 - 8, y(MID) + 4, "50% of C1", C.dn, 12, "end", 700, zo);
      }

      /* candles */
      for (i = S0; i < N; i++) {
        var pr = prog(i, T);
        if (pr <= 0) continue;
        var dimIt = T >= 18.4 && i > OUT ? 0.85 : 1;
        s += candle(x(i), y, BARS[i], pr, wB, dimIt);
      }
      /* C1 / C2 labels */
      s += txt(x(C1), y(C1L) + 22 * FS, "C1", C.ink, 14, "middle", 700, fade(T, TB[C1][1], 0.3));
      s += txt(x(C2), y(C1L) + (L.narrow ? 42 : 22) * FS, "C2", C.ink, 14, "middle", 700, fade(T, T_C2A, 0.3));

      /* the wick, while it forms */
      var wo = fade(T, T_C2A + 2.4, 0.3) * (1 - fade(T, 15.0, 0.4));
      s += ring(x(C2), y(WICK), 12 * FS, C.gold, 2.2, wo);
      if (wo > 0 && !L.narrow) s += txt(x(C2) + 18, y(WICK) + 30, Math.round(WICK_PCT) + "% deep · done by 0:" + ("0" + WICK_SEC).slice(-2), C.gold, 12, "start", 700, wo);

      /* the clock strip for C2 */
      var so = fade(T, T_C2A - 0.2, 0.3) * (1 - fade(T, 15.4, 0.4));
      if (so > 0) {
        var sx0 = L.x0, sx1 = L.narrow ? L.x1 + 90 : x(C2) + dx * 6, sy = (L.st + L.sb) / 2, sec = secAt(T);
        function sxs(v) { return sx0 + (sx1 - sx0) * v / 60; }
        s += txt(sx0, L.st - 6 * FS, "C2's first minute", C.faint, 12, "start", 600, so);
        s += rect(sx0, sy - 6, sx1 - sx0, 12, "#3a3a3c", so, null, 6);
        s += rect(sx0, sy - 6, sxs(15) - sx0, 12, C.up, 0.45 * so, null, 6);
        s += txt(sxs(7.5), sy + 24 * FS, "first 10–15 s", C.up, 11.5, "middle", 700, so);
        s += rect(sx0, sy - 6, sxs(sec) - sx0, 12, C.ink, 0.35 * so, null, 6);
        s += dot(sxs(sec), sy, 7 * FS, C.ink, so);
        if (sec >= WICK_SEC) s += dot(sxs(WICK_SEC), sy, 5 * FS, C.gold, so);
        if (sec >= 31) s += dot(sxs(31), sy, 5 * FS, C.up, so);
        s += txt(sx1, sy + 24 * FS, "0:" + ("0" + Math.floor(sec)).slice(-2), C.ink, 12, "end", 700, so);
        if (sec >= 31 && !L.narrow) s += txt(sxs(31), sy - 12 * FS, "crosses C1's high", C.up, 11.5, "middle", 600, so);
        if (sec >= WICK_SEC && !L.narrow) s += txt(sxs(WICK_SEC), sy - 12 * FS, "wick done", C.gold, 11.5, "middle", 600, so);
      }

      /* the entry and the stop */
      var eo = fade(T, T_CROSS, 0.3);
      if (eo > 0) {
        var gone = T >= 17.2;
        s += tri(x(C2) - dx * 0.75, y(ENTRY), true, C.up, 11 * FS, eo);
        s += hl(x(C2) - dx * 0.5, L.x1, y(ENTRY), C.ink, null, 1.5, eo * (gone ? 0.45 : 1));
        s += tag(L.xTag, y(ENTRY) - (L.narrow ? 0 : 0), "buy " + px(ENTRY), C.ink, eo * (1 - fade(T, 17.0, 0.3)));
        s += hl(x(C2) - dx * 0.5, L.x1, y(STOP), C.dn, "5 4", 1.8, eo * (1 - fade(T, 17.2, 0.3)));
        s += tag(L.xTag, y(STOP) + 12 * FS, "stop " + px(STOP), C.dn, eo * (1 - fade(T, 17.0, 0.3)));
        /* the wide stop you don't need */
        var wso = fade(T, T_CROSS + 0.5, 0.3) * (1 - fade(T, 15.0, 0.3));
        s += hl(x(C1) - dx * 0.5, L.x1, y(WIDE), C.faint, "3 4", 1.3, wso);
        if (!L.narrow) s += txt(L.x1, y(WIDE) - 6, "under C1's low: " + f2(WIDE_RISK) + " pts", C.faint, 11.5, "end", 600, wso);
      }

      /* the candle count */
      for (i = C2; i <= OUT; i++) {
        var co = fade(T, (i === C2 ? 15.0 : TB[i][1]), 0.3) * (1 - fade(T, 18.4, 0.4));
        s += txt(x(i), y(BARS[i][1]) - 12 * FS, String(i - C2 + 1), C.up, 14, "middle", 700, co);
      }
      var xo = fade(T, TB[OUT][1], 0.3);
      if (xo > 0) {
        s += tri(x(OUT), y(BARS[OUT][1]) - 40 * FS, false, C.cyan, 11 * FS, xo);
        s += tag(L.xTag, y(EXIT), "out " + px(EXIT), C.cyan, xo);
        if (T >= 18.4) s += txt(L.x0, L.yt + 14 * FS, "+" + f2(EXIT - ENTRY) + " pts · " + R_MULT.toFixed(1) + "R on " + f2(RISK) + " of risk", C.cyan, 13, "start", 700, fade(T, 18.4, 0.3));
      }
      var oo = fade(T, TB[OPP][1], 0.3);
      if (oo > 0) s += txt(x(OPP), y(BARS[OPP][2]) + 22 * FS, L.narrow ? "red" : "opposite candle", C.dn, 12, "middle", 700, oo);

      /* the order book picture */
      var bo = fade(T, 5.3, 0.3) * (1 - fade(T, T_C2A - 0.2, 0.3));
      if (bo > 0) {
        var bw = L.narrow ? 410 : 460, bx = L.bx, by = L.by, bh = L.narrow ? 104 : 100, full = bw - 160 * FS;
        var grow = fade(T, 5.6, 1.0);
        s += '<g opacity="' + bo.toFixed(3) + '">' + rect(bx, by, bw, bh, C.box, 1, null, 10);
        s += txt(bx + 12, by + 22 * FS, "Every second, at the ask", C.ink, 13, "start", 600);
        s += txt(bx + 12, by + 48 * FS, "buyers take", C.dim, 12);
        s += rect(bx + 110 * FS, by + 38 * FS, full * grow, 13 * FS, C.up, 0.9, null, 3);
        s += txt(bx + 116 * FS + full * grow, by + 49 * FS, "10,000", C.up, 12, "start", 700);
        s += txt(bx + 12, by + 74 * FS, "sellers refill", C.dim, 12);
        s += rect(bx + 110 * FS, by + 64 * FS, full * 0.2 * grow, 13 * FS, C.dn, 0.9, null, 3);
        s += txt(bx + 116 * FS + full * 0.2 * grow, by + 75 * FS, "2,000", C.dn, 12, "start", 700);
        s += "</g>";
      }

      /* ---- the callouts ---- */
      var cx = L.cx, cy = L.cy;
      s += callout(cx, cy, ["Compression", "Small candles, ~" + QUIET.toFixed(1) + " pts each", "Lower highs, low volatility", "Wait for something to stand out"], C.teal, fade(T, 0.4, 0.3) * (1 - fade(T, 3.6, 0.3)));
      s += callout(cx, cy, ["C1: the imbalance candle", f2(C1R) + " pts, ~" + BIG.toFixed(0) + "× its neighbors", "Closes near its high", "Breaks the trend line"], C.up, fade(T, 3.9, 0.3) * (1 - fade(T, 5.2, 0.3)));
      s += callout(cx, cy, ["C2: the quick sell-off", "Down to " + px(WICK) + " by 0:" + ("0" + WICK_SEC).slice(-2), Math.round(WICK_PCT) + "% into C1: top 20%", "Absorbed right away"], C.gold, fade(T, T_C2A, 0.3) * (1 - fade(T, T_CROSS - 0.1, 0.3)));
      s += callout(cx, cy, ["The flip: buy " + px(ENTRY), "A tick over C1's high", "Stop " + px(STOP) + ", under the wick", "Risk " + f2(RISK) + " pts"], C.up, fade(T, T_CROSS, 0.3) * (1 - fade(T, 15.0, 0.3)));
      s += callout(cx, cy, ["Ride the imbalance", "Each candle closes higher", "Still green: stay in", "Red close: out"], C.up, fade(T, 15.2, 0.3) * (1 - fade(T, 17.0, 0.3)));
      s += callout(cx, cy, ["Out after the fourth candle", "Sell " + px(EXIT), "+" + f2(EXIT - ENTRY) + " pts", R_MULT.toFixed(1) + "R on " + f2(RISK) + " of risk"], C.cyan, fade(T, 17.2, 0.3) * (1 - fade(T, 18.4, 0.3)));
      s += callout(cx, cy, ["The opposite candle", "The imbalance is over", "A few candles, then done", "On to the next one"], C.dn, fade(T, 18.6, 0.3));
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
    function tick(t) {
      if (!playing) return;
      T += Math.min(0.1, (t - lastNow) / 1000); lastNow = t;
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
    window.LRAnim = { seek: function (t) { setPlaying(false); T = t; draw(); }, END: END, STAGES: STAGES,
                      _levels: { C1H: C1H, C1L: C1L, C1R: C1R, WICK: WICK, WICK_PCT: WICK_PCT, ENTRY: ENTRY, STOP: STOP, RISK: RISK, WIDE_RISK: WIDE_RISK, EXIT: EXIT, R_MULT: R_MULT, QUIET: QUIET, BIG: BIG } };   // exposed for testing
  })();

  /* =====================================================================
     2. Aggression against refill: the order book, simplified
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-lr-book]");
    if (!root) return;
    var svg = root.querySelector("svg"), out = root.querySelector(".lr-bout");
    var ins = {}; root.querySelectorAll("input").forEach(function (el) { ins[el.name] = el; });
    var outA = root.querySelector('[data-show="aggr"]'), outR = root.querySelector('[data-show="refill"]');
    var DEPTH = 4000, LEVELS = 6, BASE = 21500;
    var price = BASE, best = DEPTH, hist = [], t = 0, lastNow = 0, raf = 0, running = false, visible = false;
    function vals() { return { a: Math.max(0, +ins.aggr.value || 0), r: Math.max(0, +ins.refill.value || 0) }; }
    function reset() { price = BASE; best = DEPTH; hist = []; t = 0; for (var i = 0; i < 60; i++) hist.push(price); }
    function step(dt) {
      var v = vals();
      best += (v.r - v.a) * dt;
      if (best > DEPTH * 1.5) best = DEPTH * 1.5;
      var guard = 0;
      while (best <= 0 && guard++ < 20) { price += 0.25; best += DEPTH; }
      t += dt;
      if (t >= 0.25) { t = 0; hist.push(price); if (hist.length > 60) hist.shift(); }
    }
    function draw() {
      var narrow = svg.clientWidth > 0 && svg.clientWidth < 520;
      var W = narrow ? 440 : 1100, H = narrow ? 420 : 300;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.2 : 1;
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      /* the ladder */
      var lx = 20, lw = narrow ? 400 : 420, ly = 34, rowH = narrow ? 24 : 30;
      s += txt(lx, 22, "The ask, one level per tick", C.faint, 12);
      for (var k = LEVELS - 1; k >= 0; k--) {
        var p = price + 0.25 * (k + 1), q = k === 0 ? Math.max(0, best) : DEPTH, yy = ly + (LEVELS - 1 - k) * rowH;
        s += txt(lx, yy + rowH * 0.68, px(p), k === 0 ? C.ink : C.dim, 12.5, "start", k === 0 ? 700 : null);
        s += rect(lx + 84 * FS, yy + 4, (lw - 150 * FS) * Math.min(1, q / (DEPTH * 1.5)), rowH - 8, C.dn, k === 0 ? 0.9 : 0.45, null, 3);
        s += txt(lx + lw, yy + rowH * 0.68, Math.round(q).toLocaleString("en-US"), k === 0 ? C.dn : C.faint, 12, "end", k === 0 ? 700 : null);
      }
      var py = ly + LEVELS * rowH + 4;
      s += hl(lx, lx + lw, py, C.up, null, 2);
      s += txt(lx, py + 18 * FS, "last " + px(price), C.up, 13, "start", 700);
      /* the price line */
      var gx = narrow ? 20 : 500, gw = narrow ? 400 : 580, gy = narrow ? py + 40 * FS : 34, gh = narrow ? H - gy - 30 : 230;
      var lo = Math.min.apply(null, hist), hi = Math.max.apply(null, hist);
      if (hi - lo < 2) { var mid = (hi + lo) / 2; hi = mid + 1; lo = mid - 1; }
      s += txt(gx, gy - 12 + (narrow ? 4 : 0), "Price, last 15 seconds", C.faint, 12);
      s += rect(gx, gy, gw, gh, "#141416", 1, null, 8);
      var pts = hist.map(function (v, i) { return (gx + 8 + (gw - 16) * i / 59).toFixed(1) + "," + (gy + gh - 10 - (v - lo) / (hi - lo) * (gh - 20)).toFixed(1); });
      s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.up + '" stroke-width="2.4" stroke-linejoin="round"/>';
      svg.innerHTML = s;
      FS = 1;
    }
    function explain() {
      var v = vals(), net = v.a - v.r, cls, head, body;
      if (outA) outA.textContent = v.a.toLocaleString("en-US");
      if (outR) outR.textContent = v.r.toLocaleString("en-US");
      if (v.a <= 0) { cls = "is-b"; head = "No aggression"; body = "Nobody's crossing the spread. Liquidity sits there and price doesn't need to move."; }
      else if (net <= 0) { cls = "is-b"; head = "Absorbed"; body = "Sellers add back at least as much as buyers take. The ask keeps up, so price holds. That's no imbalance."; }
      else {
        var tps = net / DEPTH;
        cls = net / v.a >= 0.5 ? "is-a" : "is-b";
        head = (v.a / Math.max(1, v.r)).toFixed(v.r ? 1 : 0) + (v.r ? "× · imbalance" : " · nothing refills");
        body = "The ask loses " + net.toLocaleString("en-US") + " contracts a second, so price lifts about a tick every " + (1 / tps).toFixed(1) + " seconds (at " + DEPTH.toLocaleString("en-US") + " a level). " +
               (cls === "is-a" ? "Buyers are consuming far more than sellers can provide: there's only one way price can go." : "Price drifts up, but sellers are keeping up with most of it.");
      }
      out.className = "chk-out lr-bout " + cls;
      out.innerHTML = "<b>" + head + "</b><p>" + body + "</p>";
    }
    function loop(now) {
      if (!running) return;
      var dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
      step(dt); draw();
      raf = requestAnimationFrame(loop);
    }
    function run(on) {
      running = on && !REDUCED;
      cancelAnimationFrame(raf);
      if (running) { lastNow = performance.now(); raf = requestAnimationFrame(loop); }
    }
    root.addEventListener("input", function () { explain(); if (REDUCED) { for (var i = 0; i < 60; i++) step(0.25); draw(); } });
    var rb = root.querySelector("[data-reset]");
    if (rb) rb.addEventListener("click", function () { reset(); draw(); });
    reset();
    if (REDUCED) for (var i = 0; i < 60; i++) step(0.25);
    draw(); explain();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en.some(function (e) { return e.isIntersecting; }); run(visible); }, { threshold: 0.2 }).observe(svg);
    } else run(true);
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
  })();

  /* =====================================================================
     3. Four C2s after the same C1
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-lr-four]");
    if (!root) return;
    var svg = root.querySelector("svg");
    var base = BARS.slice(6, C1 + 1);            // six quiet bars + C1
    var CASES = [
      { t: "Take it", sub: "early, shallow, flips, breaks", ok: true, sec: 12, deep: 14,
        bars: [BARS[C2], BARS[14]] },
      { t: "Too deep", sub: "past C1's 50%: the R:R is gone", ok: false, sec: 14, deep: 58,
        bars: [[21508.25, 21511.00, 21495.50, 21510.25], [21510.25, 21512.00, 21506.50, 21507.75]] },
      { t: "Too late", sub: "the wick came at 0:44, not 0:12", ok: false, sec: 44, deep: 22,
        bars: [[21508.25, 21512.25, 21504.25, 21505.50], [21505.50, 21508.00, 21503.25, 21506.75]] },
      { t: "No break on C2", sub: "C2 closes red; C3 breaks: no trade", ok: false, sec: 10, deep: 12, c3: true,
        bars: [[21508.25, 21509.25, 21506.50, 21507.25], [21507.25, 21514.00, 21506.75, 21513.25]] }
    ];
    function panel(cs, ox, oy, w, h) {
      var bars = base.concat(cs.bars), n = bars.length, dx = w / (n + 0.6), wb = Math.max(4, dx * 0.56);
      var pmin = 21483, pmax = 21516, ph = h - 70;
      function x(i) { return ox + dx * (i + 0.5); }
      function y(p) { return oy + 30 + (ph - 10) * (1 - (p - pmin) / (pmax - pmin)); }
      var col = cs.ok ? C.up : C.dn, ci = base.length - 1, c2 = ci + 1;
      var s = rect(ox - 8, oy - 8, w + 16, h + 4, "#141416", 1, null, 12);
      s += txt(ox, oy + 12, cs.t, col, 15, "start", 700);
      s += txt(ox, oy + 30 * FS, cs.sub, C.dim, 12);
      var zx0 = x(ci) - dx * 0.5, zx1 = x(n - 1) + dx * 0.5;
      s += rect(zx0, y(C1H), zx1 - zx0, y(TOP20) - y(C1H), C.up, 0.14);
      s += hl(zx0, zx1, y(MID), C.dn, "4 4", 1.2, 0.9);
      s += hl(zx0, zx1 + 6, y(C1H), C.dim, "2 3", 1, 0.8);
      bars.forEach(function (b, i) { s += candle(x(i), function (p) { return y(p) + 14 * FS; }, b, 1, wb); });
      s += txt(x(ci), oy + h - 34, "C1", C.dim, 12, "middle", 700);
      s += txt(x(c2), oy + h - 34, "C2", C.ink, 12, "middle", 700);
      if (cs.c3) s += txt(x(c2 + 1), oy + h - 34, "C3", C.dn, 12, "middle", 700);
      s += ring(x(c2), y(bars[c2][2]) + 14 * FS, 9 * FS, cs.ok ? C.gold : C.dn, 2);
      /* the seconds strip */
      var sx0 = ox, sx1 = ox + w, sy = oy + h - 14;
      s += rect(sx0, sy - 4, sx1 - sx0, 8, "#3a3a3c", 1, null, 4);
      s += rect(sx0, sy - 4, (sx1 - sx0) * 15 / 60, 8, C.up, 0.45, null, 4);
      s += dot(sx0 + (sx1 - sx0) * cs.sec / 60, sy, 6 * FS, cs.sec <= 15 ? C.gold : C.dn);
      s += txt(sx1, sy - 9, "wick " + cs.deep + "% · 0:" + ("0" + cs.sec).slice(-2), cs.sec <= 15 && cs.deep <= 20 ? C.gold : C.dn, 11.5, "end", 700);
      return s;
    }
    var narrow = null;
    function draw() {
      var nw = svg.clientWidth > 0 && svg.clientWidth < 600;
      if (nw === narrow) return; narrow = nw;
      FS = nw ? 1.15 : 1;
      var W = nw ? 440 : 1180, H = nw ? 1240 : 330, s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      CASES.forEach(function (cs, i) {
        if (nw) s += panel(cs, 24, 20 + i * 302, 392, 280);
        else s += panel(cs, 24 + i * 290, 20, 262, 290);
      });
      s += txt(W - 8, H - 4, "Illustrative · made-up bars", C.faint, 11, "end");
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.innerHTML = s;
      FS = 1;
    }
    draw();
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
  })();

  /* =====================================================================
     4. Grade the wick, then size it
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-lr-wick]");
    if (!root) return;
    var ins = {}, out = root.querySelector(".lr-wout"), calc = root.querySelector(".lr-wcalc"), unit = root.querySelector("[data-unit]");
    root.querySelectorAll("input,select").forEach(function (el) { ins[el.name] = el; });
    /* the early window by time frame, as the video gives it */
    var TF = { m1: { win: 15, u: "seconds", say: "the first 10–15 seconds" }, m5: { win: 60, u: "seconds", say: "about the first minute" },
               m15: { win: 2, u: "minutes", say: "the first couple of minutes" }, d1: { win: 4, u: "hours", say: "the first few hours" } };
    function num(k) { var v = parseFloat(ins[k].value); return isFinite(v) ? v : NaN; }
    function row(k, v, cls) { return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + k + "</span><b>" + v + "</b></div>"; }
    function run() {
      var tf = TF[ins.tf.value] || TF.m1, lng = ins.side.value !== "short";
      if (unit) unit.textContent = tf.u;
      var hi = num("hi"), lo = num("lo"), wk = num("wick"), when = num("when"), tick = num("tick"), buf = num("buf"), pv = num("pv"), risk = num("risk");
      if (![hi, lo, wk, when].every(isFinite) || hi <= lo) { out.className = "chk-out lr-wout"; out.innerHTML = "<b>&mdash;</b><p>Type C1's high and low, C2's wick, and when the wick was done.</p>"; calc.innerHTML = ""; return; }
      var rng = hi - lo, depth = lng ? (hi - wk) / rng * 100 : (wk - lo) / rng * 100, early = when <= tf.win, cls, head, body;
      if (depth < 0) { cls = "is-no"; head = "That wick isn't inside C1"; body = lng ? "For a long, C2's wick (its low) should be at or under C1's high." : "For a short, C2's wick (its high) should be at or over C1's low."; }
      else if (depth > 50) { cls = "is-no"; head = Math.round(depth) + "% deep · skip it"; body = "The early move went past C1's halfway point. The sellers weren't simply absorbed, and the stop past that wick throws off the whole risk-reward."; }
      else if (!early) { cls = "is-no"; head = "Late wick · no trade"; body = "The wick should form in " + tf.say + " of C2, quickly, then get absorbed. A wick that shows up later in the candle doesn't count."; }
      else if (depth <= 20) { cls = "is-a"; head = Math.round(depth) + "% deep, early · take the break"; body = "Quick, shallow and early: buyers (sellers, short) were lined up much closer than before and absorbed it right away. " + (depth <= 5 ? "Inside the top 5% is even stronger. " : "") + "Take it when price crosses C1's " + (lng ? "high." : "low."); }
      else { cls = "is-b"; head = Math.round(depth) + "% deep · check the risk-reward"; body = "Not the 10–20% you'd like, but under 50%. The live trade in the video had a wick around 30–35% and was taken because it was very quick. Make sure there's still room for at least 1:2."; }
      out.className = "chk-out lr-wout " + cls;
      out.innerHTML = "<b>" + head + "</b><p>" + body + "</p>";
      if (!isFinite(tick) || tick <= 0) tick = 0.25;
      if (!isFinite(buf) || buf < 0) buf = 0;
      var entry = lng ? hi + tick : lo - tick, stop = lng ? wk - buf * tick : wk + buf * tick, r = Math.abs(entry - stop);
      var dec = tick < 0.01 ? 4 : 2, fx = function (v) { return v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
      var html = row("Entry, a tick past C1's " + (lng ? "high" : "low"), fx(entry));
      html += row("Stop, " + buf + " tick" + (buf === 1 ? "" : "s") + " past the wick", fx(stop));
      html += row("Risk, in points", fx(r));
      if (isFinite(pv) && pv > 0 && isFinite(risk) && risk > 0 && r > 0) {
        var per = r * pv, q = Math.floor(risk / per);
        html += row("Risk per contract", "$" + per.toLocaleString("en-US", { maximumFractionDigits: 2 }));
        html += row("Contracts for $" + risk.toLocaleString("en-US"), q > 0 ? q : "0, the stop is too far for the risk");
      }
      html += row("2R", fx(lng ? entry + 2 * r : entry - 2 * r));
      html += row("3R", fx(lng ? entry + 3 * r : entry - 3 * r), "tot");
      calc.innerHTML = html;
    }
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    run();
  })();

  /* =====================================================================
     5. The second chance: daily C1/C2, and C2 on the 1-hour chart
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-lr-retest]");
    if (!root) return;
    var svg = root.querySelector("svg");
    var DAY = [[404.0, 405.6, 401.8, 402.6], [402.6, 404.4, 400.9, 403.7], [403.7, 404.1, 400.6, 401.4], [401.4, 403.5, 400.2, 402.9], [402.9, 403.3, 399.8, 400.5],
               [400.5, 402.8, 399.4, 402.1], [402.1, 402.5, 398.6, 400.0], [400.0, 433.0, 398.0, 432.0], [432.0, 444.0, 428.5, 442.0]];
    var HR = [[432.0, 432.4, 430.6, 430.9], [430.9, 431.2, 429.4, 429.7], [429.7, 430.0, 428.5, 428.9], [428.9, 430.3, 428.7, 430.1], [430.1, 431.9, 429.9, 431.6],
              [431.6, 433.0, 431.3, 432.8], [432.8, 434.6, 432.5, 434.3], [434.3, 437.2, 434.0, 436.8], [436.8, 437.4, 435.1, 435.4], [435.4, 435.7, 433.4, 433.7],
              [433.7, 434.0, 431.6, 432.4], [432.4, 434.8, 432.2, 434.5], [434.5, 437.6, 434.3, 437.3], [437.3, 439.9, 437.0, 439.6], [439.6, 442.2, 439.2, 441.8], [441.8, 444.0, 441.0, 442.0]];
    var OPEN2 = 432.0, LOW2 = 428.5, HI1 = 433.0, E1 = 433.25, S1 = 428.25, RT = 10, E2 = HR[RT][3], S2 = 431.35;
    function draw() {
      var nw = svg.clientWidth > 0 && svg.clientWidth < 600;
      FS = nw ? 1.15 : 1;
      var W = nw ? 440 : 1180, H = nw ? 940 : 400, s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      /* left: the daily */
      var a = nw ? { x: 24, y: 24, w: 392, h: 260 } : { x: 28, y: 28, w: 300, h: 340 };
      (function () {
        var n = DAY.length, dx = a.w / n, wb = dx * 0.56, pmin = 396, pmax = 446;
        function x(i) { return a.x + dx * (i + 0.5); }
        function y(p) { return a.y + 34 + (a.h - 60) * (1 - (p - pmin) / (pmax - pmin)); }
        s += txt(a.x, a.y + 4, "Daily", C.ink, 15, "start", 700);
        s += txt(a.x, a.y + 22 * FS, "C1 out of compression, C2's wick 13% deep", C.dim, 12);
        DAY.forEach(function (b, i) { s += candle(x(i), y, b, 1, wb); });
        s += hl(x(7) - dx * 0.5, a.x + a.w, y(HI1), C.dim, "3 3", 1.2);
        s += rect(x(8) - dx * 0.5, y(444) - 4, dx, y(428.5) - y(444) + 8, C.gold, 0.12, C.gold, 4);
        s += txt(x(7), y(398) + 18 * FS, "C1", C.dim, 12, "middle", 700) + txt(x(8), y(398) + 18 * FS, "C2", C.gold, 12, "middle", 700);
        s += txt(x(8) - dx * 0.8, y(444) - 10, "zoom in →", C.gold, 12, "end", 600);
      })();
      /* right: the same C2 on the 1-hour */
      var b = nw ? { x: 24, y: 320, w: 392, h: 470 } : { x: 400, y: 28, w: 590, h: 340 };
      (function () {
        var n = HR.length, dx = b.w / n, wb = dx * 0.56, pmin = 427.4, pmax = 445.0, xr = b.x + b.w;
        function x(i) { return b.x + dx * (i + 0.5); }
        function y(p) { return b.y + 34 + (b.h - 50) * (1 - (p - pmin) / (pmax - pmin)); }
        s += txt(b.x, b.y + 4, "C2 on the 1-hour chart", C.gold, 15, "start", 700);
        s += txt(b.x, b.y + 22 * FS, nw ? "Four hours of sell-off, the flip, the retest" : "Four hours of sell-off, the flip, the break, then a retest of the open", C.dim, 12);
        s += rect(x(0) - dx * 0.5, y(432.4) - 4, dx * 4, y(LOW2) - y(432.4) + 10, C.gold, 0.1, null, 4);
        s += hl(x(0) - dx * 0.5, xr, y(OPEN2), C.ink, "5 4", 1.3, 0.8);
        s += hl(x(0) - dx * 0.5, xr, y(LOW2), C.dn, "5 4", 1.3, 0.9);
        s += hl(x(5) - dx * 0.5, xr, y(HI1), C.dim, "2 3", 1.1, 0.8);
        HR.forEach(function (bb, i) { s += candle(x(i), y, bb, 1, wb); });
        s += tri(x(6) - dx * 0.7, y(E1), true, C.up, 10 * FS);
        s += tri(x(RT) + dx * 0.7, y(E2), true, C.cyan, 10 * FS);
        s += ring(x(RT), y(HR[RT][2]), 10 * FS, C.cyan, 2);
        s += hl(x(RT) - dx * 0.5, x(RT + 3), y(S2), C.cyan, "4 3", 1.6);
        var tx = xr + 8;
        if (nw) {
          var ly = b.y + b.h + 8;
          s += txt(b.x, ly, "White line: C2 open " + f2(OPEN2), C.ink, 12, "start", 600);
          s += txt(b.x, ly + 20 * FS, "Red line: C2's low " + f2(LOW2) + " · must hold", C.dn, 12, "start", 700);
          s += txt(b.x, ly + 40 * FS, "1st entry " + f2(E1) + ", stop " + f2(S1) + " (" + f2(E1 - S1) + ")", C.up, 12, "start", 700);
          s += txt(b.x, ly + 60 * FS, "Retest closes back over the open:", C.cyan, 12, "start", 700);
          s += txt(b.x, ly + 80 * FS, "2nd entry " + f2(E2) + ", stop " + f2(S2) + " (" + f2(E2 - S2) + ")", C.cyan, 12, "start", 700);
        } else {
          s += txt(tx, y(OPEN2) + 4, "C2 open " + f2(OPEN2), C.ink, 12, "start", 600);
          s += txt(tx, y(LOW2) + 4, "C2 low " + f2(LOW2) + " · must hold", C.dn, 12, "start", 700);
          s += txt(tx, y(HI1) - 6, "C1 high " + f2(HI1), C.dim, 12, "start", 600);
          s += txt(x(6) + dx * 0.2, y(437.6) - 26, "1st entry " + f2(E1) + " · stop " + f2(S1) + " · risk " + f2(E1 - S1), C.up, 12, "middle", 700);
          s += txt(x(RT), y(HR[RT][2]) + 30, "retest of the open, closes back over it", C.cyan, 12, "middle", 700);
          s += txt(x(RT), y(HR[RT][2]) + 48, "2nd entry " + f2(E2) + " · stop " + f2(S2) + " · risk " + f2(E2 - S2), C.cyan, 12, "middle", 700);
        }
      })();
      s += txt(W - 8, H - 6, "Illustrative · made-up bars", C.faint, 11, "end");
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.innerHTML = s;
      FS = 1;
    }
    draw();
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
  })();

  /* =====================================================================
     6. The six steps as a stepper, with a small chart of the walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-lr-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 6) return;
    var INFO = [
      { k: "Compression", c: C.teal,  tag: "Find · a quiet, low-volatility stretch" },
      { k: "C1",          c: C.up,    tag: "Spot · a relatively big candle" },
      { k: "C2's wick",   c: C.gold,  tag: "Watch · the first seconds of the next candle" },
      { k: "The entry",   c: C.ink,   tag: "Execute · the break of C1's high or low" },
      { k: "The stop",    c: C.dn,    tag: "Risk · just past C2's wick" },
      { k: "The exit",    c: C.cyan,  tag: "Manage · three or four candles, then out" }
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
    fig.innerHTML = '<svg viewBox="0 0 560 320" role="img" aria-label="The walkthrough on 1-minute bars, with the current step highlighted"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    var xa = 18, xb = 440, yt = 44, yb = 290, PMN = 21481, PMX = 21533;
    var dx = (xb - xa) / N, wb = Math.max(4, dx * 0.56);
    function X(i) { return xa + dx * (i + 0.5); }
    function Y(p) { return yb - (p - PMN) / (PMX - PMN) * (yb - yt); }
    var SF = 1;
    function t(x, y, s, col, anchor, w) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + (13 * SF).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' + (w ? ' font-weight="' + w + '"' : "") + ">" + s + "</text>"; }

    function chart(k) {
      var c = INFO[k].c, s = "";
      s += t(xa, 22, "1-minute · the walkthrough", C.faint);
      if (k === 0) s += rect(X(0) - dx * 0.5, Y(21497.5), dx * 12, Y(21483.5) - Y(21497.5), C.teal, 0.12, null, 5);
      if (k === 1 || k === 2) {
        s += rect(X(C1) - dx * 0.5, Y(C1H), dx * 2, Y(TOP20) - Y(C1H), C.up, 0.16);
        s += hl(X(C1) - dx * 0.5, X(C2) + dx * 0.5, Y(MID), C.dn, "4 4", 1.3);
      }
      BARS.forEach(function (b, i) {
        var lit = k === 0 ? i <= 11 : k === 1 ? i === C1 || i <= 11 : k === 2 ? i === C1 || i === C2 : k === 3 || k === 4 ? i >= C1 && i <= C2 : i >= C2 && i <= OPP;
        s += candle(X(i), Y, b, 1, wb, lit ? 1 : 0.28);
      });
      if (k === 0) {
        s += ln(X(0), Y(tlAt(0)) - 3, X(11), Y(tlAt(11)) - 3, C.dim, "5 4", 1.3);
        s += t(X(0), Y(21483.5) + 18, "small candles, lower highs", c, "start", 700);
      }
      if (k === 1) {
        s += ln(X(0), Y(tlAt(0)) - 3, X(C1 + 0.6), Y(tlAt(C1 + 0.6)) - 3, C.dim, "5 4", 1.3);
        s += t(X(C1) + 12, Y(C1H) - 8, "C1 · " + BIG.toFixed(0) + "× the quiet range", c, "end", 700);
        s += t(X(C1) + 12, Y(C1L) + 18, "closes near its high", C.dim, "end", 600);
      }
      if (k === 2) {
        s += ring(X(C2), Y(WICK), 10, C.gold, 2.2);
        s += t(X(C2) + 14, Y(WICK) + 22, "wick " + Math.round(WICK_PCT) + "% deep, by 0:12", c, "start", 700);
        s += t(X(C2) + 14, Y(MID) + 4, "never past 50%", C.dn, "start", 600);
        s += t(X(C2) + 14, Y(TOP20) - 30, "top 20%", C.up, "start", 600);
      }
      if (k === 3) {
        s += tri(X(C2) - dx * 0.75, Y(ENTRY), true, C.up, 10);
        s += hl(X(C1) - dx * 0.5, xb, Y(C1H), C.ink, null, 1.6);
        s += t(xb, Y(C1H) - 8, "buy " + px(ENTRY) + ", a tick over C1's high", c, "end", 700);
      }
      if (k === 4) {
        s += hl(X(C2) - dx * 0.5, xb, Y(ENTRY), C.ink, null, 1.3);
        s += hl(X(C2) - dx * 0.5, xb, Y(STOP), C.dn, "5 4", 2);
        s += t(xb, Y(STOP) + 18, "stop " + px(STOP) + " · " + f2(RISK) + " pts", c, "end", 700);
        s += t(xb, Y(C1L) + 2, "vs " + f2(WIDE_RISK) + " under C1's low", C.faint, "end", 600);
      }
      if (k === 5) {
        for (var i = C2; i <= OUT; i++) s += t(X(i), Y(BARS[i][1]) - 8, String(i - C2 + 1), C.up, "middle", 700);
        s += tri(X(OUT) + dx * 0.75, Y(EXIT), false, c, 10);
        s += t(xb, Y(EXIT) - 30, "out " + px(EXIT) + " · " + R_MULT.toFixed(1) + "R", c, "end", 700);
        s += t(X(OPP), Y(BARS[OPP][2]) + 18, "red: over", C.dn, "middle", 700);
      }
      s += t(xa, 314, "Illustrative · made-up bars", C.faint);
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

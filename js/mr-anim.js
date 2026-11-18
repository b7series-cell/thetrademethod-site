/* =====================================================================
   mr-anim.js — the animations on the Micro Range page.

   1. [data-mr-anim]   one long, start to finish, on 1-minute bars of a
      made-up ES session, in eight stages: the map (one time framing up)
      → the first breakout (price, not value: skip it) → the micro range
      (the range after the range) → plan A (the flush under the micro
      range low gets absorbed, buy the reclaim) → plan B (aggressive
      buying breaks the micro range high) → old value is a trampoline
      → the wall at the next zone (out) → the math.
   2. [data-mr-steps]  the six steps as a click-through stepper with a
      small chart per step.
   3. [data-mr-value]  price vs value: a news spike given straight back,
      and value migrating higher range by range.
   4. [data-mr-otf]    the one time framing checker (strict: high, low
      and close).
   5. [data-mr-two]    the failed auction in balance, two flavors: the
      V-shape reversal and the slow burn.
   6. [data-mr-calc]   plan A + plan B: split the risk.

   The balance value area is computed here from the bars (1-point rows,
   70% of volume), so the numbers the page prints come from the same
   bars. Everything is scripted and labelled "Illustrative". No market
   data.
   ===================================================================== */


(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#22d3ee", gold: "#f4b942", orange: "#ff9f0a", purple: "#bf5af2", teal: "#64d2ff", pink: "#ff6fb5",
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
  function bubble(x, y, r, col, op, label) {
    if (op != null && op <= 0) return "";
    var o = op == null ? 1 : op;
    return '<g opacity="' + o.toFixed(3) + '"><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + col + '" fill-opacity="0.32" stroke="' + col + '" stroke-width="1.6"/>' +
      (label ? txt(x, y + 4 * FS, label, C.ink, 11, "middle", 700) : "") + "</g>";
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
  /* a candle drawn as far as `prog` (0..1): o → l → h → c (green) or o → h → l → c (red), or b.path */
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
  function hhmm(i) { var m = 30 + 2 * i, h = 9 + Math.floor(m / 60); return h + ":" + ("0" + (m % 60)).slice(-2); }

  function hm(i) { var m = 30 + i, h = 9 + Math.floor(m / 60); return h + ":" + ("0" + (m % 60)).slice(-2); }
  function isNarrow(el, below) { return el.clientWidth > 0 && el.clientWidth < (below || 560); }

  /* ---------------------------------------------------------------------
     The bars: a made-up ES session on 1-minute bars from 9:30, tick 0.25.
     [o, h, l, c, volume (relative)].
     0–13 balance · 14–15 the first breakout (price, not value) ·
     16–24 the micro range · 25 the flush · 26 the reclaim (plan A) ·
     27–28 back to the top · 29 the break (plan B) · 30–34 the run and
     new value · 35 the pullback to old value · 36 the trampoline ·
     37–38 the run to the next zone · 39 the wall (out) · 40 rotation.
     --------------------------------------------------------------------- */
  var BARS = [
    [7392, 7397, 7389, 7395, 6], [7395, 7399, 7391, 7393, 5], [7393, 7396, 7386, 7388, 5], [7388, 7392, 7384.5, 7390, 5],
    [7390, 7395, 7388, 7394, 4.5], [7394, 7399.5, 7392, 7397, 4.5], [7397, 7398, 7390, 7391, 4], [7391, 7393, 7386, 7389, 4],
    [7389, 7394, 7387, 7393, 4], [7393, 7397, 7391, 7395, 4], [7395, 7396, 7389, 7390, 3.5], [7390, 7393, 7387, 7392, 3.5],
    [7392, 7397, 7390, 7396, 3.5], [7396, 7399, 7394, 7398, 4],
    /* the first breakout */
    [7398, 7409, 7397.5, 7408, 8], [7408, 7413, 7404, 7406, 7],
    /* the micro range */
    [7406, 7409, 7403.5, 7404.5, 5], [7404.5, 7408, 7403.75, 7407.5, 4.5], [7407.5, 7410, 7406, 7406.5, 4.5], [7406.5, 7408.5, 7404, 7405, 4],
    [7405, 7409.5, 7404.5, 7409, 4], [7409, 7410, 7406.5, 7407, 4], [7407, 7408, 7404.25, 7405.5, 4], [7405.5, 7409, 7405, 7408, 3.8],
    [7408, 7409.75, 7405, 7405.5, 4],
    /* plan A: the flush and the reclaim */
    [7405.5, 7406, 7400.5, 7402, 7], [7402, 7406.5, 7401, 7406, 7.5],
    [7406, 7409, 7405.5, 7408.5, 5], [7408.5, 7409.75, 7407, 7409.25, 4.5],
    /* plan B: the break */
    [7409.25, 7415, 7409, 7414.5, 9],
    /* the run, new value */
    [7414.5, 7418, 7413, 7417, 7], [7417, 7421, 7416, 7420.5, 6.5], [7420.5, 7422, 7417.5, 7418.5, 5], [7418.5, 7421, 7417, 7420, 4.5],
    [7420, 7421.5, 7416, 7417, 4.5],
    /* the pullback to old value, the trampoline */
    [7417, 7417.5, 7411, 7412, 6], [7412, 7418, 7410.75, 7417.5, 7],
    /* the next zone, the wall */
    [7417.5, 7424, 7417, 7423.5, 7], [7423.5, 7429, 7423, 7428, 7.5], [7428, 7430.5, 7426, 7427, 6.5], [7427, 7428, 7422, 7423, 6]
  ];
  var N = BARS.length, TICK = 0.25, ROW = 1;
  var BAL = 14, BRK = 14, SPK = 15, MR0 = 16, MR1 = 24, FLUSH = 25, RECL = 26, BREAK = 29, RUN0 = 30, PULL = 35, TRAMP = 36, WALL = 39;
  BARS[RECL].path = [[0, 7402], [0.2, 7401], [0.55, 7403.75], [0.85, 7406.5], [1, 7406]];
  BARS[BREAK].path = [[0, 7409.25], [0.15, 7409], [0.4, 7410.25], [0.85, 7415], [1, 7414.5]];
  BARS[WALL].path = [[0, 7428], [0.3, 7430.5], [0.7, 7426], [1, 7427]];

  /* the volume profile of bars [a..b): 1-point rows, volume spread evenly over each bar's range */
  function profile(a, b) {
    var m = {}, i, k;
    for (i = a; i < b; i++) {
      var r = BARS[i], lo = Math.floor(r[2] / ROW), hi = Math.floor((r[1] - 1e-9) / ROW), cnt = hi - lo + 1;
      for (k = lo; k <= hi; k++) m[k] = (m[k] || 0) + r[4] / cnt;
    }
    var ks = Object.keys(m).map(Number).sort(function (x, y) { return x - y; }), tot = 0, poc = ks[0];
    ks.forEach(function (q) { tot += m[q]; if (m[q] > m[poc]) poc = q; });
    var lo2 = poc, hi2 = poc, acc = m[poc];
    while (acc < 0.7 * tot) {
      var up = m[hi2 + 1] || 0, dn = m[lo2 - 1] || 0;
      if (!up && !dn) break;
      if (up >= dn) { hi2++; acc += up; } else { lo2--; acc += dn; }
    }
    return { rows: m, keys: ks, poc: poc * ROW + ROW / 2, vah: (hi2 + 1) * ROW, val: lo2 * ROW, max: m[poc] };
  }
  var VA = profile(0, BAL), VAH = VA.vah, VAL = VA.val, POC = VA.poc;
  var MRH = -1e9, MRL = 1e9;
  for (var q0 = MR0; q0 <= MR1; q0++) { MRH = Math.max(MRH, BARS[q0][1]); MRL = Math.min(MRL, BARS[q0][2]); }
  var SPIKE = BARS[SPK][1], FLOW = BARS[FLUSH][2];
  var A_IN = MRL + TICK, A_STOP = FLOW - TICK, A_RISK = A_IN - A_STOP;
  var B_IN = MRH + TICK, B_STOP = 7407.25, B_RISK = B_IN - B_STOP;
  var ZONE_LO = 7426, ZONE_HI = 7431, EXIT = 7428;
  var A_R = (EXIT - A_IN) / A_RISK, B_R = (EXIT - B_IN) / B_RISK;
  /* big trades: [bar, price, lots, buyer?] */
  var PRINTS = [[FLUSH, 7403, 60, false], [FLUSH, 7401.5, 85, false], [RECL, 7402, 70, true], [RECL, 7404.5, 95, true],
                [BREAK, 7410.5, 120, true], [BREAK, 7412.5, 90, true], [PULL, 7412.5, 55, false], [TRAMP, 7411.5, 80, true]];
  var WALLP = [[WALL, 7430, 140], [WALL, 7429, 110], [WALL - 1, 7428.5, 90]];

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-mr-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;

    var STAGES = [
      { at: 0,    title: "The map: one time framing up", text: "Before the open the weekly and daily bars are making higher highs, higher lows and higher closes. Buyers control the auction, so momentum is on the menu today. Intraday the market is in balance: value from " + px(VAL) + " to " + px(VAH) + ", point of control " + px(POC) + "." },
      { at: 4.6,  title: "The first breakout: price, not value", text: "A burst over the value area high to " + px(SPIKE) + ". It looks like the start of the trend. It's only price. Nobody has agreed it's fair yet, and most breakouts from balance fail. You do not buy it." },
      { at: 6.8,  title: "The micro range: the range after the range", text: "Instead of falling back in, price goes sideways above the old value: " + px(MRL) + " to " + px(MRH) + ". Buyers and sellers are doing business up here. That's acceptance, value being built, and it's the filter for the breakout." },
      { at: 10.2, title: "Plan A: the flush gets absorbed", text: "Aggressive sellers hit the bid under the micro range low (red bubbles), down to " + px(FLOW) + ". They get absorbed, big buyers fire the other way, and price reclaims the low. Buy half at " + px(A_IN) + ", stop " + px(A_STOP) + " under those aggressive buyers. " + f2(A_RISK) + " points of risk." },
      { at: 12.6, title: "Plan B: trust this breakout", text: "Back at the top of the micro range, aggressive buying lifts through " + px(MRH) + " with big blue bubbles. This is the breakout he trusts: it's coming out of value, not out of nothing. The other half goes in at " + px(B_IN) + ", stop " + px(B_STOP) + " back inside the range. Plan A's stop moves to entry." },
      { at: 15.0, title: "Old value is a trampoline", text: "New value starts to build higher. Sellers try a pullback into the micro range top and get absorbed at " + px(BARS[TRAMP][2]) + ". In balance old value is a magnet. In an imbalance it should be a launching pad, and it is." },
      { at: 18.8, title: "The wall: the buyers run out", text: "At the next zone, " + px(ZONE_LO) + " to " + px(ZONE_HI) + ", buyers keep lifting the offer and passive sellers keep filling them. That's someone big taking profit into strength. Out at " + px(EXIT) + " before the rotation." },
      { at: 21.4, title: "Regime, then value, then the trigger", text: "Plan A: +" + f2(EXIT - A_IN) + " points, " + A_R.toFixed(1) + "R. Plan B: +" + f2(EXIT - B_IN) + ", " + B_R.toFixed(1) + "R. Same risk split between them. A made-up best case; on most days only one of the two plans fills, and some days neither." }
    ];
    var TB = [];
    function segT(a, b, t0, step, dur) { for (var i = a; i <= b; i++) TB[i] = [t0 + (i - a) * step, t0 + (i - a) * step + dur]; }
    segT(0, BAL - 1, 0.3, 0.3, 0.24);
    TB[BRK] = [4.8, 5.4]; TB[SPK] = [5.6, 6.2];
    segT(MR0, MR1, 7.0, 0.32, 0.26);
    TB[FLUSH] = [10.4, 11.0]; TB[RECL] = [11.2, 12.2];
    TB[27] = [12.8, 13.2]; TB[28] = [13.4, 13.8]; TB[BREAK] = [14.0, 14.8];
    segT(RUN0, 34, 15.2, 0.36, 0.28);
    TB[PULL] = [17.2, 17.7]; TB[TRAMP] = [17.9, 18.5];
    TB[37] = [19.0, 19.4]; TB[38] = [19.6, 20.0]; TB[WALL] = [20.2, 20.9]; TB[40] = [21.0, 21.3];
    var END = 23.2;
    var T_A = TB[RECL][0] + 0.55 * (TB[RECL][1] - TB[RECL][0]);
    var T_B = TB[BREAK][0] + 0.4 * (TB[BREAK][1] - TB[BREAK][0]);
    var T_X = TB[WALL][1];
    function prog(i, T) { return clamp01((T - TB[i][0]) / (TB[i][1] - TB[i][0])); }
    function done(T) { var k = 0; for (var i = 0; i < N; i++) if (prog(i, T) >= 1) k = i + 1; return k; }

    function size(n) {
      return n ? { W: 440, H: 840, x0: 10, x1: 256, px0: 260, px1: 300, yt: 196, yb: 760, xTag: 304, cx: 12, cy: 14 }
               : { W: 1180, H: 640, x0: 24, x1: 830, px0: 842, px1: 1000, yt: 140, yb: 590, xTag: 1010, cx: 24, cy: 14 };
    }
    var PMIN = 7381, PMAX = 7442;

    function frame(T, L) {
      var s = "", i;
      var dx = (L.x1 - L.x0) / N, wB = Math.max(4, dx * 0.58);
      function x(i) { return L.x0 + dx * (i + 0.5); }
      function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
      s += txt(L.x0, L.yt - 14 * FS, "1-minute · a made-up ES session", C.faint, 12);
      [0, 15, 30].forEach(function (i) { s += txt(x(i), L.yb + 22 * FS, hm(i), C.faint, 11.5, "middle"); });

      /* the map badge */
      var mo = fade(T, 0.3, 0.3);
      s += tag(L.narrow ? L.x0 : L.x0 + 290, L.narrow ? L.yt - 44 * FS : L.yt - 18, L.narrow ? "map: one time framing up" : "weekly + daily: one time framing up", C.up, mo * (T < 21.4 ? 1 : 0.6));

      /* the balance value area */
      var vo = fade(T, 2.0, 0.5);
      if (vo > 0) {
        var vx1 = L.x1;
        s += rect(L.x0, y(VAH), x(BAL - 1) + dx / 2 - L.x0, y(VAL) - y(VAH), C.purple, 0.1 * vo);
        s += hl(L.x0, vx1, y(VAH), C.purple, "6 4", 1.6, vo * 0.9);
        s += hl(L.x0, vx1, y(VAL), C.purple, "6 4", 1.6, vo * 0.9);
        s += hl(L.x0, x(BAL - 1) + dx / 2, y(POC), C.gold, "4 4", 1.3, vo * 0.8);
        s += tag(L.xTag, y(VAH), "VAH " + px(VAH), C.purple, vo, C.ink);
        s += tag(L.xTag, y(VAL), "VAL " + px(VAL), C.purple, vo, C.ink);
        if (!L.narrow) s += txt(L.x0 + 6, y(VAL) + 18, "balance · value area", C.purple, 11.5, "start", 600, vo);
      }

      /* the first breakout: price, not value */
      var bo = fade(T, 5.8, 0.3) * (1 - fade(T, 10.2, 0.4));
      s += txt(x(SPK), y(SPIKE) - 14 * FS, L.narrow ? "price, not value" : "price, not value · don't buy it", C.dn, 12.5, "middle", 700, bo);
      if (bo > 0) s += ln(x(SPK) - dx * 1.6, y(SPIKE) + 6, x(SPK) + dx * 1.6, y(SPIKE) - 26, C.dn, null, 2, bo * 0.8);

      /* the micro range box */
      var mo2 = fade(T, 9.0, 0.5);
      if (mo2 > 0) {
        var xr0 = x(MR0) - dx / 2, xr1 = T < 12.6 ? x(Math.min(N - 1, Math.max(MR1, done(T) - 1))) + dx / 2 : x(BREAK) - dx / 2;
        s += rect(xr0, y(MRH), xr1 - xr0, y(MRL) - y(MRH), C.orange, 0.13 * mo2, C.orange);
        s += txt(xr0 + 4, y(MRH) - 8, "micro range", C.orange, 11.5, "start", 700, mo2 * (1 - fade(T, 14.0, 0.3)));
        var ext = fade(T, 15.0, 0.4);
        if (ext > 0) s += hl(x(BREAK) - dx / 2, L.x1, y(MRH), C.orange, "3 4", 1.4, ext * 0.8);
        s += tag(L.xTag, y(MRH) - 2, "MR high " + px(MRH), C.orange, mo2 * (1 - fade(T, 21.4, 0.3) * 0.6));
        s += tag(L.xTag, y(MRL) + 4 * FS, "MR low " + px(MRL), C.orange, mo2 * (1 - fade(T, T_A - 0.3, 0.3)));
      }

      /* the next zone */
      var zo = fade(T, 18.6, 0.4);
      if (zo > 0) {
        s += rect(L.x0, y(ZONE_HI), L.x1 - L.x0, y(ZONE_LO) - y(ZONE_HI), C.dn, 0.12 * zo);
        s += txt(L.x0 + 6, y(ZONE_HI) - 6, L.narrow ? "next zone" : "next zone · last week's high-volume node", C.dn, 11.5, "start", 600, zo);
      }

      /* the profile wall */
      var k = done(T);
      if (k > 0) {
        var pr = profile(0, k), pw = L.px1 - L.px0;
        s += txt(L.px0, L.yt - 14 * FS, L.narrow ? "profile" : "volume profile", C.faint, 11.5, "start");
        pr.keys.forEach(function (q) {
          var p0 = q * ROW, inBal = p0 >= VAL && p0 < VAH, inMR = p0 >= Math.floor(MRL) && p0 < MRH;
          var w = pw * pr.rows[q] / pr.max;
          s += rect(L.px0, y(p0 + ROW) + 0.5, w, Math.max(1, y(p0) - y(p0 + ROW) - 1), inBal ? C.purple : (inMR && k > MR1) ? C.orange : "#48484a", 0.5);
        });
      }

      /* candles */
      for (i = 0; i < N; i++) {
        var p = prog(i, T);
        if (p <= 0) continue;
        s += candle(x(i), y, BARS[i], p, wB, T >= 21.4 && (i < MR0 || i > WALL) ? 0.45 : 1);
      }

      /* big trades */
      PRINTS.forEach(function (q) {
        var t0 = TB[q[0]][0] + (q[0] === RECL ? 0.35 : q[0] === BREAK ? 0.3 : 0.2);
        var o = fade(T, t0, 0.3) * (1 - fade(T, q[0] < 30 ? 15.0 : 18.8, 0.4));
        var r = (5 + q[2] / 14) * (L.narrow ? 0.8 : 1);
        s += bubble(x(q[0]) + (q[3] ? dx * 0.6 : -dx * 0.6), y(q[1]), r, q[3] ? C.blue : C.dn, o, L.narrow ? null : String(q[2]));
      });
      WALLP.forEach(function (q) {
        var o = fade(T, TB[q[0]][0] + 0.2, 0.3) * (1 - fade(T, 21.4, 0.4));
        s += rect(x(q[0]) + dx * 0.4, y(q[1]) - 3, (q[2] / 140) * dx * 2.6, 6, C.dn, 0.75 * o);
      });
      if (!L.narrow) s += txt(x(WALL) - dx * 1.6, y(7430.5) - 10, "passive sellers fill every lift", C.dn, 11.5, "end", 700, fade(T, 20.4, 0.3) * (1 - fade(T, 21.4, 0.3)));

      /* entries, stops, exit */
      var ao = fade(T, T_A, 0.25);
      if (ao > 0) {
        var aStop = T < T_B ? A_STOP : A_IN;
        s += tri(x(RECL) - dx * 0.9, y(A_IN), true, C.up, 11 * FS, ao);
        s += hl(x(RECL) - dx * 0.5, T >= T_X ? x(WALL) : L.x1, y(A_IN), C.ink, null, 1.3, ao * (T >= 21.4 ? 0.5 : 0.9));
        s += tag(L.xTag, y(A_IN), "A " + px(A_IN), C.up, ao * (1 - fade(T, 15, 0.3)));
        s += hl(x(RECL) - dx * 0.5, L.x1, y(aStop), C.dn, "5 4", 1.6, ao * (1 - fade(T, T_X, 0.3)) * (T < T_B ? 1 : 0.6));
        s += tag(L.xTag, y(A_STOP) + 2, "stop " + px(A_STOP), C.dn, ao * (1 - fade(T, T_B, 0.3)));
        if (!L.narrow) s += txt(x(RECL) + dx * 1.4, y(A_IN) + 4, "plan A · reclaim", C.up, 12, "start", 700, ao * (1 - fade(T, 15, 0.3)));
      }
      var bo2 = fade(T, T_B, 0.25);
      if (bo2 > 0) {
        s += tri(x(BREAK) - dx * 0.9, y(B_IN), true, C.blue, 11 * FS, bo2);
        s += hl(x(BREAK) - dx * 0.5, L.x1, y(B_STOP), C.dn, "5 4", 1.4, bo2 * (1 - fade(T, T_X, 0.3)) * 0.8);
        s += tag(L.xTag, y(MRH) - 24 * FS, "B " + px(B_IN), C.blue, bo2 * (1 - fade(T, 18.8, 0.3)));
        if (!L.narrow) s += txt(x(BREAK) - dx * 1.3, y(MRH + 6), "plan B · break", C.blue, 12, "end", 700, bo2 * (1 - fade(T, 15.2, 0.3)));
      }
      var to = fade(T, TB[TRAMP][0] + 0.3, 0.3) * (1 - fade(T, 21.4, 0.3));
      if (to > 0) { s += ring(x(TRAMP), y(BARS[TRAMP][2]), 11 * FS, C.up, 2.2, to); s += txt(x(TRAMP) - (L.narrow ? 24 : 0), y(BARS[TRAMP][2]) + 30 * FS, "trampoline", C.up, 12, "middle", 700, to); }
      var xo = fade(T, T_X, 0.3);
      if (xo > 0) { s += ring(x(WALL), y(EXIT), 11 * FS, C.cyan, 2.2, xo); s += tag(L.xTag, y(EXIT) - 6 * FS, "out " + px(EXIT), C.cyan, xo); }
      if (T >= 21.4) s += txt(L.x0, L.yt + 22 * FS, "A +" + f2(EXIT - A_IN) + " (" + A_R.toFixed(1) + "R) · B +" + f2(EXIT - B_IN) + " (" + B_R.toFixed(1) + "R)", C.cyan, 13, "start", 700, fade(T, 21.4, 0.3));

      /* ---- the callouts ---- */
      var cx = L.cx, cy = L.cy;
      s += callout(cx, cy, ["The map", "Weekly + daily: HH, HL, HC", "Buyers own the auction", "Momentum is allowed today"], C.up, fade(T, 0.4, 0.3) * (1 - fade(T, 4.6, 0.3)));
      s += callout(cx, cy, ["The first breakout", "+" + f2(SPIKE - VAH) + " pts over VAH", "Price, not value", "Don't buy it"], C.dn, fade(T, 4.8, 0.3) * (1 - fade(T, 6.8, 0.3)));
      s += callout(cx, cy, ["The micro range", px(MRL) + " to " + px(MRH), "Business done above old value", "Acceptance: now it's a setup"], C.orange, fade(T, 7.0, 0.3) * (1 - fade(T, 10.2, 0.3)));
      s += callout(cx, cy, ["Plan A · buy " + px(A_IN), "Flush under the low, absorbed", "Stop " + px(A_STOP) + ", under the buyers", "Risk " + f2(A_RISK) + " pts · half size"], C.up, fade(T, 10.4, 0.3) * (1 - fade(T, 12.6, 0.3)));
      s += callout(cx, cy, ["Plan B · buy " + px(B_IN), "Aggressive buying out of value", "Stop " + px(B_STOP) + ", back inside", "Plan A's stop to entry"], C.blue, fade(T, 12.8, 0.3) * (1 - fade(T, 15.0, 0.3)));
      s += callout(cx, cy, ["Old value: a trampoline", "Value builds higher", "Pullback sellers absorbed", "In balance it'd be a magnet"], C.up, fade(T, 15.2, 0.3) * (1 - fade(T, 18.8, 0.3)));
      s += callout(cx, cy, ["The wall · out " + px(EXIT), "Buyers lift, sellers refill", "Exit liquidity for someone big", "Don't wait for the rotation"], C.dn, fade(T, 19.0, 0.3) * (1 - fade(T, 21.4, 0.3)));
      s += callout(cx, cy, ["The whole trade", "Regime, then value, then trigger", "Risk split between A and B", "Made-up best case"], C.ink, fade(T, 21.6, 0.3));
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
    function draw() { FS = L.narrow ? 1.18 : 1; svg.innerHTML = '<rect width="' + L.W + '" height="' + L.H + '" fill="' + C.bg + '"/>' + frame(T, L); caption(); FS = 1; }
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
    window.MRAnim = { seek: function (t) { setPlaying(false); T = t; draw(); }, END: END, STAGES: STAGES,
      _levels: { VAH: VAH, VAL: VAL, POC: POC, MRH: MRH, MRL: MRL, A_IN: A_IN, A_STOP: A_STOP, A_RISK: A_RISK, B_IN: B_IN, B_STOP: B_STOP, B_RISK: B_RISK, EXIT: EXIT, A_R: A_R, B_R: B_R } };   // exposed for testing
  })();

  /* =====================================================================
     2. The six steps as a stepper, with a small chart per step
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-mr-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 6) return;
    var INFO = [
      { k: "Regime",   c: C.up,     tag: "Map · one time framing on the weekly and daily" },
      { k: "Macro",    c: C.gold,   tag: "Filter · what the Fed has to do next" },
      { k: "Zones",    c: C.purple, tag: "Map · value, nodes and the control zones" },
      { k: "Wait",     c: C.orange, tag: "Patience · no first breakouts, wait for the micro range" },
      { k: "Plan A + B", c: C.blue, tag: "Execute · the absorbed flush, or the break out of value" },
      { k: "Manage",   c: C.cyan,   tag: "Manage · trampoline, then the wall" }
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
    fig.innerHTML = '<svg viewBox="0 0 560 340" role="img" aria-label="A small chart for the current step"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");
    var SF = 1;
    function t(x, y, s, col, anchor, w, size) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + ((size || 13) * SF).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' + (w ? ' font-weight="' + w + '"' : "") + ">" + s + "</text>"; }

    /* step 1: three daily bars, one time framing up */
    function regime(c) {
      var s = t(16, 24, "Daily bars · one time framing up", C.faint);
      var D = [[100, 112, 96, 110], [104, 119, 101, 114], [113, 127, 106, 119]];   // o h l c (a gap down on day 3 that holds)
      var y = function (p) { return 300 - (p - 90) / 40 * 250; };
      D.forEach(function (d, i) {
        var X = 120 + i * 150;
        s += candle(X, y, d, 1, 34, 1);
        if (i > 0) {
          var P = D[i - 1];
          s += ln(X - 150 + 22, y(P[1]), X + 40, y(P[1]), C.faint, "3 4", 1);
          s += ln(X - 150 + 22, y(P[2]), X + 40, y(P[2]), C.faint, "3 4", 1);
          s += t(X + 26, y(d[1]) - 6, "HH", c, "start", 700);
          s += t(X + 26, y(d[2]) + 16, "HL", c, "start", 700);
          s += t(X + 26, y(d[3]) + 5, "HC", c, "start", 700);
        }
      });
      s += t(270, 334, "higher high + higher low + higher close: buyers in control", c, "middle", 600, 12);
      return s;
    }
    /* step 2: the Fed lens */
    function macro(c) {
      var s = t(16, 24, "Every number through one lens", C.faint);
      s += rect(30, 50, 500, 58, C.box, 1, null, 10);
      s += t(280, 76, "CPI · PCE · NFP · GDP · headlines", C.ink, "middle", 700, 14);
      s += t(280, 96, "is it moving inflation or employment?", C.dim, "middle", null, 12);
      s += ln(280, 112, 150, 160, C.faint, null, 1.5); s += ln(280, 112, 410, 160, C.faint, null, 1.5);
      s += rect(30, 164, 240, 118, "#123d22", 1, null, 10);
      s += t(150, 192, "Accommodative", C.up, "middle", 700, 15);
      s += t(150, 216, "rates down, money cheap", C.dim, "middle", null, 12);
      s += t(150, 238, "growth and risk assets", C.dim, "middle", null, 12);
      s += t(150, 260, "don't stand in the way", C.up, "middle", 600, 12);
      s += rect(290, 164, 240, 118, "#3a1517", 1, null, 10);
      s += t(410, 192, "Restrictive", C.dn, "middle", 700, 15);
      s += t(410, 216, "rates up, money dear", C.dim, "middle", null, 12);
      s += t(410, 238, "profit taking, rotation", C.dim, "middle", null, 12);
      s += t(410, 260, "into safer assets", C.dn, "middle", 600, 12);
      s += t(280, 320, "Tradable only when the actual is far from what's expected", c, "middle", 600, 12);
      return s;
    }
    /* step 3: the zones on a profile */
    function zones(c) {
      var s = t(16, 24, "Weekly profile → cash sessions → overnight", C.faint);
      var y = function (p) { return 300 - (p - 7360) / 110 * 260; };
      var rows = [];
      for (var p = 7362; p < 7468; p += 2) {
        var v = Math.exp(-Math.pow((p - 7448) / 9, 2)) * 1 + Math.exp(-Math.pow((p - 7430) / 6, 2)) * 0.8 + Math.exp(-Math.pow((p - 7386) / 8, 2)) * 0.55 + 0.08;
        if (p > 7395 && p < 7410) v *= 0.35;
        rows.push([p, v]);
      }
      rows.forEach(function (r) { s += rect(330, y(r[0] + 2) + 0.5, r[1] * 190, Math.max(1, y(r[0]) - y(r[0] + 2) - 1), r[0] >= 7409 && r[0] < 7462 ? C.purple : "#48484a", 0.55); });
      var Z = [[7446, 7451, "POC area 46–51 · a zone, not a line", C.gold], [7425, 7435, "high-volume node 25–35", C.purple], [7405, 7409, "control zone 05–09", C.up], [7390, 7392, "yesterday's VAL / overnight VAH ~91–92", C.dn]];
      Z.forEach(function (z) {
        s += rect(24, y(z[1]), 300, Math.max(3, y(z[0]) - y(z[1])), z[3], 0.22);
        s += t(30, y(z[1]) - 5, z[2], z[3], "start", 600, 12);
      });
      s += t(280, 334, "Congruence across time frames = the levels that matter", c, "middle", 600, 12);
      return s;
    }
    /* steps 4–6: the walkthrough bars */
    var S0 = 10, xa = 16, xb = 400, yt = 46, yb = 300, PMN = 7383, PMX = 7433;
    var dx = (xb - xa) / (N - S0), wb = Math.max(4, dx * 0.58);
    function X(i) { return xa + dx * (i - S0 + 0.5); }
    function Y(p) { return yb - (p - PMN) / (PMX - PMN) * (yb - yt); }
    function walk(k, c) {
      var s = t(xa, 24, "1-minute · the walkthrough", C.faint);
      s += hl(xa, xb, Y(VAH), C.purple, "6 4", 1.4, 0.8);
      s += t(xb + 6, Y(VAH) + 4, "VAH", C.purple, "start", 700);
      s += rect(X(MR0) - dx / 2, Y(MRH), X(MR1) - X(MR0) + dx, Y(MRL) - Y(MRH), C.orange, k === 3 ? 0.2 : 0.1, k === 3 ? C.orange : null);
      s += t(xb + 6, Y(MRH) + 4, "MR", C.orange, "start", 700);
      if (k === 5) s += rect(xa, Y(ZONE_HI), xb - xa, Y(ZONE_LO) - Y(ZONE_HI), C.dn, 0.15);
      for (var i = S0; i < N; i++) {
        var lit = k === 3 ? i >= BRK && i <= MR1 : k === 4 ? i >= FLUSH && i <= BREAK : i >= BREAK;
        s += candle(X(i), Y, BARS[i], 1, wb, lit ? 1 : 0.25);
      }
      if (k === 3) {
        s += t(X(SPK), Y(SPIKE) - 10, "price: skip", C.dn, "middle", 700);
        s += t(X(20), Y(MRL) + 22, "value: the micro range", c, "middle", 700);
      }
      if (k === 4) {
        PRINTS.forEach(function (q) { if (q[0] === FLUSH || q[0] === RECL || q[0] === BREAK) s += bubble(X(q[0]) + (q[3] ? 1 : -1) * dx * 0.6, Y(q[1]), 4 + q[2] / 22, q[3] ? C.blue : C.dn, 1); });
        s += tri(X(RECL) - dx * 0.9, Y(A_IN), true, C.up, 10);
        s += tri(X(BREAK) - dx * 0.9, Y(B_IN), true, C.blue, 10);
        s += t(X(FLUSH) - dx * 1.2, Y(FLOW) + 4, "A: flush absorbed, reclaim", C.up, "end", 700);
        s += t(X(BREAK) - dx, Y(B_IN + 9), "B: break out of value", c, "end", 700);
      }
      if (k === 5) {
        s += ring(X(TRAMP), Y(BARS[TRAMP][2]), 9, C.up, 2);
        s += t(X(TRAMP), Y(BARS[TRAMP][2]) + 24, "trampoline", C.up, "middle", 700);
        s += ring(X(WALL), Y(EXIT), 9, c, 2);
        s += t(X(WALL) - 14, Y(ZONE_HI) - 8, "the wall · out " + px(EXIT), C.dn, "end", 700);
      }
      return s;
    }
    function chart(k) {
      var c = INFO[k].c, s = "";
      s += k === 0 ? regime(c) : k === 1 ? macro(c) : k === 2 ? zones(c) : walk(k, c);
      s += t(552, 334, k > 2 ? "Illustrative · made-up bars" : "", C.faint, "end", null, 11);
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
      FS = 1; SF = svg.clientWidth > 0 && svg.clientWidth < 440 ? 1.35 : 1;
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
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { show(cur); }, 150); });
    show(0);
  })();

  /* =====================================================================
     3. Price vs value: a news spike that gives it all back, and value
        migrating higher range by range
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-mr-value]");
    if (!root) return;
    var svg = root.querySelector("svg"), btn = root.querySelector("[data-play]");
    /* left: balance, the spike, the full retrace. right: three ranges stepping up */
    var LB = [[50, 53, 48, 52], [52, 54, 49, 50], [50, 52, 47.5, 49], [49, 53, 48.5, 52.5], [52.5, 53, 49, 50], [50, 52.5, 48, 51],
              [51, 66, 50.5, 65], [65, 66.5, 57, 58], [58, 59, 51, 52], [52, 53.5, 48.5, 50], [50, 52, 48, 51.5], [51.5, 53, 49.5, 50.5]];
    var RB = [], p = 50, i;
    var lv = [50, 58, 66];
    for (i = 0; i < 18; i++) {
      var g = Math.floor(i / 6), m = lv[g], w = i % 6;
      var o = i === 0 ? 50 : RB[i - 1][3];
      var c = w === 0 && g > 0 ? m + 1 : m + [1.5, -1.5, 2, -1, 1, 2.5][w];
      RB.push([o, Math.max(o, c) + 1.2, Math.min(o, c) - 1.2, c]);
    }
    var T = 0, raf = 0, last = 0, END = 7;
    function draw() {
      var narrow = isNarrow(svg, 600);
      var W = narrow ? 440 : 1180, H = narrow ? 700 : 360;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.2 : 1;
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      function panel(ox, oy, pw, ph, bars, title, sub, col, isLeft) {
        var r = "", dx = (pw - 40) / bars.length, y = function (v) { return oy + ph - 30 - (v - 44) / 28 * (ph - 80); };
        r += txt(ox + 10, oy + 22 * FS, title, col, 14, "start", 700);
        r += txt(ox + 10, oy + 42 * FS, sub, C.faint, 12);
        var shown = isLeft ? clamp01(T / 4.2) * bars.length : clamp01((T - 1.2) / 4.8) * bars.length;
        if (isLeft) {
          r += rect(ox + 14, y(53), pw - 40, y(48) - y(53), C.purple, 0.12);
          r += txt(ox + pw - 26, y(48) + 16 * FS, "value never moved", C.purple, 12, "end", 600, fade(T, 3.8, 0.4));
        } else {
          [0, 1, 2].forEach(function (g) {
            var o = fade(T, 1.2 + g * 1.6 + 1.2, 0.4);
            r += rect(ox + 14 + g * 6 * dx, y(lv[g] + 3.8), 6 * dx - 4, 7.6 / 28 * (ph - 80), C.purple, 0.16 * o);
          });
          r += txt(ox + pw - 26, oy + ph - 28 * FS, "value migrating higher", C.purple, 12, "end", 600, fade(T, 5.6, 0.4));
        }
        for (var i = 0; i < bars.length; i++) {
          var pr = clamp01(shown - i);
          if (pr > 0) r += candle(ox + 20 + dx * (i + 0.5), y, bars[i], pr, Math.max(4, dx * 0.55), 1);
        }
        if (isLeft) r += txt(ox + 20 + dx * 6.5, y(66.5) - 8, "the news candle", C.dn, 12, "middle", 700, fade(T, 2.4, 0.3));
        return r;
      }
      if (narrow) {
        s += panel(0, 0, W, 350, LB, "Price moved", "A spike on the number, given straight back", C.dn, true);
        s += panel(0, 350, W, 350, RB, "Value moved", "Range, then a higher range, then higher", C.up, false);
      } else {
        s += panel(0, 0, 580, H, LB, "Price moved", "A spike on the number, given straight back", C.dn, true);
        s += panel(600, 0, 580, H, RB, "Value moved", "Range, then a higher range, then higher: a trend", C.up, false);
        s += ln(590, 20, 590, H - 20, C.box, null, 1.5);
      }
      s += txt(W - 8, H - 6, "Illustrative · made-up bars", C.faint, 11, "end");
      svg.innerHTML = s; FS = 1;
    }
    function tick(now) { T += Math.min(0.1, (now - last) / 1000); last = now; if (T >= END) T = END; draw(); if (T < END) raf = requestAnimationFrame(tick); }
    function play() { T = 0; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    btn.addEventListener("click", play);
    T = END; draw();
    if (!REDUCED && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); play(); } }, { threshold: 0.4 });
      io.observe(svg);
    }
    var rt = 0; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
  })();

  /* =====================================================================
     4. One time framing: the checker
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-mr-otf]");
    if (!root) return;
    var svg = root.querySelector("svg"), out = root.querySelector(".mr-oout"), form = root.querySelector(".calc-in");
    var PRE = {
      up:     [7450, 7400, 7440, 7472, 7412, 7466],
      down:   [7450, 7400, 7410, 7438, 7380, 7386],
      old:    [7450, 7400, 7440, 7462, 7408, 7432],
      inside: [7450, 7400, 7440, 7444, 7410, 7426],
      outside:[7450, 7400, 7440, 7462, 7392, 7446]
    };
    function get(n) { var v = parseFloat(form.querySelector('[name="' + n + '"]').value); return isFinite(v) ? v : NaN; }
    function set(a) { ["ph", "pl", "pc", "h", "l", "c"].forEach(function (n, i) { form.querySelector('[name="' + n + '"]').value = a[i]; }); }
    function verdict(ph, pl, pc, h, l, c) {
      var hh = h > ph, hl2 = l > pl, hc = c > pc, lh = h < ph, ll = l < pl, lc = c < pc;
      if (hh && hl2 && hc) return { k: "a", t: "One time framing up", p: "Higher high, higher low, higher close. Buyers are in control of the auction: momentum and breakouts are on the menu, mean reversion isn't. Still wait for the micro range intraday.", f: [hh, hl2, hc], lab: ["higher high", "higher low", "higher close"] };
      if (lh && ll && lc) return { k: "no", t: "One time framing down", p: "Lower high, lower low, lower close. Sellers are in control: momentum shorts, the mirror image. Don't buy the bottom for a pullback into the middle.", f: [lh, ll, lc], lab: ["lower high", "lower low", "lower close"] };
      if (hl2 && hh && !hc) return { k: "b", t: "Old-school yes, strict no", p: "Higher high and higher low, but not a higher close. The textbook definition would call it one time framing up. His stricter rule wants the close too, so treat it as balance: fade the edges, don't chase breakouts.", f: [hh, hl2, hc], lab: ["higher high", "higher low", "higher close"] };
      if (ll && lh && !lc) return { k: "b", t: "Old-school yes, strict no", p: "Lower high and lower low, but not a lower close. Not strict one time framing down. Treat it as balance.", f: [lh, ll, lc], lab: ["lower high", "lower low", "lower close"] };
      return { k: "b", t: "Balance", p: (h <= ph && l >= pl ? "An inside bar: neither side took control. " : h > ph && l < pl ? "An outside bar: both sides swept, nobody won. " : "Mixed signals. ") + "That's balance, about 70% of the time. Momentum trades are low expected value here. Fade failed auctions at the value edges instead.", f: [hh, hl2, hc], lab: ["higher high", "higher low", "higher close"] };
    }
    function draw() {
      var ph = get("ph"), pl = get("pl"), pc = get("pc"), h = get("h"), l = get("l"), c = get("c");
      if ([ph, pl, pc, h, l, c].some(isNaN) || h < l || ph < pl) { out.className = "chk-out mr-oout is-no"; out.innerHTML = "<b>Check the numbers</b><p>Each bar needs a high at or above its low.</p>"; return; }
      var v = verdict(ph, pl, pc, h, l, c);
      var narrow = isNarrow(svg, 560), W = narrow ? 440 : 1180, H = narrow ? 420 : 320;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.2 : 1;
      var lo = Math.min(pl, l), hi = Math.max(ph, h), pad = (hi - lo) * 0.18 || 1;
      var yt = 40, yb = H - 40, y = function (p) { return yb - (p - (lo - pad)) / ((hi + pad) - (lo - pad)) * (yb - yt); };
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      var x1 = narrow ? 110 : 260, x2 = narrow ? 230 : 440, xe = narrow ? 300 : 620;
      s += txt(20, 26, "Last bar and this bar (weekly or daily)", C.faint, 12);
      var po = (ph + pl) / 2, o2 = (h + l) / 2;
      s += candle(x1, y, [po, ph, pl, pc], 1, narrow ? 34 : 46, 1, pc >= po ? C.up : C.dn);
      s += candle(x2, y, [o2, h, l, c], 1, narrow ? 34 : 46, 1, c >= pc ? C.up : C.dn);
      [[ph, "high"], [pl, "low"], [pc, "close"]].forEach(function (r) {
        s += hl(x1 + 26, xe, y(r[0]), C.faint, "3 4", 1.2);
        if (!narrow) s += txt(x1 - 32, y(r[0]) + 4, "last " + r[1] + " " + px(r[0]), C.faint, 11.5, "end");
      });
      s += hl(x2 - 30, x2 + 30, y(c), C.ink, null, 2);
      var col = v.k === "a" ? C.up : v.k === "no" ? C.dn : C.gold;
      var lx = narrow ? 20 : xe + 40, ly = narrow ? H - 90 : 110;
      if (narrow) { s += txt(20, 56, v.t, col, 16, "start", 700); }
      v.lab.forEach(function (lab, i) {
        var ok = v.f[i];
        s += txt(narrow ? 290 : lx, (narrow ? 110 : ly) + i * 34 * FS, (ok ? "✓ " : "✗ ") + lab, ok ? C.up : C.dn, 15, "start", 700);
      });
      if (!narrow) s += txt(lx, ly - 40, v.t, col, 20, "start", 700);
      s += txt(W - 8, H - 6, "Illustrative", C.faint, 11, "end");
      svg.innerHTML = s; FS = 1;
      out.className = "chk-out mr-oout is-" + v.k;
      out.innerHTML = "<b>" + v.t + "</b><p>" + v.p + "</p>";
    }
    root.querySelectorAll("[data-pre]").forEach(function (b) { b.addEventListener("click", function () { set(PRE[b.getAttribute("data-pre")]); draw(); }); });
    form.addEventListener("input", draw);
    set(PRE.up); draw();
    var rt = 0; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
  })();

  /* =====================================================================
     5. The failed auction, two flavors: the V-shape reversal at the
        value area low (long) and the slow burn at the value area high
        (short)
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-mr-two]");
    if (!root) return;
    var svg = root.querySelector("svg"), btn = root.querySelector("[data-play]");
    /* prices in "points" around a balance: VAH 60, POC 50, VAL 40 */
    var VB = [[50, 54, 47, 48], [48, 50, 43, 44], [44, 45, 40.5, 41], [41, 42, 33.5, 35], [35, 44, 34.5, 43.5], [43.5, 48, 43, 47], [47, 51, 46, 50.5], [50.5, 56, 49.5, 55], [55, 60.5, 54, 59.5]];
    VB[4].path = [[0, 35], [0.15, 34.5], [0.5, 40.25], [0.9, 44], [1, 43.5]];
    var SB = [[50, 56, 49, 55], [55, 61, 54, 60], [60, 63.5, 59, 62], [62, 64, 60.5, 61.5], [61.5, 63.5, 60.5, 63], [63, 64, 59.5, 60], [60, 60.5, 56.5, 57], [57, 59, 56, 58.5], [58.5, 59.25, 56.5, 57], [57, 59.5, 56.75, 57.5], [57.5, 58, 51, 52], [52, 53, 45, 46], [46, 47, 40.5, 41]];
    var T = 0, raf = 0, last = 0, END = 9;
    function draw() {
      var narrow = isNarrow(svg, 600), W = narrow ? 440 : 1180, H = narrow ? 800 : 400;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.2 : 1;
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      function panel(ox, oy, pw, ph, bars, title, sub, kind) {
        var nw = narrow;
        var r = "", n = bars.length + 2, dx = (pw - 110) / n, y = function (v) { return oy + ph - 34 - (v - 30) / 36 * (ph - 104); };
        var X = function (i) { return ox + 14 + dx * (i + 0.5); };
        r += txt(ox + 10, oy + 22 * FS, title, kind === "v" ? C.up : C.dn, 14, "start", 700);
        r += txt(ox + 10, oy + 42 * FS, sub, C.faint, 12);
        r += rect(ox + 14, y(60), pw - 110, y(40) - y(60), C.purple, 0.1);
        [[60, "VAH", C.purple], [50, "POC", C.gold], [40, "VAL", C.purple]].forEach(function (l) {
          r += hl(ox + 14, ox + pw - 96, y(l[0]), l[2], l[1] === "POC" ? "5 4" : null, 1.4, 0.9);
          r += txt(ox + pw - 90, y(l[0]) + 4, l[1], l[2], 12, "start", 700);
        });
        var sh = clamp01(T / 7.2) * bars.length;
        for (var i = 0; i < bars.length; i++) { var pr = clamp01(sh - i); if (pr > 0) r += candle(X(i), y, bars[i], pr, Math.max(4, dx * 0.55), 1); }
        if (kind === "v") {
          var t1 = 3 / bars.length * 7.2, t2 = 4.5 / bars.length * 7.2;
          r += bubble(X(3) - dx * 0.6, y(37), 9 * FS, C.dn, fade(T, t1, 0.3));
          r += bubble(X(3) - dx * 0.6, y(35), 11 * FS, C.dn, fade(T, t1 + 0.2, 0.3));
          r += bubble(X(4) + dx * 0.6, y(38), 11 * FS, C.blue, fade(T, t2 - 0.2, 0.3));
          r += bubble(X(4) + dx * 0.6, y(41), 13 * FS, C.blue, fade(T, t2, 0.3));
          var eo = fade(T, t2, 0.3);
          r += tri(X(4) - dx * 0.9, y(40.25), true, C.up, 11 * FS, eo);
          r += txt(X(4) + dx * 1.3, y(36), nw ? "buy the reclaim" : "buy at market on the reclaim", C.up, 12, "start", 700, eo);
          r += hl(X(3) - dx * 0.5, ox + pw - 96, y(33), C.dn, "5 4", 1.5, eo);
          r += txt(X(5), y(33) + 16 * FS, nw ? "stop under the buyers" : "stop under the aggressive buyers", C.dn, 11.5, "start", 600, eo);
          r += txt(X(1), y(31.5) - 0, "sellers trapped", C.dn, 12, "middle", 700, fade(T, t2 + 0.4, 0.3));
          r += ring(X(6), y(50), 9 * FS, C.gold, 2, fade(T, 6.6 / bars.length * 7.2, 0.3));
          r += ring(X(8), y(60), 9 * FS, C.cyan, 2, fade(T, 7.1, 0.3));
          r += txt(X(8) - dx, y(60) - 14 * FS, "POC, then VAH", C.cyan, 12, "end", 700, fade(T, 7.1, 0.3));
        } else {
          var bo = fade(T, 2.2, 0.3), mo = fade(T, 6.6 / bars.length * 7.2, 0.4);
          r += rect(X(1) + dx * 0.4, y(64), dx * 4.2, y(59) - y(64), C.orange, 0.1 * bo);
          r += txt(X(3), y(64) - 8, "value building outside", C.orange, 11.5, "middle", 600, bo * (1 - fade(T, 5, 0.3) * 0.5));
          r += rect(X(6) - dx * 0.5, y(59.25), dx * 4, y(56.5) - y(59.25), C.orange, 0.2 * mo, C.orange);
          r += txt(X(9.3), y(56.5) + 18 * FS, nw ? "micro range" : "micro range back inside", C.orange, 11.5, "end", 700, mo);
          var ao = fade(T, 8.6 / bars.length * 7.2, 0.3), b2 = fade(T, 10.3 / bars.length * 7.2, 0.3);
          r += tri(X(8) - dx * 0.9, y(59), false, C.dn, 10 * FS, ao);
          r += bubble(X(8) + dx * 0.6, y(59), 10 * FS, C.dn, ao);
          r += txt(X(8), y(61.5) - 6, nw ? "A: sell top" : "A: sell the top", C.dn, 11.5, "middle", 700, ao);
          r += tri(X(10) - dx * 0.9, y(56.25), false, C.dn, 10 * FS, b2);
          r += bubble(X(10) + dx * 0.6, y(55), 12 * FS, C.dn, b2);
          r += txt(X(10) + dx * 1.2, y(57), nw ? "B: sell below" : "B: aggressive selling below", C.dn, 11.5, "start", 700, b2);
          r += ring(X(12), y(40.5), 9 * FS, C.cyan, 2, fade(T, 7.1, 0.3));
          r += txt(X(12) - dx, y(40.5) + 22 * FS, "back to VAL", C.cyan, 12, "end", 700, fade(T, 7.1, 0.3));
        }
        return r;
      }
      if (narrow) {
        s += panel(0, 0, W, 400, VB, "Flavor 1 · the V-shape reversal", "Aggressive sellers trapped under VAL", "v");
        s += panel(0, 400, W, 400, SB, "Flavor 2 · the slow burn", "Value tries above VAH, fails back in", "s");
      } else {
        s += panel(0, 0, 580, H, VB, "Flavor 1 · the V-shape reversal", "Aggressive sellers get trapped under the value area low", "v");
        s += panel(600, 0, 580, H, SB, "Flavor 2 · the slow burn", "Value tries to build over the high, fails back inside", "s");
        s += ln(590, 20, 590, H - 20, C.box, null, 1.5);
      }
      s += txt(W - 8, H - 6, "Illustrative · made-up bars", C.faint, 11, "end");
      svg.innerHTML = s; FS = 1;
    }
    function tick(now) { T += Math.min(0.1, (now - last) / 1000); last = now; if (T >= END) T = END; draw(); if (T < END) raf = requestAnimationFrame(tick); }
    function play() { T = 0; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    btn.addEventListener("click", play);
    T = END; draw();
    if (!REDUCED && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); play(); } }, { threshold: 0.4 });
      io.observe(svg);
    }
    var rt = 0; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
  })();

  /* =====================================================================
     6. Plan A + plan B: split the risk
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-mr-calc]");
    if (!root) return;
    var out = root.querySelector(".mr-cout"), calc = root.querySelector(".mr-ccalc");
    function v(n) { var e = root.querySelector('[name="' + n + '"]'); return e.tagName === "SELECT" ? e.value : parseFloat(e.value); }
    function money(x) { return "$" + Math.round(x).toLocaleString("en-US"); }
    function row(a, b, cls) { return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + a + "</span><b>" + b + "</b></div>"; }
    function run() {
      var side = v("side"), hi = v("hi"), lo = v("lo"), agg = v("agg"), bstop = v("bstop"), tgt = v("tgt"), risk = v("risk"), pv = v("pv"), tick = v("tick"), buf = v("buf");
      var long = side === "long";
      if ([hi, lo, agg, bstop, tgt, risk, pv, tick, buf].some(function (x) { return !isFinite(x); }) || hi <= lo || tick <= 0 || pv <= 0) {
        out.className = "chk-out mr-cout is-no"; out.innerHTML = "<b>Check the numbers</b><p>The micro range high has to be above its low, and every box needs a number.</p>"; calc.innerHTML = ""; return;
      }
      var aIn = long ? lo + tick : hi - tick, aStop = long ? agg - buf * tick : agg + buf * tick;
      var bIn = long ? hi + tick : lo - tick, bStop = bstop;
      var aR = long ? aIn - aStop : aStop - aIn, bR = long ? bIn - bStop : bStop - bIn;
      var bad = [];
      if (aR <= 0) bad.push("Plan A's stop has to be " + (long ? "under" : "over") + " the entry: the aggressive " + (long ? "buyers" : "sellers") + " level goes past the micro range " + (long ? "low" : "high") + ".");
      if (bR <= 0) bad.push("Plan B's stop has to be back inside the range, " + (long ? "under" : "over") + " the entry.");
      if ((long && tgt <= bIn) || (!long && tgt >= bIn)) bad.push("The target has to be past plan B's entry.");
      if (bad.length) { out.className = "chk-out mr-cout is-no"; out.innerHTML = "<b>Not a plan yet</b><p>" + bad.join(" ") + "</p>"; calc.innerHTML = ""; return; }
      var half = risk / 2, aQ = Math.floor(half / (aR * pv)), bQ = Math.floor(half / (bR * pv));
      var aRR = Math.abs(tgt - aIn) / aR, bRR = Math.abs(tgt - bIn) / bR;
      var cls = aQ > 0 && bQ > 0 ? "is-a" : "is-b";
      out.className = "chk-out mr-cout " + cls;
      out.innerHTML = aQ > 0 && bQ > 0
        ? "<b>" + aQ + " + " + bQ + " contracts</b><p>Half the risk on each plan. If both fill, plan A's stop goes to its entry, so the most you can lose is plan B's half.</p>"
        : "<b>Too small to split</b><p>" + money(half) + " per plan doesn't cover one contract at these stops. Use micros (a tenth of the point value), or take only one plan.</p>";
      calc.innerHTML =
        row("Plan A · " + (long ? "buy" : "sell") + " the reclaim", aIn.toFixed(2)) +
        row("Plan A stop · past the aggressive " + (long ? "buyers" : "sellers"), aStop.toFixed(2) + " (" + aR.toFixed(2) + " pts)") +
        row("Plan A size · " + money(half), aQ + " × " + money(aR * pv)) +
        row("Plan B · " + (long ? "buy" : "sell") + " the break", bIn.toFixed(2)) +
        row("Plan B stop · back inside", bStop.toFixed(2) + " (" + bR.toFixed(2) + " pts)") +
        row("Plan B size · " + money(half), bQ + " × " + money(bR * pv)) +
        row("To the target " + tgt.toFixed(2), "A " + aRR.toFixed(1) + "R · B " + bRR.toFixed(1) + "R") +
        row("If both fill and both win", money(aQ * Math.abs(tgt - aIn) * pv + bQ * Math.abs(tgt - bIn) * pv), "tot");
    }
    root.addEventListener("input", run); root.addEventListener("change", run);
    run();
  })();
})();

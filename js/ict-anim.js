/* =====================================================================
   ict-anim.js — the animations on the ICT Made Simple page.

   1. [data-ict-anim]   one trade, start to finish, on two time frames of
      made-up BTC bars: trend (higher highs, higher lows, three candle
      swings) → structure (a close through the swing high: MSB) → the
      range (significant low to high, the 0.5, premium and discount, the
      OTE) → points of interest and liquidity (an FVG and an order block
      in the discount, ERL and IRL) → the pullback into the FVG (the
      weekly-only trade) → zoom in: the daily is a downtrend → the
      breaker: a low taken, then a close through the high that took it
      → out at external range liquidity.
   2. [data-ict-steps]  the six steps as a click-through stepper with a
      small chart per step.
   3. [data-ict-check]  is it a trade? trend, draw on liquidity, premium
      or discount, the POI and the low time frame trigger.
   4. [data-ict-two]    three scripts on the low time frame: the long, the
      short, and the first try that gets stopped.
   5. [data-ict-calc]   the planner: the range's 0.5 and OTE, the weekly-
      only R against the zoomed-in R, and the size for a dollar risk.

   Everything is scripted and labelled "Illustrative". No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#22d3ee", gold: "#f4b942", orange: "#ff9f0a", purple: "#bf5af2", teal: "#64d2ff", pink: "#ff375f",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e", gray: "#8e8e93" };
  var FS = 1;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
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
  function box(x, y, w, h, col, op, dash) {
    if (op <= 0) return "";
    return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="1.6"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + ' rx="4" opacity="' + op.toFixed(3) + '"/>';
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
  function poly(P, col, w, dash, op) {
    if (op != null && op <= 0) return "";
    return '<polyline points="' + P.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 3) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ' stroke-linejoin="round" stroke-linecap="round"/>';
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
    var w = (label.length * 6.9 + 16) * FS, h = 20 * FS;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xTag.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="' + col + '"/>' +
      txt(xTag + 8 * FS, y + 4.5 * FS, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function partial(b, prog) {
    var o = b[0], h = b[1], l = b[2], c = b[3];
    if (prog >= 1) return { hi: h, lo: l, cur: c };
    var pth = c >= o ? [[0, o], [1 / 3, l], [2 / 3, h], [1, c]] : [[0, o], [1 / 3, h], [2 / 3, l], [1, c]];
    var p = clamp01(prog), hi = o, lo = o, cur = o;
    for (var k = 1; k < pth.length; k++) {
      var a = pth[k - 1], z = pth[k];
      if (p >= z[0]) { hi = Math.max(hi, z[1]); lo = Math.min(lo, z[1]); cur = z[1]; continue; }
      cur = a[1] + (z[1] - a[1]) * (p - a[0]) / (z[0] - a[0]);
      break;
    }
    return { hi: Math.max(hi, cur), lo: Math.min(lo, cur), cur: cur };
  }
  function candle(x, yf, b, prog, wB, op) {
    if (prog <= 0) return "";
    var o = b[0], p = partial(b, prog), col = p.cur >= o ? C.up : C.dn;
    var top = yf(Math.max(o, p.cur)), bh = Math.max(1.5, Math.abs(yf(o) - yf(p.cur)));
    return '<g' + (op != null && op < 1 ? ' opacity="' + op.toFixed(3) + '"' : "") + '><line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + yf(p.hi).toFixed(1) + '" y2="' + yf(p.lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.4"/>' +
      '<rect x="' + (x - wB / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + wB.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }
  /* prices are in thousands of dollars: 92 → "92,000" */
  function k$(v) { return Math.round(v * 1000).toLocaleString("en-US"); }
  function isNarrow(el, below) { return el.clientWidth > 0 && el.clientWidth < (below || 560); }

  /* ---------------------------------------------------------------------
     The made-up weekly chart, in thousands. [o, h, l, c]
     1 swing low 66 · 5 swing high 86 · 8 higher low 74 · 10 closes over
     86 (MSB) · 12 higher high 104 · 15 the significant low 80 (its down
     candle is the order block, 80–86) · 16/18 leave a fair value gap
     90–94 · 19 closes over 104 (MSB, external liquidity taken) · 20 the
     range high 112 · 21–24 pull back into the FVG (low 90.6) · 25–27 run
     back through 112.
     --------------------------------------------------------------------- */
  var WK = [
    [70, 72, 67, 68], [68, 70, 66, 69], [69, 75, 68.5, 74], [74, 79, 73, 78], [78, 83, 77, 82], [82, 86, 80, 81],
    [81, 82, 77, 78], [78, 79.5, 75, 76], [76, 78, 74, 77.5], [77.5, 84, 77, 83.5], [83.5, 88, 82.5, 87.5], [87.5, 97, 87, 96],
    [96, 104, 95, 103], [103, 103.5, 95, 96], [96, 97, 84, 85], [85, 86, 80, 82], [82, 90, 81, 89], [89, 99, 88.5, 98],
    [98, 101, 94, 100], [100, 107, 99, 106], [106, 112, 104.5, 109], [109, 110, 101, 102], [102, 104, 96, 97], [97, 98.5, 92.5, 93.5],
    [93.5, 95, 90.6, 94], [94, 101, 93, 100], [100, 108, 99, 107], [107, 114, 106, 113]
  ];
  /* the made-up daily chart inside weeks 21–26. 7 the first low 91.6 · 8–9 the
     up candles that make the high 94.6 (they should be a bearish order block)
     · 11 takes the low: 90.6 · 13 closes over 94.6: the market structure shift,
     and 8–9 become a bullish breaker · 14 the retest fills the long at 94 */
  var DY = [
    [101, 102, 98.5, 99], [99, 100.5, 97, 97.5], [97.5, 99.8, 97, 99.2], [99.2, 99.5, 95.5, 96], [96, 96.5, 93.8, 94.2], [94.2, 96.8, 94, 96.4],
    [96.4, 96.6, 93, 93.4], [93.4, 93.8, 91.6, 92], [92, 93.4, 91.8, 93.1], [93.1, 94.6, 92.8, 94.3], [94.3, 94.4, 92, 92.3], [92.3, 92.6, 90.6, 91],
    [91, 93.5, 90.8, 93.3], [93.3, 95.6, 93, 95.3], [95.3, 95.8, 93.4, 93.8], [93.8, 97, 93.6, 96.7], [96.7, 99, 96, 98.6], [98.6, 101.8, 98, 101.2],
    [101.2, 102, 99.6, 100.2], [100.2, 104.5, 100, 104.1], [104.1, 107.6, 103.5, 107.2], [107.2, 108, 105.4, 106], [106, 110.6, 105.8, 110.2], [110.2, 113, 109.8, 112.6]
  ];
  var RLO = 80, RHI = 112, EQ = (RLO + RHI) / 2;
  function fibAt(r) { return RHI - r * (RHI - RLO); }
  var OTE1 = fibAt(0.618), OTE2 = fibAt(0.705), OTE3 = fibAt(0.786);
  var FVG_LO = 90, FVG_HI = 94, OB_LO = 80, OB_HI = 86;
  var W_ENTRY = 92, W_STOP = 79.5, W_R = (RHI - W_ENTRY) / (W_ENTRY - W_STOP);
  var L1 = 91.6, H1 = 94.6, L2 = 90.6, BRK_LO = 92.8, BRK_HI = 94.6;
  var D_ENTRY = 94, D_STOP = 90.2, D_R = (RHI - D_ENTRY) / (D_ENTRY - D_STOP);

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ict-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;

    var STAGES = [
      { at: 0,    title: "Trend: is it obvious?", text: "Higher highs and higher lows, clear enough to see from across the room: an uptrend. Each turning point is a three candle swing: a candle with a lower candle on each side is a swing high, one with a higher candle on each side a swing low. In an uptrend the best place to buy is as close to the next higher low as you can get." },
      { at: 3.4,  title: "Structure: a close through the swing", text: "Each new higher high is a bullish market structure break (MSB): a candle body closes through the last swing high, not just a wick. The break through " + k$(104) + " also takes the liquidity sitting above that old high. Bullish structure, so the next pullback is a pullback, not a short." },
      { at: 6.0,  title: "Range: the current leg, low to high", text: "Mark the significant low before the break to the significant high after it: " + k$(RLO) + " to " + k$(RHI) + ". A Fibonacci tool set to 0, 0.5 and 1 draws the middle for you: " + k$(EQ) + ". Above it is premium, expensive. Below it is discount, cheap. The 0.618 to 0.786 band (" + k$(OTE1) + " to " + k$(OTE3) + ") is ICT's optimal trade entry, 0.705 the sweet spot." },
      { at: 8.6,  title: "Points of interest and liquidity", text: "In the leg that broke structure: a fair value gap from " + k$(FVG_LO) + " to " + k$(FVG_HI) + " (top of candle one to bottom of candle three), and the order block, the last down candle before the move up, at " + k$(OB_LO) + " to " + k$(OB_HI) + ". Both sit in the discount. They're internal range liquidity (IRL); the range high and low are external (ERL). External was just taken, so the draw is internal next, then external again." },
      { at: 11.2, title: "The pullback reaches the FVG", text: "Price pulls back into the discount and into the gap. You could stop here: buy the FVG at " + k$(W_ENTRY) + " with the stop under the range low at " + k$(W_STOP) + ", target the range high. That's " + W_R.toFixed(1) + "R, with the stop " + k$(W_ENTRY - W_STOP) + " away." },
      { at: 13.8, title: "Zoom in: the daily is a downtrend", text: "On the daily the same pullback is a clean downtrend: lower highs, lower lows. On its own it looks like a short. With the weekly map on the chart, it's the pullback that should end in the higher low. Wait for the daily to flip back up and sync with the weekly." },
      { at: 17.4, title: "The breaker: low taken, high broken", text: "A low forms at " + k$(L1) + ". Two up candles make the high at " + k$(H1) + ", then price takes that low out (" + k$(L2) + "). Next a candle closes over " + k$(H1) + ": a market structure shift. The up candles that should have been a bearish order block failed, so they're a bullish breaker. Long " + k$(D_ENTRY) + " on the retest, stop under the low before the turn at " + k$(D_STOP) + "." },
      { at: 20.4, title: "Out at external range liquidity", text: "The daily syncs back up with the weekly and the leg runs to the old range high, " + k$(RHI) + ": " + D_R.toFixed(1) + "R with a stop " + k$(D_ENTRY - D_STOP) + " away, against " + W_R.toFixed(1) + "R on the weekly alone. External liquidity taken, a new MSB, a new range: the process starts again." }
    ];
    /* bar timings [start, end] */
    var TW = [], TD = [];
    function segW(a, b, t0, step, dur) { for (var i = a; i <= b; i++) TW[i] = [t0 + (i - a) * step, t0 + (i - a) * step + dur]; }
    function segD(a, b, t0, step, dur) { for (var i = a; i <= b; i++) TD[i] = [t0 + (i - a) * step, t0 + (i - a) * step + dur]; }
    segW(0, 12, 0.3, 0.21, 0.18);
    segW(13, 20, 3.6, 0.22, 0.2);
    segW(21, 24, 11.4, 0.4, 0.35);
    segW(25, 27, 20.8, 0.7, 0.6);
    segD(0, 7, 15.0, 0.25, 0.22);
    segD(8, 14, 17.6, 0.3, 0.26);
    segD(15, 23, 20.6, 0.27, 0.24);
    var END = 24.8;
    function pw(i, T) { return clamp01((T - TW[i][0]) / (TW[i][1] - TW[i][0])); }
    function pd(i, T) { return clamp01((T - TD[i][0]) / (TD[i][1] - TD[i][0])); }
    function wDone(i, T) { return T >= TW[i][1]; }
    function dDone(i, T) { return T >= TD[i][1]; }

    function size(n) {
      return n ? { W: 440, H: 1080, cx: 12, cy: 14, w: { x0: 10, x1a: 300, x1b: 300, yt: 196, yb: 566, yb0: 940 }, d: { x0: 10, x1: 300, yt: 666, yb: 1010 } }
               : { W: 1180, H: 690, cx: 24, cy: 14, w: { x0: 24, x1a: 990, x1b: 500, yt: 160, yb: 630 }, d: { x0: 690, x1: 1010, yt: 160, yb: 630 } };
    }
    var WMIN = 62, WMAX = 118, DMIN = 88.5, DMAX = 115;

    function frame(T, L) {
      var s = "", i, z = ease(fade(T, 13.8, 1.0));
      var wx0 = L.w.x0, wx1 = L.narrow ? L.w.x1a : lerp(L.w.x1a, L.w.x1b, z), wTag = wx1 + 6;
      var ndx = WK.length, dxw = (wx1 - wx0) / ndx;
      function xw(i) { return wx0 + dxw * (i + 0.5); }
      var wyb = L.w.yb0 ? lerp(L.w.yb0, L.w.yb, z) : L.w.yb;
      function yw(p) { return wyb - (p - WMIN) / (WMAX - WMIN) * (wyb - L.w.yt); }
      var dx0 = L.d.x0, dx1 = L.d.x1, dTag = dx1 + 6, dxd = (dx1 - dx0) / DY.length;
      function xd(i) { return dx0 + dxd * (i + 0.5); }
      var dmax = lerp(103, DMAX, ease(fade(T, 20.5, 2.4)));
      function yd(p) { return L.d.yb - (p - DMIN) / (dmax - DMIN) * (L.d.yb - L.d.yt); }
      var sumo = fade(T, 23.6, 0.3);

      /* panel titles */
      s += txt(wx0, L.w.yt - 14 * FS, L.narrow ? "Weekly · the map" : "Weekly · the high time frame map · made-up BTC", C.faint, 12, "start", null, 1);
      if (z > 0) {
        s += txt(dx0, L.d.yt - 14 * FS, L.narrow ? "Daily · the trigger" : "Daily · zoomed in for the trigger", C.faint, 12, "start", null, z);
        s += rect(dx0 - 8, L.d.yt - 6, dx1 - dx0 + 16 + (L.narrow ? 120 : 150), L.d.yb - L.d.yt + 12, C.ink, 0.025 * z);
      }

      /* range: premium / discount tint, OTE band, fib lines */
      var ro = fade(T, 6.2, 0.8), rx0 = xw(15) - dxw * 0.5;
      if (ro > 0) {
        s += rect(rx0, yw(RHI), wx1 - rx0, yw(EQ) - yw(RHI), C.dn, 0.06 * ro);
        s += rect(rx0, yw(EQ), wx1 - rx0, yw(RLO) - yw(EQ), C.up, 0.06 * ro);
        var oo = fade(T, 7.2, 0.6);
        s += rect(rx0, yw(OTE1), wx1 - rx0, yw(OTE3) - yw(OTE1), C.gold, 0.1 * oo);
        s += hl(rx0, wx1, yw(OTE2), C.gold, "2 4", 1.2, 0.8 * oo);
        s += hl(rx0, wx1, yw(RHI), C.ink, "6 4", 1.3, ro);
        s += hl(rx0, wx1, yw(EQ), C.ink, "6 4", 1.3, ro);
        s += hl(rx0, wx1, yw(RLO), C.ink, "6 4", 1.3, ro);
        if (!L.narrow) {
          s += txt(wx1 - 6, yw(EQ) - 8, "premium · expensive", C.dn, 11.5, "end", 600, ro * 0.9 * (1 - z));
          s += txt(wx1 - 6, yw(EQ) + 18, "discount · cheap", C.up, 11.5, "end", 600, ro * 0.9 * (1 - fade(T, 8.8, 0.4)));
          s += txt(wx1 - 6, yw(OTE3) + 16, "OTE 0.618–0.786", C.gold, 11, "end", 600, oo * (1 - fade(T, 8.6, 0.4)));
        }
      }
      /* POIs: FVG and order block */
      var po = fade(T, 8.8, 0.6);
      if (po > 0) {
        var fx0 = xw(16) - dxw * 0.5, ox0 = xw(15) - dxw * 0.5;
        s += rect(fx0, yw(FVG_HI), wx1 - fx0, yw(FVG_LO) - yw(FVG_HI), C.blue, 0.2 * po, null, 2);
        s += rect(ox0, yw(OB_HI), wx1 - ox0, yw(OB_LO) - yw(OB_HI), C.purple, 0.16 * po, null, 2);
        s += txt(wx1 - 6, yw(FVG_LO) - 6, L.narrow ? "FVG" : "FVG · IRL", C.blue, 11.5, "end", 700, po * (1 - z));
        s += txt(wx1 - 6, yw(OB_LO) - 7, L.narrow ? "OB" : "order block · IRL", C.purple, 11.5, "end", 700, po * (1 - z));
      }
      /* right-hand tags on the weekly */
      if (ro > 0) {
        s += tag(wTag, yw(RHI), (T >= 8.8 ? "ERL · " : "1 · ") + k$(RHI), T >= 8.8 ? C.cyan : C.ink, ro);
        s += tag(wTag, yw(EQ), "0.5 · " + k$(EQ), C.dim, ro);
        s += tag(wTag, yw(RLO) + 2, (T >= 8.8 ? "ERL · " : "0 · ") + k$(RLO), T >= 8.8 ? C.cyan : C.ink, ro);
      }
      if (po > 0 && !L.narrow) s += tag(wTag, yw((FVG_LO + FVG_HI) / 2), "FVG " + k$(FVG_LO) + "–" + k$(FVG_HI), C.blue, po * (1 - z * 0.0));

      /* the weekly candles */
      var wB = Math.max(3, dxw * 0.56);
      for (i = 0; i < ndx; i++) s += candle(xw(i), yw, WK[i], pw(i, T), wB, 1);

      /* trend swing labels (shown once the third candle closes) */
      var SW = [[1, 66, "low", false], [5, 86, "high", true], [8, 74, "higher low", false], [12, 104, "higher high", true], [15, 80, "higher low", false], [20, 112, "higher high", true]];
      SW.forEach(function (q) {
        var c = q[0] + 1; if (c >= ndx || !wDone(c, T)) return;
        var op = fade(T, TW[c][1], 0.3) * (1 - 0.45 * fade(T, 6.0, 0.5)) * (1 - z);
        var yy = q[3] ? yw(q[1]) - 10 * FS : yw(q[1]) + 18 * FS;
        if (L.narrow && (q[2] === "low" || q[2] === "high")) return;
        s += txt(xw(q[0]), yy, L.narrow ? (q[2] === "higher high" ? "HH" : "HL") : q[2], q[3] ? C.up : C.teal, 11, "middle", 600, op);
      });
      /* the three candle swing, counted once */
      var t3 = fade(T, 2.2, 0.3) * (1 - fade(T, 3.6, 0.4));
      if (t3 > 0) [7, 8, 9].forEach(function (k, n) { s += txt(xw(k), yw(WK[k][2]) + 34 * FS, String(n + 1), C.gold, 12, "middle", 700, t3); });
      if (t3 > 0) s += ring(xw(8), yw(74), 12 * FS, C.gold, 1.6, t3);

      /* market structure breaks */
      function msb(hiBar, level, brkBar, label, at) {
        if (!wDone(brkBar, T)) return "";
        var op = fade(T, Math.max(at, TW[brkBar][1]), 0.35) * (1 - 0.5 * z);
        var r = hl(xw(hiBar), xw(brkBar) + dxw * 0.4, yw(level), C.up, "4 3", 1.5, op);
        r += txt((xw(hiBar) + xw(brkBar)) / 2, yw(level) - 6, label, C.up, 11, "middle", 700, op);
        return r;
      }
      s += msb(5, 86, 10, "MSB", 3.4);
      s += msb(12, 104, 19, L.narrow ? "MSB" : "MSB · ERL taken", 3.6);

      /* the draw on liquidity: ERL → IRL → ERL */
      var dl = fade(T, 9.6, 0.5) * (1 - fade(T, 11.2, 0.4));
      if (dl > 0) {
        var ax = xw(22);
        s += poly([[xw(20), yw(112) - 4], [ax, yw(100)], [xw(23), yw(93)]], C.orange, 2.2, "6 5", dl);
        s += tri(xw(23), yw(93) + 6, false, C.orange, 10, dl);
        s += poly([[xw(24) + 4, yw(93)], [xw(26), yw(103)], [xw(27), yw(111)]], C.cyan, 2.2, "6 5", dl);
        s += tri(xw(27), yw(111) - 6, true, C.cyan, 10, dl);
      }

      /* the weekly-only trade */
      var wo = fade(T, 12.8, 0.4) * (1 - 0.6 * fade(T, 20.4, 0.5));
      if (wo > 0) {
        var ex0 = xw(24) - dxw * 0.5;
        s += hl(ex0, wx1, yw(W_ENTRY), C.ink, null, 1.6, wo);
        s += hl(ex0, wx1, yw(W_STOP), C.dn, "5 4", 1.6, wo);
        s += rect(ex0, yw(W_ENTRY), Math.min(dxw * 1.2, 18), yw(W_STOP) - yw(W_ENTRY), C.dn, 0.25 * wo);
        if (!L.narrow) s += txt(ex0 - 6, yw(W_STOP) + 16, "weekly-only stop " + k$(W_STOP), C.dn, 11, "end", 600, wo * (1 - z));
      }

      /* the zoom box and connector */
      if (z > 0) {
        var zx0 = xw(21) - dxw * 0.6, zx1 = xw(26) + dxw * 0.4, zy0 = yw(102.5), zy1 = yw(89.5);
        s += box(zx0, zy0, zx1 - zx0, zy1 - zy0, C.ink, 0.9 * z, "4 3");
        if (L.narrow) {
          s += ln(zx0, zy1, dx0, L.d.yt - 30, C.ink, "3 4", 1, 0.45 * z);
          s += ln(zx1, zy1, dx1, L.d.yt - 30, C.ink, "3 4", 1, 0.45 * z);
        } else {
          s += ln(zx1, zy0, dx0 - 8, L.d.yt - 6, C.ink, "3 4", 1, 0.45 * z);
          s += ln(zx1, zy1, dx0 - 8, L.d.yb + 6, C.ink, "3 4", 1, 0.45 * z);
        }
      }

      /* the daily panel */
      if (z > 0) {
        var dfo = fade(T, 14.6, 0.5);
        s += rect(dx0, yd(FVG_HI), dx1 - dx0, yd(FVG_LO) - yd(FVG_HI), C.blue, 0.16 * dfo, null, 2);
        s += txt(dx0 + 4, yd(FVG_LO) + 15 * FS, "weekly FVG", C.blue, 11, "start", 700, dfo * (1 - fade(T, 17.4, 0.4)));
        s += RHI <= dmax ? tag(dTag, yd(RHI), "ERL " + k$(RHI), C.cyan, dfo) : tag(dTag, L.d.yt + 4, "ERL " + k$(RHI) + " ↑", C.cyan, dfo);
        var dB = Math.max(3, dxd * 0.56);
        for (i = 0; i < DY.length; i++) s += candle(xd(i), yd, DY[i], pd(i, T), dB, 1);
        /* daily downtrend labels */
        var dto = fade(T, 16.4, 0.4) * (1 - fade(T, 17.6, 0.4));
        if (dto > 0) {
          s += txt(xd(2), yd(99.8) - 8, "LH", C.dn, 11, "middle", 700, dto);
          s += txt(xd(5), yd(96.8) - 8, "LH", C.dn, 11, "middle", 700, dto);
          s += txt(xd(4), yd(93.8) + 16 * FS, "LL", C.dn, 11, "middle", 700, dto);
          s += poly([[xd(0), yd(101.5)], [xd(7), yd(92)]], C.dn, 2, "6 5", dto * 0.8);
          s += txt(xd(4), yd(102.6), L.narrow ? "looks like a short" : "a downtrend · looks like a short", C.dn, 12, "middle", 700, dto);
        }
        /* the fractal */
        if (dDone(7, T) && T >= 17.6) {
          var fo = fade(T, 17.6, 0.3);
          s += hl(xd(7) - dxd * 0.4, xd(11) + dxd * 0.4, yd(L1), C.gold, "4 3", 1.4, fo);
          s += txt(xd(7), yd(L1) + 16 * FS, "low", C.gold, 11, "middle", 700, fo);
        }
        if (dDone(9, T)) {
          var ho = fade(T, TD[9][1], 0.3);
          s += hl(xd(9) - dxd * 0.4, xd(13) + dxd * 0.4, yd(H1), C.ink, "4 3", 1.4, ho);
          s += txt(xd(9) - dxd * 0.3, yd(H1) - 8, L.narrow ? "high" : "the high", C.ink, 11, "end", 700, ho);
        }
        if (dDone(11, T)) {
          var lo2 = fade(T, TD[11][1], 0.3);
          s += ring(xd(11), yd(L2), 10 * FS, C.gold, 2, lo2);
          s += txt(xd(11), yd(L2) + 22 * FS, L.narrow ? "taken" : "low taken", C.gold, 11, "middle", 700, lo2);
        }
        if (dDone(13, T)) {
          var mo = fade(T, TD[13][1], 0.3);
          s += txt(xd(11), yd(H1) - 8, "MSS", C.up, 12, "middle", 800, mo);
          s += rect(xd(8) - dxd * 0.5, yd(BRK_HI), dx1 - (xd(8) - dxd * 0.5), yd(BRK_LO) - yd(BRK_HI), C.up, 0.18 * mo, null, 2);
          s += txt(dx1 - 4, yd(BRK_HI) - 6, L.narrow ? "breaker" : "bullish breaker", C.up, 11.5, "end", 700, mo * (1 - fade(T, 20.4, 0.4)));
        }
        if (dDone(14, T)) {
          var eo = fade(T, TD[14][1], 0.3), done = T >= TD[23][1];
          s += hl(xd(14) - dxd * 0.4, done ? xd(23) : dx1, yd(D_ENTRY), C.ink, null, 1.8, eo);
          s += hl(xd(14) - dxd * 0.4, dx1, yd(D_STOP), C.dn, "5 4", 1.6, eo * (done ? 0.5 : 1));
          s += tri(xd(14), yd(93.4) + 12 * FS, true, C.up, 11, eo);
          s += tag(dTag, yd(D_ENTRY) - 2, "long " + k$(D_ENTRY), C.ink, eo);
          s += tag(dTag, yd(D_STOP) + 6, "stop " + k$(D_STOP), C.dn, eo);
          s += rect(xd(14) - dxd * 0.5, yd(D_ENTRY), Math.min(dxd, 14), yd(D_STOP) - yd(D_ENTRY), C.dn, 0.3 * eo);
          if (done) {
            var xo = fade(T, TD[23][1], 0.3);
            s += rect(xd(14) - dxd * 0.5, yd(RHI), Math.min(dxd, 14), yd(D_ENTRY) - yd(RHI), C.up, 0.22 * xo);
            s += ring(xd(23), yd(112), 11 * FS, C.cyan, 2.2, xo);
          }
        }
      }

      /* the summary line */
      if (sumo > 0) s += txt(L.narrow ? L.cx : L.d.x0, L.narrow ? L.d.yb + 30 * FS : L.d.yb + 30, L.narrow ? "Long " + k$(D_ENTRY) + " · " + D_R.toFixed(1) + "R vs " + W_R.toFixed(1) + "R weekly-only" : "Long " + k$(D_ENTRY) + " · stop " + k$(D_STOP) + " · out " + k$(RHI) + " = " + D_R.toFixed(1) + "R (weekly-only: " + W_R.toFixed(1) + "R)", C.cyan, 13, "start", 700, sumo);

      /* callouts */
      var cx0 = L.cx, cy0 = L.cy;
      s += callout(cx0, cy0, ["Trend · obvious, or not at all", "Higher highs, higher lows", "Swings: three candles each", "Buy near the next higher low"], C.ink, fade(T, 0.3, 0.3) * (1 - fade(T, 3.4, 0.3)));
      s += callout(cx0, cy0, ["Structure · MSB", "A body closes through the swing", "Not a wick", "Liquidity over " + k$(104) + " taken"], C.up, fade(T, 3.6, 0.3) * (1 - fade(T, 6.0, 0.3)));
      s += callout(cx0, cy0, ["Range · the current leg", k$(RLO) + " to " + k$(RHI) + " · 0.5 at " + k$(EQ), "Above: premium · below: discount", "OTE 0.618–0.786 · sweet spot 0.705"], C.gold, fade(T, 6.2, 0.3) * (1 - fade(T, 8.6, 0.3)));
      s += callout(cx0, cy0, ["Points of interest", "FVG " + k$(FVG_LO) + "–" + k$(FVG_HI) + " · OB " + k$(OB_LO) + "–" + k$(OB_HI), "Both in the discount: IRL", "ERL just taken → IRL next → ERL"], C.blue, fade(T, 8.8, 0.3) * (1 - fade(T, 11.2, 0.3)));
      s += callout(cx0, cy0, ["Into the FVG", "Weekly-only: buy " + k$(W_ENTRY), "Stop " + k$(W_STOP) + " under the range", "To " + k$(RHI) + ": " + W_R.toFixed(1) + "R"], C.ink, fade(T, 11.4, 0.3) * (1 - fade(T, 13.8, 0.3)));
      s += callout(cx0, cy0, ["Zoom in · weekly → daily", "Daily: lower highs, lower lows", "It's the weekly pullback", "Don't short it. Wait for the flip"], C.dn, fade(T, 14.0, 0.3) * (1 - fade(T, 17.4, 0.3)));
      s += callout(cx0, cy0, ["The breaker · long " + k$(D_ENTRY), "Low taken, then a close", "through the high that took it", "Stop " + k$(D_STOP) + " under the turn"], C.up, fade(T, 17.6, 0.3) * (1 - fade(T, 20.4, 0.3)));
      s += callout(cx0, cy0, ["Out · ERL " + k$(RHI), "Daily entry: " + D_R.toFixed(1) + "R", "Weekly-only: " + W_R.toFixed(1) + "R", "New MSB, new range, repeat"], C.cyan, fade(T, 20.6, 0.3));
      s += txt(L.W - 8, L.H - 6, "Illustrative · made-up bars", C.faint, 11, "end");
      return s;
    }

    var svg = root.querySelector("svg");
    var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
    var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay"), chips = root.querySelector(".anim-chips");
    var wrap = root.querySelector(".anim-scroll") || svg.parentNode;
    var T = END, playing = false, lastNow = 0, raf = 0, shown = -1, L = null;
    function layout() {
      var narrow = wrap.clientWidth > 0 && wrap.clientWidth < NARROW_BELOW;
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
      }, { threshold: 0.3 });
      io.observe(svg.parentNode || svg);
    }
    window.ICTAnim = { seek: function (t) { setPlaying(false); T = t; draw(); }, END: END, STAGES: STAGES,
      _levels: { EQ: EQ, OTE: [OTE1, OTE2, OTE3], W_R: W_R, D_R: D_R } };
  })();

  /* =====================================================================
     2. The six steps as a stepper, with a small chart per step
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ict-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 6) return;
    var INFO = [
      { k: "Trend",     c: C.ink,    tag: "Trend · up, down, or sideways" },
      { k: "Structure", c: C.up,     tag: "Structure · break or shift" },
      { k: "Range",     c: C.gold,   tag: "Range · the current leg, 0 / 0.5 / 1" },
      { k: "POI",       c: C.blue,   tag: "Points of interest · OB, breaker, FVG" },
      { k: "Liquidity", c: C.cyan,   tag: "Liquidity · external and internal" },
      { k: "Zoom in",   c: C.purple, tag: "Two time frames · the breaker entry" }
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
    /* candles in screen coordinates: y grows down, so pass "prices" as negative y */
    function cS(x, o, h, l, c, w) {
      var col = c <= o ? C.up : C.dn, top = Math.min(o, c), bh = Math.max(1.5, Math.abs(o - c)), wB = w || 14;
      return '<line x1="' + x + '" x2="' + x + '" y1="' + h + '" y2="' + l + '" stroke="' + col + '" stroke-width="1.4"/><rect x="' + (x - wB / 2) + '" y="' + top + '" width="' + wB + '" height="' + bh + '" rx="1.5" fill="' + col + '"/>';
    }

    /* step 1: three trends and the three candle swing */
    function trend(c) {
      var s = t(16, 24, "Clear and obvious, or call it sideways", C.faint, "start", null, 12);
      var cols = [[24, "Uptrend", C.up, [[0, 150], [30, 105], [52, 128], [86, 78], [108, 102], [140, 50]], "HH + HL"],
                  [196, "Downtrend", C.dn, [[0, 50], [30, 95], [52, 72], [86, 122], [108, 98], [140, 150]], "LH + LL"],
                  [368, "Sideways", C.gold, [[0, 100], [24, 62], [48, 136], [72, 70], [96, 130], [120, 66], [140, 120]], "no obvious trend"]];
      cols.forEach(function (k) {
        var ox = k[0], oy = 40;
        s += poly(k[3].map(function (p) { return [ox + p[0], oy + p[1]]; }), k[2], 3);
        s += t(ox + 70, 214, k[1], k[2], "middle", 700, 14);
        s += t(ox + 70, 232, k[4], C.faint, "middle", null, 11);
      });
      /* the three candle swing */
      s += hl(24, 536, 250, C.box, null, 1);
      s += t(24, 274, "Swings: three candles", C.ink, "start", 700, 12);
      s += cS(214, 300, 284, 318, 292, 12) + cS(238, 292, 266, 300, 274, 12) + cS(262, 278, 272, 310, 302, 12);
      s += t(238, 260, "swing high", C.up, "middle", 600, 11);
      s += cS(394, 272, 266, 300, 294, 12) + cS(418, 294, 288, 322, 310, 12) + cS(442, 308, 280, 314, 286, 12);
      s += t(418, 336, "swing low", C.teal, "middle", 600, 11);
      return s;
    }
    /* step 2: MSB and MSS */
    function structure(c) {
      var s = t(16, 24, "A body closes through the swing. A wick doesn't count", C.faint, "start", null, 12);
      var P = [[30, 260], [80, 190], [110, 222], [170, 130], [200, 168], [260, 80], [300, 130], [330, 108], [370, 200], [410, 168], [450, 250], [500, 290]];
      s += poly(P, C.ink, 3);
      s += hl(80, 160, 190, C.up, "4 3", 1.6); s += t(124, 182, "MSB", C.up, "middle", 700, 12);
      s += hl(170, 248, 130, C.up, "4 3", 1.6); s += t(212, 122, "MSB", C.up, "middle", 700, 12);
      s += t(260, 68, "higher high", C.up, "middle", 600, 11);
      s += hl(300, 362, 130, C.dim, "2 4", 1.2); s += t(300, 146, "last higher low", C.dim, "start", 600, 11);
      s += ring(358, 130, 9, C.dn, 2);
      s += t(372, 122, "MSS: the trend may be turning", C.dn, "start", 700, 12);
      s += t(330, 98, "lower high", C.dn, "middle", 600, 11);
      s += t(280, 322, "MSB: the trend continues · MSS: the last higher low breaks", c, "middle", 600, 12);
      return s;
    }
    /* step 3: the range */
    function range(c) {
      var s = t(16, 24, "Significant low to significant high of the current leg", C.faint, "start", null, 12);
      var yH = 60, yL = 280, y5 = (yH + yL) / 2, y618 = yH + 0.618 * (yL - yH), y705 = yH + 0.705 * (yL - yH), y786 = yH + 0.786 * (yL - yH);
      s += rect(150, yH, 280, y5 - yH, C.dn, 0.08); s += rect(150, y5, 280, yL - y5, C.up, 0.08);
      s += rect(150, y618, 280, y786 - y618, C.gold, 0.16);
      s += poly([[30, 250], [60, 280], [100, 200], [120, 220], [150, 60]], C.ink, 3);
      s += poly([[150, 60], [190, 140], [210, 120], [250, 200]], C.ink, 3, "6 5");
      [[yH, "1 · range high", C.ink], [y5, "0.5 · equilibrium", C.ink], [yL, "0 · range low", C.ink]].forEach(function (q) { s += hl(150, 540, q[0], q[2], "6 4", 1.3); s += t(540, q[0] - 5, q[1], q[2], "end", 600, 11); });
      s += hl(150, 540, y705, C.gold, "2 4", 1.2); s += t(540, y705 - 4, "0.705 sweet spot", C.gold, "end", 700, 11);
      s += t(540, y618 - 4, "0.618", C.gold, "end", null, 11); s += t(540, y786 + 13, "0.786", C.gold, "end", null, 11);
      s += t(290, y5 - 40, "premium · sell", C.dn, "middle", 700, 13);
      s += t(330, y786 + 34, "discount · buy", C.up, "middle", 700, 13);
      s += t(280, 330, "A new MSB means a new leg, and a new range", c, "middle", 600, 12);
      return s;
    }
    /* step 4: OB, breaker, FVG */
    function poi(c) {
      var s = t(16, 24, "Three kinds, all of them supply and demand", C.faint, "start", null, 12);
      /* order block */
      var ox = 20;
      s += rect(ox + 22, 182, 140, 42, C.purple, 0.22, null, 3);
      s += cS(ox + 30, 150, 145, 196, 186, 10) + cS(ox + 48, 186, 180, 222, 214, 10) + cS(ox + 66, 214, 200, 218, 160, 10) + cS(ox + 84, 160, 100, 166, 108, 10) + cS(ox + 102, 108, 70, 116, 78, 10);
      s += hl(ox + 10, ox + 150, 100, C.up, "4 3", 1.3); s += t(ox + 150, 94, "MSB", C.up, "end", 700, 10.5);
      s += t(ox + 80, 262, "Order block", C.purple, "middle", 700, 14);
      s += t(ox + 80, 280, "last down move before", C.faint, "middle", null, 11);
      s += t(ox + 80, 294, "the break · continuation", C.faint, "middle", null, 11);
      /* breaker */
      var bx = 200;
      s += rect(bx + 40, 112, 130, 40, C.up, 0.2, null, 3);
      s += poly([[bx + 6, 60], [bx + 40, 152], [bx + 62, 112], [bx + 92, 200], [bx + 122, 86], [bx + 140, 128], [bx + 168, 50]], C.ink, 2.6);
      s += t(bx + 92, 104, "bearish OB…", C.dn, "middle", 600, 10.5);
      s += t(bx + 150, 166, "…fails: support", C.up, "end", 600, 10.5);
      s += t(bx + 80, 262, "Breaker", C.up, "middle", 700, 14);
      s += t(bx + 80, 280, "a failed order block:", C.faint, "middle", null, 11);
      s += t(bx + 80, 294, "flips · often a reversal", C.faint, "middle", null, 11);
      /* FVG */
      var fx = 380;
      s += rect(fx + 20, 118, 140, 52, C.blue, 0.22, null, 3);
      s += cS(fx + 40, 200, 170, 214, 190, 14) + cS(fx + 80, 192, 80, 198, 90, 18) + cS(fx + 120, 90, 60, 118, 70, 14);
      s += t(fx + 160, 112, "top of 1", C.dim, "end", null, 10); s += t(fx + 160, 182, "bottom of 3", C.dim, "end", null, 10);
      s += t(fx + 80, 262, "Fair value gap", C.blue, "middle", 700, 14);
      s += t(fx + 80, 280, "one-way price, three", C.faint, "middle", null, 11);
      s += t(fx + 80, 294, "candles · shallow pullback", C.faint, "middle", null, 11);
      s += t(280, 330, "Two in one spot? Take the one in the discount (premium for shorts)", c, "middle", 600, 12);
      return s;
    }
    /* step 5: liquidity */
    function liq(c) {
      var s = t(16, 24, "What just got taken tells you where it goes next", C.faint, "start", null, 12);
      s += rect(120, 70, 300, 200, C.ink, 0.04);
      s += hl(60, 500, 70, C.cyan, "6 4", 1.4); s += t(500, 62, "ERL · the range high", C.cyan, "end", 700, 11);
      s += hl(60, 500, 270, C.cyan, "6 4", 1.4); s += t(500, 290, "ERL · the range low", C.cyan, "end", 700, 11);
      s += rect(150, 186, 120, 30, C.blue, 0.24, null, 3); s += t(156, 204, "IRL · FVG / OB", C.blue, "start", 700, 11);
      s += poly([[130, 250], [170, 200], [240, 70]], C.ink, 3);
      s += poly([[240, 70], [280, 140], [300, 120], [330, 200]], C.orange, 3, "6 5");
      s += tri(330, 206, false, C.orange, 11);
      s += poly([[340, 200], [400, 120], [450, 50]], C.cyan, 3, "6 5");
      s += tri(450, 44, true, C.cyan, 11);
      s += t(250, 56, "ERL taken", C.ink, "middle", 700, 11);
      s += t(350, 236, "→ draw: IRL", C.orange, "start", 700, 12);
      s += t(458, 44, "→ ERL", C.cyan, "start", 700, 12);
      s += t(280, 322, "Took external? Next is internal. Took internal? Next is external", c, "middle", 600, 12);
      return s;
    }
    /* step 6: zoom in, the breaker fractal */
    function zoom(c) {
      var s = t(16, 24, "On the low time frame, at the high time frame POI", C.faint, "start", null, 12);
      var P = [[30, 70], [70, 120], [92, 100], [130, 170], [160, 120], [190, 196], [230, 100], [260, 150], [300, 60], [340, 90], [400, 40]];
      s += rect(130, 118, 40, 30, C.up, 0.22, null, 3);
      s += poly(P, C.ink, 3);
      s += hl(120, 200, 170, C.gold, "4 3", 1.4); s += t(130, 186, "low", C.gold, "middle", 700, 11);
      s += ring(190, 196, 9, C.gold, 2); s += t(190, 222, "low taken", C.gold, "middle", 700, 11);
      s += hl(160, 260, 120, C.ink, "4 3", 1.4); s += t(232, 92, "close through: MSS", C.up, "middle", 700, 11);
      s += t(150, 112, "breaker", C.up, "middle", 700, 11);
      s += hl(250, 520, 146, C.ink, null, 1.8); s += t(520, 140, "entry · the breaker retest", C.ink, "end", 600, 11);
      s += hl(180, 520, 204, C.dn, "5 4", 1.6); s += t(520, 220, "stop · under the low before the turn", C.dn, "end", 600, 11);
      s += hl(300, 520, 40, C.cyan, "6 4", 1.4); s += t(520, 34, "target · ERL", C.cyan, "end", 700, 11);
      s += t(280, 280, "The low time frame flips back in line with the high time frame", c, "middle", 600, 12);
      s += t(280, 300, "Weekly → daily · daily → 1-hour · 4-hour → 15-minute · 1-hour → 5-minute", C.faint, "middle", null, 11);
      return s;
    }
    function chart(k) {
      var c = INFO[k].c;
      return [trend, structure, range, poi, liq, zoom][k](c);
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
      FS = 1; SF = svg.clientWidth > 0 && svg.clientWidth < 440 ? 1.2 : 1;
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
     3. Is it a trade? Trend, draw, premium/discount, POI, trigger
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ict-check]");
    if (!root) return;
    var out = root.querySelector(".ict-out"), rr = root.querySelector('[name="ret"]'), rrv = root.querySelector(".ict-retv");
    var lamps = root.querySelectorAll("[data-lamp]");
    function v(n) { var e = root.querySelector('[name="' + n + '"]'); return e.value; }
    function setLamp(k, ok) { lamps[k].className = "ict-lamp " + (ok === true ? "is-ok" : ok === "warn" ? "is-warn" : "is-no"); }
    function run() {
      var trend = v("trend"), side = v("side"), took = v("took"), poi = v("poi"), ltf = v("ltf"), r = parseFloat(rr.value);
      var zone = r > 100 ? "broken" : r >= 61.8 && r <= 78.6 ? "ote" : r >= 50 ? "disc" : "prem";
      var cheapWord = side === "long" ? "discount" : "premium";
      rrv.textContent = r.toFixed(0) + "% · " + (zone === "broken" ? "past the range " + (side === "long" ? "low" : "high") : zone === "ote" ? "OTE, " + cheapWord : zone === "disc" ? cheapWord : side === "long" ? "premium" : "discount");
      var withTrend = (trend === "up" && side === "long") || (trend === "down" && side === "short");
      var trendOk = trend === "side" ? false : withTrend;
      var drawOk = took === "int" ? true : "warn";
      var locOk = zone === "broken" ? false : zone === "prem" ? "warn" : true;
      var poiOk = poi === "none" ? false : true;
      var ltfOk = ltf === "mss" ? true : ltf === "htf" ? "warn" : false;
      setLamp(0, trendOk); setLamp(1, drawOk); setLamp(2, locOk); setLamp(3, poiOk); setLamp(4, ltfOk);
      var k, h, p;
      if (trend === "side") { k = "no"; h = "No obvious trend"; p = "If you can't tell whether it's making higher highs and higher lows or lower highs and lower lows, it's going sideways. The framework starts with a trend. Wait for one."; }
      else if (!withTrend) { k = "no"; h = "Against the trend"; p = "Legal on paper (the draw can be the pullback), but it's counter-trend. Early on, take only the trades in line with the high time frame trend: that's where the expansive moves are."; }
      else if (zone === "broken") { k = "no"; h = "Invalidated"; p = "Price went through the range " + (side === "long" ? "low: no longer higher lows, that's a market structure shift." : "high: no longer lower highs, that's a market structure shift.") + " The idea is wrong. Wait for a new structure and a new range."; }
      else if (poi === "none") { k = "no"; h = "No point of interest"; p = "A pullback into the middle of nowhere. Without an order block, breaker or fair value gap there's no reason for the turn to happen here. Wait, or let it go."; }
      else if (took === "ext") { k = "no"; h = "The draw is still internal"; p = "External liquidity was just taken, so the next draw is internal: the pullback into the POI isn't done. Wait for price to reach it before looking for the turn."; }
      else if (ltf === "against") { k = "b"; h = "At the POI: zoom in and wait"; p = "Everything on the high time frame lines up. The low time frame is still moving against you, which is normal: that's the pullback. Don't trade with it. Wait for a low to be taken and a close through the high that took it."; }
      else if (ltf === "htf") { k = "b"; h = "Valid, with a wide stop"; p = "Entering at the high time frame POI with the stop past the range " + (side === "long" ? "low" : "high") + " works, but the stop is wide and the R to external liquidity is small. Zooming in usually gives a tighter stop and a bigger R."; }
      else { k = zone === "prem" ? "b" : "a"; h = zone === "prem" ? "Take it, but it's expensive" : zone === "ote" ? "Take it: in the OTE, with the breaker" : "Take it: the breaker in the " + cheapWord;
        p = (zone === "prem" ? "The low time frame flipped, but price never got past the 0.5: the reward to risk is thinner. " : "") + "Entry at the breaker, stop past the low time frame " + (side === "long" ? "low" : "high") + " before the turn, target external range liquidity. Take a good chunk off before it if you like. If it fails and price digs deeper (still inside the range), you can try again."; }
      out.className = "chk-out ict-out is-" + k;
      out.innerHTML = "<b>" + h + "</b><p>" + p + "</p>";
    }
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    run();
  })();

  /* =====================================================================
     4. Three low time frame scripts
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ict-two]");
    if (!root) return;
    var svg = root.querySelector("svg"), btns = root.querySelectorAll("[data-case]"), note = root.querySelector(".ict-two-note"), again = root.querySelector("[data-play]");
    function mirror(b, m) { return [2 * m - b[0], 2 * m - b[2], 2 * m - b[1], 2 * m - b[3]]; }
    var LONG = DY.slice(3, 20);
    var CASES = {
      long: {
        title: "Long · the weekly FVG in the discount", side: "long",
        bars: LONG, zones: [[FVG_LO, FVG_HI, C.blue, "weekly FVG · discount"]], brk: [6, BRK_LO, BRK_HI], mss: 10,
        entryBar: 11, entry: D_ENTRY, stop: D_STOP, target: 104, exitBar: 16, win: true, pmin: 89, pmax: 105.5, tgtName: "toward ERL " + k$(RHI) + " ↑", tgtShort: "ERL ↑",
        note: "The daily pullback ends where the weekly map said it should: in the FVG, in the discount. A low gets taken, a candle closes through the high that took it, and the up candles turn into a bullish breaker. The chart stops partway; the plan runs to the range high."
      },
      short: {
        title: "Short · the weekly FVG in the premium", side: "short",
        bars: LONG.map(function (b) { return mirror(b, 97); }), zones: [[194 - FVG_HI, 194 - FVG_LO, C.blue, "weekly FVG · premium"]], brk: [6, 194 - BRK_HI, 194 - BRK_LO], mss: 10,
        entryBar: 11, entry: 194 - D_ENTRY, stop: 194 - D_STOP, target: 90, exitBar: 16, win: true, pmin: 88.5, pmax: 105, tgtName: "toward ERL " + k$(194 - RHI) + " ↓", tgtShort: "ERL ↓",
        note: "Weekly downtrend, a rally into a premium FVG, and the daily is in a clean uptrend: the crowd calls the bottom. A high gets taken, then a close under the low that took it: a bearish breaker. Short its retest, stop over the high before the turn."
      },
      retry: {
        title: "First try stopped · second try at the order block", side: "long",
        bars: [[99, 99.5, 96.5, 97], [97, 97.6, 94.6, 95], [95, 95.4, 92.4, 92.8], [92.8, 93.6, 91.2, 91.6], [91.6, 93.2, 91.4, 93], [93, 94.2, 92.8, 94],
               [94, 94.1, 91.8, 92.1], [92.1, 92.3, 90.9, 91.2], [91.2, 93.6, 91, 93.4], [93.4, 95.0, 93.2, 94.8], [94.8, 95, 93.6, 93.9], [93.9, 94, 89.8, 90.2],
               [90.2, 90.4, 86.6, 87], [87, 87.4, 85.2, 85.6], [85.6, 86.8, 85.1, 86.6], [86.6, 88.4, 86.4, 88.2], [88.2, 88.5, 84.6, 85], [85, 87.6, 84.8, 87.4],
               [87.4, 89, 87.2, 88.8], [88.8, 89.2, 87.4, 87.8], [87.8, 91.4, 87.6, 91.2], [91.2, 94, 91, 93.8]],
        zones: [[FVG_LO, FVG_HI, C.blue, "FVG"], [83.6, 86.4, C.purple, "order block, deeper"]], brk: [4, 91.6, 94.2], mss: 9,
        entryBar: 10, entry: 94, stop: 90.6, target: null, exitBar: 11, win: false, pmin: 83.5, pmax: 100.5,
        second: { brk: [14, 85.6, 88.4], mss: 18, entryBar: 19, entry: 87.8, stop: 84.3 },
        note: "The first breaker at the FVG gets stopped: −1R. Price digs deeper into the discount, but the range low (the real invalidation) still holds, so the idea isn't wrong yet. A second low time frame breaker forms at the order block, with another tight stop: one more kick at the can."
      }
    };
    var which = "long", T = 99, playing = false, raf = 0, last = 0, DUR = 7;
    function draw() {
      var cs = CASES[which], narrow = isNarrow(svg, 600);
      var W = narrow ? 440 : 1180, H = narrow ? 540 : 430;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.2 : 1;
      var x0 = narrow ? 14 : 30, x1 = narrow ? 290 : 900, xTag = x1 + 8, yt = 60, yb = H - 44;
      var n = cs.bars.length, dx = (x1 - x0) / n, long = cs.side === "long";
      function x(i) { return x0 + dx * (i + 0.5); }
      function y(p) { return yb - (p - cs.pmin) / (cs.pmax - cs.pmin) * (yb - yt); }
      var per = DUR / n;
      function done(i) { return T >= (i + 0.9) * per; }
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      s += txt(16, 28 * FS, cs.title, cs.win ? C.up : C.gold, 13, "start", 700);
      cs.zones.forEach(function (zn) {
        s += rect(x0, y(zn[1]), x1 - x0, y(zn[0]) - y(zn[1]), zn[2], 0.16, null, 2);
        s += txt(x0 + 6, y(zn[0]) - 6, zn[3], zn[2], 11.5, "start", 700);
      });
      function brkBox(bk, mss, col) {
        if (!done(mss)) return "";
        var r = rect(x(bk[0]) - dx * 0.5, y(bk[2]), x1 - (x(bk[0]) - dx * 0.5), y(bk[1]) - y(bk[2]), col, 0.2, null, 2);
        return r;
      }
      s += brkBox(cs.brk, cs.mss, long ? C.up : C.dn);
      if (cs.second) s += brkBox(cs.second.brk, cs.second.mss, C.up);
      var wB = Math.max(3, dx * 0.56);
      for (var i = 0; i < n; i++) {
        var p = clamp01((T - i * per) / (per * 0.85));
        if (p > 0) s += candle(x(i), y, cs.bars[i], p, wB, 1);
      }
      function trade(eb, entry, stop, target, xb, win, lbl) {
        if (!done(eb)) return "";
        var fin = done(xb), r = "", col = long ? C.up : C.dn;
        r += hl(x(eb) - dx * 0.5, fin ? x(xb) : x1, y(entry), C.ink, null, 1.8);
        r += hl(x(eb) - dx * 0.5, fin ? x(xb) : x1, y(stop), C.dn, "5 4", 1.5);
        r += tri(x(eb), long ? y(entry) + 22 * FS : y(entry) - 22 * FS, long, col, 11);
        r += txt(x(eb) - dx * 0.7, y(entry) + 4, lbl + " " + k$(entry), C.ink, 11.5, "end", 700);
        r += txt(x(eb) - dx * 0.7, y(stop) + 4, "stop " + k$(stop), C.dn, 11, "end", 600);
        if (fin) {
          r += ring(x(xb), y(win ? (long ? cs.bars[xb][1] : cs.bars[xb][2]) : stop), 10 * FS, win ? C.cyan : C.dn, 2.2);
          if (!win) r += txt(x(xb) - dx * 0.7, y(stop) + (long ? 22 : -12) * FS, "stopped · −1R", C.dn, 12, "end", 700);
        }
        return r;
      }
      s += trade(cs.entryBar, cs.entry, cs.stop, cs.target, cs.exitBar, cs.win, long ? "long" : "short");
      if (cs.second) s += trade(cs.second.entryBar, cs.second.entry, cs.second.stop, null, n - 1, true, "again");
      if (done(cs.mss)) s += tag(xTag, y((cs.brk[1] + cs.brk[2]) / 2), narrow ? "breaker" : "MSS · breaker", long ? C.up : C.dn, 1);
      if (cs.second && done(cs.second.mss)) s += tag(xTag, y((cs.second.brk[1] + cs.second.brk[2]) / 2), narrow ? "breaker 2" : "MSS · breaker 2", C.up, 1);
      if (cs.target != null && done(cs.entryBar)) s += tag(xTag, y(cs.target), narrow ? cs.tgtShort : cs.tgtName, C.cyan, 1);
      s += txt(W - 8, H - 8, "Illustrative · made-up bars", C.faint, 11, "end");
      svg.innerHTML = s; FS = 1;
      note.textContent = cs.note;
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-case") === which ? "true" : "false"); });
    }
    function tick(now) {
      if (!playing) return;
      T += Math.min(0.1, (now - last) / 1000); last = now;
      if (T >= DUR + 0.6) { T = 99; playing = false; }
      draw();
      if (playing) raf = requestAnimationFrame(tick);
    }
    function play() { if (REDUCED) { T = 99; draw(); return; } T = 0; playing = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
    btns.forEach(function (b) { b.addEventListener("click", function () { which = b.getAttribute("data-case"); play(); }); });
    again.addEventListener("click", play);
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
    draw();
    if (!REDUCED && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); play(); } }, { threshold: 0.4 });
      io.observe(svg);
    }
  })();

  /* =====================================================================
     5. The planner
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-ict-calc]");
    if (!root) return;
    var out = root.querySelector(".ict-cout"), calc = root.querySelector(".ict-ccalc");
    function v(n) { var e = root.querySelector('[name="' + n + '"]'); return e.tagName === "SELECT" ? e.value : parseFloat(e.value); }
    function money(x) { return "$" + Math.round(x).toLocaleString("en-US"); }
    function num(x) { return (Math.abs(x) >= 1000 ? Math.round(x).toLocaleString("en-US") : (+x.toFixed(4)).toLocaleString("en-US", { maximumFractionDigits: 4 })); }
    function row(a, b, cls) { return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + a + "</span><b>" + b + "</b></div>"; }
    function run() {
      var side = v("side"), lo = v("lo"), hi = v("hi"), poi = v("poi"), hst = v("hstop"), e = v("entry"), st = v("stop"), risk = v("risk");
      var long = side === "long";
      if ([lo, hi, poi, hst, e, st, risk].some(function (q) { return !isFinite(q); })) { out.className = "chk-out ict-cout is-no"; out.innerHTML = "<b>Fill in every box</b><p>Numbers only.</p>"; calc.innerHTML = ""; return; }
      if (hi <= lo) { out.className = "chk-out ict-cout is-no"; out.innerHTML = "<b>Check the range</b><p>The range high has to be above the range low.</p>"; calc.innerHTML = ""; return; }
      var leg = hi - lo, eq = lo + leg / 2;
      /* for a long the fib runs from the low (0) to the high (1), retracements measured down from the high; for a short, up from the low */
      function lvl(r) { return long ? hi - r * leg : lo + r * leg; }
      var tgt = long ? hi : lo;
      var hR = long ? (tgt - poi) / (poi - hst) : (poi - tgt) / (hst - poi);
      var lR = long ? (tgt - e) / (e - st) : (e - tgt) / (st - e);
      var rk = long ? e - st : st - e, hrk = long ? poi - hst : hst - poi;
      var ret = long ? (hi - poi) / leg : (poi - lo) / leg;
      if (rk <= 0 || hrk <= 0) { out.className = "chk-out ict-cout is-no"; out.innerHTML = "<b>Check the stops</b><p>" + (long ? "For a long both stops go below their entries." : "For a short both stops go above their entries.") + "</p>"; calc.innerHTML = ""; return; }
      var where = ret > 1 ? "past the range" : ret >= 0.618 && ret <= 0.786 ? "in the OTE" : ret >= 0.5 ? "in the " + (long ? "discount" : "premium") : "in the " + (long ? "premium" : "discount") + " (expensive)";
      var k, h, p;
      if (ret > 1) { k = "no"; h = "The POI is outside the range"; p = "Past the range " + (long ? "low" : "high") + " the trend has shifted. Redraw the range."; }
      else if (lR >= 2) { k = "a"; h = lR.toFixed(1) + "R zoomed in, against " + hR.toFixed(1) + "R"; p = "The POI is " + where + ". The low time frame entry cuts the stop to " + num(rk) + " from " + num(hrk) + "."; }
      else if (lR >= 1.5 || hR >= 1.5) { k = "b"; h = "Workable: " + Math.max(lR, hR).toFixed(1) + "R"; p = "Aim for about 2R or more. 1.5R isn't bad, and if price runs beyond the range " + (long ? "high" : "low") + " it gets better."; }
      else { k = "no"; h = "Thin: under 1.5R either way"; p = "The stop is too wide for the room to external liquidity. Wait for a deeper pullback, or a tighter low time frame turn."; }
      out.className = "chk-out ict-cout is-" + k;
      out.innerHTML = "<b>" + h + "</b><p>" + p + "</p>";
      var n = risk / rk, c = "";
      c += row("0.5", num(eq));
      c += row("OTE", num(lvl(0.618)) + " · " + num(lvl(0.705)) + " · " + num(lvl(0.786)));
      c += row("POI", (ret * 100).toFixed(0) + "% retraced, " + where);
      c += row("HTF only", hR.toFixed(2) + "R · risk " + num(hrk));
      c += row("Zoomed in", lR.toFixed(2) + "R · risk " + num(rk));
      c += row("Size for " + money(risk), num(n) + " units");
      c += row("At " + num(tgt), "+" + money(n * (long ? tgt - e : e - tgt)), "tot");
      calc.innerHTML = c;
    }
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    root.querySelector("select[name=side]").addEventListener("change", function (ev) {
      var long = ev.target.value === "long";
      var set = function (nm, x) { root.querySelector('[name="' + nm + '"]').value = x; };
      if (long) { set("lo", 80000); set("hi", 112000); set("poi", 92000); set("hstop", 79500); set("entry", 94000); set("stop", 90200); }
      else { set("lo", 82000); set("hi", 114000); set("poi", 102000); set("hstop", 114500); set("entry", 100000); set("stop", 103800); }
      run();
    });
    run();
  })();
})();

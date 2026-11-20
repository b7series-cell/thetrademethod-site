/* =====================================================================
   rf-anim.js — the animations on the Ready, Aim, Fire page.

   1. [data-rf-anim]    one trade, start to finish, on made-up 5-minute
      NQ bars drawn as volume profile candles (each candle carries its
      own little profile and point of control) with big trade bubbles:
      ready (the higher time frame) → aim (yesterday's profile, the
      overnight range, VWAP, the composite node) → pre-market fails at
      yesterday's POC → the open slices through the overnight low, no
      trade yet → the retest: big buyers, no reward → fire: short the
      failed retest → value steps lower → out at the prior day low.
   2. [data-rf-steps]   the six steps as a click-through stepper with a
      small chart per step.
   3. [data-rf-check]   is it a trade? context, side, location, trigger
      and reward to risk to the next level.
   4. [data-rf-two]     the winner and the loser, side by side scripts.
   5. [data-rf-calc]    the trade planner: R to the next and the second
      level, and the size for MNQ, NQ, MES or ES.

   Everything is scripted and labelled "Illustrative". No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#22d3ee", gold: "#f4b942", orange: "#ff9f0a", purple: "#bf5af2", teal: "#64d2ff",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e", gray: "#8e8e93" };
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
  function dot(x, y, r, col, op, stroke) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + col + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="1.2"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
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
  /* a volume profile candle: a thin candle on the left of its slot, its own
     profile to the right of it, and the candle's point of control */
  function vpCandle(x, yf, b, prog, slot, op, vmax, showProf) {
    if (prog <= 0) return "";
    var o = b[0], p = partial(b, prog), poc = b[4], v = b[5];
    var col = p.cur >= o ? C.up : C.dn, wB = Math.max(3, slot * 0.22), xc = x - slot * 0.2;
    var s = '<g opacity="' + (op == null ? 1 : op) + '">';
    if (showProf && prog > 0.25) {
      var lo = p.lo, hi = p.hi, sig = Math.max(7, (b[1] - b[2]) / 4), wMax = slot * 0.5 * (v / vmax) * clamp01((prog - 0.25) / 0.75), row = 4;
      for (var q = Math.floor(lo / row) * row; q < hi; q += row) {
        var mid = q + row / 2; if (mid < lo || mid > hi) continue;
        var wgt = Math.exp(-((mid - poc) * (mid - poc)) / (2 * sig * sig));
        var y1 = yf(q + row), y2 = yf(q);
        s += '<rect x="' + (xc + wB / 2 + 1.5).toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + Math.max(0.5, wMax * wgt).toFixed(1) + '" height="' + Math.max(0.6, (y2 - y1) - 0.6).toFixed(1) + '" fill="' + C.gray + '" opacity="0.42"/>';
      }
      if (prog >= 1) s += '<line x1="' + (xc - wB / 2).toFixed(1) + '" x2="' + (xc + wB / 2 + 1.5 + wMax * 0.95).toFixed(1) + '" y1="' + yf(poc).toFixed(1) + '" y2="' + yf(poc).toFixed(1) + '" stroke="' + C.ink + '" stroke-width="1.6" opacity="0.85"/>';
    }
    var top = yf(Math.max(o, p.cur)), bh = Math.max(1.5, Math.abs(yf(o) - yf(p.cur)));
    s += '<line x1="' + xc.toFixed(1) + '" x2="' + xc.toFixed(1) + '" y1="' + yf(p.hi).toFixed(1) + '" y2="' + yf(p.lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.4"/>' +
      '<rect x="' + (xc - wB / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + wB.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/>';
    return s + "</g>";
  }
  function pt(v) { return v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  function px(v) { return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function isNarrow(el, below) { return el.clientWidth > 0 && el.clientWidth < (below || 560); }

  /* ---------------------------------------------------------------------
     The day: made-up NQ 5-minute bars, 9:00 to 10:40. [o, h, l, c, poc, vol]
     0–5 pre-market pokes over yesterday's POC and fails · 6 the 9:30 bar
     slices through the value area low · 7 through the overnight low ·
     8 the retest: big buyers, high volume over the level, closes back
     under · 9 the short, at the open · 10–18 value steps lower · 18 the
     target at the prior day low · 19–20 buyers at the prior day low.
     --------------------------------------------------------------------- */
  var BARS = [
    [28372, 28386, 28366, 28383, 28378, 0.30], [28383, 28404, 28380, 28399, 28392, 0.34], [28399, 28412, 28388, 28391, 28402, 0.36],
    [28391, 28394, 28368, 28372, 28384, 0.30], [28372, 28384, 28362, 28378, 28372, 0.26], [28378, 28386, 28364, 28368, 28376, 0.28],
    [28368, 28374, 28262, 28270, 28298, 1.00], [28270, 28276, 28214, 28226, 28236, 0.84], [28226, 28284, 28220, 28238, 28266, 0.92],
    [28238, 28246, 28188, 28196, 28212, 0.70], [28196, 28204, 28150, 28160, 28172, 0.62], [28160, 28232, 28154, 28218, 28178, 0.58],
    [28218, 28226, 28140, 28148, 28160, 0.60], [28148, 28160, 28096, 28104, 28118, 0.56], [28104, 28130, 28090, 28122, 28110, 0.46],
    [28122, 28126, 28060, 28068, 28080, 0.52], [28068, 28084, 28040, 28048, 28058, 0.50], [28048, 28062, 28018, 28030, 28036, 0.48],
    [28030, 28044, 28002, 28012, 28020, 0.56], [28012, 28038, 27996, 28030, 28010, 0.60], [28030, 28052, 28022, 28046, 28036, 0.44]
  ];
  var N = BARS.length, VMAX = 1;
  var OPEN = 6, BRK = 7, RT = 8, EB = 9, BOUNCE = 11, TB_ = 18;
  var PDH = 28520, VAH = 28455, POC = 28380, VAL = 28320, ONH = 28412, ONL = 28250, PDL = 28000, HVN_LO = 27975, HVN_HI = 28020;
  var ENTRY = BARS[EB][0], DEF_HI = BARS[RT][1], STOP = 28297, TARGET = 28005;
  var RISK = STOP - ENTRY, REW = ENTRY - TARGET, RR = REW / RISK;
  var TIMES = ["9:00", "9:05", "9:10", "9:15", "9:20", "9:25", "9:30", "9:35", "9:40", "9:45", "9:50", "9:55", "10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30", "10:35", "10:40"];
  /* big trades: [bar, price, lots, buyer?] */
  var BIG = [
    [6, 28344, 280, false], [6, 28300, 380, false], [6, 28276, 240, false],
    [7, 28248, 260, false], [7, 28232, 190, false],
    [RT, 28276, 549, true], [RT, 28268, 310, true], [RT, 28282, 220, true], [RT, 28272, 330, false], [RT, 28250, 260, false],
    [EB, 28236, 300, false], [EB, 28214, 210, false],
    [19, 28000, 420, true], [19, 28010, 260, true]
  ];
  /* session VWAP from the bars (typical price × volume) */
  var VW = [], cpv = 0, cv = 0;
  BARS.forEach(function (b) { cpv += (b[1] + b[2] + b[3]) / 3 * b[5]; cv += b[5]; VW.push(cpv / cv); });

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-rf-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;

    var STAGES = [
      { at: 0,    title: "Ready: the higher time frame", text: "On the daily, the index has pulled back off its highs with lower highs, and the last two days are inside bars: a bearish lean inside a little balance. No FOMC, no big news. So: careful with longs, not married to shorts." },
      { at: 2.4,  title: "Aim: mark the levels", text: "From yesterday's full session profile: value area high " + pt(VAH) + ", POC " + pt(POC) + ", value area low " + pt(VAL) + ", and the prior day low " + pt(PDL) + ". The overnight range from the session changeover to 9:30: high " + pt(ONH) + ", low " + pt(ONL) + ". VWAP, and a big composite node at " + pt(HVN_LO) + " to " + pt(HVN_HI) + "." },
      { at: 5.0,  title: "Pre-market fails at yesterday's POC", text: "Before the open, buyers push over yesterday's POC to " + pt(ONH) + " and can't hold it. Price slips back under " + pt(POC) + ". Sellers are defending value from above." },
      { at: 8.0,  title: "The open slices through: no trade yet", text: "The 9:30 bar sells straight through the value area low, the next one through the overnight low at " + pt(ONL) + ". Aggressive, but there's nothing to read yet: no retest, no fight at the level. Don't chase it." },
      { at: 10.6, title: "The retest: big buyers, no reward", text: "Buyers lift it back over " + pt(ONL) + ". The big trades light up: 549 lots, 310, 220, all buying, and the candle's volume piles up above the level. Sellers meet them. Price can't get past " + pt(DEF_HI) + ": effort without reward." },
      { at: 13.2, title: "Fire: short the failed retest", text: "The candle closes back under the level, and its own POC sits lower than the retest high. Short " + pt(ENTRY) + " at the next open (the aggressive version sells it mid-candle as it breaks back under). Stop " + pt(STOP) + ", above the high the sellers defended, with room for a wick: " + RISK + " points." },
      { at: 15.8, title: "Value steps lower: hands off", text: "Each candle's POC prints lower than the last: value is migrating, not just price. A bounce to " + pt(BARS[BOUNCE][1]) + " never gets back over the level. The stop stays where it is; nothing to do." },
      { at: 19.0, title: "Out at the next area of interest", text: "The prior day low and the composite node sit together at the 28,000 evens. Cover at " + pt(TARGET) + ": +" + REW + " points, " + RR.toFixed(1) + "R. Buyers show up right there with 420 lots, which is why that's where the trade ends." }
    ];
    var TB = [];
    function segT(a, b, t0, step, dur) { for (var i = a; i <= b; i++) TB[i] = [t0 + (i - a) * step, t0 + (i - a) * step + dur]; }
    segT(0, 5, 5.2, 0.42, 0.32);
    segT(6, 7, 8.2, 0.9, 0.75);
    segT(8, 8, 10.8, 0, 1.8);
    segT(9, 12, 13.5, 0.6, 0.48);
    segT(13, 18, 16.0, 0.5, 0.4);
    segT(19, 20, 19.6, 0.55, 0.45);
    var END = 22.2;
    var T_E = TB[EB][0];
    var T_X = TB[TB_][0] + 0.7 * (TB[TB_][1] - TB[TB_][0]);
    function prog(i, T) { return clamp01((T - TB[i][0]) / (TB[i][1] - TB[i][0])); }

    function size(n) {
      return n ? { W: 440, H: 880, x0: 10, x1: 312, xTag: 318, yt: 214, yb: 800, cx: 12, cy: 14 }
               : { W: 1180, H: 660, x0: 24, x1: 920, xTag: 934, yt: 150, yb: 610, cx: 24, cy: 14 };
    }
    var PMIN = 27960, PMAX = 28470;

    function frame(T, L) {
      var s = "", i;
      var dx = (L.x1 - L.x0) / N;
      function x(i) { return L.x0 + dx * (i + 0.5); }
      function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
      var sumo = fade(T, 20.6, 0.3);
      s += txt(L.x0, L.yt - 14 * FS, L.narrow ? "5-minute · made-up NQ" : "5-minute · volume profile candles · a made-up NQ morning", C.faint, 12, "start", null, 1 - sumo);

      /* time axis */
      [0, 6, 12, 18].forEach(function (k) { s += txt(x(k) - dx * 0.2, L.yb + 22 * FS, TIMES[k], C.faint, 11, "middle"); });
      var oo = fade(T, 5.2, 0.4);
      s += ln(x(OPEN) - dx * 0.5, L.yt, x(OPEN) - dx * 0.5, L.yb, C.faint, "2 5", 1, oo * 0.7);
      if (!L.narrow) s += txt(x(OPEN) - dx * 0.5 + 6, L.yb - 8, "9:30 open", C.faint, 11, "start", null, oo);

      /* stage 0: the daily context inset */
      var io = fade(T, 0.3, 0.4) * (1 - fade(T, 2.4, 0.4));
      if (io > 0) {
        var ix = L.narrow ? 40 : 300, iy = L.narrow ? 330 : 250, iw = L.narrow ? 360 : 560, ih = L.narrow ? 300 : 260;
        s += rect(ix, iy, iw, ih, C.box, io * 0.9, null, 12);
        s += txt(ix + 14, iy + 24 * FS, "Daily · the last few weeks", C.faint, 12, "start", null, io);
        var D = [[60, 66, 56, 64], [64, 72, 62, 70], [70, 80, 68, 78], [78, 86, 74, 84], [84, 92, 82, 90], [90, 91, 80, 82], [82, 86, 72, 74], [74, 84, 70, 80], [80, 82, 66, 68],
                 [68, 76, 62, 72], [72, 78, 66, 70], [70, 75, 67, 72]];
        var dw = (iw - 40) / D.length;
        var dy = function (v) { return iy + ih - 34 - (v - 54) / 40 * (ih - 80); };
        D.forEach(function (b, k) {
          var cx = ix + 20 + dw * (k + 0.5), col = b[3] >= b[0] ? C.up : C.dn;
          s += ln(cx, dy(b[1]), cx, dy(b[2]), col, null, 1.4, io);
          s += rect(cx - dw * 0.22, dy(Math.max(b[0], b[3])), dw * 0.44, Math.max(2, Math.abs(dy(b[0]) - dy(b[3]))), col, io);
        });
        s += txt(ix + 20 + dw * 4.5, dy(92) - 8, "all-time highs", C.dim, 11.5, "middle", 600, io);
        s += txt(ix + 20 + dw * 8.2, dy(88) - 8, "lower highs", C.dn, 11.5, "middle", 600, io);
        s += rect(ix + 20 + dw * 9, dy(78), dw * 3, dy(62) - dy(78), C.gold, 0.12 * io);
        s += txt(ix + 20 + dw * 10.5, dy(62) + 16 * FS, "balance", C.gold, 11.5, "middle", 700, io);
      }

      /* stage 1: the levels */
      var lo = fade(T, 2.6, 0.5), ldim = T >= 13.2 ? 0.55 : 1;
      if (lo > 0) {
        s += rect(L.x0, y(HVN_HI), L.x1 - L.x0, y(HVN_LO) - y(HVN_HI), C.blue, 0.13 * lo);
        if (!L.narrow) s += txt(L.x0 + 6, y(HVN_LO) - 4, "composite high volume node", C.blue, 11, "start", 600, lo);
        var LV = [
          [VAH, "VAH", "prior VAH " + pt(VAH), C.purple, "5 4"], [ONH, "ON high", "overnight high " + pt(ONH), C.gold, "2 4"], [POC, "POC", "prior POC " + pt(POC), C.orange, null],
          [VAL, "VAL", "prior VAL " + pt(VAL), C.purple, "5 4"], [ONL, "ON low " + pt(ONL), "overnight low " + pt(ONL), C.gold, null], [PDL, "PDL " + pt(PDL), "prior day low " + pt(PDL), C.blue, null]
        ];
        LV.forEach(function (l, k) {
          var op = lo * clamp01((T - 2.6 - k * 0.25) / 0.3), key = l[0] === ONL;
          s += hl(L.x0, L.x1, y(l[0]), l[3], l[4], key ? 1.8 : 1.2, op * (key ? 1 : 0.8 * ldim));
          s += tag(L.xTag, y(l[0]), L.narrow ? l[1] : l[2], key ? l[3] : C.box, op * (key ? 1 : ldim), key ? "#000" : l[3]);
        });
        s += txt(L.x1 - 4, L.yt + 4, L.narrow ? "PDH " + pt(PDH) + " ↑" : "prior day high " + pt(PDH) + " ↑ off the chart", C.faint, 11, "end", null, lo);
      }
      /* VWAP */
      var vo = fade(T, 4.0, 0.4);
      if (vo > 0) {
        var d = "", lastI = -1;
        for (i = 0; i < N; i++) { if (prog(i, T) < 1) break; d += (d ? " L" : "M") + x(i).toFixed(1) + " " + y(VW[i]).toFixed(1); lastI = i; }
        if (d) s += '<path d="' + d + '" fill="none" stroke="' + C.teal + '" stroke-width="1.6" stroke-dasharray="1 0" opacity="' + (0.75 * vo).toFixed(3) + '"/>';
        if (lastI >= 0) s += txt(x(lastI) + dx * 0.3, y(VW[lastI]) - 6, "VWAP", C.teal, 11, "start", 600, vo * (lastI < 7 ? 1 : 0));
      }

      /* stage 2 marks: the failed poke */
      var po = fade(T, TB[2][1], 0.3) * (1 - fade(T, 8.0, 0.4));
      if (po > 0) s += txt(x(2), y(BARS[2][1]) - 12 * FS, L.narrow ? "fails" : "pokes over POC, fails", C.orange, 11.5, "middle", 700, po);
      /* stage 3: no trade on the slice */
      var no = fade(T, TB[BRK][1], 0.3) * (1 - fade(T, 10.6, 0.4));
      if (no > 0) {
        s += ring(x(BRK) - dx * 0.2, y(ONL), 13 * FS, C.ink, 2, no);
        s += txt(x(BRK) + dx * 0.6, y(ONL) + 34 * FS, L.narrow ? "no trade yet" : "through the level · no trade yet", C.ink, 12, "start", 700, no);
      }

      /* the trade */
      var eo = fade(T, T_E, 0.3);
      if (eo > 0) {
        var live = T < T_X;
        s += hl(x(EB) - dx * 0.5, live ? L.x1 : x(TB_), y(ENTRY), C.dn, null, 1.8, eo * (live ? 1 : 0.5));
        s += tri(x(EB) - dx * 0.2, y(ENTRY) - 12 * FS, false, C.dn, 11 * FS, eo);
        s += tag(L.xTag, y(ENTRY) + 22 * FS, "short " + pt(ENTRY), C.dn, eo * (live ? 1 : 0.5), "#000");
        if (live) {
          s += hl(x(RT) - dx * 0.5, L.x1, y(STOP), C.dn, "5 4", 1.6, eo);
          s += tag(L.xTag, y(STOP) - 4 * FS, "stop " + pt(STOP), C.dn, eo, "#000");
          s += hl(x(EB), L.x1, y(TARGET), C.cyan, "2 4", 1.4, eo);
          s += tag(L.xTag, y(TARGET) - 22 * FS, "target " + pt(TARGET), C.cyan, eo);
          var so = eo * (1 - fade(T, 15.8, 0.4));
          if (so > 0 && !L.narrow) {
            s += txt(L.x1 - 6, y(STOP) - 7, "above the defended high " + pt(DEF_HI) + ", room for a wick", C.dn, 11.5, "end", 600, so);
          }
        } else {
          s += tag(L.xTag, y(TARGET) - 22 * FS, "+" + REW + " · " + RR.toFixed(1) + "R", C.cyan, eo);
        }
      }
      var xo = fade(T, T_X, 0.25);
      if (xo > 0) {
        s += ring(x(TB_) - dx * 0.2, y(TARGET), 11 * FS, C.cyan, 2.2, xo);
      }
      /* value steps lower: connect the candle POCs */
      var vso = fade(T, 15.9, 0.4);
      if (vso > 0) {
        var vd = "";
        for (i = RT; i <= TB_; i++) { if (prog(i, T) < 1) break; vd += (vd ? " L" : "M") + (x(i) - dx * 0.2).toFixed(1) + " " + y(BARS[i][4]).toFixed(1); }
        if (vd) s += '<path d="' + vd + '" fill="none" stroke="' + C.ink + '" stroke-width="1.4" stroke-dasharray="3 4" opacity="' + (0.7 * vso * (1 - fade(T, 19.6, 0.4) * 0.6)).toFixed(3) + '"/>';
        if (!L.narrow) s += txt(x(13), y(BARS[11][4]) + 4, "candle POCs stepping lower", C.ink, 11.5, "start", 600, vso * (1 - fade(T, 19.0, 0.4)));
      }

      /* candles */
      for (i = 0; i < N; i++) {
        var p = prog(i, T);
        if (p <= 0) continue;
        s += vpCandle(x(i), y, BARS[i], p, dx, 1, VMAX, true);
      }
      /* big trades */
      BIG.slice().sort(function (a, b) { return (a[3] ? 1 : 0) - (b[3] ? 1 : 0); }).forEach(function (bt) {
        var p = prog(bt[0], T);
        if (p < 0.45) return;
        var op = clamp01((p - 0.45) / 0.3) * (bt[0] < RT && T > 13.2 ? 0.45 : 1);
        var r = (2.5 + Math.sqrt(bt[2]) * 0.4) * (L.narrow ? 0.75 : 1);
        var cx = x(bt[0]) + dx * (L.narrow ? 0.05 : 0.12);
        s += dot(cx, y(bt[1]), r, bt[3] ? C.up : C.gray, op * 0.42, bt[3] ? C.up : C.gray);
        if (bt[2] >= 300 && !L.narrow) s += txt(cx, y(bt[1]) + 4, String(bt[2]), C.ink, 10.5, "middle", 700, op);
      });
      if (!L.narrow) {
        var bo = fade(T, TB[RT][0] + 1.0, 0.3) * (1 - fade(T, 13.2, 0.4));
        s += txt(x(RT) + dx * 0.9, y(28340), "549 lots buying · price goes nowhere", C.up, 12, "start", 700, bo);
      } else {
        var bn = fade(T, TB[RT][0] + 1.0, 0.3) * (1 - fade(T, 13.2, 0.4));
        s += txt(x(RT) + dx * 0.7, y(DEF_HI) - 12 * FS, "549 lots, no reward", C.up, 11.5, "start", 700, bn);
      }

      if (sumo > 0) s += txt(L.x0, L.yt - 14 * FS, L.narrow ? "Short " + pt(ENTRY) + " · out " + pt(TARGET) + " · " + RR.toFixed(1) + "R" : "Short " + pt(ENTRY) + " · stop " + pt(STOP) + " (" + RISK + ") · out " + pt(TARGET) + " (+" + REW + ") = " + RR.toFixed(1) + "R", C.cyan, 13, "start", 700, sumo);

      /* callouts */
      var cx0 = L.cx, cy0 = L.cy;
      s += callout(cx0, cy0, ["Ready · the higher time frame", "Off the highs, lower highs", "Two inside days: balance", "Lean short, careful with longs"], C.ink, fade(T, 0.4, 0.3) * (1 - fade(T, 2.4, 0.3)));
      s += callout(cx0, cy0, ["Aim · the map", "Yesterday's VAH, POC, VAL, low", "Overnight high and low", "VWAP · the composite node"], C.gold, fade(T, 2.6, 0.3) * (1 - fade(T, 5.0, 0.3)));
      s += callout(cx0, cy0, ["Pre-market", "Over yesterday's POC", "and straight back under", "Sellers defend value"], C.orange, fade(T, 5.2, 0.3) * (1 - fade(T, 8.0, 0.3)));
      s += callout(cx0, cy0, ["9:30 · through the level", "Fast, one-sided, no retest", "Nothing to read yet", "No trade. Don't chase"], C.ink, fade(T, 8.2, 0.3) * (1 - fade(T, 10.6, 0.3)));
      s += callout(cx0, cy0, ["The retest · effort", "Big buyers: 549, 310, 220", "Volume piles up over " + pt(ONL), "No reward: stuck at " + pt(DEF_HI)], C.up, fade(T, 10.8, 0.3) * (1 - fade(T, 13.2, 0.3)));
      s += callout(cx0, cy0, ["Fire · short " + pt(ENTRY), "Closed back under the level", "Stop " + pt(STOP) + ": past the fight", "Risk " + RISK + " pts"], C.dn, fade(T, 13.4, 0.3) * (1 - fade(T, 15.8, 0.3)));
      s += callout(cx0, cy0, ["Value migrates lower", "Each candle's POC lower", "A bounce that can't reclaim", "Don't touch the stop"], C.ink, fade(T, 16.0, 0.3) * (1 - fade(T, 19.0, 0.3)));
      s += callout(cx0, cy0, ["Out · " + pt(TARGET), "Prior day low + composite node", "+" + REW + " pts · " + RR.toFixed(1) + "R", "Buyers step in right there"], C.cyan, fade(T, 19.2, 0.3));
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
    window.RFAnim = { seek: function (t) { setPlaying(false); T = t; draw(); }, END: END, STAGES: STAGES,
      _levels: { ENTRY: ENTRY, STOP: STOP, TARGET: TARGET, RISK: RISK, REW: REW, RR: RR, DEF_HI: DEF_HI, VWAP: VW } };
  })();

  /* =====================================================================
     2. The six steps as a stepper, with a small chart per step
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-rf-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 6) return;
    var INFO = [
      { k: "Ready",  c: C.ink,    tag: "Ready · the higher time frame regime" },
      { k: "Aim",    c: C.gold,   tag: "Aim · the levels, marked before the open" },
      { k: "Wait",   c: C.orange, tag: "Aim · wait for price to reach a level" },
      { k: "Fire",   c: C.dn,     tag: "Fire · effort without reward, then rejection" },
      { k: "Stop",   c: C.purple, tag: "Protect · past the fight, with room" },
      { k: "Target", c: C.cyan,   tag: "Manage · the next area of interest, 1:1 or better" }
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
    function path(P, col, w, dash) { return '<polyline points="' + P.map(function (p) { return p[0] + "," + p[1]; }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 3) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + ' stroke-linejoin="round" stroke-linecap="round"/>'; }

    /* step 1: three regimes */
    function ready(c) {
      var s = t(16, 24, "Daily structure first: monthly, weekly, daily, then the 15-minute", C.faint, "start", null, 12);
      var cols = [[24, "Uptrend", C.up, [[0, 200], [40, 140], [64, 170], [104, 100], [128, 132], [168, 60]], "Trade with it", "careful with shorts"],
                  [200, "Downtrend", C.dn, [[0, 60], [40, 120], [64, 92], [104, 160], [128, 128], [168, 200]], "Trade with it", "careful with longs"],
                  [376, "Balance", C.gold, [[0, 130], [28, 80], [56, 175], [84, 85], [112, 170], [140, 90], [168, 165]], "Fade the edges", "careful with breakouts"]];
      cols.forEach(function (k) {
        var ox = k[0], oy = 60;
        if (k[1] === "Balance") s += rect(ox, oy + 74, 168, 108, C.gold, 0.1);
        s += path(k[3].map(function (p) { return [ox + p[0], oy + p[1] * 0.9]; }), k[2], 3);
        s += t(ox + 84, 270, k[1], k[2], "middle", 700, 14);
        s += t(ox + 84, 292, k[4], C.ink, "middle", 600, 12);
        s += t(ox + 84, 310, k[5], C.faint, "middle", null, 11);
      });
      s += t(280, 334, "Then check the news: FOMC week, or a quiet Monday?", c, "middle", 600, 12);
      return s;
    }
    /* step 2: the level ladder */
    function aim(c) {
      var s = t(16, 24, "Marked before 9:30, from yesterday and the overnight", C.faint, "start", null, 12);
      var prof = [[60, 10], [74, 18], [88, 30], [102, 44], [116, 70], [130, 96], [144, 120], [158, 104], [172, 80], [186, 58], [200, 40], [214, 26], [228, 18], [242, 12]];
      prof.forEach(function (p) { s += rect(30, p[0], p[1], 12, C.gray, 0.45); });
      s += rect(30, 82, 160, 140, C.purple, 0.08);
      var LV = [[64, "Prior day high", C.dim], [84, "Value area high", C.purple], [118, "Overnight high", C.gold], [150, "POC · most volume", C.orange], [176, "VWAP (today)", C.teal],
                [222, "Value area low", C.purple], [250, "Overnight low", C.gold], [282, "Prior day low", C.dim], [306, "Composite node · GEX wall", C.blue]];
      LV.forEach(function (l) { s += hl(170, 540, l[0], l[2], l[1] === "POC · most volume" ? null : "5 4", 1.4, 0.95); s += t(540, l[0] - 5, l[1], l[2], "end", 600, 12); });
      s += t(30, 330, "yesterday's full session profile", C.faint, "start", null, 11);
      return s;
    }
    /* step 3: in the middle vs at the level */
    function wait(c) {
      var s = t(16, 24, "Location: a level that has made traders react before", C.faint, "start", null, 12);
      function side(ox, at) {
        var r = "";
        r += hl(ox, ox + 240, 90, C.purple, "5 4", 1.4); r += t(ox + 240, 84, "VAL", C.purple, "end", 600, 11);
        r += hl(ox, ox + 240, 240, C.gold, "5 4", 1.4); r += t(ox + 240, 258, "overnight low", C.gold, "end", 600, 11);
        if (at) { r += hl(ox, ox + 240, 236, C.teal, "2 4", 1.4); r += t(ox + 240, 230, "+ VWAP", C.teal, "end", 600, 11); }
        var P = at ? [[ox + 10, 110], [ox + 60, 160], [ox + 110, 200], [ox + 150, 240], [ox + 175, 228], [ox + 200, 244]] : [[ox + 10, 110], [ox + 60, 140], [ox + 110, 170], [ox + 150, 160]];
        r += path(P, c, 3);
        r += dot(P[P.length - 1][0], P[P.length - 1][1], 6, at ? C.up : C.dn);
        r += t(ox + 120, 300, at ? "At stacked levels: get ready" : "In the middle: no trade", at ? C.up : C.dn, "middle", 700, 13);
        r += t(ox + 120, 318, at ? "now watch the order flow" : "you're inside the move", C.faint, "middle", null, 11);
        return r;
      }
      s += side(20, false); s += side(300, true);
      return s;
    }
    /* step 4: the trigger, up close */
    function fire(c) {
      var s = t(16, 24, "5-minute · the retest candle up close", C.faint, "start", null, 12);
      var lvl = 170, yf = function (p) { return 170 - (p - 28250) * 2.6; };
      s += hl(20, 540, lvl, C.gold, null, 1.6); s += t(540, lvl + 16, "overnight low · the level", C.gold, "end", 600, 11);
      var b1 = [28270, 28276, 28214, 28226, 28236, 0.84], b2 = [28226, 28284, 28220, 28238, 28266, 0.92], b3 = [28238, 28246, 28188, 28196, 28212, 0.7];
      s += vpCandle(110, yf, b1, 1, 120, 0.5, 1, true);
      s += vpCandle(260, yf, b2, 1, 120, 1, 1, true);
      s += vpCandle(400, yf, b3, 1, 120, 0.8, 1, true);
      [[28276, 549], [28268, 310], [28282, 220]].forEach(function (q) { s += dot(262, yf(q[0]), 3 + Math.sqrt(q[1]) * 0.55, C.up, 0.42, C.up); });
      s += t(262, yf(28276) + 4, "549", C.ink, "middle", 700, 10.5);
      s += t(300, yf(28290), "effort: big buyers", C.up, "start", 700, 12);
      s += t(300, yf(28290) + 16, "reward: none", C.dn, "start", 700, 12);
      s += tri(400 - 24, yf(28238) - 14, false, C.dn, 11);
      s += t(366, yf(28238) - 22, "fire", C.dn, "end", 700, 12);
      s += t(280, 330, "Big trades + volume over the level + back under it", c, "middle", 600, 12);
      return s;
    }
    /* step 5: the stop */
    function stop(c) {
      var s = t(16, 24, "Above the high the sellers defended, not pinned to it", C.faint, "start", null, 12);
      function side(ox, room) {
        var r = "", hi = 110, lvl = 170;
        r += hl(ox, ox + 240, lvl, C.gold, null, 1.4);
        r += hl(ox, ox + 240, hi, C.dim, "2 4", 1.2); r += t(ox + 240, hi - 6, "defended high", C.dim, "end", 600, 11);
        var sy = room ? 78 : 104;
        r += hl(ox, ox + 240, sy, C.dn, "5 4", 1.8); r += t(ox, sy - 6, room ? "stop · with room" : "stop · pinned", C.dn, "start", 700, 11);
        r += path([[ox + 20, 200], [ox + 60, 120], [ox + 90, 180], [ox + 130, room ? 92 : 98], [ox + 160, 200], [ox + 210, 270]], room ? C.up : C.dn, 3);
        if (!room) r += ring(ox + 130, 98, 9, C.dn, 2);
        r += t(ox + 120, 300, room ? "The wick tests it, you're still in" : "One wick and you're out", room ? C.up : C.dn, "middle", 700, 13);
        r += t(ox + 120, 318, room ? "then it works" : "then it works without you", C.faint, "middle", null, 11);
        return r;
      }
      s += side(20, false); s += side(300, true);
      return s;
    }
    /* step 6: the target */
    function target(c) {
      var s = t(16, 24, "Next area of interest, with at least 1:1 to it", C.faint, "start", null, 12);
      var e = 80, st = 50, l1 = 140, l2 = 250;
      s += hl(40, 520, st, C.dn, "5 4", 1.6); s += t(520, st - 6, "stop", C.dn, "end", 600, 11);
      s += hl(40, 520, e, C.ink, null, 2); s += t(520, e - 6, "short", C.ink, "end", 700, 11);
      s += hl(40, 520, l1, C.purple, "5 4", 1.4); s += t(520, l1 - 6, "next level · 2R", C.purple, "end", 600, 11);
      s += hl(40, 520, l2, C.cyan, null, 1.6); s += t(520, l2 - 6, "prior day low + composite node · 5.7R", C.cyan, "end", 700, 11);
      s += rect(70, st, 22, e - st, C.dn, 0.4); s += rect(70, e, 22, l2 - e, C.up, 0.3);
      s += t(100, (st + e) / 2 + 4, "1R", C.dn, "start", 700, 12);
      s += path([[150, 80], [190, 120], [210, 104], [260, 170], [290, 150], [340, 230], [380, 250]], c, 3);
      s += ring(380, 250, 9, c, 2);
      s += t(280, 300, "Under 1:1 to the next or the second level? Skip it.", c, "middle", 700, 12);
      s += t(280, 318, "Don't move the stop, don't jump to break even.", C.faint, "middle", null, 11);
      return s;
    }
    function chart(k) {
      var c = INFO[k].c, s = "";
      s += [ready, aim, wait, fire, stop, target][k](c);
      s += t(552, 334, k === 3 ? "Illustrative · made-up bars" : "", C.faint, "end", null, 11);
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
     3. Is it a trade? All three pieces, plus the 1:1 rule
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-rf-check]");
    if (!root) return;
    var out = root.querySelector(".rf-out"), rr = root.querySelector('[name="rr"]'), rrv = root.querySelector(".rf-rrv");
    var lamps = root.querySelectorAll("[data-lamp]");
    function v(n) { var e = root.querySelector('[name="' + n + '"]'); return e.value; }
    function setLamp(k, ok) { lamps[k].className = "rf-lamp " + (ok === true ? "is-ok" : ok === "warn" ? "is-warn" : "is-no"); }
    function run() {
      var ctx = v("ctx"), side = v("side"), loc = v("loc"), trig = v("trig"), r = parseFloat(rr.value);
      rrv.textContent = r.toFixed(2) + " : 1";
      var against = (ctx === "up" && side === "short") || (ctx === "down" && side === "long");
      var readyOk = against ? false : true;
      var aimOk = loc === "middle" ? false : loc === "stack" ? true : "warn";
      var fireOk = trig === "none" ? false : trig === "slow" ? false : true;
      setLamp(0, readyOk); setLamp(1, aimOk); setLamp(2, fireOk); setLamp(3, r >= 1);
      var k, h, p;
      if (against) { k = "no"; h = "Ready says no"; p = (ctx === "up" ? "Shorting a market that keeps making higher highs and higher lows" : "Buying a market that keeps breaking lower day over day") + ". Maybe a scalp in there, but this is fading the big money. Be cautious, or pass."; }
      else if (loc === "middle") { k = "no"; h = "Aim says no: you're in the middle"; p = "Trend right, trigger maybe, but no level that has made traders react before. You're entering in the middle of the move. Wait for price to reach one."; }
      else if (trig === "none") { k = "no"; h = "Fire says no: no trigger"; p = "Selling or buying a level blind, even with the trend, is how you get smoked. Sit on your hands until the auction shows you one side putting in effort and not getting paid."; }
      else if (trig === "slow") { k = "no"; h = "Fire says no: nothing to read"; p = "A slow grind into the level, no big trades, little volume above it. It might still work, but don't talk yourself into it: explaining your way in is how the model stops being a model."; }
      else if (r < 1) { k = "no"; h = "All three, but under 1:1"; p = "Everything lines up, but the stop past the fight is too wide for the room to the next and second level. At coin-flip odds that's a losing bet. Valid, not tradable."; }
      else { k = loc === "stack" ? "a" : "b"; h = loc === "stack" ? "Fire: " + r.toFixed(2) + "R, levels stacked" : "Fire: " + r.toFixed(2) + "R"; p = (ctx === "bal" ? "In balance: fading the edge back toward the other side of the range. " : "With the higher time frame, off a pullback to a level. ") + "Market order on the rejection (or after the candle closes), stop past the fight, target the next area of interest, then leave it alone."; }
      out.className = "chk-out rf-out is-" + k;
      out.innerHTML = "<b>" + h + "</b><p>" + p + "</p>";
    }
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    run();
  })();

  /* =====================================================================
     4. The winner and the loser
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-rf-two]");
    if (!root) return;
    var svg = root.querySelector("svg"), btns = root.querySelectorAll("[data-case]"), note = root.querySelector(".rf-two-note"), again = root.querySelector("[data-play]");
    var CASES = {
      win: {
        title: "Friday · the overnight low", lvl: 28250, lvlName: "overnight low", side: "short",
        bars: BARS.slice(4, 14), entryBar: 5, entry: ENTRY, stop: STOP, target: TARGET, exitBar: 9, exitP: 28104, win: true,
        big: [[4, 28276, 549, true], [4, 28268, 310, true], [4, 28282, 220, true], [5, 28236, 300, false]],
        pmin: 28080, pmax: 28400,
        note: "Through the overnight low, buyers try to take it back with size, fail, and value steps lower. The plan ran on to the prior day low at " + pt(TARGET) + " (+" + REW + ", " + RR.toFixed(1) + "R); the chart stops partway."
      },
      loss: {
        title: "Two days earlier · yesterday's POC", lvl: 28380, lvlName: "prior day POC", side: "short",
        bars: [[28330, 28352, 28326, 28348, 28338, 0.5], [28348, 28372, 28344, 28366, 28360, 0.6], [28366, 28392, 28360, 28384, 28386, 0.9], [28384, 28390, 28362, 28366, 28380, 0.85],
               [28366, 28374, 28352, 28360, 28364, 0.6], [28360, 28382, 28356, 28378, 28370, 0.55], [28378, 28396, 28374, 28392, 28386, 0.6], [28392, 28408, 28386, 28404, 28398, 0.62],
               [28404, 28418, 28398, 28414, 28410, 0.7], [28414, 28426, 28408, 28420, 28416, 0.5]],
        entryBar: 4, entry: 28366, stop: 28412, target: 28300, exitBar: 8, exitP: 28412, win: false,
        big: [[2, 28388, 410, true], [2, 28382, 260, true], [3, 28372, 280, false], [4, 28358, 230, false]],
        pmin: 28290, pmax: 28440,
        note: "A good read: buyers push into yesterday's POC with size, get rejected, and sellers are even rewarded for a candle. Then it drifts higher and takes the stop: −46 points, −1R. A normal loss. Nothing to fix."
      }
    };
    var which = "win", T = 99, playing = false, raf = 0, last = 0, DUR = 6.5;
    function draw() {
      var cs = CASES[which], narrow = isNarrow(svg, 600);
      var W = narrow ? 440 : 1180, H = narrow ? 520 : 420;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.2 : 1;
      var x0 = narrow ? 14 : 30, x1 = narrow ? 300 : 900, xTag = x1 + 8, yt = 60, yb = H - 44;
      var n = cs.bars.length, dx = (x1 - x0) / n;
      function x(i) { return x0 + dx * (i + 0.5); }
      function y(p) { return yb - (p - cs.pmin) / (cs.pmax - cs.pmin) * (yb - yt); }
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      s += txt(16, 28 * FS, cs.title, cs.win ? C.up : C.dn, 13, "start", 700);
      s += hl(x0, x1, y(cs.lvl), C.gold, null, 1.8);
      s += tag(xTag, y(cs.lvl), narrow ? pt(cs.lvl) : cs.lvlName + " " + pt(cs.lvl), C.gold, 1);
      var per = DUR / n;
      for (var i = 0; i < n; i++) {
        var p = clamp01((T - i * per) / (per * 0.85));
        if (p > 0) s += vpCandle(x(i), y, cs.bars[i], p, dx, 1, 1, true);
      }
      cs.big.forEach(function (bt) {
        var p = clamp01((T - bt[0] * per) / (per * 0.85));
        if (p < 0.5) return;
        s += dot(x(bt[0]) + dx * 0.12, y(bt[1]), (2.5 + Math.sqrt(bt[2]) * 0.4) * (narrow ? 0.8 : 1), bt[3] ? C.up : C.gray, 0.42, bt[3] ? C.up : C.gray);
        if (!narrow && bt[2] >= 300) s += txt(x(bt[0]) + dx * 0.12, y(bt[1]) + 4, String(bt[2]), C.ink, 10.5, "middle", 700);
      });
      var te = cs.entryBar * per;
      if (T >= te) {
        var done = T >= (cs.exitBar + 0.8) * per;
        s += hl(x(cs.entryBar) - dx * 0.5, done ? x(cs.exitBar) : x1, y(cs.entry), C.dn, null, 1.8);
        s += hl(x(cs.entryBar) - dx * 0.5, x1, y(cs.stop), C.dn, "5 4", 1.5, done && cs.win ? 0.4 : 1);
        s += tag(xTag, y(cs.entry) + 14 * FS, "short " + pt(cs.entry), C.dn, 1);
        s += tag(xTag, y(cs.stop) - 4 * FS, "stop " + pt(cs.stop), C.dn, 1);
        if (cs.target >= cs.pmin) s += tag(xTag, y(cs.target), "target " + pt(cs.target), C.cyan, 1);
        if (done) {
          s += ring(x(cs.exitBar) - dx * 0.2, y(cs.exitP), 11 * FS, cs.win ? C.cyan : C.dn, 2.2);
          s += txt(x(cs.exitBar) - dx * 0.8, y(cs.exitP) + (cs.win ? 30 : -16) * FS, cs.win ? "value keeps stepping lower" : "stopped · −1R", cs.win ? C.cyan : C.dn, 12.5, "end", 700);
        }
      }
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
     5. The trade planner
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-rf-calc]");
    if (!root) return;
    var out = root.querySelector(".rf-cout"), calc = root.querySelector(".rf-ccalc");
    function v(n) { var e = root.querySelector('[name="' + n + '"]'); return e.tagName === "SELECT" ? e.value : parseFloat(e.value); }
    function money(x) { return "$" + Math.round(x).toLocaleString("en-US"); }
    function row(a, b, cls) { return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + a + "</span><b>" + b + "</b></div>"; }
    function run() {
      var side = v("side"), e = v("entry"), st = v("stop"), t1 = v("t1"), t2 = v("t2"), pv = parseFloat(v("ct")), risk = v("risk");
      var long = side === "long";
      if ([e, st, t1, t2, risk].some(function (q) { return !isFinite(q); })) { out.className = "chk-out rf-cout is-no"; out.innerHTML = "<b>Fill in every box</b><p>Numbers only.</p>"; calc.innerHTML = ""; return; }
      var rk = long ? e - st : st - e;
      if (rk <= 0) { out.className = "chk-out rf-cout is-no"; out.innerHTML = "<b>Check the stop</b><p>" + (long ? "For a long the stop goes below the entry, past the low the buyers defended." : "For a short the stop goes above the entry, past the high the sellers defended.") + "</p>"; calc.innerHTML = ""; return; }
      var g1 = long ? t1 - e : e - t1, g2 = long ? t2 - e : e - t2, r1 = g1 / rk, r2 = g2 / rk;
      var ticks = rk / 0.25, n = pv > 0 ? Math.floor(risk / (rk * pv)) : 0;
      var k, h, p;
      if (g1 <= 0 || g2 <= 0) { k = "no"; h = "Check the levels"; p = "A target is on the wrong side of the entry."; }
      else if (r1 >= 1) { k = "a"; h = "Take it: " + r1.toFixed(2) + "R to the next level"; p = "At least 1:1 to the next area of interest. Set the stop and the target, then leave both alone."; }
      else if (r2 >= 1) { k = "b"; h = "Only to the second level: " + r2.toFixed(2) + "R"; p = "The next level is under 1:1, the second one isn't. Target the second area of interest, or pass."; }
      else { k = "no"; h = "No trade: under 1:1 to both"; p = "The setup may be valid, but the risk can't be structured. At coin-flip odds a sub-1:1 trade loses money over time."; }
      out.className = "chk-out rf-cout is-" + k;
      out.innerHTML = "<b>" + h + "</b><p>" + p + "</p>";
      var c = "";
      c += row("Stop distance", pt(rk) + " pts &middot; " + Math.round(ticks) + " ticks");
      c += row("Next level", (g1 > 0 ? "+" : "") + pt(g1) + " pts &middot; " + r1.toFixed(2) + "R");
      c += row("Second level", (g2 > 0 ? "+" : "") + pt(g2) + " pts &middot; " + r2.toFixed(2) + "R");
      c += row("Contracts for " + money(risk), n > 0 ? n + " &middot; " + money(n * rk * pv) + " at risk" : "under 1: risk less or skip");
      if (n > 0) c += row("At the " + (r1 >= 1 ? "next" : "second") + " level", "+" + money(n * (r1 >= 1 ? g1 : g2) * pv), "tot");
      calc.innerHTML = c;
    }
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    root.querySelector("select[name=side]").addEventListener("change", function (ev) {
      var long = ev.target.value === "long";
      var set = function (nm, x) { root.querySelector('[name="' + nm + '"]').value = x; };
      if (long) { set("entry", 28262); set("stop", 28203); set("t1", 28320); set("t2", 28380); }
      else { set("entry", ENTRY); set("stop", STOP); set("t1", 28120); set("t2", TARGET); }
      run();
    });
    run();
  })();
})();

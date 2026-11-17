/* =====================================================================
   laf-anim.js — the animations on the Look Above and Fail page.

   1. [data-laf-anim]   one short, start to finish, on 2-minute bars of a
      made-up NQ session, in eight stages: the first 30 minutes (the
      developing value area jumps around) → 10:00, mark VAH, VAL and POC
      → wait, the middle is noise → look above: buyers get aggressive
      over VAH (big trades at the offer, a buy-side delta imbalance) →
      the fail: back under VAH fast, short the reclaim, stop over the
      75-lot print → POC, the first target → the other side of balance
      → the math.
   2. [data-laf-steps]  the six steps as a click-through stepper with a
      small chart of the walkthrough that lights up per step.
   3. [data-laf-dev]    the first 30 minutes: a time slider over the same
      bars, with the developing VAH / POC / VAL as they were at each bar
      and the prior day's value area.
   4. [data-laf-two]    aggressive or conservative: the same look below
      VAL twice, a fast flip (market order on the reclaim) and a slow
      creep (wait for the retest to hold as a higher low).
   5. [data-laf-calc]   plan the trade: stop choices, R to POC and to the
      other side, the 2R check, contracts and the VIX soft rule.

   The value area is computed here from the bars (2-point rows, 70% of
   volume, the usual expansion from the POC), so every number the page
   prints comes from the same bars. The bars are scripted and labelled
   "Illustrative". No market data.
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

  /* ---------------------------------------------------------------------
     The bars: a made-up NQ session on 2-minute bars from 9:30, tick 0.25.
     [o, h, l, c, volume (relative)]. 0–14 the first 30 minutes, 15–24
     rotation inside value, 25–27 the look above, 28 the fail, 29 POC,
     30 VAL, 31–32 chop at the low edge.
     --------------------------------------------------------------------- */
  var BARS = [
    [25150, 25172, 25141, 25168, 9], [25168, 25186, 25160, 25181, 8], [25181, 25194, 25170, 25174, 7.5], [25174, 25178, 25151, 25156, 7.5],
    [25156, 25162, 25128, 25133, 7], [25133, 25141, 25112, 25121, 6.5], [25121, 25139, 25116, 25136, 6], [25136, 25158, 25132, 25154, 5.5],
    [25154, 25167, 25147, 25150, 5], [25150, 25159, 25138, 25141, 4.5], [25141, 25149, 25129, 25146, 4.5], [25146, 25163, 25143, 25160, 4.5],
    [25160, 25171, 25152, 25155, 4], [25155, 25161, 25141, 25144, 4], [25144, 25153, 25137, 25150, 4],
    /* 10:00: rotation inside value */
    [25150, 25158, 25144, 25146, 3.5], [25146, 25152, 25138, 25149, 3.5], [25149, 25162, 25147, 25158, 3.2], [25158, 25171, 25155, 25167, 3.2],
    [25166, 25168, 25150, 25152, 3.2], [25152, 25156, 25140, 25143, 3.2], [25143, 25151, 25139, 25149, 3], [25149, 25157, 25145, 25153, 3],
    [25153, 25165, 25151, 25160, 3], [25160, 25171, 25158, 25169, 3],
    /* 10:20: the test, the look above (big trades at the offer), the stall */
    [25166, 25172, 25164, 25170, 3.6], [25170, 25183, 25168.5, 25181.25, 6.5], [25181.25, 25186.5, 25178.25, 25180.5, 6],
    /* 10:26: the fail, back under VAH */
    [25180.5, 25182, 25161.5, 25163.25, 7.5],
    /* POC, then the other side of balance, then chop */
    [25163.25, 25165, 25149.5, 25151.75, 5.5], [25151.75, 25153, 25136.25, 25139.5, 5.5], [25139.5, 25146, 25135, 25144, 4], [25144, 25150, 25140, 25147, 3.5]
  ];
  var N = BARS.length, TICK = 0.25, ROW = 2, DEV = 15, TEST = 25, PUSH = 26, STALL = 27, FAIL = 28, TPOC = 29, TVAL = 30;
  BARS[FAIL].path = [[0, 25180.5], [0.12, 25182], [0.5, 25169.75], [0.8, 25161.5], [1, 25163.25]];

  /* the volume profile of bars [0..n-1]: 2-point rows, volume spread evenly over each bar's range */
  function profile(n) {
    var m = {}, i, k;
    for (i = 0; i < n; i++) {
      var b = BARS[i], lo = Math.floor(b[2] / ROW), hi = Math.floor((b[1] - 1e-9) / ROW), cnt = hi - lo + 1;
      for (k = lo; k <= hi; k++) m[k] = (m[k] || 0) + b[4] / cnt;
    }
    var ks = Object.keys(m).map(Number).sort(function (a, b) { return a - b; }), tot = 0, poc = ks[0];
    ks.forEach(function (q) { tot += m[q]; if (m[q] > m[poc]) poc = q; });
    var lo2 = poc, hi2 = poc, acc = m[poc];
    while (acc < 0.7 * tot) {
      var up = m[hi2 + 1] || 0, dn = m[lo2 - 1] || 0;
      if (!up && !dn) break;
      if (up >= dn) { hi2++; acc += up; } else { lo2--; acc += dn; }
    }
    return { rows: m, keys: ks, poc: poc * ROW + ROW / 2, vah: (hi2 + 1) * ROW, val: lo2 * ROW, max: m[poc] };
  }
  var VA = profile(TEST);
  var VAH = VA.vah, VAL = VA.val, POC = VA.poc, WIDTH = VAH - VAL;
  var EXT = BARS[STALL][1], BIG = 25184.00, BIG_LOTS = 75;
  var ENTRY = VAH - TICK, STOP = BIG + 3 * TICK, RISK = STOP - ENTRY;
  var STOP_EXT = EXT + 2 * TICK, STOP_HALF = VAH + (EXT - VAH) / 2;
  var R_POC = (ENTRY - POC) / RISK, R_VAL = (ENTRY - VAL) / RISK;
  /* the prior day's value area (for the first 30 minutes) */
  var PD = { vah: 25162, val: 25096, poc: 25131 };
  var DEVS = []; for (var n0 = 1; n0 <= N; n0++) DEVS.push(profile(n0));
  /* big trades: [bar, price, lots, at the offer?] */
  var PRINTS = [[PUSH, 25177.5, 52, true], [PUSH, 25181.0, 40, true], [STALL, BIG, BIG_LOTS, true], [FAIL, 25168.0, 60, false], [FAIL, 25162.5, 45, false]];

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-laf-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;

    var STAGES = [
      { at: 0,    title: "The first 30 minutes: let it develop", text: "9:30 to 10:00 on 2-minute bars. The developing profile is fresh, so its value area high and low jump around with every swing. It's the flea market: everybody buying here, selling there. A beginner just watches. If you do trade it, use yesterday's value area instead." },
      { at: 4.6,  title: "10:00: mark the extremes", text: "Thirty minutes in, the profile has its shape: a bell, with value from " + px(DEVS[DEV - 1].val) + " to " + px(DEVS[DEV - 1].vah) + " and the point of control at " + px(DEVS[DEV - 1].poc) + ". It keeps developing, but slowly now. 70% of the volume traded inside. The value area high and low are the extreme points. That's where you do business." },
      { at: 6.4,  title: "Wait. The middle is noise", text: "Price rotates inside value. Everything between the extremes is where you get chopped up and burn mental capital, so you sit on your hands. Waiting is a step of its own, and the hardest one." },
      { at: 9.6,  title: "Look above: buyers get aggressive", text: "Price tests the value area high and pushes " + f2(EXT - VAH) + " points over it. Big trades print at the offer, " + BIG_LOTS + " lots at " + px(BIG) + ", and the delta profile shows a buy-side imbalance above VAH. A breakout looks imminent. If it's real, price should never come back inside." },
      { at: 12.2, title: "The fail: short the reclaim", text: "It stalls, then flips back under VAH in one bar. Those buyers are trapped, and their stops are buy-side fuel for the other way. Market order short as it crosses back under: " + px(ENTRY) + ". Stop just over the " + BIG_LOTS + "-lot print, " + px(STOP) + ", tighter than the swing high. " + f2(RISK) + " points of risk." },
      { at: 14.2, title: "POC, the first target", text: "Two minutes later price is at the point of control, " + px(POC) + ": " + R_POC.toFixed(2) + "R. A beginner takes some off here and moves the stop to break even. Big trades are printing at the bid on the way down." },
      { at: 15.8, title: "The other side of balance", text: "The next bar reaches the value area low, " + px(VAL) + ": " + R_VAL.toFixed(2) + "R. On a choppy, bell-shaped day like this one, with little follow-through, the whole trade comes off at the other side." },
      { at: 17.6, title: "Location, then the trap, then the plan", text: "In at a value edge, out at the other one, about six minutes in all. +" + f2(ENTRY - VAL) + " points on " + f2(RISK) + " of risk. He plans every trade for at least 2R to the other side before he takes it." }
    ];
    var TB = [];
    function segT(a, b, t0, step, dur) { for (var i = a; i <= b; i++) TB[i] = [t0 + (i - a) * step, t0 + (i - a) * step + dur]; }
    segT(0, DEV - 1, 0.3, 0.28, 0.24);
    segT(DEV, TEST - 1, 6.6, 0.28, 0.24);
    TB[TEST] = [9.6, 10.1];
    TB[PUSH] = [10.3, 11.0];
    TB[STALL] = [11.2, 11.8];
    TB[FAIL] = [12.2, 13.4];
    TB[TPOC] = [14.2, 14.9];
    TB[TVAL] = [15.8, 16.5];
    segT(TVAL + 1, N - 1, 16.9, 0.4, 0.3);
    var END = 19.2;
    var T_ENTRY = TB[FAIL][0] + 0.5 * (TB[FAIL][1] - TB[FAIL][0]);
    function prog(i, T) { return clamp01((T - TB[i][0]) / (TB[i][1] - TB[i][0])); }
    function done(T) { var k = 0; for (var i = 0; i < N; i++) if (prog(i, T) >= 1) k = i + 1; return k; }

    function size(n) {
      return n ? { W: 440, H: 800, x0: 10, x1: 252, px0: 256, px1: 300, yt: 160, yb: 720, xTag: 304, cx: 12, cy: 14, S: 0 }
               : { W: 1180, H: 640, x0: 24, x1: 820, px0: 832, px1: 1000, yt: 140, yb: 590, xTag: 1010, cx: 24, cy: 14, S: 0 };
    }
    var PMIN = 25106, PMAX = 25198;

    function frame(T, L) {
      var s = "", i;
      var dx = (L.x1 - L.x0) / N, wB = Math.max(4, dx * 0.58);
      function x(i) { return L.x0 + dx * (i + 0.5); }
      function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
      s += txt(L.x0, L.yt - 14 * FS, "2-minute · a made-up NQ session", C.faint, 12);

      /* time axis */
      [0, 15, 30].forEach(function (i) { if (i < N) s += txt(x(i), L.yb + 22 * FS, hhmm(i), C.faint, 11.5, "middle"); });

      /* the first 30 minutes */
      var wo = fade(T, 0.2, 0.3) * (1 - fade(T, 6.4, 0.4) * 0.75);
      s += rect(x(0) - dx * 0.5, L.yt, dx * DEV, L.yb - L.yt, C.faint, 0.1 * wo);
      s += txt(x(0) - dx * 0.5 + 6, L.yt + 16 * FS, L.narrow ? "first 30 min" : "first 30 minutes · developing", C.faint, 11.5, "start", 600, wo);

      /* the developing value area while it forms (until 10:00), then fixed lines */
      var k = done(T), devOn = T < 4.6;
      if (devOn && k > 0) {
        var d = DEVS[k - 1];
        s += hl(L.x0, L.x1, y(d.vah), C.teal, "3 4", 1.4, 0.85);
        s += hl(L.x0, L.x1, y(d.val), C.teal, "3 4", 1.4, 0.85);
        s += txt(L.x1 - 4, y(d.vah) - 6, "developing VAH " + px(d.vah), C.teal, 11.5, "end", 600);
        s += txt(L.x1 - 4, y(d.val) + 16 * FS, "developing VAL " + px(d.val), C.teal, 11.5, "end", 600);
      }
      var lo = fade(T, 4.6, 0.5), cv = DEVS[Math.max(DEV, Math.min(k, TEST)) - 1], cVAH = cv.vah, cVAL = cv.val, cPOC = cv.poc;
      if (lo > 0) {
        var mid = fade(T, 6.4, 0.4) * (1 - fade(T, 9.6, 0.4));
        s += rect(L.x0, y(cVAH - 4), L.x1 - L.x0, y(cVAL + 4) - y(cVAH - 4), C.faint, 0.12 * mid);
        s += txt((L.x0 + L.x1) / 2 + (L.narrow ? 40 : 120), y(cPOC) + 28 * FS, "the middle · no trades", C.faint, 12, "middle", 700, mid);
        s += hl(L.x0, L.x1, y(cVAH), C.pink, null, 1.8, lo);
        s += hl(L.x0, L.x1, y(cVAL), C.pink, null, 1.8, lo);
        s += hl(L.x0, L.x1, y(cPOC), C.gold, "6 5", 1.4, lo);
        s += tag(L.xTag, y(cVAH), "VAH " + px(cVAH), C.pink, lo * (1 - fade(T, T_ENTRY, 0.3)));
        s += tag(L.xTag, y(cVAL), "VAL " + px(cVAL), C.pink, lo);
        s += tag(L.xTag, y(cPOC), "POC " + px(cPOC), C.gold, lo * (1 - fade(T, 14.0, 0.2)));
      }

      /* the volume profile wall (developing) */
      if (k > 0) {
        var pr = DEVS[Math.min(k, TEST) - 1], pw = L.px1 - L.px0;
        s += txt(L.px0, L.yt - 14 * FS, L.narrow ? "profile" : "volume profile", C.faint, 11.5, "start");
        pr.keys.forEach(function (q) {
          var p0 = q * ROW, inVA = p0 >= pr.val && p0 < pr.vah;
          var w = pw * pr.rows[q] / pr.max;
          s += rect(L.px0, y(p0 + ROW) + 0.5, w, Math.max(1, y(p0) - y(p0 + ROW) - 1), q * ROW + ROW / 2 === pr.poc ? C.gold : inVA ? C.teal : "#48484a", inVA ? 0.55 : 0.45);
        });
      }
      /* delta: the buy-side imbalance above VAH */
      var dlo = fade(T, 10.9, 0.4) * (1 - fade(T, 15.8, 0.4));
      if (dlo > 0) {
        var dw = L.px1 - L.px0;
        [[VAH, 0.35], [VAH + 2, 0.55], [VAH + 4, 0.8], [VAH + 6, 1], [VAH + 8, 0.9], [VAH + 10, 0.85], [VAH + 12, 1], [VAH + 14, 0.45]].forEach(function (r) {
          s += rect(L.px0, y(r[0] + ROW) + 0.5, dw * 0.9 * r[1], Math.max(1, y(r[0]) - y(r[0] + ROW) - 1), C.up, 0.8 * dlo);
        });
        s += txt(L.px0, y(EXT) - 22 * FS, L.narrow ? "+delta" : "delta · buy imbalance", C.up, 11.5, "start", 700, dlo);
      }

      /* candles */
      for (i = 0; i < N; i++) {
        var p = prog(i, T);
        if (p <= 0) continue;
        s += candle(x(i), y, BARS[i], p, wB, T >= 17.6 && (i < TEST || i > TVAL) ? 0.5 : 1);
      }

      /* big trades */
      PRINTS.forEach(function (q) {
        var o = fade(T, TB[q[0]][0] + (q[0] === FAIL ? 0.6 : 0.3), 0.3) * (1 - fade(T, 16.6, 0.4));
        var r = (6 + q[2] / 7) * (L.narrow ? 0.85 : 1);
        s += bubble(x(q[0]) + (q[3] ? dx * 0.55 : -dx * 0.55), y(q[1]), r, q[3] ? C.up : C.dn, o, L.narrow ? null : String(q[2]));
      });
      if (!L.narrow) s += txt(x(STALL) + dx * 0.55 + 18, y(BIG) - 14, BIG_LOTS + " lots at the offer", C.up, 11.5, "start", 700, fade(T, 11.5, 0.3) * (1 - fade(T, 12.2, 0.3)));

      /* look above / fail labels */
      var la = fade(T, 10.6, 0.3) * (1 - fade(T, 17.6, 0.4));
      s += txt(x(PUSH) - dx * 0.2, y(EXT) - 30 * FS, "look above", C.up, 13, "middle", 700, la);
      var fl = fade(T, T_ENTRY, 0.3) * (1 - fade(T, 17.6, 0.4));
      s += txt(x(FAIL) + dx * 1.2, y(BARS[FAIL][2]) + 4, L.narrow ? "fail" : "and fail", C.dn, 13, "start", 700, fl);

      /* entry, stop, targets */
      var eo = fade(T, T_ENTRY, 0.25);
      if (eo > 0) {
        var gone = fade(T, 16.4, 0.3);
        s += tri(x(FAIL) - dx * 0.85, y(ENTRY), false, C.dn, 11 * FS, eo);
        s += hl(x(FAIL) - dx * 0.5, L.x1, y(ENTRY), C.ink, null, 1.4, eo * (1 - gone * 0.6));
        s += tag(L.xTag, y(ENTRY) + (L.narrow ? 22 : 0) * 0, "short " + px(ENTRY), C.ink, eo * (1 - gone));
        s += hl(x(FAIL) - dx * 0.5, L.x1, y(STOP), C.dn, "5 4", 1.8, eo * (1 - gone));
        s += tag(L.xTag, y(STOP) - 4 * FS, "stop " + px(STOP), C.dn, eo * (1 - gone));
        var so = eo * (1 - fade(T, 14.2, 0.3));
        s += hl(x(STALL) - dx * 0.5, L.x1, y(STOP_EXT), C.faint, "3 4", 1.2, so);
        if (!L.narrow) s += txt(L.x1 - 4, y(STOP_EXT) - 6, "over the swing high: " + f2(STOP_EXT - ENTRY) + " pts", C.faint, 11.5, "end", 600, so);
      }
      var po = fade(T, TB[TPOC][1] - 0.2, 0.3);
      if (po > 0) { s += ring(x(TPOC), y(POC), 11 * FS, C.gold, 2.2, po * (1 - fade(T, 17.6, 0.4))); s += tag(L.xTag, y(POC) + 0, "POC · " + R_POC.toFixed(2) + "R", C.gold, po); }
      var vo = fade(T, TB[TVAL][1] - 0.2, 0.3);
      if (vo > 0) { s += ring(x(TVAL), y(VAL), 11 * FS, C.cyan, 2.2, vo * (1 - fade(T, 17.6, 0.4))); s += tag(L.xTag, y(VAL) + 24 * FS, "out · " + R_VAL.toFixed(2) + "R", C.cyan, vo); }
      if (T >= 17.6) s += txt(L.x0, L.yt + 36 * FS, "+" + f2(ENTRY - VAL) + " pts · " + R_VAL.toFixed(2) + "R on " + f2(RISK) + " of risk", C.cyan, 13, "start", 700, fade(T, 17.6, 0.3));

      /* ---- the callouts ---- */
      var cx = L.cx, cy = L.cy;
      s += callout(cx, cy, ["The first 30 minutes", "Developing VAH and VAL jump", "Beginners: just watch", "Or use yesterday's VAH / VAL"], C.teal, fade(T, 0.4, 0.3) * (1 - fade(T, 4.6, 0.3)));
      s += callout(cx, cy, ["10:00 · the extreme points", "VAH " + px(DEVS[DEV - 1].vah), "POC " + px(DEVS[DEV - 1].poc), "VAL " + px(DEVS[DEV - 1].val) + " · 70% inside"], C.pink, fade(T, 4.8, 0.3) * (1 - fade(T, 6.4, 0.3)));
      s += callout(cx, cy, ["Wait", "Inside value: nothing to do", "Only the edges are trades", "Patience is a step"], C.faint, fade(T, 6.6, 0.3) * (1 - fade(T, 9.6, 0.3)));
      s += callout(cx, cy, ["Look above", "+" + f2(EXT - VAH) + " pts over VAH", "Big trades at the offer", "Buy imbalance on the delta"], C.up, fade(T, 9.8, 0.3) * (1 - fade(T, 12.2, 0.3)));
      s += callout(cx, cy, ["And fail: short " + px(ENTRY), "Back under VAH in one bar", "Stop " + px(STOP) + ", over the " + BIG_LOTS, "Risk " + f2(RISK) + " pts"], C.dn, fade(T, T_ENTRY, 0.3) * (1 - fade(T, 14.2, 0.3)));
      s += callout(cx, cy, ["POC · " + px(POC), R_POC.toFixed(2) + "R", "Beginners: take some off", "Stop to break even"], C.gold, fade(T, 14.4, 0.3) * (1 - fade(T, 15.8, 0.3)));
      s += callout(cx, cy, ["The other side · " + px(VAL), R_VAL.toFixed(2) + "R", "Choppy bell-shaped day", "Out full here"], C.cyan, fade(T, 16.0, 0.3) * (1 - fade(T, 17.6, 0.3)));
      s += callout(cx, cy, ["The whole trade", "In at one edge, out at the other", "About six minutes", "Planned for 2R or better"], C.ink, fade(T, 17.8, 0.3));
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
    window.LAFAnim = { seek: function (t) { setPlaying(false); T = t; draw(); }, END: END, STAGES: STAGES,
      _levels: { VAH: VAH, VAL: VAL, POC: POC, ENTRY: ENTRY, STOP: STOP, RISK: RISK, R_POC: R_POC, R_VAL: R_VAL, EXT: EXT, STOP_EXT: STOP_EXT, STOP_HALF: STOP_HALF } };   // exposed for testing
  })();

  /* =====================================================================
     2. The six steps as a stepper, with a small chart of the walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-laf-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 6) return;
    var INFO = [
      { k: "Location",   c: C.pink,  tag: "Map · the value area high and low" },
      { k: "Wait",       c: C.dim,   tag: "Patience · nothing in the middle" },
      { k: "Aggression", c: C.up,    tag: "Watch · who gets aggressive past the edge" },
      { k: "The fail",   c: C.dn,    tag: "Execute · trapped traders, back inside" },
      { k: "The stop",   c: C.orange, tag: "Risk · past the big trades, or half the poke" },
      { k: "Targets",    c: C.cyan,  tag: "Manage · POC, then the other side" }
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
    fig.innerHTML = '<svg viewBox="0 0 560 320" role="img" aria-label="The walkthrough on 2-minute bars, with the current step highlighted"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    var S0 = 12, xa = 16, xb = 400, yt = 40, yb = 292, PMN = 25128, PMX = 25194;
    var dx = (xb - xa) / (N - S0), wb = Math.max(4, dx * 0.58);
    function X(i) { return xa + dx * (i - S0 + 0.5); }
    function Y(p) { return yb - (p - PMN) / (PMX - PMN) * (yb - yt); }
    var SF = 1;
    function t(x, y, s, col, anchor, w) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + (13 * SF).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' + (w ? ' font-weight="' + w + '"' : "") + ">" + s + "</text>"; }

    function chart(k) {
      var c = INFO[k].c, s = "";
      s += t(xa, 22, "2-minute · the walkthrough, from 9:54", C.faint);
      if (k === 1) s += rect(xa, Y(VAH - 4), xb - xa, Y(VAL + 4) - Y(VAH - 4), C.faint, 0.14);
      s += hl(xa, xb, Y(VAH), C.pink, null, 1.6);
      s += hl(xa, xb, Y(VAL), C.pink, null, 1.6);
      s += hl(xa, xb, Y(POC), C.gold, "5 4", 1.2, k === 0 || k === 5 ? 1 : 0.5);
      s += t(xb + 6, Y(VAH) + 4, "VAH", C.pink, "start", 700);
      s += t(xb + 6, Y(VAL) + 4, "VAL", C.pink, "start", 700);
      s += t(xb + 6, Y(POC) + 4, "POC", C.gold, "start", 700);
      for (var i = S0; i < N; i++) {
        var lit = k === 0 ? i < TEST : k === 1 ? i >= DEV && i < TEST : k === 2 ? i >= TEST && i <= STALL : k === 3 ? i >= STALL && i <= FAIL : k === 4 ? i >= PUSH && i <= FAIL : i >= FAIL && i <= TVAL;
        s += candle(X(i), Y, BARS[i], 1, wb, lit ? 1 : 0.25);
      }
      if (k === 0) {
        s += t(xb, Y(VAH) - 8, "VAH " + px(VAH), c, "end", 700);
        s += t(xb, Y(VAL) + 18, "VAL " + px(VAL), c, "end", 700);
      }
      if (k === 1) s += t((xa + xb) / 2, Y(POC) + 30, "the middle · sit on the sideline", C.dim, "middle", 700);
      if (k === 2) {
        PRINTS.forEach(function (q) { if (q[3]) s += bubble(X(q[0]) + dx * 0.5, Y(q[1]), 4 + q[2] / 10, C.up, 1); });
        s += t(X(PUSH), Y(EXT) - 14, "big trades at the offer", c, "middle", 700);
      }
      if (k === 3) {
        s += tri(X(FAIL) - dx * 0.8, Y(ENTRY), false, C.dn, 10);
        s += t(X(FAIL) + dx * 0.8, Y(BARS[FAIL][2]) + 4, "back inside fast · short " + px(ENTRY), c, "start", 700);
      }
      if (k === 4) {
        s += hl(X(PUSH) - dx * 0.5, xb, Y(STOP), C.dn, "5 4", 2);
        s += hl(X(PUSH) - dx * 0.5, xb, Y(STOP_EXT), C.faint, "3 4", 1.2);
        s += bubble(X(STALL) + dx * 0.5, Y(BIG), 11, C.up, 1);
        s += t(xb, Y(STOP) + 18, "stop " + px(STOP) + " · " + f2(RISK) + " pts", c, "end", 700);
        s += t(xb, Y(STOP_EXT) - 8, "swing high: " + f2(STOP_EXT - ENTRY) + " pts", C.faint, "end", 600);
      }
      if (k === 5) {
        s += ring(X(TPOC), Y(POC), 9, C.gold, 2);
        s += ring(X(TVAL), Y(VAL), 9, c, 2);
        s += t(X(TPOC) + 14, Y(POC) - 10, "POC · " + R_POC.toFixed(2) + "R · partial", C.gold, "start", 700);
        s += t(X(TVAL) - 14, Y(VAL) + 22, "VAL · " + R_VAL.toFixed(2) + "R · out", c, "end", 700);
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
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { show(cur); }, 150); });
    show(0);
  })();

  /* =====================================================================
     3. The first 30 minutes: the developing value area, bar by bar
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-laf-dev]");
    if (!root) return;
    var svg = root.querySelector("svg"), rng = root.querySelector("input[type=range]"), out = root.querySelector(".laf-dout"), shown = root.querySelector("[data-show]");
    var LAST = TEST;   // 9:30 to 10:18
    rng.max = String(LAST); if (+rng.value > LAST) rng.value = String(LAST);
    function draw() {
      var n = Math.max(1, Math.min(LAST, +rng.value || 1)), d = DEVS[n - 1];
      var narrow = svg.clientWidth > 0 && svg.clientWidth < 560;
      var W = narrow ? 440 : 1180, H = narrow ? 520 : 380;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.2 : 1;
      var x0 = 16, x1 = narrow ? 300 : 900, yt = 40, yb = H - 44, PMN = 25088, PMX = 25198;
      var dx = (x1 - x0) / LAST, wB = Math.max(3, dx * 0.58);
      function x(i) { return x0 + dx * (i + 0.5); }
      function y(p) { return yb - (p - PMN) / (PMX - PMN) * (yb - yt); }
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      s += txt(x0, 24, "2-minute · the same session, 9:30 to " + hhmm(n - 1), C.faint, 12);
      s += rect(x(0) - dx / 2, yt, dx * DEV, yb - yt, C.faint, 0.1);
      /* prior day's value area */
      s += hl(x0, x1, y(PD.vah), C.purple, "2 4", 1.4, n < DEV ? 1 : 0.4);
      s += hl(x0, x1, y(PD.val), C.purple, "2 4", 1.4, n < DEV ? 1 : 0.4);
      if (!narrow) { s += txt(x0 + 6, y(PD.vah) - 6, "yesterday's VAH " + px(PD.vah), C.purple, 11.5, "start", 600); s += txt(x1, y(PD.val) - 6, "yesterday's VAL " + px(PD.val), C.purple, 11.5, "end", 600); }
      else { s += txt(x1, y(PD.val) - 6, "yesterday's VA", C.purple, 11.5, "end", 600); }
      /* the path of the developing VAH / VAL / POC */
      ["vah", "val", "poc"].forEach(function (key) {
        var pts = [];
        for (var i = 0; i < n; i++) { var v = DEVS[i][key]; pts.push((x(i) - dx / 2).toFixed(1) + "," + y(v).toFixed(1), (x(i) + dx / 2).toFixed(1) + "," + y(v).toFixed(1)); }
        s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + (key === "poc" ? C.gold : C.pink) + '" stroke-width="1.8"' + (key === "poc" ? ' stroke-dasharray="5 4"' : "") + "/>";
      });
      for (var i = 0; i < n; i++) s += candle(x(i), y, BARS[i], 1, wB, 1);
      /* the profile as of bar n */
      var px0 = x1 + 14, pw = (W - px0 - (narrow ? 12 : 120));
      d.keys.forEach(function (q) {
        var p0 = q * ROW, inVA = p0 >= d.val && p0 < d.vah;
        s += rect(px0, y(p0 + ROW) + 0.4, pw * d.rows[q] / d.max, Math.max(1, y(p0) - y(p0 + ROW) - 0.8), q * ROW + ROW / 2 === d.poc ? C.gold : inVA ? C.teal : "#48484a", inVA ? 0.6 : 0.5);
      });
      if (!narrow) {
        s += txt(W - 14, y(d.vah) + 4, "VAH " + px(d.vah), C.pink, 12, "end", 700);
        s += txt(W - 14, y(d.poc) + 4, "POC " + px(d.poc), C.gold, 12, "end", 700);
        s += txt(W - 14, y(d.val) + 4, "VAL " + px(d.val), C.pink, 12, "end", 700);
      }
      s += txt(x(DEV - 1), yb + 22 * FS, "10:00", C.ink, 11.5, "middle", 700);
      s += txt(W - 8, H - 8, "Illustrative · made-up bars", C.faint, 11, "end");
      svg.innerHTML = s;
      FS = 1;
      /* how far the edges have moved in the last 10 minutes */
      var back = DEVS[Math.max(0, n - 6)], mv = Math.max(Math.abs(d.vah - back.vah), Math.abs(d.val - back.val));
      if (shown) shown.textContent = hhmm(n - 1);
      var cls, head, body;
      if (n < DEV) {
        cls = "is-b"; head = hhmm(n - 1) + " · still the flea market";
        body = "VAH " + px(d.vah) + ", VAL " + px(d.val) + ". The edges moved up to " + f2(mv) + " points in the last 10 minutes. Not a framework yet. Opened inside yesterday's value area (" + px(PD.val) + " to " + px(PD.vah) + "): compression, expect chop. If you trade now, use yesterday's edges.";
      } else {
        cls = "is-a"; head = hhmm(n - 1) + " · settled";
        body = "VAH " + px(d.vah) + ", POC " + px(d.poc) + ", VAL " + px(d.val) + ". The edges moved " + f2(mv) + " points in the last 10 minutes. The bulk of the day's early volume is in, so today's developing profile is the framework now.";
      }
      out.className = "chk-out laf-dout " + cls;
      out.innerHTML = "<b>" + head + "</b><p>" + body + "</p>";
    }
    rng.addEventListener("input", draw);
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
    draw();
  })();

  /* =====================================================================
     4. Aggressive or conservative: the same look below VAL, twice
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-laf-two]");
    if (!root) return;
    var svg = root.querySelector("svg"), btn = root.querySelector("[data-play]");
    var V = 21800, P = 21826, VH = 21850;   // a made-up value area for this sketch: VAL, POC, VAH
    /* fast: three quiet bars, a flush with big bids, one bar back in */
    var FAST = [[21812, 21816, 21804, 21806], [21806, 21810, 21801, 21803], [21803, 21806, 21799, 21801],
                [21801, 21802, 21786, 21788], [21788, 21809, 21786.5, 21807], [21807, 21821, 21805, 21819], [21819, 21831, 21817, 21828], [21828, 21839, 21825, 21836]];
    FAST[4].path = [[0, 21788], [0.1, 21786.5], [0.35, 21800.25], [1, 21807]];
    /* slow: the same flush, a creep back, a retest that holds as a higher low */
    var SLOW = [[21812, 21816, 21804, 21806], [21806, 21810, 21801, 21803], [21803, 21806, 21799, 21801],
                [21801, 21802, 21786, 21788], [21788, 21795, 21787, 21793], [21793, 21801.5, 21791, 21799.5], [21799.5, 21804, 21797, 21802.5],
                [21802.5, 21804, 21796.5, 21803.25], [21803.25, 21813, 21802, 21811], [21811, 21822, 21809, 21820]];
    var DUR = 0.55, t0 = 0, raf = 0, T = 99;
    function panel(x0, x1, yt, yb, bars, mode, T, nar) {
      var s = "", PMN = 21780, PMX = 21842, n = bars.length, dx = (x1 - x0) / 10, wB = Math.max(4, dx * 0.56);
      function x(i) { return x0 + dx * (i + 0.5); }
      function y(p) { return yb - (p - PMN) / (PMX - PMN) * (yb - yt); }
      s += hl(x0, x1, y(V), C.pink, null, 1.6); s += txt(x1, y(V) - 6, "VAL " + px(V), C.pink, 11.5, "end", 700);
      s += hl(x0, x1, y(P), C.gold, "5 4", 1.2); s += txt(x1, y(P) - 6, "POC " + px(P), C.gold, 11.5, "end", 700);
      for (var i = 0; i < n; i++) s += candle(x(i), y, bars[i], clamp01((T - i * DUR) / (DUR * 0.85)), wB, 1);
      var at = function (i) { return clamp01((T - i * DUR - DUR * 0.4) / 0.3); };
      s += bubble(x(3) - dx * 0.55, y(21790), 10, C.dn, at(3));
      s += bubble(x(3) - dx * 0.55, y(21795.5), 8, C.dn, at(3));
      s += txt(x(3), y(21786) + 22 * FS, "big bids · sellers push", C.dn, 11.5, "middle", 600, at(3));
      if (mode === "fast") {
        var e = at(4);
        s += tri(x(4) - dx * 0.8, y(V + TICK), true, C.up, 10 * FS, e);
        s += hl(x(4) - dx * 0.5, x1, y(V + TICK), C.ink, null, 1.3, e);
        s += txt(x(4) + dx * 0.7, y(V + TICK) + 18 * FS, nar ? "buy the reclaim" : "back in, fast · market buy " + px(V + TICK), C.up, 12, "start", 700, e);
        s += txt(x(7), y(21839) - 12 * FS, "no second look needed", C.dim, 11.5, "end", 600, at(7));
      } else {
        var c = at(6);
        s += txt(x(5), y(21803) - 14 * FS, "creeps back in", C.dim, 11.5, "middle", 600, at(5));
        s += bubble(x(7) - dx * 0.55, y(21798), 9, C.dn, c > 0 ? at(7) : 0);
        s += ring(x(7), y(21796.5), 10 * FS, C.gold, 2, at(7));
        s += txt(x(7), y(21796.5) + 30 * FS, nar ? "higher low" : "retest holds · higher low", C.gold, 11.5, "middle", 700, at(7));
        var e2 = at(8);
        s += tri(x(8) - dx * 0.8, y(21804.25), true, C.up, 10 * FS, e2);
        s += txt(x(8) + dx * 0.3, y(21813) - 12 * FS, "buy the hold", C.up, 12, "end", 700, e2);
      }
      return s;
    }
    function draw() {
      var narrow = svg.clientWidth > 0 && svg.clientWidth < 620;
      var W = narrow ? 440 : 1180, H = narrow ? 760 : 380;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.15 : 1;
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      if (!narrow) {
        s += txt(20, 28, "Aggressive · a fast flip", C.up, 15, "start", 700);
        s += txt(610, 28, "Conservative · a slow creep", C.gold, 15, "start", 700);
        s += ln(590, 20, 590, H - 20, "#3a3a3c", null, 1);
        s += panel(20, 570, 50, H - 34, FAST, "fast", T) + panel(610, 1160, 50, H - 34, SLOW, "slow", T);
      } else {
        s += txt(16, 28, "Aggressive · a fast flip", C.up, 15, "start", 700);
        s += panel(12, 428, 46, 352, FAST, "fast", T, true);
        s += txt(16, 404, "Conservative · a slow creep", C.gold, 15, "start", 700);
        s += panel(12, 428, 422, 728, SLOW, "slow", T, true);
      }
      s += txt(W - 8, H - 8, "Illustrative · made-up bars", C.faint, 11, "end");
      svg.innerHTML = s;
      FS = 1;
    }
    function tick(now) {
      T = (now - t0) / 1000;
      draw();
      if (T < SLOW.length * DUR + 0.6) raf = requestAnimationFrame(tick);
    }
    function play() { cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(tick); }
    if (btn) btn.addEventListener("click", function () { if (REDUCED) { T = 99; draw(); } else play(); });
    draw();
    if (!REDUCED && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) { if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); play(); } }, { threshold: 0.4 });
      io.observe(svg);
    }
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
  })();

  /* =====================================================================
     5. Plan the trade
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-laf-calc]");
    if (!root) return;
    var ins = {}; root.querySelectorAll("input,select").forEach(function (el) { ins[el.name] = el; });
    var out = root.querySelector(".laf-cout"), tab = root.querySelector(".laf-ccalc");
    function num(k) { var v = parseFloat(ins[k].value); return isFinite(v) ? v : NaN; }
    function row(a, b, cls) { return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + a + "</span><b>" + b + "</b></div>"; }
    function draw() {
      var side = ins.side.value, vah = num("vah"), val = num("val"), poc = num("poc"), ext = num("ext"), big = num("big"), tick = num("tick") || 0.25, buf = Math.max(0, num("buf") || 0);
      var pv = num("pv"), risk$ = num("risk"), vix = num("vix"), mode = ins.stop.value;
      var sh = side === "short", edge = sh ? vah : val, other = sh ? val : vah, sgn = sh ? -1 : 1;
      if (!(vah > val) || !(poc > val && poc < vah) || !isFinite(ext) || (sh ? ext <= vah : ext >= val)) {
        out.className = "chk-out laf-cout is-no"; out.innerHTML = "<b>Check the levels</b><p>VAH must be above VAL, POC between them, and the extreme past the edge you're fading (above VAH for a short, below VAL for a long).</p>"; tab.innerHTML = ""; return;
      }
      var entry = edge + sgn * tick;
      var stops = { big: isFinite(big) ? big - sgn * buf * tick : NaN, half: edge + (ext - edge) / 2, ext: ext - sgn * buf * tick };
      if (mode === "big" && !(isFinite(big) && (sh ? big > vah : big < val))) mode = "ext";
      var stop = stops[mode], risk = (stop - entry) * -sgn;
      var rp = (poc - entry) * sgn / risk, ro = (other - entry) * sgn / risk;
      var ct = pv > 0 && risk > 0 ? Math.floor(risk$ / (risk * pv)) : 0, micro = pv > 0 && risk > 0 ? Math.floor(risk$ / (risk * pv / 10)) : 0;
      var cls, head, body;
      if (!(risk > 0)) { cls = "is-no"; head = "No room"; body = "The stop is on the wrong side of the entry. Check the big-trade price or pick another stop."; }
      else if (ro >= 2) { cls = "is-a"; head = ro.toFixed(2) + "R to the other side · take it"; body = "That clears his 2R plan. POC is " + rp.toFixed(2) + "R: a beginner takes some off there and moves the stop to break even."; }
      else if (ro >= 1.4) { cls = "is-b"; head = ro.toFixed(2) + "R · under 2R"; body = "Short of the 2R he plans for. Tighten the stop (the big trades, or half the poke) or pass. Prop rules let you get away with less; he doesn't advise it."; }
      else { cls = "is-no"; head = ro.toFixed(2) + "R · pass"; body = "The stop is too far for the room inside value. Wait for a cleaner one."; }
      if (isFinite(vix) && vix >= 18) body += " VIX " + vix.toFixed(1) + " is at or over 18 to 20: his soft rule is micros and bigger swings.";
      out.className = "chk-out laf-cout " + cls;
      out.innerHTML = "<b>" + head + "</b><p>" + body + "</p>";
      var h = "";
      h += row((sh ? "Short" : "Buy") + " the reclaim", px(entry));
      h += row("Stop (" + (mode === "big" ? "past the big trades" : mode === "half" ? "half the poke" : "past the extreme") + ")", px(stop));
      h += row("Risk", f2(risk) + " pts");
      h += row("POC", px(poc) + " · " + rp.toFixed(2) + "R");
      h += row("Other side", px(other) + " · " + ro.toFixed(2) + "R");
      h += row("Contracts for $" + Math.round(risk$).toLocaleString("en-US"), ct + " full · or " + micro + " micros");
      h += row("If it pays the other side", "$" + Math.round(Math.max(ct, 0) * pv * risk * ro).toLocaleString("en-US"), "tot");
      tab.innerHTML = h;
    }
    root.addEventListener("input", draw);
    root.addEventListener("change", draw);
    draw();
  })();
})();

/* =====================================================================
   tf-anim.js — the animations on The 10 AM ORB page.

   1. [data-tf-anim]   one long on a made-up 5-minute ES morning:
      bias first → 9:30–9:45 hands off (the fakeouts) → box the 15-minute
      range at 9:45 → the break is confirmation, not the entry → the
      retest holds into 10:00, long → stop to break-even → the shakeout
      into 11:00 → the target at the next key level, 2R.
   2. [data-tf-steps]  the six steps as a click-through stepper with a
      small chart per step.
   3. [data-tf-plays]  the four trades from the video, replayed on
      made-up bars.
   4. [data-tf-check]  is it a trade? five lamps.
   5. [data-tf-calc]   size it: contracts from a dollar risk, R, break-even.

   Everything is scripted and labelled "Illustrative". No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#22d3ee", gold: "#f4b942", orange: "#ff9f0a", yellow: "#ffd60a", purple: "#bf5af2", teal: "#64d2ff",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#111114", box: "#2c2c2e", gray: "#8e8e93" };
  var FS = 1;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function f1(v) { return (+v).toFixed(1); }
  function txt(x, y, s, col, size, anchor, weight, op) {
    if (op != null && op <= 0) return "";
    return '<text x="' + f1(x) + '" y="' + f1(y) + '" fill="' + col + '" font-size="' + f1((size || 13) * FS) + '" text-anchor="' + (anchor || "start") + '"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  function hl(x1, x2, y, col, dash, w, op) {
    if (op != null && op <= 0) return "";
    return '<line x1="' + f1(x1) + '" x2="' + f1(x2) + '" y1="' + f1(y) + '" y2="' + f1(y) + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function rect(x, y, w, h, fill, op, stroke, rx) {
    if (op <= 0) return "";
    return '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(Math.max(0, w)) + '" height="' + f1(Math.max(0, h)) + '"' + (rx ? ' rx="' + rx + '"' : "") + ' fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="1.4"' : "") + ' opacity="' + op.toFixed(3) + '"/>';
  }
  function ring(x, y, r, col, w, op) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r) + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2) + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function dot(x, y, r, col, op, stroke) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(r) + '" fill="' + col + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="1.3"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function tri(x, y, up, col, sz, op) {
    if (op != null && op <= 0) return "";
    var h = sz * 1.15, p = up ? [x, y - h / 2, x - sz / 2, y + h / 2, x + sz / 2, y + h / 2] : [x, y + h / 2, x - sz / 2, y - h / 2, x + sz / 2, y - h / 2];
    return '<polygon points="' + p.map(f1).join(" ") + '" fill="' + col + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function poly(P, col, w, dash, op) {
    if (P.length < 2 || (op != null && op <= 0)) return "";
    return '<polyline points="' + P.map(function (p) { return f1(p[0]) + "," + f1(p[1]); }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2) + '"' +
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
    var w = (label.length * 7 + 16) * FS, h = 20 * FS;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + f1(xTag) + '" y="' + f1(y - h / 2) + '" width="' + f1(w) + '" height="' + f1(h) + '" rx="5" fill="' + col + '"/>' +
      txt(xTag + 8 * FS, y + 4.5 * FS, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function pt(v) { return v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  function isNarrow(el, below) { return el.clientWidth > 0 && el.clientWidth < (below || 560); }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  var C2 = { indigo: "#7d7aff" };
  function rx(x, y, w, h, fill, op, stroke, r, sw) {
    if (op != null && op <= 0) return "";
    return '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(Math.max(0, w)) + '" height="' + f1(Math.max(0, h)) + '" rx="' + (r || 0) + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="' + (sw || 1.5) + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function n0(v) { return Math.round(v).toLocaleString("en-US"); }
  function sgn(v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + n0(Math.abs(v)); }

  /* bars from closes: [open, high, low, close]; wicks from a seeded random, overrides by index */
  function makeBars(first, closes, seed, over) {
    var r = rng(seed || 3), B = [], o = first;
    closes.forEach(function (c, i) {
      var w = Math.abs(c - o);
      var h = Math.max(o, c) + 0.6 + r() * (1.2 + w * 0.25), l = Math.min(o, c) - 0.6 - r() * (1.2 + w * 0.25);
      var b = [o, h, l, c];
      if (over && over[i]) b = over[i];
      B.push(b); o = b[3];
    });
    return B;
  }

  /* candle chart up to bar `cur` (fractional: the last bar grows). L {x0,x1,yt,yb}; D {B,pmin,pmax} */
  function candleChart(L, D, cur, op) {
    var n = D.B.length, dx = (L.x1 - L.x0) / n;
    function x(i) { return L.x0 + dx * (i + 0.5); }
    function y(p) { return L.yb - (p - D.pmin) / (D.pmax - D.pmin) * (L.yb - L.yt); }
    var s = "", bw = Math.max(3, dx * 0.62), full = Math.floor(cur), fr = cur - full;
    for (var i = 0; i < n; i++) {
      if (i > full || (i === full && fr <= 0)) break;
      var b = D.B[i], f = i < full ? 1 : fr;
      var c = b[0] + (b[3] - b[0]) * f, h = b[0] + (b[1] - b[0]) * Math.min(1, f * 1.4), l = b[0] + (b[2] - b[0]) * Math.min(1, f * 1.4);
      h = Math.max(h, Math.max(b[0], c)); l = Math.min(l, Math.min(b[0], c));
      var up = c >= b[0], col = up ? C.up : C.dn, top = y(Math.max(b[0], c)), bot = y(Math.min(b[0], c));
      s += '<line x1="' + f1(x(i)) + '" x2="' + f1(x(i)) + '" y1="' + f1(y(h)) + '" y2="' + f1(y(l)) + '" stroke="' + col + '" stroke-width="1.4"' + (op != null ? ' opacity="' + op + '"' : "") + "/>";
      s += rx(x(i) - bw / 2, top, bw, Math.max(1.5, bot - top), col, op == null ? 1 : op);
    }
    return { s: s, x: x, y: y, dx: dx };
  }

  var OR = "#ff9f0a";
  function times(i) { var m = 9 * 60 + 30 + i * 5; return Math.floor(m / 60) + ":" + ("0" + (m % 60)).slice(-2); }
  function boxOf(B, i0, i1) { var h = -1e9, l = 1e9; for (var i = i0; i <= i1; i++) { h = Math.max(h, B[i][1]); l = Math.min(l, B[i][2]); } return { hi: h, lo: l, mid: (h + l) / 2 }; }

  /* the clock strip under a chart: 9:30–9:45 hands off, 9:45–10:00 plan, 10:00–10:30 enter, 11:00 the hourly candle */
  function clockStrip(L, x, n, op, short) {
    var s = "", y0 = L.yb + 30 * FS, h = 8 * FS, half = (x(1) - x(0)) / 2;
    function seg(a, b, col, label) {
      if (a >= n) return;
      var xa = x(a) - half, xb = x(Math.min(b, n) - 1) + half;
      s += rx(xa + 1, y0, xb - xa - 2, h, col, 0.85 * op, null, 3);
      if (label && xb - xa > label.length * 6.2 * FS) s += txt((xa + xb) / 2, y0 + h + 15 * FS, label, col, 11, "middle", 600, op);
    }
    seg(0, 3, C.dn, short ? "hands off" : "9:30–9:45 hands off");
    seg(3, 6, C.gold, short ? "plan" : "9:45–10 plan");
    seg(6, 12, C.up, short ? "enter" : "10:00–10:30 enter");
    if (n > 18) s += hl(x(18) - half, x(18) - half, L.yt, C.teal, "3 4", 1.2, 0.6 * op) + txt(x(18) - half + 4, L.yt + 12 * FS, "11:00", C.teal, 11, "start", 600, op);
    return s;
  }
  function vline(x, y1, y2, col, dash, w, op) {
    if (op != null && op <= 0) return "";
    return '<line x1="' + f1(x) + '" x2="' + f1(x) + '" y1="' + f1(y1) + '" y2="' + f1(y2) + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  /* the opening range box, the 50% line */
  function orbBox(x, y, b, i1, col, op, label) {
    var half = (x(1) - x(0)) / 2, xa = x(0) - half, xb = x(i1) + half;
    var s = rx(xa, y(b.hi), xb - xa, y(b.lo) - y(b.hi), col, 0.13 * op, col, 4, 1.4);
    if (label) s += txt(xa + 4, y(b.hi) - 6 * FS, label, col, 11.5, "start", 700, op);
    return s;
  }

  /* =====================================================================
     The walkthrough data: a made-up ES morning, 5-minute bars from 9:30.
     ===================================================================== */
  var WB = [
    [6840, 6852, 6838, 6851], [6851, 6851.5, 6836, 6838], [6838, 6847, 6837, 6845],
    [6845, 6857, 6844, 6856], [6856, 6857.5, 6851, 6852], [6852, 6854, 6849.5, 6853],
    [6853, 6857, 6852, 6856.5], [6856.5, 6860, 6855, 6859], [6859, 6862, 6857, 6861],
    [6861, 6863, 6858, 6859.5], [6859.5, 6864, 6859, 6863], [6863, 6865, 6861, 6862],
    [6862, 6866, 6861, 6865], [6865, 6867, 6863, 6864], [6864, 6866.5, 6862.5, 6866],
    [6866, 6867, 6864, 6865], [6865, 6865.5, 6860, 6861], [6861, 6862, 6857.5, 6859],
    [6859, 6864, 6858.5, 6863.5], [6863.5, 6868, 6863, 6867], [6867, 6871, 6866, 6870],
    [6870, 6871.5, 6867, 6868]
  ];
  var WORB = boxOf(WB, 0, 2), WE = 6856, WS = 6849, WK = 6870;

  (function () {
    var root = document.querySelector("[data-tf-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;
    var STAGES = [
      { at: 0,    title: "Bias first", text: "Before the open: the larger point of view is bullish, the next key level above is yesterday's high at 6,870, and there's no level 3 news or FOMC today. Longs only." },
      { at: 2.6,  title: "9:30 to 9:45: hands off", text: "The open pops up, gets slammed down, then pops again. This is where the traditional ORB trader takes the first break and gets stopped out. Big money is filling orders; anyone trading now is their liquidity." },
      { at: 6.2,  title: "9:45: box the opening range", text: "Mark the high and low of the first 15 minutes: 6,852 and 6,836. The 50% line, 6,844, is a level too. Now you plan the trade; you don't take it yet." },
      { at: 8.4,  title: "The break is not the entry", text: "Price breaks above the range high in the direction of your bias. Good: that confirms the thesis. But 9:45 to 10:00 is where the institutions position, so it's the second most likely time for a fakeout. Wait." },
      { at: 10.6, title: "10:00: the retest holds, long", text: "Price pulls back to the top of the range and holds above the last low: a higher low. At 10:00 a green candle leaves it. Long 6,856, stop 6,849 under the higher low: 7 points, $350 on one ES." },
      { at: 13.8, title: "Stop to break-even", text: "It moves your way, so the stop goes to break-even at 6,856. Now it's a no-risk trade. Base hits: you're aiming for the next level, not the whole day." },
      { at: 17.0, title: "Into 11:00: the shakeout", text: "Into 11:00 the 1-hour candle is printing, and price dips 9 points. That's manipulation before the next leg, not the end of the trend. The break-even stop at 6,856 holds." },
      { at: 19.6, title: "The target: +14, 2R", text: "After 11:00 the trend resumes and tags yesterday's high at 6,870. +14 points from a 7-point stop: 2R, $700 on one ES. Bias, time of day, the retest." }
    ];
    var KF = [[0, 0.6], [2.4, 0.6], [2.6, 0.6], [5.6, 3], [6.2, 3], [8.2, 3], [8.4, 3], [9.8, 4], [10.6, 4], [12.4, 7], [13.8, 7], [16.4, 16], [17.0, 16], [18.8, 18], [19.6, 18], [21.6, 22]];
    var END = 22.8;
    function curAt(T) {
      if (T >= KF[KF.length - 1][0]) return WB.length;
      for (var k = 1; k < KF.length; k++) if (T <= KF[k][0]) { var a = KF[k - 1], b = KF[k]; return a[1] + (b[1] - a[1]) * clamp01((T - a[0]) / (b[0] - a[0] || 1)); }
      return WB.length;
    }
    function size(n) {
      return n ? { W: 440, H: 800, x0: 10, x1: 300, xTag: 304, yt: 210, yb: 720, cx: 12, cy: 14 }
               : { W: 1180, H: 640, x0: 30, x1: 960, xTag: 968, yt: 150, yb: 560, cx: 30, cy: 14 };
    }
    var D = { B: WB, pmin: 6830, pmax: 6876 };

    function frame(T, L) {
      var cur = curAt(T), s = "", N = L.narrow;
      var H = candleChart(L, D, cur), x = H.x, y = H.y;
      s += txt(L.x0, L.yt - 34 * FS, N ? "5-minute ES · made-up" : "5-minute ES · a made-up morning", C.faint, 12, "start");
      [0, 3, 6, 12, 18].forEach(function (i) { s += txt(x(i), L.yb + 20 * FS, times(i), C.faint, 11, "middle"); });

      /* the key level above, from the bias */
      var ko = fade(T, 0.3, 0.5);
      s += hl(L.x0, L.x1, y(WK), C.teal, "8 5", 1.8, ko);
      s += tag(L.xTag, y(WK), N ? "KPL " + pt(WK) : "KPL · yesterday's high " + pt(WK), C.teal, ko);

      /* the zones */
      var half = H.dx / 2;
      var zo = fade(T, 2.6, 0.4);
      if (zo > 0) s += rx(x(0) - half, L.yt, H.dx * 3, L.yb - L.yt, C.dn, 0.07 * zo);
      var po = fade(T, 8.4, 0.4);
      if (po > 0) s += rx(x(3) - half, L.yt, H.dx * 3, L.yb - L.yt, C.gold, 0.06 * po);
      var eo0 = fade(T, 10.6, 0.4);
      if (eo0 > 0) s += rx(x(6) - half, L.yt, H.dx * 6, L.yb - L.yt, C.up, 0.05 * eo0);
      var mo = fade(T, 17.0, 0.4);
      if (mo > 0) s += rx(x(16) - half, L.yt, H.dx * 2, L.yb - L.yt, C.purple, 0.09 * mo * (1 - fade(T, 19.6, 0.4) * 0.6));
      s += clockStrip(L, x, Math.ceil(cur), fade(T, 2.6, 0.4), N);

      /* the opening range */
      var bo = fade(T, 6.2, 0.5);
      if (bo > 0) {
        s += orbBox(x, y, WORB, 2, OR, bo, N ? null : "15-minute opening range");
        s += hl(x(0) - half, L.x1, y(WORB.hi), OR, null, 1.6, bo * 0.9);
        s += hl(x(0) - half, L.x1, y(WORB.mid), OR, "3 4", 1.4, bo * 0.8);
        s += hl(x(0) - half, L.x1, y(WORB.lo), OR, null, 1.6, bo * 0.9);
        s += tag(L.xTag, y(WORB.hi) + (T >= 12.0 ? 6 : 0) * FS, (N ? "high " : "ORB high ") + pt(WORB.hi), OR, bo);
        s += tag(L.xTag, y(WORB.mid), "50% " + pt(WORB.mid), OR, bo * 0.85);
        s += tag(L.xTag, y(WORB.lo), (N ? "low " : "ORB low ") + pt(WORB.lo), OR, bo);
      }
      s += H.s;

      /* fakeouts */
      var fo = fade(T, 3.2, 0.4) * (1 - fade(T, 6.2, 0.4));
      if (fo > 0) {
        s += txt(x(0), y(6852) - 14 * FS, "✕", C.dn, 15, "middle", 800, fo);
        s += txt(x(1), y(6836) + 22 * FS, "✕", C.dn, 15, "middle", 800, fo * fade(T, 4.0, 0.3));
        if (!N) s += txt(x(1) + 30, y(6836) + 26, "long break, short break: both stopped", C.dn, 12, "start", 700, fo * fade(T, 4.4, 0.3));
      }
      /* the break */
      var ro = fade(T, 8.6, 0.3) * (1 - fade(T, 10.6, 0.4));
      if (ro > 0) {
        s += ring(x(3), y(6857), 10 * FS, C.gold, 2.2, ro);
        s += txt(x(3), y(6857) - 18 * FS, N ? "wait" : "confirmation, not the entry", C.gold, 12, "middle", 700, ro);
      }
      /* higher low, the entry */
      var ho = fade(T, 10.8, 0.3);
      if (ho > 0) {
        s += ring(x(5), y(6849.5), 9 * FS, C.up, 2, ho * (T < 14 ? 1 : 0.45));
        if (T < 14) s += txt(x(5), y(6849.5) + (N ? 40 : 24) * FS, "higher low", C.up, 12, "middle", 700, ho);
      }
      var eo = fade(T, 12.0, 0.3);
      if (eo > 0) {
        var xe = x(6), xr = x(Math.max(6, Math.min(cur - 0.5, 20)));
        var be = T >= 14.2, so = be ? WE : WS;
        s += hl(xe, xr, y(WE), C.up, null, 1.8, eo);
        s += tri(xe - 12 * FS, y(WE) + 10 * FS, true, C.up, 10 * FS, eo);
        s += hl(xe, xr, y(so), be ? C.gold : C.dn, "5 4", 1.6, eo);
        s += tag(L.xTag, y(WE) - 8 * FS, "long " + pt(WE), C.up, eo * (be ? 0 : 1));
        s += tag(L.xTag, y(so) + (be ? -8 : 14) * FS, be ? (N ? "stop BE" : "stop at break-even " + pt(WE)) : "stop " + pt(WS), be ? C.gold : C.dn, eo, be ? "#000" : "#fff");
      }
      var so2 = fade(T, 17.2, 0.3) * (1 - fade(T, 19.6, 0.4) * 0.6);
      if (so2 > 0) s += txt(x(16.5), y(6857.5) + 40 * FS, N ? "11:00 shake" : "shakeout into 11:00", C.purple, 12, "middle", 700, so2);
      var xo = fade(T, 21.0, 0.3);
      if (xo > 0) {
        s += ring(x(20), y(WK), 10 * FS, C.cyan, 2.2, xo);
        s += txt(x(20), y(WK) - 18 * FS, "+14 · 2R", C.cyan, 14, "middle", 800, xo);
      }

      var cx0 = L.cx, cy0 = L.cy;
      s += callout(cx0, cy0, ["Bias first · before the open", "Larger point of view: bullish", "Next level up: " + pt(WK), "No level 3 news: longs only"], C.teal, fade(T, 0.2, 0.3) * (1 - fade(T, 2.6, 0.3)));
      s += callout(cx0, cy0, ["9:30 to 9:45 · hands off", "Pop up, slammed down, pop up", "The first break gets faked out", "You'd be their liquidity"], C.dn, fade(T, 2.8, 0.3) * (1 - fade(T, 6.2, 0.3)));
      s += callout(cx0, cy0, ["9:45 · box the range", "High " + pt(WORB.hi) + " · low " + pt(WORB.lo), "50% line " + pt(WORB.mid), "Plan it, don't take it"], OR, fade(T, 6.4, 0.3) * (1 - fade(T, 8.4, 0.3)));
      s += callout(cx0, cy0, ["It breaks up, with the bias", "Confirmation, not the entry", "9:45 to 10: positioning", "Wait for the retest"], C.gold, fade(T, 8.6, 0.3) * (1 - fade(T, 10.6, 0.3)));
      s += callout(cx0, cy0, ["10:00 · long " + pt(WE), "Retest holds: a higher low", "Stop " + pt(WS) + ": 7 points", "$350 risk on one ES"], C.up, fade(T, 10.8, 0.3) * (1 - fade(T, 13.8, 0.3)));
      s += callout(cx0, cy0, ["Stop to break-even", "It's working: risk off", "Base hits, KPL to KPL", "Not the whole day"], C.gold, fade(T, 14.0, 0.3) * (1 - fade(T, 17.0, 0.3)));
      s += callout(cx0, cy0, ["Into 11:00 · the shakeout", "The 1-hour candle prints", "A 9-point dip, stop holds", "Then the trend resumes"], C.purple, fade(T, 17.2, 0.3) * (1 - fade(T, 19.6, 0.3)));
      s += callout(cx0, cy0, ["Target · " + pt(WK), "+14 points from a 7 stop", "2R · $700 on one ES", "Bias, time, the retest"], C.cyan, fade(T, 19.8, 0.3));
      s += txt(L.W - 8, L.H - 6, "Illustrative · made-up candles", C.faint, 11, "end");
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
    window.TFAnim = { seek: function (t) { setPlaying(false); T = t; draw(); }, END: END, STAGES: STAGES };
  })();

  /* =====================================================================
     2. The six steps as a stepper, with a small chart per step
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-tf-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 6) return;
    var INFO = [
      { k: "Bias",     c: C.teal,   tag: "Bias · the larger point of view first" },
      { k: "Wait",     c: C.dn,     tag: "Wait · nothing before 9:45" },
      { k: "Mark",     c: OR,       tag: "Mark · the range, its 50%, the key levels" },
      { k: "10:00",    c: C.gold,   tag: "10:00 · the true direction for the day" },
      { k: "Enter",    c: C.up,     tag: "Enter · on the retest, not the break" },
      { k: "Manage",   c: C.cyan,   tag: "Manage · base hits, break-even, 11:00" }
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
    function t(x, y, s, col, anchor, w, size) { return '<text x="' + f1(x) + '" y="' + f1(y) + '" fill="' + col + '" font-size="' + f1((size || 13) * SF) + '" text-anchor="' + (anchor || "start") + '"' + (w ? ' font-weight="' + w + '"' : "") + ">" + s + "</text>"; }
    function candles(list, x0, dx, bw, yf) {
      var s = "";
      list.forEach(function (b, i) {
        var up = b[3] >= b[0], col = up ? C.up : C.dn, xc = x0 + i * dx;
        s += vline(xc, yf(b[1]), yf(b[2]), col, null, 1.3);
        s += rect(xc - bw / 2, yf(Math.max(b[0], b[3])), bw, Math.max(2, Math.abs(yf(b[0]) - yf(b[3]))), col, 0.95, null, 2);
      });
      return s;
    }

    function bias(c) {
      var s = t(16, 24, "Top-down: the daily trend sets the side for the day", C.faint, "start", null, 12);
      var P = [[30, 270], [80, 210], [120, 240], [175, 170], [215, 200], [270, 130], [310, 160], [365, 90]];
      s += poly(P, c, 3);
      [[120, 240], [215, 200], [310, 160]].forEach(function (p) { s += ring(p[0], p[1], 7, C.up, 2) + t(p[0], p[1] + 24, "HL", C.up, "middle", 700, 11); });
      s += t(200, 300, "higher highs, higher lows: bullish · longs only", C.up, "middle", 700, 13);
      s += rect(400, 60, 146, 120, C.box, 0.6, null, 10);
      s += t(412, 84, "The calendar", C.ink, "start", 700, 13);
      s += t(412, 108, "Level 3 news?", C.dim, "start", null, 12);
      s += t(412, 128, "FOMC?", C.dim, "start", null, 12);
      s += t(412, 156, "Yes: sit it out", C.dn, "start", 700, 12);
      s += t(473, 230, "No bias,", C.faint, "middle", null, 12) + t(473, 248, "no trade.", C.faint, "middle", 700, 12);
      return s;
    }
    function wait(c) {
      var s = t(16, 24, "9:30 to 9:45: the most fakeouts of the day", C.faint, "start", null, 12);
      var yf = function (p) { return 300 - (p - 6830) * 6; };
      var B = [[6842, 6852, 6840, 6851], [6851, 6851.5, 6836, 6838], [6838, 6847, 6837, 6845]];
      s += rect(40, 40, 230, 270, c, 0.08, null, 8);
      s += t(155, 60, "hands off", c, "middle", 700, 14);
      s += candles(B, 90, 66, 34, yf);
      s += hl(40, 520, yf(6849), C.gray, "4 4", 1.2) + t(520, yf(6849) - 6, "first break up", C.gray, "end", null, 11);
      s += hl(40, 520, yf(6839), C.gray, "4 4", 1.2) + t(520, yf(6839) + 16, "first break down", C.gray, "end", null, 11);
      s += t(90, yf(6852) - 12, "✕ long stopped", C.dn, "middle", 700, 12);
      s += t(156, yf(6836) + 22, "✕ short stopped", C.dn, "middle", 700, 12);
      s += t(400, 120, "Big money fills its orders.", C.dim, "middle", null, 13);
      s += t(400, 140, "Early traders are the liquidity.", C.dim, "middle", null, 13);
      return s;
    }
    function mark(c) {
      var s = t(16, 24, "Two ranges and a halfway line", C.faint, "start", null, 12);
      var yf = function (p) { return 310 - (p - 6828) * 6.2; };
      var B = [[6842, 6852, 6840, 6851], [6851, 6851.5, 6836, 6838], [6838, 6847, 6837, 6845], [6845, 6857, 6844, 6856], [6856, 6858, 6851, 6852], [6852, 6854, 6849.5, 6853]];
      s += rect(54, yf(6852), 132, yf(6836) - yf(6852), c, 0.14, c, 4);
      s += rect(54, yf(6858), 316, yf(6836) - yf(6858), C.purple, 0.06, C.purple, 4);
      s += candles(B, 80, 56, 26, yf);
      s += hl(54, 530, yf(6852), c, null, 1.6) + t(530, yf(6852) - 6, "15-min high · 9:45", c, "end", 700, 11);
      s += hl(54, 530, yf(6844), c, "3 4", 1.4) + t(530, yf(6844) - 6, "50% of the range", c, "end", 700, 11);
      s += hl(54, 530, yf(6836), c, null, 1.6) + t(530, yf(6836) + 16, "15-min low", c, "end", 700, 11);
      s += t(370, yf(6858) - 8, "30-min range · prints at 10:00", C.purple, "end", 700, 11);
      s += t(280, 330, "The edges and the 50% are all key pivot levels.", C.faint, "middle", null, 11);
      return s;
    }
    function ten(c) {
      var s = t(16, 24, "The clock, 9:30 to 11:30 ET", C.faint, "start", null, 12);
      var x0 = 30, x1 = 530, m0 = 570, m1 = 690, xf = function (m) { return x0 + (m - m0) / (m1 - m0) * (x1 - x0); };
      function zone(a, b, col, l1, l2, row) {
        var r = rect(xf(a), 120, xf(b) - xf(a) - 2, 42, col, 0.85, null, 6);
        var xm = (xf(a) + xf(b)) / 2, yy = row ? 214 : 190;
        r += t(xm, yy, l1, col, "middle", 700, 12) + t(xm, yy + 17, l2, C.dim, "middle", null, 11);
        return r;
      }
      s += zone(570, 585, C.dn, "9:30", "hands off", 0);
      s += zone(585, 600, C.gold, "9:45", "plan it", 1);
      s += zone(600, 630, C.up, "10:00–10:30", "the entry window", 0);
      s += zone(630, 660, C.gray, "10:30", "no break? range day", 1);
      s += zone(660, 690, C.purple, "11:00", "hourly candle: shakeouts", 0);
      [570, 600, 630, 660, 690].forEach(function (m) { s += t(xf(m), 108, Math.floor(m / 60) + ":" + ("0" + m % 60).slice(-2), C.faint, "middle", null, 11); });
      s += tri(xf(600), 78, false, c, 14) + t(xf(600), 60, "true direction for the day", c, "middle", 700, 13);
      s += t(280, 300, "Most of the time the real trend starts around 10:00.", C.faint, "middle", null, 12);
      s += t(280, 318, "Not set in stone: it's probabilities.", C.faint, "middle", null, 11);
      return s;
    }
    function enter(c) {
      var s = t(16, 24, "Two good entries after the break (long shown; flip it for shorts)", C.faint, "start", null, 12);
      function side(ox, deep) {
        var r = "", yf = function (p) { return 300 - (p - 6834) * 6.6; };
        var B = deep ? [[6845, 6857, 6844, 6856], [6856, 6857, 6849, 6850], [6850, 6851, 6846, 6847], [6847, 6853, 6846.5, 6852], [6852, 6858, 6851, 6857]]
                     : [[6845, 6857, 6844, 6856], [6856, 6857, 6852.5, 6853], [6853, 6855, 6852, 6854.5], [6854.5, 6859, 6854, 6858], [6858, 6861, 6857, 6860]];
        r += hl(ox, ox + 240, yf(6852), OR, null, 1.6) + t(ox + 240, yf(6852) - 6, "ORB high", OR, "end", 600, 11);
        r += hl(ox, ox + 240, yf(6844), OR, "3 4", 1.2) + t(ox + 240, yf(6844) - 6, "50%", OR, "end", 600, 11);
        r += candles(B, ox + 30, 40, 20, yf);
        var lowP = deep ? 6846 : 6852, ent = deep ? 6852 : 6854.5;
        r += ring(ox + 30 + (deep ? 2 : 2) * 40, yf(lowP), 8, c, 2);
        r += hl(ox + 30 + 3 * 40 - 14, ox + 236, yf(lowP - 1), C.dn, "5 4", 1.4) + t(ox + 236, yf(lowP - 1) + 15, "stop", C.dn, "end", 600, 11);
        r += tri(ox + 30 + 3 * 40 - 20, yf(ent) + 2, true, C.up, 10);
        r += t(ox + 120, 322, deep ? "Deeper: a higher low, then long" : "Retest of the ORB high, then long", deep ? C.up : C.gold, "middle", 700, 12);
        return r;
      }
      return s + side(20, false) + side(296, true);
    }
    function manage(c) {
      var s = t(16, 24, "Base hits from level to level; break-even as soon as it works", C.faint, "start", null, 12);
      var yf = function (p) { return 310 - (p - 6834) * 6.4; };
      s += hl(30, 530, yf(6870), C.teal, "8 5", 1.6) + t(530, yf(6870) - 6, "next KPL · target", C.teal, "end", 700, 11);
      s += hl(30, 530, yf(6852), OR, null, 1.4) + t(530, yf(6852) + 15, "ORB high", OR, "end", 600, 11);
      var P = [[30, yf(6850)], [70, yf(6856)], [100, yf(6851)], [130, yf(6856)], [170, yf(6861)], [210, yf(6859)], [250, yf(6864)], [300, yf(6866)], [340, yf(6865)], [372, yf(6858)], [404, yf(6860)], [440, yf(6866)], [480, yf(6870)]];
      s += poly(P, C.ink, 3);
      s += tri(130, yf(6856) + 14, true, C.up, 10) + t(130, yf(6856) + 32, "long", C.up, "middle", 700, 11);
      s += hl(130, 480, yf(6856), C.gold, "5 4", 1.4) + t(200, yf(6856) + 30, "stop to break-even", C.gold, "start", 700, 11);
      s += ring(372, yf(6858), 9, C.purple, 2) + t(372, yf(6858) + 34, "11:00 shake", C.purple, "middle", 700, 11);
      s += ring(480, yf(6870), 9, c, 2.2) + t(470, yf(6870) - 14, "out", c, "end", 700, 12);
      s += t(280, 330, "No break by 10:30? A range day: wait for the next hourly candle.", C.faint, "middle", null, 11);
      return s;
    }
    function chart(k) { return [bias, wait, mark, ten, enter, manage][k](INFO[k].c); }
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
      FS = 1; SF = svg.clientWidth > 0 && svg.clientWidth < 440 ? 1.12 : 1;
      svg.innerHTML = '<rect width="560" height="340" rx="14" fill="' + C.bg + '"/>' + chart(k);
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
     3. The four trades from the video, on made-up bars
     ===================================================================== */
  function ema(B, n) { var k = 2 / (n + 1), e = B[0][3], out = []; B.forEach(function (b) { e = b[3] * k + e * (1 - k); out.push(e); }); return out; }
  var PLAYS = {
    reject: {
      B: [[6900, 6907, 6898, 6905], [6905, 6906, 6895, 6898], [6898, 6903, 6897, 6902], [6902, 6911, 6901, 6910], [6910, 6915, 6909, 6914], [6914, 6918.5, 6913, 6917],
          [6917, 6919.5, 6907, 6908], [6908, 6909, 6903, 6904], [6904, 6907, 6903, 6906], [6906, 6906.5, 6898, 6899], [6899, 6900, 6893, 6894], [6894, 6897, 6893, 6896],
          [6896, 6896.5, 6888, 6889], [6889, 6890, 6884, 6885], [6885, 6888, 6884.5, 6887], [6887, 6888, 6885, 6886], [6886, 6889, 6885.5, 6888], [6888, 6889, 6883.5, 6884]],
      pmin: 6876, pmax: 6926, orb30: true,
      levels: [[6919.5, "KPL 6,919.50", C.teal, "8 5"], [6884, "KPL 6,884", C.teal, "8 5"]],
      entry: [6, 6908, false], stop: 6920, exitAt: [13, 6884],
      marks: [[3, 6911, "breaks the 15-min high", C.gold, -16, 3], [6, 6919.5, "10:00: rejected", C.dn, -16], [13, 6884, "+24 · 2R", C.cyan, 30]],
      note: "<b>Rejected at 10:00, short.</b> The open broke above the 15-minute range, and anyone who bought that break had a scalp. But the 10:00 candle, the top of the 30-minute range, ran into a key level and got rejected hard. That's the trade: short " + "6,908, stop above the rejection at 6,920, target the next key level down at 6,884. +24 from a 12-point stop. The video's own example from that morning; the prices here are made up."
    },
    half: {
      B: [[6850, 6884, 6848, 6880], [6880, 6886, 6871, 6872], [6872, 6874, 6866, 6868], [6868, 6869, 6866, 6867.5], [6867.5, 6872, 6867, 6871.5], [6871.5, 6872.5, 6868.5, 6869.5],
          [6869.5, 6874, 6869, 6873.5], [6873.5, 6877, 6872, 6876], [6876, 6877, 6873, 6874.5], [6874.5, 6880, 6874, 6879], [6879, 6883, 6878, 6882], [6882, 6885.5, 6880, 6884.5],
          [6884.5, 6885, 6880, 6881], [6881, 6883, 6879, 6882], [6882, 6884, 6880.5, 6883]],
      pmin: 6842, pmax: 6892,
      levels: [],
      entry: [4, 6871, true], stop: 6866, exitAt: [11, 6885],
      marks: [[0, 6884, "news spike", C.gold, -14], [3, 6866, "at 50%", OR, 26], [5, 6868.5, "higher low · add", C.up, 26, 5.4], [11, 6886, "+14 · base hit", C.cyan, -16]],
      note: "<b>A big range: the 50% rule.</b> A news headline made the opening range huge, so a break of its high would come far too late. Instead the halfway line is the level. The bias was bullish, price came back to 50% and reacted: long one contract on the reaction candle with the stop just under it, add a second on the higher low above 50%, and take the base hit back to the range high. +14 from a 5-point stop. Made-up prices."
    },
    pre: {
      B: [[6950, 6958, 6949, 6956], [6956, 6957, 6948, 6951], [6951, 6955, 6950, 6954], [6954, 6958.5, 6953, 6956], [6956, 6957, 6952, 6953], [6953, 6957.5, 6952.5, 6955.5],
          [6955.5, 6956, 6949, 6950], [6950, 6951, 6945, 6946], [6946, 6949.5, 6945.5, 6948], [6948, 6948.5, 6941, 6942], [6942, 6943, 6937, 6938], [6938, 6942, 6937.5, 6941],
          [6941, 6941.5, 6933, 6934], [6934, 6935, 6928, 6929], [6929, 6933, 6928.5, 6932], [6932, 6932.5, 6924, 6925], [6925, 6927, 6920, 6922], [6922, 6925, 6921, 6924]],
      pmin: 6912, pmax: 6964, bands: true,
      levels: [[6922, "KPL 6,922", C.teal, "8 5"]],
      entry: [6, 6950, false], stop: 6959, exitAt: [16, 6922],
      marks: [[3, 6958.5, "can't break the high", C.gold, -14], [8, 6949.5, "into the bands · add", C.dn, -14, 8.2], [11, 6942, "add", C.dn, -14], [16, 6920, "+28 · 3R", C.cyan, 28]],
      note: "<b>The premarket pop fails, short.</b> Premarket pushed up into the open, but that move was grabbing liquidity, not starting a trend, and the larger bias was down. Price failed twice at the range high, so at 10:00 it's a short: target 50%, then the range low. It kept going. The trend bands turned red and stayed red, and every pullback into them was a place to add, not to panic. +28 from a 9-point stop. Made-up prices."
    },
    eleven: {
      B: [[6905, 6920, 6903, 6917], [6917, 6918, 6888, 6893], [6893, 6905, 6892, 6903], [6903, 6914, 6902, 6912], [6912, 6918, 6910, 6916], [6916, 6919.5, 6913, 6914],
          [6914, 6915, 6908, 6909], [6909, 6910, 6904, 6905], [6905, 6906, 6900, 6901], [6901, 6909, 6900.5, 6906], [6906, 6907, 6901, 6902], [6902, 6903, 6897, 6898],
          [6898, 6902, 6897, 6901], [6901, 6904.5, 6900, 6903], [6903, 6904, 6899, 6900], [6900, 6901, 6896, 6897], [6897, 6903, 6896.5, 6902], [6902, 6906, 6901, 6903],
          [6903, 6904, 6897, 6898], [6898, 6899, 6893, 6894], [6894, 6896, 6891, 6892.5], [6892.5, 6894, 6889, 6890], [6890, 6893, 6889, 6891.5], [6891.5, 6892, 6888, 6889]],
      pmin: 6882, pmax: 6926, bands: true,
      levels: [[6892, "KPL 6,892", C.teal, "8 5"]],
      entry: [18, 6902, false], stop: 6907, exitAt: [20, 6892],
      marks: [[5, 6919.5, "can't break it", C.gold, -14], [8, 6900, "bands flip red", C.dn, 26], [13, 6904.5, "lower high", C.gold, -14], [17, 6906, "into 11:00", C.purple, -16], [20, 6891, "+10 · 2R", C.cyan, 28]],
      note: "<b>The live trade: a shakeout into 11:00, short.</b> A wide range, so trade it inside: base hits from level to level. The bands flipped red, price lost the 50% line and printed lower highs under the range. Into 11:00 it pushed up to the 50% line, a classic shakeout while the 1-hour candle prints. Short with the risk just above that candle, target the next key level. In the video she risked $500 and closed it at +$1,000, 2R. Made-up prices."
    }
  };

  (function () {
    var root = document.querySelector("[data-tf-plays]");
    if (!root) return;
    var svg = root.querySelector("svg"), btns = root.querySelectorAll("[data-case]"), note = root.querySelector(".tf-note"), again = root.querySelector("[data-play]");
    var which = "reject", T = 99, playing = false, raf = 0, last = 0, DUR = 6.5;
    function draw() {
      var cs = PLAYS[which], narrow = isNarrow(svg, 600);
      var W = narrow ? 440 : 1180, H = narrow ? 560 : 460;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.18 : 1;
      var L = { x0: narrow ? 12 : 28, x1: narrow ? 268 : 940, yt: narrow ? 74 : 74, yb: H - 74 * FS };
      var n = cs.B.length, cur = Math.min(n, T / DUR * n);
      var Hc = candleChart(L, { B: cs.B, pmin: cs.pmin, pmax: cs.pmax }, cur), x = Hc.x, y = Hc.y, half = Hc.dx / 2;
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      var b15 = boxOf(cs.B, 0, 2);
      var bo = clamp01((cur - 3) / 0.8);
      if (cs.orb30) { var b30 = boxOf(cs.B, 0, 5), o30 = clamp01((cur - 6) / 0.8); s += orbBox(x, y, b30, 5, C.purple, o30 * 0.8, null); if (o30 > 0) s += txt(x(5) + half - 4, y(b30.lo) - 6 * FS, narrow ? "30-min" : "30-minute range", C.purple, 11.5, "end", 700, o30); }
      s += orbBox(x, y, b15, 2, OR, bo, narrow ? null : "15-minute range");
      if (bo > 0) {
        s += hl(x(0) - half, L.x1, y(b15.hi), OR, null, 1.5, bo * 0.85) + hl(x(0) - half, L.x1, y(b15.mid), OR, "3 4", 1.3, bo * 0.8) + hl(x(0) - half, L.x1, y(b15.lo), OR, null, 1.5, bo * 0.85);
        s += tag(L.x1 + 6, y(b15.hi), (narrow ? "high " : "ORB high ") + pt(b15.hi), OR, bo);
        s += tag(L.x1 + 6, y(b15.mid), "50% " + pt(b15.mid), OR, bo * 0.85);
        s += tag(L.x1 + 6, y(b15.lo), (narrow ? "low " : "ORB low ") + pt(b15.lo), OR, bo);
      }
      cs.levels.forEach(function (lv) { s += hl(L.x0, L.x1, y(lv[0]), lv[2], lv[3], 1.8, 0.95) + tag(L.x1 + 6, y(lv[0]) + (lv[0] > b15.hi ? -18 : 0) * FS, lv[1], lv[2], 1); });
      if (cs.bands) {
        var E = ema(cs.B, 5), k0 = 3, k1 = Math.min(n - 1, Math.floor(cur - 0.01));
        for (var i = k0; i <= k1; i++) {
          var col = E[i] < E[i - 1] ? C.dn : C.up;
          var pts = [[x(i - 1), y(E[i - 1] + 2)], [x(i), y(E[i] + 2)], [x(i), y(E[i] - 2)], [x(i - 1), y(E[i - 1] - 2)]];
          s += '<polygon points="' + pts.map(function (p) { return f1(p[0]) + "," + f1(p[1]); }).join(" ") + '" fill="' + col + '" opacity="0.22"/>';
        }
      }
      s += Hc.s;
      s += clockStrip(L, x, n, 1, narrow);
      [0, 6, 12, 18].forEach(function (i) { if (i < n) s += txt(x(i), L.yb + 18 * FS, times(i), C.faint, 11, "middle"); });
      var e = cs.entry;
      if (cur > e[0] + 0.6) {
        var xr = x(Math.min(cs.exitAt[0], cur - 0.5));
        s += hl(x(e[0]), xr, y(e[1]), e[2] ? C.up : C.dn, null, 1.8);
        s += hl(x(e[0]), xr, y(cs.stop), C.dn, "5 4", 1.5);
        s += tri(x(e[0]) - 12 * FS, y(e[1]), e[2], e[2] ? C.up : C.dn, 10 * FS);
      }
      cs.marks.forEach(function (m) {
        var at = m[5] != null ? m[5] : m[0]; if (cur < at + 0.8) return;
        if (narrow && m[2].length > 15) return;
        var o = clamp01((cur - at - 0.8) / 1.2);
        var hw = m[2].length * 3.4 * FS + 4, mx = Math.max(L.x0 + hw, Math.min(L.x1 - hw, x(m[0])));
        s += txt(mx, y(m[1]) + m[4] * FS, m[2], m[3], 12.5, "middle", 700, o);
      });
      s += txt(16, 30 * FS, narrow ? "5-minute ES · made-up" : "5-minute ES · made-up bars drawn to match the trade in the video", C.faint, 12, "start");
      if (cur > e[0] + 0.6) s += txt(16, 50 * FS, (e[2] ? "long " : "short ") + pt(e[1]) + " · stop " + pt(cs.stop), e[2] ? C.up : C.dn, 12.5, "start", 700);
      s += txt(W - 8, H - 8, "Illustrative", C.faint, 11, "end");
      svg.innerHTML = s; FS = 1;
      note.innerHTML = cs.note;
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-case") === which ? "true" : "false"); });
    }
    function tick(now) {
      if (!playing) return;
      T += Math.min(0.1, (now - last) / 1000); last = now;
      if (T >= DUR + 0.4) { T = 99; playing = false; }
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
     4. Is it a trade?
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-tf-check]");
    if (!root) return;
    var out = root.querySelector(".tf-out"), lamps = root.querySelectorAll("[data-lamp]");
    function v(n) { return root.querySelector('[name="' + n + '"]').value; }
    function setLamp(k, ok) { lamps[k].className = "tf-lamp " + (ok === true ? "is-ok" : ok === "warn" ? "is-warn" : "is-no"); }
    function run() {
      var time = v("time"), bias = v("bias"), news = v("news"), ent = v("ent"), room = v("room");
      var timeOk = time === "ten" ? true : time === "plan" || time === "eleven" ? "warn" : false;
      var biasOk = bias === "with" ? true : false;
      var newsOk = news === "ok" ? true : false;
      var entOk = ent === "retest" || ent === "hl" || ent === "half" ? true : false;
      var roomOk = room === "two" ? true : room === "one" ? "warn" : false;
      [timeOk, biasOk, newsOk, entOk, roomOk].forEach(function (o, k) { setLamp(k, o); });
      var k, h, p;
      if (newsOk === false) { k = "no"; h = "Not today"; p = "Level 3 news or FOMC. The range and the 10:00 read are far less likely to work on a high volatility news day. If you're new, skip the day."; }
      else if (time === "open") { k = "no"; h = "Too early: hands off"; p = "9:30 to 9:45 is where the most fakeouts happen. Big money is filling orders and anyone trading now is the liquidity. Wait for the range to finish."; }
      else if (biasOk === false) { k = "no"; h = bias === "none" ? "No bias, no trade" : "Against your bias"; p = bias === "none" ? "Taking whichever way it breaks is what didn't work. Do the top-down read first: which side is the day on?" : "A break against the larger point of view is the lower-probability side. Let it go, or wait for the setup in your direction."; }
      else if (ent === "break") { k = "no"; h = "That's the traditional ORB"; p = "The first break of the range is confirmation that your bias is right, not the entry. Wait for the retest of the range edge or a higher low (lower high for shorts)."; }
      else if (ent === "chase") { k = "no"; h = "The move already happened"; p = "Once price has run, taking the break is too late. Look for base hits from the next level, or wait for the next setup."; }
      else if (time === "range") { k = "no"; h = "A range day"; p = "No break of the range between 10:00 and 10:30. The best opportunity is usually waiting for the next 1-hour candle to print."; }
      else if (roomOk === false) { k = "no"; h = "No room"; p = "The next key level is right there. Without room for at least 2R it isn't worth the risk."; }
      else {
        var warn = timeOk === "warn" || roomOk === "warn";
        k = warn ? "b" : "a";
        h = warn ? "A trade, with something to check" : "Take it";
        p = warn ? ((time === "plan" ? "9:45 to 10:00 is when the institutions position and fakeouts are still common. Waiting for 10:00 almost always gives the better entry. " : "") +
                    (time === "eleven" ? "The 1-hour candle prints at 11:00 and can shake you out before the trend resumes. Stop past the shakeout, or wait for 11:00 to print. " : "") +
                    (roomOk === "warn" ? "Only about 1R to the next level: smaller size or a base hit. " : "") + "Smaller, or wait.")
                 : "Time of day, bias and the entry line up. Stop past the reaction candle or the retest low, target the next key level, and move the stop to break-even once it works.";
      }
      out.className = "chk-out tf-out is-" + k;
      out.innerHTML = "<b>" + h + "</b><p>" + p + "</p>";
    }
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    run();
  })();

  /* =====================================================================
     5. Size it: contracts from a dollar risk
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-tf-calc]");
    if (!root) return;
    var out = root.querySelector(".tf-cout"), calc = root.querySelector(".tf-ccalc"), pres = root.querySelectorAll("[data-pre]");
    var PRE = {
      walk:   { risk: 350, ct: "50", side: "long", entry: 6856, stop: 6849, tgt: 6870 },
      goose:  { risk: 300, ct: "5", side: "long", entry: 6856, stop: 6849, tgt: 6877 },
      live:   { risk: 500, ct: "50", side: "short", entry: 6902, stop: 6907, tgt: 6892 }
    };
    function el(n) { return root.querySelector('[name="' + n + '"]'); }
    function v(n) { return parseFloat(el(n).value); }
    function money(x) { return (x < 0 ? "−$" : "$") + Math.round(Math.abs(x)).toLocaleString("en-US"); }
    function row(a, b, cls) { return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + a + "</span><b>" + b + "</b></div>"; }
    function run() {
      var side = el("side").value, e = v("entry"), st = v("stop"), tg = v("tgt"), rk = v("risk"), pv = +el("ct").value, dir = side === "long" ? 1 : -1;
      var name = pv === 50 ? "ES" : "MES";
      if ([e, st, tg, rk].some(function (q) { return !isFinite(q); })) { out.className = "chk-out tf-cout is-no"; out.innerHTML = "<b>Fill in every box</b><p>Numbers only.</p>"; calc.innerHTML = ""; return; }
      var risk = (e - st) * dir, rew = (tg - e) * dir;
      if (risk <= 0) { out.className = "chk-out tf-cout is-no"; out.innerHTML = "<b>The stop is on the wrong side</b><p>For a " + side + " the stop goes " + (dir > 0 ? "below" : "above") + " the entry.</p>"; calc.innerHTML = ""; return; }
      if (rew <= 0) { out.className = "chk-out tf-cout is-no"; out.innerHTML = "<b>The target is behind you</b><p>The next level has to be " + (dir > 0 ? "above" : "below") + " the entry.</p>"; calc.innerHTML = ""; return; }
      var per = risk * pv, n = Math.floor(rk / per + 1e-9), R = rew / risk, k, h, p;
      if (n < 1) { k = "no"; h = "Too big for this risk"; p = "One " + name + " risks " + money(per) + " here, more than your " + money(rk) + ". Use the micro (MES), or find a tighter entry."; }
      else if (R >= 2) { k = "a"; h = n + " " + name + " · " + R.toFixed(1) + "R"; p = "At least 1:2 to the next level, the minimum the coach in the video looks for. Stop to break-even once it works."; }
      else if (R >= 1) { k = "b"; h = n + " " + name + " · " + R.toFixed(1) + "R"; p = "Under 1:2. A base hit at best: smaller, or wait for a better entry closer to the level."; }
      else { k = "no"; h = R.toFixed(1) + "R · not worth it"; p = "The next level is closer than your stop. Pass."; }
      out.className = "chk-out tf-cout is-" + k;
      out.innerHTML = "<b>" + h + "</b><p>" + p + "</p>";
      var c = "";
      c += row("Risk to the stop", pt(risk) + " pts &middot; " + Math.round(risk * 4) + " ticks &middot; " + money(per) + " per " + name);
      if (n >= 1) {
        c += row("Contracts for " + money(rk), n + " " + name + " &middot; risks " + money(n * per));
        c += row("Break-even stop at", pt(e) + " once it moves your way");
        c += row("At the target", "+" + pt(rew) + " pts &middot; " + R.toFixed(1) + "R &middot; +" + money(n * rew * pv), "tot");
      }
      calc.innerHTML = c;
    }
    pres.forEach(function (b) {
      b.addEventListener("click", function () {
        var q = PRE[b.getAttribute("data-pre")];
        Object.keys(q).forEach(function (n) { el(n).value = q[n]; });
        pres.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        run();
      });
    });
    root.addEventListener("input", function (e) { if (e.target.name) pres.forEach(function (x) { x.setAttribute("aria-pressed", "false"); }); run(); });
    root.addEventListener("change", run);
    run();
  })();
})();

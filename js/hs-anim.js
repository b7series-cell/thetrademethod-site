/* =====================================================================
   hs-anim.js — the animations on the Heatmap Scalp page.

   1. [data-hs-anim]   one London session on a liquidity heatmap: the
      bias (higher lows above VWAP) → the heatmap → a first long that
      meets big sellers and gets cut early → the pullback to VWAP where
      the sellers' push fails and the bid holds → long on the bid →
      add on the pullback → stop above the entry once the local high
      breaks → out a few ticks under the wall.
   2. [data-hs-steps]  the six steps as a click-through stepper with a
      small chart per step.
   3. [data-hs-read]   read the book: four scripted heatmap cases.
   4. [data-hs-check]  is it a trade? five lamps.
   5. [data-hs-calc]   size it, then add.

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

  /* heat colour: dim blue → orange → yellow → near white */
  function heat(q) {
    var stops = [[0, [24, 40, 72]], [0.4, [150, 70, 20]], [0.65, [255, 159, 10]], [0.85, [255, 214, 10]], [1, [255, 246, 196]]];
    q = clamp01(q);
    for (var k = 1; k < stops.length; k++) {
      if (q <= stops[k][0]) {
        var a = stops[k - 1], b = stops[k], f = (q - a[0]) / (b[0] - a[0]);
        return "rgb(" + [0, 1, 2].map(function (j) { return Math.round(a[1][j] + (b[1][j] - a[1][j]) * f); }).join(",") + ")";
      }
    }
    return "rgb(255,246,196)";
  }

  /* a price path through key points, with a little wiggle that is zero at the keys */
  function path(keys, n, amp, seed) {
    var P = [], r = rng(seed || 7), ph = r() * 6;
    for (var i = 0; i < n; i++) {
      var k = 0;
      while (k < keys.length - 2 && keys[k + 1][0] <= i) k++;
      var a = keys[k], b = keys[k + 1], f = b[0] === a[0] ? 0 : clamp01((i - a[0]) / (b[0] - a[0]));
      var v = a[1] + (b[1] - a[1]) * f;
      v += Math.sin(Math.PI * f) * (amp || 1) * (Math.sin(i * 1.7 + ph) * 0.7 + (r() - 0.5) * 0.8);
      P.push(v);
    }
    return P;
  }
  /* background resting liquidity: rows every `step` points, chunks of `chunk` columns, eaten where price trades */
  function bgHeat(P, pmin, pmax, step, chunk, seed, maxQ) {
    var r = rng(seed || 11), segs = [];
    for (var p = Math.ceil(pmin / step) * step; p <= pmax; p += step) {
      var base = r() * 0.32 * (maxQ || 1);
      for (var i0 = 0; i0 < P.length; i0 += chunk) {
        var i1 = Math.min(P.length - 1, i0 + chunk), hit = false;
        for (var i = i0; i <= i1; i++) if (Math.abs(P[i] - p) < step * 0.6) { hit = true; break; }
        var q = Math.round((base + (r() - 0.4) * 0.18) * 10) / 10;
        if (hit || q < 0.12) continue;
        segs.push([p, i0, i1, q]);
      }
    }
    return segs;
  }

  /* draw a heatmap chart up to column `cur` (fractional). L: layout {x0,x1,yt,yb}. D: data */
  function heatChart(L, D, cur, op) {
    var n = D.P.length, dx = (L.x1 - L.x0) / (n - 1);
    function x(i) { return L.x0 + dx * i; }
    function y(p) { return L.yb - (p - D.pmin) / (D.pmax - D.pmin) * (L.yb - L.yt); }
    var s = "", rowH = Math.max(2, (L.yb - L.yt) / ((D.pmax - D.pmin) / D.step) * 0.82), xc = x(Math.max(0, cur));
    D.bg.forEach(function (g) {
      if (g[1] > cur) return;
      var xa = x(g[1]), xb = Math.min(x(g[2]), xc);
      s += rect(xa, y(g[0]) - rowH / 2, xb - xa, rowH, heat(g[3]), (0.3 + 0.5 * g[3]) * (op == null ? 1 : op));
    });
    (D.liq || []).forEach(function (g) {
      if (g[1] > cur) return;
      var xa = x(g[1]), xb = Math.min(x(g[2]), xc), h = rowH * (1 + g[3] * 0.6);
      s += rect(xa, y(g[0]) - h / 2, xb - xa, h, heat(0.45 + g[3] * 0.55), (0.55 + 0.45 * g[3]) * (op == null ? 1 : op));
    });
    if (D.vw) {
      var V = [];
      for (var i = 0; i <= Math.min(n - 1, Math.floor(cur)); i++) V.push([x(i), y(D.vw[i])]);
      s += poly(V, C.teal, 2, null, 0.9);
    }
    var Q = [];
    for (var j = 0; j <= Math.min(n - 1, Math.floor(cur)); j++) Q.push([x(j), y(D.P[j])]);
    var fi = Math.floor(cur), fr = cur - fi;
    if (fi < n - 1 && fr > 0) Q.push([x(fi + fr), y(D.P[fi] + (D.P[fi + 1] - D.P[fi]) * fr)]);
    s += poly(Q, "#000", 5, null, 0.55) + poly(Q, C.ink, 2.4);
    (D.bub || []).forEach(function (b) {
      if (b[0] > cur) return;
      var a = clamp01((cur - b[0]) / 0.6), rr = (2.5 + Math.sqrt(b[2]) * 0.95) * (L.narrow ? 0.7 : 1) * (0.6 + 0.4 * a);
      s += dot(x(b[0]), y(b[1]), rr, b[3] ? C.up : C.dn, 0.42, b[3] ? C.up : C.dn);
      if (b[2] >= 100 && !L.narrow && D.nums !== false) s += txt(x(b[0]), y(b[1]) + 4, String(b[2]), C.ink, 10, "middle", 700, a);
    });
    if (Q.length) s += dot(Q[Q.length - 1][0], Q[Q.length - 1][1], 4, C.ink);
    return { s: s, x: x, y: y, dx: dx };
  }

  /* =====================================================================
     The session: made-up NQ, one column a minute, 3:00 to 4:29 ET (London)
     ===================================================================== */
  var KEYS = [[0, 25874], [4, 25889], [10, 25816], [15, 25846], [18, 25834], [24, 25862], [27, 25856], [30, 25871], [31, 25866], [33, 25857],
              [36, 25861], [39, 25849], [41, 25852], [43, 25846], [44, 25852], [46, 25856], [50, 25866], [53, 25872], [56, 25865], [58, 25861],
              [60, 25866], [63, 25875], [65, 25870], [70, 25884], [73, 25889], [75, 25892], [77, 25894], [80, 25880], [85, 25876], [89, 25879]];
  var N = 90;
  var PS = path(KEYS, N, 1.3, 5);
  var VWK = [[0, 25850], [10, 25840], [14, 25838], [43, 25845], [60, 25851], [89, 25861]];
  var VWP = path(VWK, N, 0, 1);
  var WALL = 25895;
  var LIQ = [[WALL, 0, 89, 1.0], [25860, 18, 33, 0.7], [25850, 34, 46, 0.8], [25872, 46, 62, 0.62], [25880, 62, 70, 0.55], [25887, 70, 74, 0.5], [25826, 14, 89, 0.5], [25904, 0, 89, 0.45]];
  var BUB = [[3, 25886, 60, true], [6, 25880, 70, false], [9, 25822, 80, false], [12, 25832, 50, true], [16, 25845, 40, true], [21, 25848, 35, true], [25, 25858, 30, false],
             [28, 25864, 140, true], [31, 25866, 180, false], [32, 25862, 220, false], [33, 25858, 160, false],
             [37, 25858, 60, false], [38, 25852, 120, false], [40, 25850, 150, false], [42, 25848, 130, false], [43, 25847, 30, true], [44, 25851, 40, true], [45, 25853, 35, true], [46, 25856, 45, true],
             [50, 25866, 60, true], [52, 25871, 70, true], [55, 25866, 60, false], [57, 25862, 50, false], [59, 25863, 40, true], [62, 25873, 160, true], [67, 25876, 50, true],
             [70, 25884, 90, true], [72, 25888, 70, true], [76, 25894, 200, false], [77, 25892, 160, false], [79, 25884, 80, false]];
  var E1 = 25868, S1 = 25848, CUT = 25858, E2 = 25852, S2 = 25832, ADD = 25861, S_VW = 25840, S_BE = 25856, EXIT = 25892;
  var D_MAIN = { P: PS, vw: VWP, pmin: 25806, pmax: 25912, step: 3, liq: LIQ, bub: BUB, bg: bgHeat(PS, 25806, 25912, 3, 5, 21) };
  var TIMES = ["3:00", "3:15", "3:30", "3:45", "4:00", "4:15"];

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-hs-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;
    var STAGES = [
      { at: 0,    title: "Bias: higher lows, above VWAP", text: "A dip in the Asia session, then higher lows, and price back above the session VWAP. He's a trend follower, so the plan before London gets going is simple: longs only." },
      { at: 3.2,  title: "The heatmap", text: "The bright bars are resting limit orders: the brighter, the bigger. A big wall of sell orders sits at " + pt(WALL) + ", near the high. The bubbles are market orders that filled: green bought, red sold." },
      { at: 5.4,  title: "First try: long " + pt(E1), text: "A big buying bubble, bid liquidity building under price at 25,860. He goes in before the break of the high: long " + pt(E1) + ", the full stop 20 points lower at " + pt(S1) + "." },
      { at: 7.4,  title: "Big sellers: cut it early", text: "Red bubbles: 180, 220, 160 lots, selling hard. The bid at 25,860 gets taken. Not enough power to break the high, so the idea is wrong for now. Out at " + pt(CUT) + ": −10 points, not the full −20." },
      { at: 9.8,  title: "The pullback: their push fails", text: "Down toward VWAP. Sellers keep hitting the bid at 25,850, but it isn't taken and price stops going lower. A wick into VWAP, then small buyers start lifting it." },
      { at: 12.8, title: "Long on the bid: " + pt(E2), text: "A green candle closes. He joins on the bid with a one-click limit instead of paying the ask: long " + pt(E2) + ", stop " + pt(S2) + ", 20 points, the same $400 an account." },
      { at: 15.2, title: "In profit, it pulls back: add", text: "Up to the local high at 25,872, then a pullback with the trend intact. He adds a second lot at " + pt(ADD) + " and moves the stop for both under VWAP, " + pt(S_VW) + "." },
      { at: 17.8, title: "The high breaks: stop above entry", text: "The sell liquidity at 25,872 gets taken and moved up, then taken again. The pullback is done, so the stop goes a little above the first entry, " + pt(S_BE) + ". Not tighter: the small dips would take it." },
      { at: 20.4, title: "Out a few ticks under the wall", text: "The wall at " + pt(WALL) + " is still there. He sells both lots at " + pt(EXIT) + ": +40 and +31 points. Don't be greedy for a tick. The wall holds, and price flushes back." }
    ];
    var KF = [[0, 0], [3.0, 27], [3.2, 27], [5.2, 28], [5.4, 28], [6.8, 30], [7.4, 30], [9.0, 33], [9.8, 33], [12.2, 44], [12.8, 44], [14.6, 50], [15.2, 50], [17.2, 58], [17.8, 58], [19.8, 66], [20.4, 66], [22.6, 75], [23.2, 75], [25.0, 89]];
    var END = 25.4;
    function colAt(T) {
      if (T >= KF[KF.length - 1][0]) return N - 1;
      for (var k = 1; k < KF.length; k++) if (T <= KF[k][0]) { var a = KF[k - 1], b = KF[k]; return a[1] + (b[1] - a[1]) * clamp01((T - a[0]) / (b[0] - a[0] || 1)); }
      return N - 1;
    }
    function size(n) {
      return n ? { W: 440, H: 820, x0: 10, x1: 318, xTag: 322, yt: 210, yb: 770, cx: 12, cy: 14 }
               : { W: 1180, H: 660, x0: 24, x1: 900, xTag: 912, yt: 140, yb: 610, cx: 24, cy: 14 };
    }

    function frame(T, L) {
      var cur = colAt(T), s = "";
      var H = heatChart(L, D_MAIN, cur);
      var x = H.x, y = H.y;
      var sumo = fade(T, 24.6, 0.3);
      s += txt(L.x0, L.yt - 16 * FS, L.narrow ? "Heatmap · made-up NQ" : "Liquidity heatmap · a made-up NQ London morning, one column a minute", C.faint, 12, "start", null, 1 - sumo);
      [0, 15, 30, 45, 60, 75].forEach(function (k, j) { s += txt(x(k), L.yb + 22 * FS, TIMES[j], C.faint, 11, "middle"); });
      s += H.s;

      /* bias marks: the higher lows */
      var bo = fade(T, 1.6, 0.4) * (1 - fade(T, 5.4, 0.4));
      if (bo > 0) {
        [[10, 25816], [18, 25834], [27, 25856]].forEach(function (h, k) { if (cur >= h[0]) s += ring(x(h[0]), y(PS[h[0]]), 9 * FS, C.up, 2, bo); });
        if (cur >= 27) s += poly([[x(10), y(PS[10]) + 14], [x(18), y(PS[18]) + 14], [x(27), y(PS[27]) + 14]], C.up, 2, "5 5", bo);
        s += txt(x(18), y(PS[18]) + 36 * FS, "higher lows", C.up, 12, "middle", 700, bo);
      }
      if (cur > 3) s += txt(x(Math.min(cur, 89)) + 8, y(VWP[Math.min(89, Math.floor(cur))]) + 16 * FS, "VWAP", C.teal, 11, "start", 600, fade(T, 0.6, 0.4) * (cur < 40 ? 1 : 0));

      /* the wall label */
      var wo = fade(T, 3.4, 0.4);
      s += tag(L.xTag, y(WALL), L.narrow ? "wall " + pt(WALL) : "sell wall " + pt(WALL), C.yellow, wo);
      if (!L.narrow) {
        var lo = fade(T, 3.6, 0.4) * (1 - fade(T, 5.4, 0.4));
        s += txt(x(20), y(25860) + 22, "bid liquidity building", C.orange, 12, "start", 700, lo);
        s += txt(x(4) + 14, y(25898) - 14, "big buyer", C.up, 11.5, "start", 600, lo);
        s += txt(x(9) + 14, y(25822) + 4, "big seller", C.dn, 11.5, "start", 600, lo);
      }

      /* trade one */
      var e1 = fade(T, 6.4, 0.3);
      if (e1 > 0) {
        var cut = T >= 8.9, xe = x(29);
        s += hl(xe, cut ? x(33) : x(cur), y(E1), C.up, null, 1.8, e1 * (cut ? 0.5 : 1));
        s += tri(xe, y(E1) + 14 * FS, true, C.up, 10 * FS, e1 * (T < 9.8 ? 1 : 0.5));
        var t1o = e1 * (1 - fade(T, 9.8, 0.4));
        s += tag(L.xTag, y(E1) - 2, "long " + pt(E1), C.up, t1o);
        s += hl(xe, x(cut ? 33 : cur), y(S1), C.dn, "5 4", 1.5, t1o);
        s += tag(L.xTag, y(S1), (L.narrow ? "stop " : "full stop ") + pt(S1), C.dn, t1o);
        if (cut) {
          var co = fade(T, 8.9, 0.3);
          s += ring(x(33), y(CUT), 11 * FS, C.dn, 2.2, co * (T < 12.8 ? 1 : 0.45));
          s += txt(x(33) + 10, y(E1) - 20 * FS, L.narrow ? "cut −10" : "cut " + pt(CUT) + " · −10, not −20", C.dn, 12, "start", 700, co * (T < 12.8 ? 1 : 0.45));
        }
      }
      /* the pullback: bid holds */
      var ph = fade(T, 11.0, 0.4) * (1 - fade(T, 14.8, 0.4));
      if (ph > 0) {
        s += txt(x(38), y(25850) + 52 * FS, L.narrow ? "bid holds" : "sellers hit 25,850 · not taken", C.orange, 12, "middle", 700, ph);
        s += ring(x(43), y(PS[43]), 10 * FS, C.teal, 2, ph);
        if (!L.narrow) s += txt(x(43) + 14, y(PS[43]) + 26, "wick into VWAP", C.teal, 11.5, "start", 600, ph);
      }

      /* trade two */
      var e2 = fade(T, 13.4, 0.3), done = T >= 22.6;
      if (e2 > 0) {
        var x2 = x(45), xr = done ? x(75) : x(cur);
        s += hl(x2, xr, y(E2), C.up, null, 1.8, e2 * (done ? 0.6 : 1));
        s += tri(x2, y(E2) + 14 * FS, true, C.up, 10 * FS, e2);
        s += tag(L.xTag, y(E2) + 2, (L.narrow ? "long " : "long on the bid ") + pt(E2), C.up, e2 * (done ? 0.6 : 1));
        var stopP = T < 16.6 ? S2 : T < 19.4 ? S_VW : S_BE;
        var sx0 = T < 16.6 ? x2 : T < 19.4 ? x(58) : x(66);
        if (!done) {
          s += hl(sx0, xr, y(stopP), C.dn, "5 4", 1.6, e2);
          s += tag(L.xTag, y(stopP) + (stopP === S_BE ? 22 * FS : 0), (stopP === S_VW ? (L.narrow ? "stop " : "stop under VWAP ") : stopP === S_BE ? (L.narrow ? "stop " : "stop above entry ") : "stop ") + pt(stopP), C.dn, e2);
        }
        if (T >= 16.4) {
          var ao = fade(T, 16.4, 0.3);
          s += hl(x(58), xr, y(ADD), C.up, "2 3", 1.6, ao * (done ? 0.6 : 1));
          s += tri(x(58), y(ADD) + 14 * FS, true, C.up, 10 * FS, ao);
          s += txt(x(58), y(ADD) + 34 * FS, "+1 lot " + pt(ADD), C.up, 12, "middle", 700, ao * (1 - fade(T, 20.4, 0.4)));
        }
        if (T >= 19.0 && !L.narrow) s += txt(x(62) + 10, y(25875) - 16, "taken and moved up", C.orange, 12, "start", 700, fade(T, 19.0, 0.3) * (1 - fade(T, 21.4, 0.4)));
        if (done) {
          var xo = fade(T, 22.6, 0.3);
          s += ring(x(75), y(EXIT), 11 * FS, C.cyan, 2.2, xo);
          s += tag(L.xTag, y(EXIT) + 22 * FS, L.narrow ? "out " + pt(EXIT) : "out " + pt(EXIT) + " · +40, +31", C.cyan, xo);
        }
      }
      if (sumo > 0) s += txt(L.x0, L.yt - 16 * FS, L.narrow ? "Cut −10 · then +40 and +31" : "Cut the first try −10 · long " + pt(E2) + " +40 · add " + pt(ADD) + " +31 · out " + pt(EXIT) + ", under the wall", C.cyan, 13, "start", 700, sumo);

      var cx0 = L.cx, cy0 = L.cy;
      s += callout(cx0, cy0, ["Bias · before London", "Asia dipped, then higher lows", "Back above VWAP", "Longs only today"], C.up, fade(T, 0.3, 0.3) * (1 - fade(T, 3.2, 0.3)));
      s += callout(cx0, cy0, ["The heatmap", "Bright bars: resting orders", "Bubbles: market orders", "A big sell wall at " + pt(WALL)], C.yellow, fade(T, 3.4, 0.3) * (1 - fade(T, 5.4, 0.3)));
      s += callout(cx0, cy0, ["First try · long " + pt(E1), "Big buyer, bid building", "In before the break", "Full stop: 20 points"], C.up, fade(T, 5.6, 0.3) * (1 - fade(T, 7.4, 0.3)));
      s += callout(cx0, cy0, ["Big sellers step in", "180, 220, 160 lots", "The bid under you is taken", "Cut it: −10, not −20"], C.dn, fade(T, 7.6, 0.3) * (1 - fade(T, 9.8, 0.3)));
      s += callout(cx0, cy0, ["The pullback to VWAP", "Sellers keep hitting it", "The bid isn't taken", "Small buyers lift it"], C.orange, fade(T, 10.0, 0.3) * (1 - fade(T, 12.8, 0.3)));
      s += callout(cx0, cy0, ["Long on the bid · " + pt(E2), "A green candle closed", "Limit at the bid, no spread", "Stop " + pt(S2) + " · $400 an account"], C.up, fade(T, 13.0, 0.3) * (1 - fade(T, 15.2, 0.3)));
      s += callout(cx0, cy0, ["Add on the pullback", "In profit, trend intact", "+1 lot at " + pt(ADD), "Stop for both under VWAP"], C.up, fade(T, 15.4, 0.3) * (1 - fade(T, 17.8, 0.3)));
      s += callout(cx0, cy0, ["The local high breaks", "Liquidity taken, moved up", "Stop a bit above entry", "Not tight: dips are normal"], C.orange, fade(T, 18.0, 0.3) * (1 - fade(T, 20.4, 0.3)));
      s += callout(cx0, cy0, ["Out · " + pt(EXIT), "A few ticks under the wall", "+40 and +31 points", "The wall holds, it flushes"], C.cyan, fade(T, 20.6, 0.3));
      s += txt(L.W - 8, L.H - 6, "Illustrative · made-up prices", C.faint, 11, "end");
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
    window.HSAnim = { seek: function (t) { setPlaying(false); T = t; draw(); }, END: END, STAGES: STAGES };
  })();

  /* =====================================================================
     2. The six steps as a stepper, with a small chart per step
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-hs-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 6) return;
    var INFO = [
      { k: "Bias",     c: C.up,     tag: "Bias · structure plus VWAP" },
      { k: "Market",   c: C.teal,   tag: "Market · trade the one that's moving" },
      { k: "Location", c: C.orange, tag: "Location · the pullback, not the middle" },
      { k: "Trigger",  c: C.yellow, tag: "Trigger · their push stops working" },
      { k: "Risk",     c: C.dn,     tag: "Risk · fixed dollars, cut it early" },
      { k: "Add/exit", c: C.cyan,   tag: "Manage · add on pullbacks, out before the wall" }
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

    function bias(c) {
      var s = t(16, 24, "Read it before the session: structure and VWAP agree", C.faint, "start", null, 12);
      function side(ox, up) {
        var r = "", P = up ? [[0, 200], [40, 140], [64, 170], [104, 110], [128, 140], [168, 80], [200, 100], [236, 50]] : [[0, 60], [40, 120], [64, 92], [104, 150], [128, 122], [168, 182], [200, 162], [236, 214]];
        var V = up ? [[0, 230], [236, 130]] : [[0, 40], [236, 150]];
        r += poly(V.map(function (p) { return [ox + p[0], 30 + p[1]]; }), C.teal, 2, null, 0.9);
        r += poly(P.map(function (p) { return [ox + p[0], 30 + p[1]]; }), up ? C.up : C.dn, 3);
        (up ? [[64, 170], [128, 140], [200, 100]] : [[40, 120], [104, 150], [168, 182]]).forEach(function (h) { r += ring(ox + h[0], 30 + h[1], 7, up ? C.up : C.dn, 2); });
        r += t(ox + 236, 30 + V[1][1] + (up ? 18 : -8), "VWAP", C.teal, "end", 600, 11);
        r += t(ox + 118, 290, up ? "Higher lows above VWAP" : "Lower highs below VWAP", up ? C.up : C.dn, "middle", 700, 13);
        r += t(ox + 118, 310, up ? "longs only" : "shorts only", C.faint, "middle", null, 12);
        return r;
      }
      return s + side(24, true) + side(300, false);
    }
    function market(c) {
      var s = t(16, 24, "Same idea, two indexes: trade the one with the range", C.faint, "start", null, 12);
      var es = [], nq = [];
      for (var i = 0; i <= 24; i++) { es.push([30 + i * 20, 92 + Math.sin(i * 1.3) * 12]); nq.push([30 + i * 20, 270 - i * 6.5 + Math.sin(i * 1.1) * 10]); }
      s += t(30, 60, "ES · two points up, two back", C.dim, "start", 700, 13);
      s += poly(es, C.gray, 2.6);
      s += t(530, 128, "skip: no volatility", C.dn, "end", 700, 12);
      s += hl(30, 530, 160, C.box, null, 1);
      s += t(30, 190, "NQ · moving the same way, more range", C.dim, "start", 700, 13);
      s += poly(nq, C.up, 3);
      s += t(530, 300, "trade it · ES confirms", C.up, "end", 700, 12);
      return s;
    }
    function location(c) {
      var s = t(16, 24, "Wait for the pullback to come to you", C.faint, "start", null, 12);
      s += poly([[30, 250], [520, 170]], C.teal, 2, null, 0.9); s += t(520, 162, "VWAP", C.teal, "end", 600, 11);
      s += hl(30, 520, 205, C.gold, "5 4", 1.4); s += t(30, 199, "old support", C.gold, "start", 600, 11);
      var P = [[30, 280], [90, 200], [130, 220], [190, 130], [240, 110], [290, 150], [320, 196], [332, 222], [346, 198], [400, 150], [460, 100], [520, 70]];
      s += poly(P, C.ink, 3);
      s += ring(332, 222, 10, c, 2.4);
      s += t(346, 246, "wick into VWAP + support", c, "start", 700, 12);
      s += ring(240, 110, 10, C.dn, 2);
      s += t(240, 88, "the middle: no", C.dn, "middle", 700, 12);
      s += t(280, 318, "A first touch can go through VWAP. The wick that comes straight back is the one.", C.faint, "middle", null, 11);
      return s;
    }
    function trigger(c) {
      var s = t(16, 24, "The heatmap at the pullback, up close", C.faint, "start", null, 12);
      var keys = [[0, 30], [10, 18], [18, 10], [24, 6], [30, 5.5], [36, 4.5], [40, 6], [46, 12], [52, 20], [59, 28]];
      var P = path(keys, 60, 0.8, 3);
      var D = { P: P, pmin: 0, pmax: 40, step: 2, bg: bgHeat(P, 0, 40, 2, 6, 9, 0.8), liq: [[4, 14, 50, 0.85], [34, 0, 59, 0.6]],
                bub: [[16, 11, 120, false], [22, 7, 150, false], [27, 5.5, 170, false], [31, 5, 140, false], [38, 5, 30, true], [41, 6.5, 40, true], [44, 9, 35, true], [48, 14, 45, true]], nums: false };
      var H = heatChart({ x0: 24, x1: 470, yt: 50, yb: 300, narrow: false }, D, 59);
      s += H.s;
      s += t(H.x(26), H.y(4) + 30, "sellers hit the bid · it holds", C.orange, "middle", 700, 12);
      s += tri(H.x(41), H.y(6.5) + 16, true, C.up, 11);
      s += t(H.x(41) + 10, H.y(6.5) + 32, "long on the bid", C.up, "start", 700, 12);
      s += t(H.x(52) + 12, H.y(21) + 8, "small buyers lift it", C.up, "start", 600, 11);
      s += t(552, 334, "Illustrative · made-up prices", C.faint, "end", null, 11);
      return s;
    }
    function risk(c) {
      var s = t(16, 24, "The stop is a dollar amount. The exit can come sooner", C.faint, "start", null, 12);
      function side(ox, cutEarly) {
        var r = "", e = 110, st = 230;
        r += hl(ox, ox + 240, e, C.up, null, 1.8); r += t(ox + 240, e - 6, "entry", C.up, "end", 600, 11);
        r += hl(ox, ox + 240, st, C.dn, "5 4", 1.6); r += t(ox + 240, st - 6, "full stop · −$400", C.dn, "end", 600, 11);
        var P = cutEarly ? [[ox + 10, 110], [ox + 50, 96], [ox + 80, 120], [ox + 110, 150], [ox + 125, 170]] : [[ox + 10, 110], [ox + 50, 96], [ox + 80, 120], [ox + 110, 150], [ox + 150, 190], [ox + 180, 230]];
        r += poly(P, C.ink, 3);
        var last = P[P.length - 1];
        r += ring(last[0], last[1], 9, C.dn, 2.2);
        r += t(ox + 120, 290, cutEarly ? "Big sellers, bid taken: out" : "Waited for the stop", cutEarly ? C.up : C.dn, "middle", 700, 13);
        r += t(ox + 120, 310, cutEarly ? "about −$240, half the risk" : "the full −$400", C.faint, "middle", null, 12);
        return r;
      }
      return s + side(24, false) + side(300, true);
    }
    function manage(c) {
      var s = t(16, 24, "Add with the trend, step the stop, leave the last ticks", C.faint, "start", null, 12);
      var wall = 64, e = 230, add = 196, ex = 74;
      s += rect(30, wall - 7, 500, 14, heat(1), 0.9); s += t(30, wall - 12, "big wall of sell orders", C.yellow, "start", 700, 11);
      var P = [[30, 250], [60, e], [120, 170], [160, 190], [180, add], [220, 150], [250, 165], [300, 120], [350, 96], [390, ex], [410, 70], [440, 100], [480, 120]];
      s += poly(P, C.ink, 3);
      s += tri(60, e + 16, true, C.up, 11); s += t(60, e + 36, "entry", C.up, "middle", 700, 11);
      s += tri(180, add + 16, true, C.up, 11); s += t(180, add + 36, "+1 on the pullback", C.up, "middle", 700, 11);
      s += poly([[60, 290], [180, 290], [180, 262], [250, 262], [250, 222], [390, 222]], C.dn, 2, "5 4");
      s += t(330, 244, "stop: under VWAP, then above entry", C.dn, "middle", 600, 11);
      s += ring(390, ex, 9, c, 2.2); s += t(530, wall - 12, "out a few ticks under it", c, "end", 700, 12);
      return s;
    }
    function chart(k) { return [bias, market, location, trigger, risk, manage][k](INFO[k].c); }
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
     3. Read the book: four scripted cases
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-hs-read]");
    if (!root) return;
    var svg = root.querySelector("svg"), btns = root.querySelectorAll("[data-case]"), note = root.querySelector(".hs-read-note"), again = root.querySelector("[data-play]");
    function mk(keys, seed, liq, bub, extra) {
      var P = path(keys, 60, 0.9, seed);
      return { P: P, pmin: 0, pmax: 40, step: 2, bg: bgHeat(P, 0, 40, 2, 6, seed + 3, 0.8), liq: liq, bub: bub, extra: extra };
    }
    var CASES = {
      hold: mk([[0, 32], [12, 20], [20, 12], [26, 9], [32, 8.5], [38, 8], [42, 9.5], [48, 15], [54, 22], [59, 27]], 4,
        [[8, 14, 59, 0.85], [37, 0, 59, 0.55]],
        [[18, 14, 110, false], [24, 10, 150, false], [29, 9, 170, false], [34, 8.5, 130, false], [40, 9, 30, true], [43, 10, 40, true], [46, 13, 35, true], [50, 17, 45, true]],
        { title: "The bid holds the pullback", col: C.up, mark: [41, "long on the bid", 30], verdict: "<b>Enter.</b> In a long trend, sellers hit the bid again and again, but price stops going lower and the liquidity under it isn't taken. Small buyers lift it and a green candle closes: that's the entry, filled on the bid." }),
      stack: mk([[0, 14], [10, 22], [16, 25], [20, 24], [26, 20], [32, 17], [38, 14], [46, 10], [52, 7], [59, 4]], 8,
        [[20, 10, 26, 0.7], [17, 18, 32, 0.6], [26, 22, 59, 0.75], [23, 30, 59, 0.7], [19, 38, 59, 0.6]],
        [[22, 24, 160, false], [25, 22, 200, false], [28, 19, 180, false], [32, 17, 150, false], [36, 15, 120, false]],
        { title: "Sellers stack under you", col: C.dn, entry: [16, 25], mark: [25, "out here: about half the risk", -44], verdict: "<b>Get out early.</b> You're long, then big red bubbles come in, the bid under you keeps getting taken, and sellers keep adding liquidity on the offer. The idea is done. Close it with a small loss instead of waiting for the full stop." }),
      move: mk([[0, 6], [8, 10], [14, 13], [18, 12], [24, 17], [28, 16], [34, 21], [38, 20], [44, 26], [48, 25], [54, 31], [59, 34]], 12,
        [[14, 4, 14, 0.7], [19, 18, 24, 0.7], [24, 28, 34, 0.7], [30, 38, 44, 0.7], [36, 48, 59, 0.7]],
        [[14, 13.5, 110, true], [24, 18.5, 120, true], [34, 23.5, 130, true], [44, 29.5, 120, true]],
        { title: "Liquidity taken and moved up", col: C.orange, entry: [8, 10], mark: [44, "taken, put higher: stay in", 34], verdict: "<b>Stay in and follow it.</b> In a long trend the sell liquidity above gets taken, put back higher, taken again. Some days that happens four, five, six times. It works like a magnet: you can take a partial into it, but there's no reason to get out." }),
      wall: mk([[0, 8], [10, 14], [18, 20], [26, 26], [32, 30], [36, 32.5], [40, 33.5], [43, 34], [46, 32], [50, 27], [55, 24], [59, 25]], 16,
        [[35, 0, 59, 1.0], [37, 0, 59, 0.6]],
        [[30, 29, 60, true], [36, 32.5, 70, true], [42, 34.5, 190, false], [44, 34, 160, false], [47, 31, 110, false]],
        { title: "A wall ahead", col: C.cyan, entry: [8, 13], mark: [38, "out a few ticks under it", 34], verdict: "<b>Take it off before the wall.</b> A big block of sell orders sits just above. It can fill and flush right back. Sell a few ticks under it (don't be greedy for a tick), or at least take partials. If you're flat, let them take it first before you trade toward it." })
    };
    var which = "hold", T = 99, playing = false, raf = 0, last = 0, DUR = 6.5;
    function draw() {
      var cs = CASES[which], ex = cs.extra, narrow = isNarrow(svg, 600);
      var W = narrow ? 440 : 1180, H = narrow ? 480 : 400;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.2 : 1;
      var L = { x0: narrow ? 14 : 30, x1: narrow ? 426 : 1150, yt: narrow ? 70 : 56, yb: H - 30, narrow: narrow };
      var cur = Math.min(59, T / DUR * 59);
      var Hh = heatChart(L, { P: cs.P, pmin: cs.pmin, pmax: cs.pmax, step: cs.step, bg: cs.bg, liq: cs.liq, bub: cs.bub, nums: !narrow }, cur);
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      s += txt(16, 30 * FS, ex.title, ex.col, 14, "start", 700);
      s += Hh.s;
      if (ex.entry && cur >= ex.entry[0]) {
        s += tri(Hh.x(ex.entry[0]), Hh.y(ex.entry[1]) + 15 * FS, true, C.up, 10 * FS);
        s += txt(Hh.x(ex.entry[0]), Hh.y(ex.entry[1]) + 34 * FS, "long", C.up, 11.5, "middle", 700);
      }
      if (cur >= ex.mark[0]) {
        var mx = Hh.x(ex.mark[0]), my = Hh.y(cs.P[ex.mark[0]]), o = clamp01((cur - ex.mark[0]) / 2);
        s += ring(mx, my, 11 * FS, ex.col, 2.2, o);
        var right = mx < (W * 0.62);
        s += txt(mx + (right ? 16 : -16), my + ex.mark[2] * FS, ex.mark[1], ex.col, 12.5, right ? "start" : "end", 700, o);
      }
      s += txt(W - 8, H - 8, "Illustrative · made-up prices", C.faint, 11, "end");
      svg.innerHTML = s; FS = 1;
      note.innerHTML = ex.verdict;
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
    var root = document.querySelector("[data-hs-check]");
    if (!root) return;
    var out = root.querySelector(".hs-out"), lamps = root.querySelectorAll("[data-lamp]");
    function v(n) { return root.querySelector('[name="' + n + '"]').value; }
    function setLamp(k, ok) { lamps[k].className = "hs-lamp " + (ok === true ? "is-ok" : ok === "warn" ? "is-warn" : "is-no"); }
    function run() {
      var bias = v("bias"), side = v("side"), vol = v("vol"), loc = v("loc"), book = v("book"), n = +v("n");
      var withIt = (bias === "up" && side === "long") || (bias === "down" && side === "short");
      var biasOk = withIt ? true : bias === "mixed" ? "warn" : false;
      var mktOk = vol === "moving" ? true : vol === "lone" ? "warn" : false;
      var locOk = loc === "vwap" ? true : loc === "range" ? "warn" : false;
      var bookOk = book === "hold" ? true : false;
      var cntOk = n < 2 ? true : n === 2 ? "warn" : false;
      [biasOk, mktOk, locOk, bookOk, cntOk].forEach(function (o, k) { setLamp(k, o); });
      var k, h, p, sideWord = side === "long" ? "long" : "short", bid = side === "long" ? "bid" : "offer";
      if (biasOk === false) { k = "no"; h = "Against the bias"; p = "The structure and VWAP say " + (bias === "up" ? "long" : "short") + ". He only follows the trend; a " + sideWord + " here is fighting it. Wait for the pullback in the other direction."; }
      else if (mktOk === false) { k = "no"; h = "No volatility, no trade"; p = "Two points up, two points back. You only earn when it moves. Switch to the other index if it's moving, or wait."; }
      else if (cntOk === false) { k = "no"; h = "Done for the day"; p = "Three trades is the limit. A fourth is usually for the adrenaline, and it's how a good day turns red."; }
      else if (locOk === false) { k = "no"; h = "You're in the middle"; p = "Nothing to lean on: no VWAP, no support, no range to break. Let the pullback come to you."; }
      else if (book === "against") { k = "no"; h = "The book says no"; p = "Big orders are stacking against the trade. If you're already in, this is where you cut it early. If you're flat, don't fight it."; }
      else if (book === "wall") { k = "no"; h = "A wall in the way"; p = "A big block of liquidity just ahead. If you trade into it and it holds, it flushes; if you fade it and it breaks, you're stopped. Let them take it first."; }
      else if (book === "none") { k = "b"; h = "Location yes, trigger not yet"; p = "Right side, right spot. Now watch the book: you want the other side's push to stop working and the " + bid + " to hold, then a candle closing your way."; }
      else {
        var warn = biasOk === "warn" || mktOk === "warn" || locOk === "warn" || cntOk === "warn";
        k = warn ? "b" : "a"; h = warn ? "A trade, with less behind it" : "Take it on the " + bid;
        p = warn ? (biasOk === "warn" ? "Price is around VWAP, so the bias is soft; the heatmap is doing all the work. " : "") + (mktOk === "warn" ? "The other index isn't confirming. " : "") + (locOk === "warn" ? "A range break is fine, a VWAP pullback is better. " : "") + (cntOk === "warn" ? "This is the third trade: only risk what keeps the day green. " : "") + "Smaller size, or pass."
                 : "Trend, a moving market, a pullback, and the other side's push failing. One-click limit on the " + bid + ", a fixed dollar stop, and cut it if big orders stack against you.";
      }
      out.className = "chk-out hs-out is-" + k;
      out.innerHTML = "<b>" + h + "</b><p>" + p + "</p>";
    }
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    run();
  })();

  /* =====================================================================
     5. Size it, then add
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-hs-calc]");
    if (!root) return;
    var out = root.querySelector(".hs-cout"), calc = root.querySelector(".hs-ccalc");
    function v(n) { var e = root.querySelector('[name="' + n + '"]'); return parseFloat(e.value); }
    function money(x) { return (x < 0 ? "−$" : "$") + Math.round(Math.abs(x)).toLocaleString("en-US"); }
    function row(a, b, cls) { return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + a + "</span><b>" + b + "</b></div>"; }
    function run() {
      var risk = v("risk"), st = v("stop"), pv = v("ct"), tp = v("tp"), add = v("add"), acc = Math.max(1, Math.floor(v("acc") || 1));
      if ([risk, st, pv, tp, add].some(function (q) { return !isFinite(q); }) || st <= 0 || tp <= 0) {
        out.className = "chk-out hs-cout is-no"; out.innerHTML = "<b>Fill in every box</b><p>Positive numbers only.</p>"; calc.innerHTML = ""; return;
      }
      var n = Math.floor(risk / (st * pv) + 1e-9), rr = tp / st;
      var k, h, p;
      if (n < 1) { k = "no"; h = "Under one contract"; p = "That stop costs " + money(st * pv) + " a contract, more than " + money(risk) + ". Use the micro, or a smaller stop that still has room."; }
      else if (rr >= 2) { k = "a"; h = rr.toFixed(1) + ":1 · " + n + (n === 1 ? " contract" : " contracts"); p = "At or above the 2:1 he suggests for a newer trader. The stop is " + money(n * st * pv) + "; decide that before you think about the profit."; }
      else if (rr >= 1) { k = "b"; h = rr.toFixed(1) + ":1 · fine once you're consistent"; p = "Above 1:1 works if you win more than half. Starting out, he'd rather see 2:1."; }
      else { k = "no"; h = "Under 1:1"; p = "The target is closer than the stop. Pass, or find a better spot for the stop."; }
      out.className = "chk-out hs-cout is-" + k;
      out.innerHTML = "<b>" + h + "</b><p>" + p + "</p>";
      if (n < 1) { calc.innerHTML = ""; return; }
      var c = "", per = n * pv, addGain = Math.max(0, tp - add);
      c += row("Contracts an account", n + (acc > 1 ? " &middot; " + n * acc + " in total" : ""));
      c += row("Risk at the stop", money(n * st * pv) + (acc > 1 ? " &middot; " + money(n * st * pv * acc) + " total" : ""));
      c += row("At the target, no add", "+" + money(per * tp * acc) + " &middot; " + rr.toFixed(2) + "R");
      if (add > 0 && add < tp) {
        c += row("Add " + n + " more at +" + pt(add), "+" + pt(addGain) + " pts on the add");
        c += row("Add, stop left where it was", "risk grows to " + money(per * (2 * st + add) * acc), "");
        c += row("Add, stop moved to entry", "worst case " + money(-per * add * acc));
        c += row("At the target, with the add", "+" + money(per * (tp + addGain) * acc), "tot");
      } else {
        c += row("Add", add >= tp ? "the add is at or past the target" : "none");
      }
      calc.innerHTML = c;
    }
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    run();
  })();
})();

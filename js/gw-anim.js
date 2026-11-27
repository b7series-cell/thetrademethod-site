/* =====================================================================
   gw-anim.js — the animations on the Gamma Wall Footprint page.

   1. [data-gw-anim]   one put wall long on a made-up 5-minute NQ morning:
      the map → a slow approach → the wall bar's footprint (absorption)
      → the next bar (stacked buy imbalances, delta flips) → long, stop
      under the failed low → half off → the rest to zero gamma.
   2. [data-gw-steps]  the six steps as a click-through stepper with a
      small chart per step.
   3. [data-gw-plays]  the three setups: put wall long, call wall short
      on the reclaim, zero gamma break.
   4. [data-gw-read]   read the footprint: four signs.
   5. [data-gw-check]  is it a trade? five lamps.
   6. [data-gw-calc]   enter close, or don't: R from entry, stop, target.

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

  /* a footprint ladder for one bar. prices: the row list (top to bottom); bar.rows {price:[bid,ask]}
     o: {x, y0, rowH, cw (cell width), reveal 0..1, maxv, hiBid:[p], hiAsk:[p], title, delta} */
  function ladder(prices, bar, o) {
    var s = "", maxv = o.maxv || 900, rev = o.reveal == null ? 1 : o.reveal, shownRows = 0, totB = 0, totA = 0, nr = 0;
    var keys = prices.filter(function (p) { return bar.rows[p]; });
    var nShow = Math.ceil(keys.length * rev);
    if (o.title) s += txt(o.x + o.cw, o.y0 - 12 * FS, o.title, o.tcol || C.dim, 12, "middle", 700, Math.min(1, rev * 3));
    prices.forEach(function (p, k) {
      var r = bar.rows[p]; if (!r) return;
      var idx = keys.indexOf(p);
      if (idx >= nShow) return;
      var y = o.y0 + k * o.rowH, a = Math.min(1, (rev * keys.length - idx) * 1.2);
      totB += r[0]; totA += r[1]; nr++;
      s += rx(o.x, y + 1, o.cw - 2, o.rowH - 2, C.dn, (0.08 + 0.55 * Math.min(1, r[0] / maxv)) * a, null, 3);
      s += rx(o.x + o.cw, y + 1, o.cw - 2, o.rowH - 2, C.up, (0.08 + 0.55 * Math.min(1, r[1] / maxv)) * a, null, 3);
      s += txt(o.x + o.cw / 2 - 1, y + o.rowH / 2 + 4.5 * FS, n0(r[0]), C.ink, 12, "middle", r[0] >= maxv * 0.5 ? 700 : null, a);
      s += txt(o.x + o.cw * 1.5 - 1, y + o.rowH / 2 + 4.5 * FS, n0(r[1]), C.ink, 12, "middle", r[1] >= maxv * 0.5 ? 700 : null, a);
      if (o.hiBid && o.hiBid.indexOf(p) >= 0 && rev >= 1) s += rx(o.x - 1, y, o.cw, o.rowH, "none", o.hiOp == null ? 1 : o.hiOp, C.dn, 3, 2.2);
      if (o.hiAsk && o.hiAsk.indexOf(p) >= 0 && rev >= 1) s += rx(o.x + o.cw - 1, y, o.cw, o.rowH, "none", o.hiOp == null ? 1 : o.hiOp, C.up, 3, 2.2);
    });
    if (rev >= 1 && o.delta !== false) {
      var d = totA - totB, yd = o.y0 + prices.length * o.rowH + 8;
      s += rx(o.x, yd, o.cw * 2 - 2, 26 * FS, d < 0 ? "#3a1416" : "#123d22", o.dOp == null ? 1 : o.dOp, d < 0 ? C.dn : C.up, 5, o.dHi ? 2.4 : 1);
      s += txt(o.x + o.cw - 1, yd + 18 * FS, "Δ " + sgn(d), d < 0 ? C.dn : C.up, 13, "middle", 700, o.dOp);
    }
    return s;
  }
  function priceCol(prices, x, y0, rowH, op, hi) {
    var s = "";
    prices.forEach(function (p, k) { s += txt(x, y0 + k * rowH + rowH / 2 + 4.5 * FS, n0(p), hi && hi.indexOf(p) >= 0 ? hi.col : C.faint, 11.5, "end", hi && hi.indexOf(p) >= 0 ? 700 : null, op); });
    return s;
  }
  function range(hi, lo, step) { var a = []; for (var p = hi; p >= lo; p -= step) a.push(p); return a; }

  /* =====================================================================
     The data: example 1 from the video, put wall 25,150, zero gamma 25,250.
     Prices of the trade and the footprint deltas are the video's (a synthetic
     replay in the video too); the candles and row numbers are drawn to fit.
     ===================================================================== */
  var PW = 25150, ZG = 25250, E1 = 25156, S1 = 25145, H1 = 25200, X1 = 25250;
  var CL1 = [25232, 25236, 25228, 25224, 25226, 25218, 25212, 25214, 25204, 25198, 25192, 25194, 25184, 25176, 25170, 25163, 25158,
             25153, 25164, 25170, 25176, 25184, 25192, 25201, 25196, 25205, 25214, 25222, 25228, 25236, 25244, 25251, 25246, 25248];
  var B1 = makeBars(25238, CL1, 9, { 17: [25158, 25160.5, 25146, 25153], 18: [25153, 25166.5, 25151, 25164], 23: [25192, 25204, 25190.5, 25201], 31: [25244, 25253, 25242, 25251] });
  var WALLBAR = { rows: { 25160: [210, 262], 25155: [1040, 388], 25150: [2010, 330], 25145: [860, 64] } };
  var KNOCK = { rows: { 25170: [90, 240], 25165: [160, 1200], 25160: [210, 1500], 25155: [180, 1200], 25150: [310, 270] } };
  var PREVBAR = { rows: { 25175: [300, 250], 25170: [520, 380], 25165: [810, 420], 25160: [683, 300], 25155: [200, 120] } };
  var FP_PRICES = range(25170, 25145, 5);
  function times(i) { var m = 9 * 60 + 30 + i * 5; return Math.floor(m / 60) + ":" + ("0" + (m % 60)).slice(-2); }

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-gw-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;
    var STAGES = [
      { at: 0,    title: "The map before the open", text: "The GEX map for the day puts the put wall at " + pt(PW) + " and zero gamma at " + pt(ZG) + ". The call wall is far above. Location first: these are the prices this plan cares about." },
      { at: 3.2,  title: "A slow approach", text: "Price grinds lower in small, steady candles. No momentum. A slow approach means you look for the reaction right at the wall, not past it." },
      { at: 7.4,  title: "It tags the wall: absorption", text: "Price tags " + pt(PW) + ". The footprint shows over 3,000 contracts sold into the wall, and price won't go lower. The goalkeeper is catching every shot." },
      { at: 10.2, title: "The knock", text: "Next bar: stacked buy imbalances, three rows where the buyers are more than three times the sellers, a big buy print at 25,156, and delta flips from −3,076 to +3,460." },
      { at: 13.0, title: "Long " + pt(E1) + ", stop " + pt(S1), text: "Long at " + pt(E1) + ". The stop goes 11 points lower at " + pt(S1) + ", under the failed low: if the wall is real, price shouldn't trade there again." },
      { at: 15.4, title: "Half off at " + pt(H1), text: "The first reaction carries price to " + pt(H1) + ". Half comes off there: +44 points on that half. The rest rides." },
      { at: 18.0, title: "The rest to zero gamma: +94", text: "The rest goes to the next level, zero gamma at " + pt(ZG) + ": +94 points from an 11-point stop. Location, approach, confirmation." }
    ];
    var KF = [[0, 1], [3.0, 4], [3.2, 4], [6.8, 17], [7.4, 17], [8.8, 18], [10.2, 18], [11.4, 19], [13.0, 19], [14.8, 24], [15.4, 24], [17.4, 32], [18.0, 32], [20.2, 34]];
    var END = 21.2;
    function curAt(T) {
      if (T >= KF[KF.length - 1][0]) return B1.length;
      for (var k = 1; k < KF.length; k++) if (T <= KF[k][0]) { var a = KF[k - 1], b = KF[k]; return a[1] + (b[1] - a[1]) * clamp01((T - a[0]) / (b[0] - a[0] || 1)); }
      return B1.length;
    }
    function size(n) {
      return n ? { W: 440, H: 1050, x0: 10, x1: 280, xTag: 284, yt: 190, yb: 590, cx: 12, cy: 14, fx: 92, fy: 700, rowH: 25, cw: 70 }
               : { W: 1180, H: 660, x0: 24, x1: 740, xTag: 748, yt: 150, yb: 610, cx: 24, cy: 14, fx: 966, fy: 186, rowH: 30, cw: 46 };
    }
    var D = { B: B1, pmin: 25130, pmax: 25262 };

    function frame(T, L) {
      var cur = curAt(T), s = "";
      var H = candleChart(L, D, cur), x = H.x, y = H.y;
      s += txt(L.x0, L.yt - 14 * FS, L.narrow ? "5-minute NQ · made-up" : "5-minute NQ · a made-up morning built around the video's example 1", C.faint, 12, "start");
      [0, 6, 12, 18, 24, 30].forEach(function (i) { s += txt(x(i), L.yb + 22 * FS, times(i), C.faint, 11, "middle"); });

      /* the levels */
      var lo = fade(T, 0.3, 0.5);
      s += hl(L.x0, L.x1, y(PW), C.dn, null, 2, lo);
      s += tag(L.xTag, y(PW), L.narrow ? "put wall " + pt(PW) : "put wall " + pt(PW), C.dn, lo, "#fff");
      s += hl(L.x0, L.x1, y(ZG), C2.indigo, "8 5", 2, lo);
      s += tag(L.xTag, y(ZG), (L.narrow ? "zero γ " : "zero gamma ") + pt(ZG), C2.indigo, lo, "#fff");
      s += txt(L.xTag, L.yt - 14 * FS, L.narrow ? "call wall ↑" : "call wall: far above ↑", C.up, 12, "start", 700, lo);
      s += H.s;

      /* slow approach */
      var so = fade(T, 4.0, 0.4) * (1 - fade(T, 7.4, 0.4));
      if (so > 0) {
        s += poly([[x(4), y(25236) - 18], [x(16), y(25168) - 18]], C.gold, 2, "6 5", so);
        s += txt(x(10), y(25205) - 34 * FS, L.narrow ? "slow drift" : "small candles, steady drift", C.gold, 12.5, "middle", 700, so);
      }
      /* the wall bar */
      if (T >= 8.0) {
        var wo = fade(T, 8.4, 0.4);
        s += ring(x(17), y(25146), 11 * FS, C.dn, 2.2, wo * (T < 13 ? 1 : 0.5));
        if (!L.narrow) s += txt(x(17), y(25146) + 32, "3,255 sold · no lower", C.dn, 12, "middle", 700, wo * (1 - fade(T, 13, 0.4)));
      }
      if (T >= 10.6) {
        var ko = fade(T, 10.8, 0.4);
        s += txt(x(18) + 12, y(25168) - 8, L.narrow ? "knock" : "the knock", C.up, 12, "start", 700, ko * (1 - fade(T, 13, 0.4)));
      }
      /* the trade */
      var eo = fade(T, 13.2, 0.3);
      if (eo > 0) {
        var xe = x(18), xr = T >= 18.6 ? x(31) : x(Math.max(18, cur - 0.5));
        s += hl(xe, xr, y(E1), C.up, null, 1.8, eo);
        s += tri(xe - 12, y(E1), true, C.up, 10 * FS, eo);
        s += hl(xe, xr, y(S1), C.dn, "5 4", 1.6, eo);
        s += tag(L.xTag, y(E1) - 24 * FS, "long " + pt(E1), C.up, eo);
        s += tag(L.xTag, y(S1) + 20 * FS, "stop " + pt(S1), C.dn, eo, "#fff");
      }
      var ho = fade(T, 15.0, 0.3);
      if (ho > 0) {
        s += ring(x(23), y(H1), 10 * FS, C.gold, 2.2, ho);
        s += tag(L.xTag, y(H1), L.narrow ? "½ off " + pt(H1) : "half off " + pt(H1) + " · +44", C.gold, ho);
      }
      var xo = fade(T, 17.6, 0.3);
      if (xo > 0) {
        s += ring(x(31), y(X1), 10 * FS, C.cyan, 2.2, xo);
        s += txt(x(31), y(X1) - 18 * FS, "+94", C.cyan, 14, "middle", 800, xo);
      }

      /* the footprint panel */
      var fo = fade(T, 7.4, 0.5);
      if (fo > 0) {
        var r1 = clamp01((T - 7.6) / 1.4), r2 = clamp01((T - 10.4) / 1.2);
        var fx = L.fx, fy = L.fy, rh = L.rowH, cw = L.cw;
        var pxCol = L.narrow ? fx - 8 : fx - 8;
        if (L.narrow) s += txt(L.x0, fy - 44 * FS, "Footprint · bid × ask by price", C.dim, 13, "start", 700, fo);
        else s += txt(fx - 60, fy - 44, "Footprint · bid × ask", C.dim, 13, "start", 700, fo);
        s += priceCol(FP_PRICES, pxCol, fy, rh, fo);
        s += hl(fx - 2, fx + cw * 4 + 14, fy + FP_PRICES.indexOf(PW) * rh + rh / 2, C.dn, "4 4", 1.2, fo * 0.6);
        var hiOp = T < 13 ? 1 : 0.45;
        s += ladder(FP_PRICES, WALLBAR, { x: fx, y0: fy, rowH: rh, cw: cw, reveal: r1, maxv: 1600, title: times(17) + " · wall bar", tcol: C.dn, hiBid: T >= 9.0 ? [25155, 25150, 25145] : null, hiOp: hiOp, dHi: T >= 10.4 && T < 13 });
        if (T >= 10.4) s += ladder(FP_PRICES, KNOCK, { x: fx + cw * 2 + 14, y0: fy, rowH: rh, cw: cw, reveal: r2, maxv: 1600, title: times(18) + " · next bar", tcol: C.up, hiAsk: [25165, 25160, 25155], hiOp: hiOp, dHi: T < 13 });
      }

      var sumo = fade(T, 20.0, 0.3);
      if (sumo > 0) s += txt(L.x0, L.yt - 34 * FS, L.narrow ? "Risk 11 · +44 on half, +94 on the rest" : "Risk 11 points · half off +44 · the rest +94 into zero gamma", C.cyan, 13, "start", 700, sumo);

      var cx0 = L.cx, cy0 = L.cy;
      s += callout(cx0, cy0, ["The map · before the open", "Put wall " + pt(PW), "Zero gamma " + pt(ZG), "Call wall far above"], C2.indigo, fade(T, 0.2, 0.3) * (1 - fade(T, 3.2, 0.3)));
      s += callout(cx0, cy0, ["A slow approach", "Small candles", "A steady drift down", "Look for the reaction at the wall"], C.gold, fade(T, 3.4, 0.3) * (1 - fade(T, 7.4, 0.3)));
      s += callout(cx0, cy0, ["It tags the wall", "3,255 sold at the bid", "Price won't go lower", "Absorption"], C.dn, fade(T, 7.6, 0.3) * (1 - fade(T, 10.2, 0.3)));
      s += callout(cx0, cy0, ["The knock", "3 stacked buy imbalances", "A big buy print at 25,156", "Delta −3,076 → +3,460"], C.up, fade(T, 10.4, 0.3) * (1 - fade(T, 13.0, 0.3)));
      s += callout(cx0, cy0, ["Long " + pt(E1), "Stop " + pt(S1) + ": 11 points", "Under the failed low", "Target: the next level"], C.up, fade(T, 13.2, 0.3) * (1 - fade(T, 15.4, 0.3)));
      s += callout(cx0, cy0, ["Half off · " + pt(H1), "The first reaction", "+44 on that half", "The rest rides"], C.gold, fade(T, 15.6, 0.3) * (1 - fade(T, 18.0, 0.3)));
      s += callout(cx0, cy0, ["Zero gamma · " + pt(X1), "The next level", "+94 points", "From an 11-point stop"], C.cyan, fade(T, 18.2, 0.3));
      s += txt(L.W - 8, L.H - 6, "Illustrative · made-up candles and footprint", C.faint, 11, "end");
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
    window.GWAnim = { seek: function (t) { setPlaying(false); T = t; draw(); }, END: END, STAGES: STAGES };
  })();

  /* =====================================================================
     2. The six steps as a stepper, with a small chart per step
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-gw-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 6) return;
    var INFO = [
      { k: "Map",      c: C2.indigo, tag: "Map · put wall, call wall, zero gamma" },
      { k: "Regime",   c: C.teal,    tag: "Regime · the lake or the rapids" },
      { k: "Approach", c: C.gold,    tag: "Approach · how price arrives" },
      { k: "Confirm",  c: C.up,      tag: "Confirm · the footprint knocks" },
      { k: "Risk",     c: C.dn,      tag: "Risk · stop where the idea is wrong" },
      { k: "Manage",   c: C.cyan,    tag: "Manage · half off, the rest rides" }
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

    function map(c) {
      var s = t(16, 24, "Gamma exposure by strike: three lines matter", C.faint, "start", null, 12);
      var G = [[-0.5, 0], [-0.8, 0], [-2.4, 1], [-1.1, 0], [-0.7, 0], [-0.3, 0], [0.2, 2], [0.5, 0], [0.8, 0], [1.1, 0], [2.6, 3], [0.9, 0], [0.4, 0]];
      var mid = 300, y0 = 50, rh = 20;
      G.forEach(function (g, k) {
        var y = y0 + (G.length - 1 - k) * rh, w = Math.abs(g[0]) * 80;
        s += rect(g[0] < 0 ? mid - w : mid, y + 3, w, rh - 6, g[0] < 0 ? C.dn : C.up, g[1] ? 0.95 : 0.45, null, 3);
        if (g[1] === 1) { s += hl(40, 540, y + rh / 2, C.dn, "5 4", 1.2, 0.8); s += t(40, y + rh / 2 - 5, "put wall · dealers buy dips", C.dn, "start", 700, 12); }
        if (g[1] === 3) { s += hl(40, 540, y + rh / 2, C.up, "5 4", 1.2, 0.8); s += t(40, y + rh / 2 - 5, "call wall · dealers sell rallies", C.up, "start", 700, 12); }
        if (g[1] === 2) { s += hl(40, 540, y + rh / 2, c, "8 5", 2, 1); s += t(540, y + rh / 2 - 6, "zero gamma · the border", c, "end", 700, 12); }
      });
      s += poly([[mid, y0 - 4], [mid, y0 + G.length * rh]], C.gray, 1);
      s += t(mid - 8, 326, "◀ negative", C.dn, "end", 600, 11); s += t(mid + 8, 326, "positive ▶", C.up, "start", 600, 11);
      return s;
    }
    function regime(c) {
      var s = t(16, 24, "Above zero gamma moves get absorbed. Below it, they stretch", C.faint, "start", null, 12);
      var zg = 170;
      s += hl(24, 536, zg, C2.indigo, "8 5", 2); s += t(536, zg - 6, "zero gamma", C2.indigo, "end", 700, 11);
      var P = [], Q = [];
      for (var i = 0; i <= 22; i++) P.push([24 + i * 11, 104 + Math.sin(i * 0.9) * 26]);
      s += poly(P, C.teal, 3);
      s += t(146, 60, "the lake · back and forth", C.teal, "middle", 700, 13);
      var x = 290, y = 190;
      Q.push([x, y]);
      [[16, 22], [10, -10], [18, 34], [10, -14], [20, 44], [12, -16], [22, 52]].forEach(function (d) { x += d[0] * 1.4; y += d[1]; Q.push([x, y]); });
      s += poly(Q, C.dn, 3);
      s += t(420, 318, "the rapids · the current takes you", C.dn, "middle", 700, 13);
      return s;
    }
    function approach(c) {
      var s = t(16, 24, "The same wall, two ways to arrive", C.faint, "start", null, 12);
      function side(ox, fast) {
        var r = "", wall = 210, P = fast ? [70, 108, 140, 172, 200, 232, 198, 214] : [80, 100, 118, 136, 152, 170, 186, 200, 208, 196, 176];
        r += hl(ox, ox + 240, wall, C.dn, null, 2);
        var bw = fast ? 16 : 11, dx = fast ? 26 : 21, prev = fast ? 56 : 70;
        P.forEach(function (p, k) {
          var up = p < prev, top = Math.min(p, prev), h = Math.abs(p - prev);
          r += rect(ox + 12 + k * dx, top, bw, Math.max(2, h), up ? C.up : C.dn, 0.95, null, 2);
          prev = p;
        });
        if (fast) {
          r += ring(ox + 12 + 5 * dx + bw / 2, 232, 10, C.gold, 2.2);
          r += t(ox + 12 + 5 * dx + bw / 2, 260, "overshoot", C.gold, "middle", 700, 11);
          r += tri(ox + 12 + 6 * dx + bw / 2 + 2, 186, false, C.up, 11);
          r += t(ox + 120, 296, "Fast: wait, take the reclaim", C.gold, "middle", 700, 13);
        } else {
          r += ring(ox + 12 + 8 * dx + bw / 2, 210, 10, C.gold, 2.2);
          r += tri(ox + 12 + 9 * dx + bw / 2, 226, true, C.up, 11);
          r += t(ox + 120, 296, "Slow: the reaction at the level", C.up, "middle", 700, 13);
        }
        r += t(ox + 240, wall - 6, "wall", C.dn, "end", 600, 11);
        return r;
      }
      return s + side(24, false) + side(300, true) + t(280, 324, "A support wall shown; mirror it for the call wall above.", C.faint, "middle", null, 11);
    }
    function confirm(c) {
      var s = t(16, 24, "Four ways someone knocks at the level", C.faint, "start", null, 12);
      function tile(ox, oy, title, fn) { return rect(ox, oy, 252, 132, C.box, 0.55, null, 10) + t(ox + 12, oy + 22, title, C.ink, "start", 700, 13) + fn(ox, oy); }
      s += tile(20, 40, "Absorption", function (ox, oy) {
        var r = ""; [[120, 30], [260, 40], [512, 50], [864, 60]].forEach(function (v, k) { r += rect(ox + 14, oy + 34 + k * 22, 70, 18, C.dn, 0.2 + 0.6 * v[0] / 864, null, 3) + t(ox + 49, oy + 48 + k * 22, n0(v[0]), C.ink, "middle", 600, 11); });
        r += hl(ox + 10, ox + 240, oy + 120, C.dn, "4 3", 1.4); r += t(ox + 96, oy + 70, "sold, sold, sold…", C.dn, "start", 600, 12); r += t(ox + 96, oy + 90, "price won't go lower", C.dim, "start", null, 12);
        return r;
      });
      s += tile(288, 40, "Stacked imbalances", function (ox, oy) {
        var r = ""; [[64, 342], [96, 418], [120, 466]].forEach(function (v, k) { r += rect(ox + 14, oy + 36 + k * 26, 52, 22, C.dn, 0.15, null, 3) + rect(ox + 68, oy + 36 + k * 26, 52, 22, C.up, 0.65, C.up, 3) + t(ox + 40, oy + 52 + k * 26, v[0], C.ink, "middle", null, 11) + t(ox + 94, oy + 52 + k * 26, v[1], C.ink, "middle", 700, 11); });
        r += t(ox + 132, oy + 64, "3+ rows,", C.up, "start", 700, 12); r += t(ox + 132, oy + 82, "one side 3× the other", C.dim, "start", null, 11);
        return r;
      });
      s += tile(20, 184, "A delta flip", function (ox, oy) {
        var r = "", base = oy + 82;
        r += hl(ox + 14, ox + 160, base, C.gray, null, 1);
        r += rect(ox + 30, base, 40, 40, C.dn, 0.85, null, 3) + t(ox + 50, base - 6, "−3,076", C.dn, "middle", 700, 11);
        r += rect(ox + 100, base - 30, 40, 30, C.up, 0.85, null, 3) + t(ox + 120, base - 36, "+3,460", C.up, "middle", 700, 11);
        r += t(ox + 170, oy + 70, "big minus,", C.dim, "start", null, 12) + t(ox + 170, oy + 88, "then big plus", C.dim, "start", null, 12);
        return r;
      });
      s += tile(288, 184, "Trapped traders", function (ox, oy) {
        var r = "", wl = oy + 70;
        r += hl(ox + 14, ox + 240, wl, C.up, null, 2); r += t(ox + 240, wl - 6, "call wall", C.up, "end", 600, 11);
        r += poly([[ox + 20, oy + 110], [ox + 60, oy + 86], [ox + 90, oy + 50], [ox + 110, oy + 44], [ox + 130, oy + 62], [ox + 150, oy + 92], [ox + 180, oy + 112]], C.ink, 2.6);
        r += ring(ox + 110, oy + 44, 9, C.gold, 2); r += t(ox + 160, oy + 52, "bought above,", C.gold, "start", 600, 11); r += t(ox + 160, oy + 124, "stuck under it", C.dn, "start", 700, 11);
        return r;
      });
      return s;
    }
    function risk(c) {
      var s = t(16, 24, "Same wall, same stop logic, same target. Only the entry moves", C.faint, "start", null, 12);
      function side(ox, entry, label, good) {
        var r = "", y = function (p) { return 300 - (p - 25140) * 2.2; };
        r += hl(ox, ox + 230, y(25250), C2.indigo, "8 5", 1.6); r += t(ox + 230, y(25250) - 6, "target 25,250", C2.indigo, "end", 600, 11);
        r += hl(ox, ox + 230, y(25150), C.dn, null, 1.6); r += t(ox + 230, y(25150) + 16, "put wall", C.dn, "end", 600, 11);
        var risk = entry - 25145, rew = 25250 - entry;
        r += rect(ox + 40, y(entry), 46, y(25145) - y(entry), C.dn, 0.75, null, 3);
        r += rect(ox + 40, y(25250), 46, y(entry) - y(25250), C.up, 0.35, C.up, 3);
        r += hl(ox + 30, ox + 96, y(entry), C.ink, null, 2);
        r += t(ox + 100, y(entry) + 4, "entry " + n0(entry), C.ink, "start", 600, 11);
        r += t(ox + 115, 330, label + " · " + (rew / risk).toFixed(1) + "R", good ? C.up : C.dn, "middle", 700, 13);
        return r;
      }
      return s + side(24, 25156, "Close", true) + side(300, 25200, "Chased", false);
    }
    function manage(c) {
      var s = t(16, 24, "Some off at the first reaction, the rest to the next level", C.faint, "start", null, 12);
      var y = function (p) { return 300 - (p - 25140) * 2.2; };
      s += hl(30, 530, y(25250), C2.indigo, "8 5", 1.8); s += t(530, y(25250) - 6, "next level · the rest", C2.indigo, "end", 700, 11);
      s += hl(30, 530, y(25150), C.dn, null, 1.8); s += t(530, y(25150) + 16, "put wall", C.dn, "end", 600, 11);
      var P = [[30, y(25190)], [70, y(25170)], [110, y(25152)], [140, y(25158)], [180, y(25180)], [220, y(25201)], [250, y(25194)], [300, y(25214)], [350, y(25228)], [400, y(25242)], [440, y(25251)], [480, y(25246)]];
      s += poly(P, C.ink, 3);
      s += tri(140, y(25158) + 16, true, C.up, 11); s += t(140, y(25158) + 34, "long", C.up, "middle", 700, 11);
      s += ring(220, y(25201), 9, C.gold, 2.2); s += t(220, y(25201) - 16, "½ off", C.gold, "middle", 700, 12);
      s += ring(440, y(25251), 9, c, 2.2); s += t(440, y(25251) + 26, "the rest", c, "middle", 700, 12);
      s += t(280, 328, "If the wall breaks and price holds beyond it: reassess.", C.faint, "middle", null, 11);
      return s;
    }
    function chart(k) { return [map, regime, approach, confirm, risk, manage][k](INFO[k].c); }
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
      FS = 1; SF = svg.clientWidth > 0 && svg.clientWidth < 440 ? 1.15 : 1;
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
     3. The three setups
     ===================================================================== */
  var PLAYS = {
    put: {
      B: B1, pmin: 25130, pmax: 25262,
      levels: [[PW, "put wall " + pt(PW), C.dn, null], [ZG, "zero gamma " + pt(ZG), C2.indigo, "8 5"]],
      entry: [18, E1, true], stop: S1, marks: [[16, 25168, "slow drift", C.gold, -30], [17, 25146, "absorbed", C.dn, 30], [23, H1, "½ off " + pt(H1), C.gold, -20], [31, X1, "+94", C.cyan, -20]],
      note: "<b>Put wall, slow approach, long.</b> Small candles drift into the wall, so the reaction comes right at it: over 3,000 contracts sold into " + pt(PW) + " and price won't go lower, then stacked buy imbalances and delta flips positive. Long " + pt(E1) + ", stop " + pt(S1) + " under the failed low, half off " + pt(H1) + ", the rest to zero gamma: +94, about 8.5R."
    },
    call: {
      B: makeBars(25348, [25352, 25358, 25356, 25366, 25372, 25370, 25394, 25414, 25436, 25452, 25446, 25440, 25438, 25426, 25418, 25404, 25392, 25381, 25386, 25372, 25362, 25350, 25344, 25334, 25326, 25321, 25324],
        5, { 9: [25436, 25454, 25434, 25452], 10: [25452, 25458, 25445, 25446], 11: [25446, 25449, 25438, 25440], 17: [25392, 25394, 25378, 25381], 25: [25326, 25328, 25319, 25321] }),
      pmin: 25300, pmax: 25475,
      levels: [[25450, "call wall 25,450", C.up, null], [25320, "zero gamma 25,320", C2.indigo, "8 5"]],
      entry: [11, 25447, false], stop: 25459, marks: [[4, 25386, "fast: big candles", C.gold, -40, 8], [10, 25458, "6,000+ bought above, nothing", C.gold, -14], [11, 25441, "trapped", C.dn, 32], [17, 25380, "½ off 25,380", C.gold, 26], [25, 25320, "+127", C.cyan, 28]],
      note: "<b>Call wall, fast approach, short.</b> Price rips into 25,450 in big green candles, so you don't catch the ball while it's stretching the net. It overshoots with over 6,000 contracts bought above the wall and no follow-through, then falls back under it: the buyers are trapped, sellers stack the bid, delta flips hard negative. Short 25,447 on the close back under the wall, stop 48 ticks higher at 25,459 above the overshoot high, half off 25,380, the rest into zero gamma at 25,320: +127, about 10R."
    },
    zero: {
      B: makeBars(25352, [25348, 25344, 25346, 25338, 25334, 25336, 25328, 25322, 25318, 25312, 25308, 25304, 25292, 25296, 25288, 25274, 25279, 25262, 25248, 25254, 25236, 25222, 25228, 25208, 25194, 25186, 25182, 25188],
        13, { 12: [25304, 25306, 25289, 25292], 13: [25292, 25299, 25290, 25296], 14: [25296, 25298, 25285, 25288], 26: [25186, 25190, 25179, 25182] }),
      pmin: 25160, pmax: 25370,
      levels: [[25300, "zero gamma 25,300", C2.indigo, "8 5"], [25180, "put wall 25,180", C.dn, null]],
      entry: [14, 25288, false], stop: 25318, marks: [[7, 25322, "drifting down", C.gold, -26], [13, 25299, "retest holds under", C2.indigo, -22], [13, 25236, "ranges get bigger", C.dn, 0, 20], [26, 25180, "+108", C.cyan, 28]],
      note: "<b>Zero gamma breaks: go with it.</b> Late morning, price drifts toward zero gamma while gamma builds at lower strikes. It breaks below and holds, and the ranges get bigger: you've left the lake. Don't fade anything. Short with the momentum, a wider stop back above zero gamma, the put wall as the target. If price climbs back above zero gamma and holds on the retest, you were wrong: out. Made-up prices."
    }
  };

  (function () {
    var root = document.querySelector("[data-gw-plays]");
    if (!root) return;
    var svg = root.querySelector("svg"), btns = root.querySelectorAll("[data-case]"), note = root.querySelector(".gw-note"), again = root.querySelector("[data-play]");
    var which = "put", T = 99, playing = false, raf = 0, last = 0, DUR = 6.5;
    function draw() {
      var cs = PLAYS[which], narrow = isNarrow(svg, 600);
      var W = narrow ? 440 : 1180, H = narrow ? 520 : 420;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.2 : 1;
      var L = { x0: narrow ? 12 : 28, x1: narrow ? 268 : 940, yt: narrow ? 64 : 50, yb: H - 36 };
      var n = cs.B.length, cur = Math.min(n, T / DUR * n);
      var Hc = candleChart(L, { B: cs.B, pmin: cs.pmin, pmax: cs.pmax }, cur), x = Hc.x, y = Hc.y;
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      cs.levels.forEach(function (lv) {
        s += hl(L.x0, L.x1, y(lv[0]), lv[2], lv[3], 2, 0.95);
        s += tag(L.x1 + 6, y(lv[0]), lv[1], lv[2], 1, "#fff");
      });
      s += Hc.s;
      var e = cs.entry;
      if (cur > e[0] + 0.6) {
        var xr = x(Math.min(n - 1, cur - 0.5));
        s += hl(x(e[0]), xr, y(e[1]), e[2] ? C.up : C.dn, null, 1.8);
        s += hl(x(e[0]), xr, y(cs.stop), C.dn, "5 4", 1.5);
        s += tag(L.x1 + 6, y(e[1]) + (e[2] ? -26 : 26) * FS, (e[2] ? "long " : "short ") + pt(e[1]), e[2] ? C.up : C.dn, 1, e[2] ? "#000" : "#fff");
        s += tag(L.x1 + 6, y(cs.stop) + (e[2] ? 24 : -24) * FS, "stop " + pt(cs.stop), "#5e2a30", 1, "#fff");
        s += tri(x(e[0]) - 12 * FS, y(e[1]), e[2], e[2] ? C.up : C.dn, 10 * FS);
      }
      cs.marks.forEach(function (m) {
        var at = m[5] != null ? m[5] : m[0]; if (cur < at + 0.8) return;
        if (narrow && m[2].length > 16) return;
        var o = clamp01((cur - at - 0.8) / 1.5), right = x(m[0]) < (L.x0 + L.x1) * 0.55;
        s += txt(x(m[0]) + (right ? 0 : 0), y(m[1]) + m[4] * FS, m[2], m[3], 12.5, "middle", 700, o);
      });
      s += txt(16, 30 * FS, narrow ? "5-minute NQ" : "5-minute NQ · illustrative candles, the video's levels and trade prices" + (which === "zero" ? " (this one's made up)" : ""), C.faint, 12, "start");
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
     4. Read the footprint: four signs
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-gw-read]");
    if (!root) return;
    var svg = root.querySelector("svg"), btns = root.querySelectorAll("[data-case]"), note = root.querySelector(".gw-note"), again = root.querySelector("[data-play]");
    var OVER = { rows: { 25455: [590, 3200], 25450: [760, 3000], 25445: [520, 1200], 25440: [210, 240] } };
    var BACK = { rows: { 25455: [420, 310], 25450: [2700, 390], 25445: [2200, 510], 25440: [1300, 420], 25435: [640, 600] } };
    var CASES = {
      absorb: { prices: range(25175, 25145, 5), bars: [[PREVBAR, "the bar before"], [WALLBAR, "the wall bar"]], wall: [PW, "put wall", C.dn], hiBid: [[], [25155, 25150, 25145]], maxv: 1600,
        verdict: "<b>Absorption.</b> In the bar before, selling moved price down. At the wall the sellers hit even harder (4,120 contracts at the bid, 3,910 of them in the bottom three rows, delta −3,076) and price won't go lower. A goalkeeper catching every shot: someone is soaking up the selling." },
      stack: { prices: range(25170, 25145, 5), bars: [[WALLBAR, "the wall bar"], [KNOCK, "the next bar"]], wall: [PW, "put wall", C.dn], hiAsk: [[], [25165, 25160, 25155]], maxv: 1600,
        verdict: "<b>Stacked imbalances.</b> Three rows in a row where the buyers at the ask are more than three times the sellers at the bid. Three or more stacked means someone just took control. Here it's the buyers, right off the put wall." },
      flip: { prices: range(25170, 25145, 5), bars: [[WALLBAR, "the wall bar"], [KNOCK, "the next bar"]], wall: [PW, "put wall", C.dn], dHi: true, maxv: 1600,
        verdict: "<b>A delta flip.</b> Delta is buys at the ask minus sells at the bid. Big negative (−3,076) on the bar that tags the wall, then big positive (+3,460) on the next one, right at the level. The pressure changed hands." },
      trap: { prices: range(25460, 25435, 5), bars: [[OVER, "the overshoot bar"], [BACK, "back under the wall"]], wall: [25450, "call wall", C.up], hiAsk: [[25455, 25450, 25445], []], hiBid: [[], [25450, 25445, 25440]], maxv: 2400,
        verdict: "<b>Trapped traders.</b> A fast move through the call wall: over 6,000 contracts bought at and above 25,450 (delta +5,560) and no follow-through. When price falls back under the wall, every one of those buyers is underwater. They rushed through the door just before it slammed shut. Their exits are fuel for the short: the next bar's delta is −5,030." }
    };
    function sumRows(b) { var a = 0, d = 0; Object.keys(b.rows).forEach(function (k) { a += b.rows[k][1]; d += b.rows[k][0]; }); return [d, a]; }
    var which = "absorb", T = 99, playing = false, raf = 0, last = 0, DUR = 3.2;
    function draw() {
      var cs = CASES[which], narrow = isNarrow(svg, 600);
      var W = narrow ? 440 : 1180, H = narrow ? 84 + cs.prices.length * 30 + 70 : 440;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      FS = narrow ? 1.15 : 1;
      var nR = cs.prices.length, top = narrow ? 84 : 70, rowH = Math.min(narrow ? 30 : 26, ((H - top - 60) / nR));
      var cw = narrow ? 62 : 78, px = narrow ? 70 : 120, gap = narrow ? 16 : 60;
      var s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      s += txt(16, 30 * FS, narrow ? "Footprint · bid × ask" : "Footprint · sold at the bid × bought at the ask, by price (illustrative)", C.faint, 12, "start");
      s += priceCol(cs.prices, px - 8, top, rowH, 1);
      var wi = cs.prices.indexOf(cs.wall[0]);
      var wy = wi >= 0 ? top + wi * rowH + rowH / 2 : top + (cs.prices[0] - cs.wall[0]) / (cs.prices[0] - cs.prices[1]) * rowH + rowH / 2;
      var xEnd = px + cs.bars.length * (cw * 2 + gap) - gap + 10;
      s += hl(px - 4, xEnd, wy, cs.wall[2], "5 4", 2, 0.9);
      s += txt(xEnd + 6, wy + 4, narrow ? "wall" : cs.wall[1] + " " + pt(cs.wall[0]), cs.wall[2], 12, "start", 700);
      cs.bars.forEach(function (b, k) {
        var rev = clamp01((T - k * DUR * 0.45) / (DUR * 0.45));
        if (rev <= 0) return;
        s += ladder(cs.prices, b[0], { x: px + k * (cw * 2 + gap), y0: top, rowH: rowH, cw: cw, reveal: rev, maxv: cs.maxv, title: b[1], tcol: C.dim,
          hiBid: cs.hiBid ? cs.hiBid[k] : null, hiAsk: cs.hiAsk ? cs.hiAsk[k] : null, dHi: !!cs.dHi });
      });
      if (!narrow && T >= DUR) {
        var tx = xEnd + 6, ty = wy + 40;
        var sums = cs.bars.map(function (b) { return sumRows(b[0]); });
        var lines = which === "absorb" ? ["Sold at the bid: " + n0(sums[1][0]), "Price at the wall: holds"] :
                    which === "stack" ? ["3 rows, buyers ≥ 3×", "Someone took control"] :
                    which === "flip" ? ["Δ " + sgn(sums[0][1] - sums[0][0]) + " → " + sgn(sums[1][1] - sums[1][0]), "At the level"] :
                    ["Bought at 25,450+: " + n0(cs.bars[0][0].rows[25455][1] + cs.bars[0][0].rows[25450][1]), "Now under the wall"];
        s += callout(Math.min(tx, W - 230), Math.min(ty, H - 70), lines, which === "absorb" ? C.dn : which === "trap" ? C.gold : C.up, 1);
      }
      svg.innerHTML = s; FS = 1;
      note.innerHTML = cs.verdict;
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-case") === which ? "true" : "false"); });
    }
    function tick(now) {
      if (!playing) return;
      T += Math.min(0.1, (now - last) / 1000); last = now;
      if (T >= DUR + 0.3) { T = 99; playing = false; }
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
     5. Is it a trade?
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-gw-check]");
    if (!root) return;
    var out = root.querySelector(".gw-out"), lamps = root.querySelectorAll("[data-lamp]");
    function v(n) { return root.querySelector('[name="' + n + '"]').value; }
    function setLamp(k, ok) { lamps[k].className = "gw-lamp " + (ok === true ? "is-ok" : ok === "warn" ? "is-warn" : "is-no"); }
    function run() {
      var loc = v("loc"), reg = v("reg"), app = v("app"), ent = v("ent"), fp = v("fp"), day = v("day");
      var wall = loc === "put" || loc === "call";
      var locOk = loc === "mid" ? false : true;
      var regOk, appOk, why = {};
      if (loc === "zero") {
        regOk = reg === "rapids" ? true : false;
        appOk = ent === "accept" ? true : ent === "at" ? "warn" : false;
      } else {
        regOk = reg === "lake" ? true : "warn";
        if (ent === "accept") appOk = false;
        else if (app === "slow") appOk = ent === "at" ? true : "warn";
        else appOk = ent === "reclaim" ? true : false;
      }
      var fpOk = fp === "yes" ? true : fp === "none" ? "warn" : false;
      var dayOk = day === "ok" ? true : day === "done" ? false : "warn";
      [locOk, regOk, appOk, fpOk, dayOk].forEach(function (o, k) { setLamp(k, o); });
      var side = loc === "put" ? "long" : "short";
      var k, h, p;
      if (locOk === false) { k = "no"; h = "No level, no trade"; p = "Price is between the levels. Location first, execution second: wait for it to reach a wall or zero gamma."; }
      else if (dayOk === false) { k = "no"; h = "Done for the day"; p = "One or two quality setups in the first hours, then you're done. This isn't a sit-at-the-screen-all-day method."; }
      else if (loc === "zero" && regOk === false) { k = "no"; h = "Still on the lake"; p = "This play needs price below zero gamma and holding there. Until it is, there's no regime change to go with."; }
      else if (loc === "zero" && ent === "reclaim") { k = "no"; h = "That's the exit, not the entry"; p = "Back above zero gamma and holding on the retest means the break failed. If you're short, you're out."; }
      else if (wall && ent === "accept") { k = "no"; h = "A broken dam"; p = "The wall broke and price accepted beyond it. Don't stand in front of it holding a bucket: reassess, and the map may have changed."; }
      else if (wall && app === "fast" && ent === "at") { k = "no"; h = "Don't catch the ball yet"; p = "Price came in fast, so it's still stretching the net. Let it overshoot the wall, then enter when it gets back to the level: the reclaim."; }
      else if (fpOk === false) { k = "no"; h = "The footprint says no"; p = "Size is pushing through the level against you. Nobody is defending it. No knock, no trade."; }
      else if (fpOk === "warn") { k = "b"; h = "Location yes, trigger not yet"; p = "The wall tells you where, not when. Wait for absorption, stacked imbalances, a delta flip or trapped traders at the level."; }
      else {
        var warn = regOk === "warn" || appOk === "warn" || dayOk === "warn";
        k = warn ? "b" : "a";
        h = warn ? "A trade, with something to check" : (loc === "zero" ? "Go with it: short" : "Take it: " + side);
        p = warn ? ((regOk === "warn" ? "Below zero gamma moves stretch, so expect bigger ranges than on the lake. " : "") +
                    (appOk === "warn" && loc !== "zero" ? "It came in slow; the reaction usually comes right at the level, so waiting for a reclaim can leave you behind. " : "") +
                    (appOk === "warn" && loc === "zero" ? "It's broken, but wait for it to hold below before you go with it. " : "") +
                    (day === "opex" ? "It's moving day: check the levels are where you left them. " : "") +
                    (day === "loss" ? "Right after a loss: is this trade still from the plan? " : "") + "Smaller, or pass.")
                 : (loc === "zero" ? "Price left the lake and holds below zero gamma. Don't fade anything: short with the momentum, a wider stop back above zero gamma, the put wall as the target."
                                   : "Level, approach and footprint line up. Stop where the wall idea is proven wrong, target the next level, half off at the first reaction.");
      }
      out.className = "chk-out gw-out is-" + k;
      out.innerHTML = "<b>" + h + "</b><p>" + p + "</p>";
    }
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    run();
  })();

  /* =====================================================================
     6. Enter close, or don't
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-gw-calc]");
    if (!root) return;
    var out = root.querySelector(".gw-cout"), calc = root.querySelector(".gw-ccalc"), pres = root.querySelectorAll("[data-pre]");
    var PRE = {
      close: { side: "long", entry: 25156, stop: 25145, tp1: 25200, tp2: 25250 },
      chase: { side: "long", entry: 25214, stop: 25145, tp1: 25230, tp2: 25250 },
      "short": { side: "short", entry: 25447, stop: 25459, tp1: 25380, tp2: 25320 }
    };
    function el(n) { return root.querySelector('[name="' + n + '"]'); }
    function v(n) { return parseFloat(el(n).value); }
    function money(x) { return (x < 0 ? "−$" : "$") + Math.round(Math.abs(x)).toLocaleString("en-US"); }
    function row(a, b, cls) { return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + a + "</span><b>" + b + "</b></div>"; }
    function run() {
      var side = el("side").value, e = v("entry"), st = v("stop"), t1 = v("tp1"), t2 = v("tp2"), pv = v("ct"), dir = side === "long" ? 1 : -1;
      if ([e, st, t1, t2].some(function (q) { return !isFinite(q); })) { out.className = "chk-out gw-cout is-no"; out.innerHTML = "<b>Fill in every box</b><p>Prices only.</p>"; calc.innerHTML = ""; return; }
      var risk = (e - st) * dir, r1 = (t1 - e) * dir, r2 = (t2 - e) * dir;
      if (risk <= 0) { out.className = "chk-out gw-cout is-no"; out.innerHTML = "<b>The stop is on the wrong side</b><p>For a " + side + " the stop goes " + (dir > 0 ? "below" : "above") + " the entry.</p>"; calc.innerHTML = ""; return; }
      if (r2 <= 0) { out.className = "chk-out gw-cout is-no"; out.innerHTML = "<b>The target is behind you</b><p>The next level has to be " + (dir > 0 ? "above" : "below") + " the entry.</p>"; calc.innerHTML = ""; return; }
      var R = r2 / risk, ticks = Math.round(risk * 4), k, h, p;
      if (R >= 3) { k = "a"; h = R.toFixed(1) + "R to the next level"; p = "Small stop, big target, because you entered near the level. That's the whole point of trading at a wall."; }
      else if (R >= 1) { k = "b"; h = R.toFixed(1) + "R · getting late"; p = "Still positive, but most of the distance to the next level is gone. Closer to the level, or a smaller size."; }
      else { k = "no"; h = R.toFixed(1) + "R · you chased it"; p = "Same wall, same target, and the trade isn't even worth 1R anymore. Let this one go and wait for the next level."; }
      out.className = "chk-out gw-cout is-" + k;
      out.innerHTML = "<b>" + h + "</b><p>" + p + "</p>";
      var c = "";
      c += row("Risk to the stop", pt(risk) + " pts &middot; " + ticks + " ticks &middot; " + money(risk * pv) + " a contract");
      c += row("Stop size check", ticks < 30 ? "tighter than 30 ticks: is it past where it's wrong?" : ticks <= 50 ? "inside the usual 30 to 50 ticks" : "wider than 50 ticks: fine if that is where the idea is wrong");
      c += row("To the first take profit", (r1 > 0 ? "+" : "") + pt(r1) + " pts &middot; " + (r1 / risk).toFixed(1) + "R");
      c += row("To the next level", "+" + pt(r2) + " pts &middot; " + R.toFixed(1) + "R");
      c += row("2 contracts: half off, the rest rides", "+" + money((r1 + r2) * pv) + " &middot; risk " + money(2 * risk * pv), "tot");
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

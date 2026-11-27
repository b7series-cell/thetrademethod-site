/* =====================================================================
   hh-anim.js — the animations on the Hitchhiker Scalp page.

   1. [data-hh-anim]  one long, start to finish, on 2-minute bars, in
      eight stages: a stock in play → the outsized move on heavy volume
      → don't chase it (the risk to the 21 EMA from the highs) → the
      first pullback toward the 9 EMA on lighter volume → selling slows
      at the 9 EMA: buy, stop on a 2-minute close under the 21 EMA →
      volume comes back → new high: tighten the stop, trim 70% in 5%
      pieces → trail the last 30% on the prior bar's low.
   2. [data-hh-two]   two pullbacks to the same 9 EMA: one on light
      volume that resumes, one on heavy opposing volume that closes
      under the 21 EMA. Same chart, different volume, different answer.
   3. [data-hh-vol]   pullback volume against the move's volume.
   4. [data-hh-calc]  entry, the 21 EMA, the risk: size, trims, runner.
   5. [data-hh-check] stack it: eight boxes, all of them or pass.
   6. [data-hh-steps] the six steps as a click-through stepper with a
      small chart of the walkthrough that lights up per step.

   Like ts-anim.js the walkthrough redraws for the space it has: under
   640px of drawing width it uses a tall, narrow layout with larger text.
   The bars are scripted and labelled "Illustrative". No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#22d3ee", gold: "#f4b942", orange: "#ff9f0a", purple: "#bf5af2",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e", e9: "#ff9f0a", e21: "#bf5af2" };
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
  function rect(x, y, w, h, fill, op, stroke, rx) {
    if (op <= 0) return "";
    return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '"' + (rx ? ' rx="' + rx + '"' : "") + ' fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width="1.4"' : "") + ' opacity="' + op.toFixed(3) + '"/>';
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
  function tri(x, y, up, col, sz, op) {
    if (op != null && op <= 0) return "";
    var h = sz * 1.15, p = up ? [x, y - h / 2, x - sz / 2, y + h / 2, x + sz / 2, y + h / 2] : [x, y + h / 2, x - sz / 2, y - h / 2, x + sz / 2, y - h / 2];
    return '<polygon points="' + p.map(function (v) { return v.toFixed(1); }).join(" ") + '" fill="' + col + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function callout(x, y, lines, col, op) {
    if (op <= 0) return "";
    var w = 18 + Math.max.apply(null, lines.map(function (s) { return s.replace(/&[a-z#0-9]+;/g, "x").length; })) * 7.2 * FS, h = 10 + lines.length * 18 * FS;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" rx="8" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, k) { s += txt(x + 10, y + 21 * FS + k * 18 * FS, ln, k === 0 ? col : C.dim, 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  function partial(b, prog) {
    var o = b[0], h = b[1], l = b[2], c = b[3];
    if (prog >= 1) return { hi: h, lo: l, cur: c };
    var pth = c >= o ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
    var cur = pth[idx] + (pth[idx + 1] - pth[idx]) * f, hi = o, lo = o;
    for (var k = 0; k <= idx; k++) { hi = Math.max(hi, pth[k]); lo = Math.min(lo, pth[k]); }
    return { hi: Math.max(hi, cur), lo: Math.min(lo, cur), cur: cur };
  }
  function candle(x, yf, b, prog, wBody, op, paint) {
    if (prog <= 0) return "";
    var o = b[0], p = partial(b, prog);
    var col = paint || (p.cur >= o ? C.up : C.dn), top = yf(Math.max(o, p.cur)), bh = Math.max(1.5, Math.abs(yf(o) - yf(p.cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + yf(p.hi).toFixed(1) + '" y2="' + yf(p.lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.3"/>' +
      '<rect x="' + (x - wBody / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + wBody.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }
  function tag(xTag, y, label, col, op, ink) {
    if (op <= 0) return "";
    var w = (label.length * 7 + 16) * FS, h = 20 * FS;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xTag.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="' + col + '"/>' +
      txt(xTag + 8 * FS, y + 4.5 * FS, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function f2(v) { return v.toFixed(2); }
  function kv(v) { return v >= 1e6 ? (v / 1e6).toFixed(2) + "M" : Math.round(v / 1e3) + "k"; }
  function emaSeries(vals, n) { var k = 2 / (n + 1), e = null; return vals.map(function (v) { e = e == null ? v : e + (v - e) * k; return e; }); }

  /* ---------------------------------------------------------------------
     The bars: a made-up semiconductor ETF on 2-minute bars, 9:30 to
     10:40. [o, h, l, c, volume in thousands]
     --------------------------------------------------------------------- */
  var BARS = [
    [97.80, 98.05, 97.62, 97.95, 310], [97.95, 98.22, 97.84, 98.10, 280], [98.10, 98.18, 97.70, 97.78, 300], [97.78, 98.00, 97.60, 97.92, 260],
    [97.92, 98.30, 97.88, 98.24, 330], [98.24, 98.36, 98.02, 98.08, 290], [98.08, 98.20, 97.86, 97.98, 250], [97.98, 98.14, 97.80, 98.05, 240],
    [98.05, 98.28, 97.96, 98.20, 270], [98.20, 98.34, 98.06, 98.12, 260], [98.12, 98.25, 97.98, 98.18, 250], [98.18, 98.40, 98.10, 98.32, 300],
    /* the move: 12 to 19 */
    [98.32, 99.10, 98.28, 99.02, 980], [99.02, 99.85, 98.95, 99.78, 1240], [99.78, 100.40, 99.60, 100.32, 1180], [100.32, 101.05, 100.20, 100.96, 1420],
    [100.96, 101.70, 100.82, 101.58, 1560], [101.58, 102.20, 101.40, 102.10, 1380], [102.10, 102.88, 102.02, 102.74, 1610], [102.74, 102.90, 102.30, 102.46, 1120],
    /* the first pullback: 20 to 24 */
    [102.46, 102.60, 101.98, 102.08, 520], [102.08, 102.22, 101.62, 101.70, 470], [101.70, 101.86, 101.30, 101.42, 430], [101.42, 101.55, 101.08, 101.20, 380], [101.20, 101.32, 100.96, 101.12, 340],
    /* the turn: 25 */
    [101.12, 101.58, 101.04, 101.52, 690],
    /* volume comes back: 26 and 27, new high at 28 */
    [101.52, 102.10, 101.44, 102.02, 980], [102.02, 102.66, 101.94, 102.58, 1120], [102.58, 103.05, 102.48, 102.98, 1260], [102.98, 103.52, 102.86, 103.44, 1340],
    [103.44, 103.90, 103.30, 103.80, 1180], [103.80, 104.28, 103.66, 104.16, 1220], [104.16, 104.55, 104.02, 104.40, 1010], [104.40, 104.62, 104.18, 104.30, 760],
    [104.30, 104.48, 103.98, 104.04, 640], [104.04, 104.22, 103.80, 103.92, 520]
  ];
  var N = BARS.length;
  var CL = BARS.map(function (b) { return b[3]; });
  var E9 = emaSeries(CL, 9), E21 = emaSeries(CL, 21);
  var M0 = 12, M1 = 19, P0 = 20, P1 = 24, TURN = 25, NEWHI = 28, OUT = 34;
  var MOVE_HI = BARS[M1][1];                         // 102.90
  var CHASE = BARS[18][3], CHASE_STOP = E21[18];     // chasing the close of the big bar, stop at its 21 EMA
  var ENTRY = 101.33;                                 // a penny over the prior bar's high (101.32) as buyers step back in
  var STOPREF = E21[P1];                              // the 21 EMA when the entry fills
  var RISK = ENTRY - STOPREF;
  var TIGHT = +(BARS[NEWHI - 1][2] - 0.01).toFixed(2); // the most recent low when the new high prints
  var TRIMS = [[28, 102.80], [28, 103.00], [29, 103.20], [29, 103.35], [29, 103.50], [30, 103.60], [30, 103.75], [30, 103.88],
               [31, 104.00], [31, 104.12], [31, 104.25], [32, 104.35], [32, 104.45], [32, 104.52]];
  var TRIM_AVG = TRIMS.reduce(function (a, t) { return a + t[1]; }, 0) / TRIMS.length;
  var RUN_OUT = +(BARS[OUT - 1][2] - 0.01).toFixed(2);
  var R_TRIM = (TRIM_AVG - ENTRY) / RISK, R_RUN = (RUN_OUT - ENTRY) / RISK, R_ALL = 0.7 * R_TRIM + 0.3 * R_RUN;
  function avgVol(a, b) { var s = 0; for (var i = a; i <= b; i++) s += BARS[i][4]; return s / (b - a + 1) * 1000; }
  var VOL_BASE = avgVol(0, 11), VOL_MOVE = avgVol(M0, M1), VOL_PB = avgVol(P0, P1), VOL_PCT = VOL_PB / VOL_MOVE * 100;
  function clock(i) { var m = 30 + i * 2, h = 9 + Math.floor(m / 60); return h + ":" + ("0" + (m % 60)).slice(-2); }

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-hh-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;

    var STAGES = [
      { at: 0,    title: "A stock in play", text: "The semis are moving on news, and this ETF is trading well above its normal volume with a wide range on the day: abnormal volume, a big range, and a reason traders are watching. That's in play. A stock drifting in the middle of its range on light volume is nothing to hitchhike." },
      { at: 3.6,  title: "The outsized move", text: "Eight bars carry it from about 98.30 to " + f2(MOVE_HI) + " on heavy buying, about " + kv(VOL_MOVE) + " a bar against " + kv(VOL_BASE) + " before it. Buyers are clearly in control. Now you know the direction." },
      { at: 7.4,  title: "Don't chase it", text: "Buying the top of that push at " + f2(CHASE) + " means a stop back at the 21 EMA, " + f2(CHASE_STOP) + ": " + f2(CHASE - CHASE_STOP) + " a share of risk on a scalp. Too far. You'd either use a tight stop and get shaken out, or give it so much room you're not scalping anymore. Let it go." },
      { at: 10.0, title: "The first pullback, on lighter volume", text: "Here's the first pullback toward the 9 EMA. Small bodies, lower highs, and volume down to about " + kv(VOL_PB) + " a bar, " + Math.round(VOL_PCT) + "% of the move's. The selling is a lot less convincing than the buying was. That's what you want to see." },
      { at: 13.6, title: "Selling slows at the 9 EMA: buy", text: "Price stalls at the 9 EMA and a bar pushes back over the prior bar's high. Buy " + f2(ENTRY) + ". The stop is a 2-minute close under the 21 EMA, " + f2(STOPREF) + " right now: " + f2(RISK) + " of risk, a quarter of chasing it. You know where you're wrong before you get in, so you can size it." },
      { at: 16.2, title: "Volume comes back", text: "The original direction resumes and the volume comes back with it: 980k, then 1.12M. The move against the trend was the weak one. Now the strong side is back in charge." },
      { at: 18.0, title: "New high: tighten and pay yourself", text: "A new high over " + f2(MOVE_HI) + ". Move the stop up to the most recent low, " + f2(TIGHT) + ". Then pay yourself into momentum: 70% of the position in small pieces, about 5% at a time, " + TRIMS.length + " sells averaging " + f2(TRIM_AVG) + ", about " + R_TRIM.toFixed(1) + "R." },
      { at: 21.6, title: "Trail the last 30% on the prior bar", text: "Keep 30% and trail it under the prior 2-minute bar's low. Two bars later one breaks the prior low and the runner is out at " + f2(RUN_OUT) + ", about " + R_RUN.toFixed(1) + "R. The whole trade: about " + R_ALL.toFixed(1) + "R. You didn't catch 98 to 104. You didn't need to." }
    ];
    var TB = [];
    function segT(a, b, t0, step, dur) { for (var i = a; i <= b; i++) TB[i] = [t0 + (i - a) * step, t0 + (i - a) * step + dur]; }
    segT(0, 11, 0.3, 0.26, 0.22);
    segT(M0, M1, 3.8, 0.42, 0.36);
    segT(P0, P1, 10.2, 0.6, 0.5);
    segT(TURN, TURN, 13.8, 0.6, 0.55);
    segT(26, 27, 16.4, 0.6, 0.5);
    segT(NEWHI, 32, 18.2, 0.62, 0.52);
    segT(33, N - 1, 21.8, 0.6, 0.5);
    var END = TB[N - 1][1] + 1.8;
    function prog(i, T) { return clamp01((T - TB[i][0]) / (TB[i][1] - TB[i][0])); }
    function lastBar(T) { var last = -1; for (var i = 0; i < N; i++) if (T >= TB[i][0]) last = i; return last; }

    function size(n) {
      return n ? { W: 440, H: 900, x0: 14, x1: 340, yt: 210, yb: 640, vt: 676, vb: 800, xTag: 344, cx: 14, cy: 14 }
               : { W: 1180, H: 620, x0: 24, x1: 1030, yt: 132, yb: 438, vt: 470, vb: 566, xTag: 1036, cx: 24, cy: 14 };
    }
    var PMIN = 97.3, PMAX = 104.9, VMAX = 1700;

    function frame(T, L) {
      var s = "", i;
      var last = lastBar(T);
      var dx = (L.x1 - L.x0) / N, wB = Math.max(3, dx * 0.6);
      function x(i) { return L.x0 + dx * (i + 0.5); }
      function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
      function yv(v) { return L.vb - v / VMAX * (L.vb - L.vt); }
      s += txt(L.x0, L.yt - 14 * FS, "2-minute · a semis ETF", C.faint, 12);
      var lgx = L.x0 + (L.narrow ? 150 : 150) * FS;
      s += txt(lgx, L.yt - 14 * FS, "9 EMA", C.e9, 12, "start", 700) + txt(lgx + 50 * FS, L.yt - 14 * FS, "21 EMA", C.e21, 12, "start", 700);
      for (i = 0; i < N; i += 10) s += txt(x(i), L.vb + 20 * FS, clock(i), C.faint, 11.5, "middle");
      s += hl(L.x0, L.x1, L.vb, "#3a3a3c", null, 1);
      s += txt(L.x0, L.vt - 8 * FS, "Volume", C.faint, 11.5);

      /* the move's high, once it's in */
      var mh = fade(T, TB[M1][1], 0.3);
      s += hl(x(M1) - dx * 0.5, L.x1, y(MOVE_HI), C.faint, "4 4", 1.2, mh * (T >= 18.0 ? 0.4 : 1));
      if (!L.narrow) s += txt(x(M1) + dx * 2, y(MOVE_HI) - 7, "move high " + f2(MOVE_HI), C.faint, 11.5, "start", null, mh * (1 - fade(T, 18.0, 0.3)));

      /* the EMAs, drawn as far as price has printed */
      if (last >= 0) {
        var p9 = [], p21 = [];
        for (i = 0; i <= last; i++) {
          if (prog(i, T) < 1 && i === last) break;
          p9.push(x(i).toFixed(1) + "," + y(E9[i]).toFixed(1)); p21.push(x(i).toFixed(1) + "," + y(E21[i]).toFixed(1));
        }
        s += poly(p21, C.e21, 2, 0.9) + poly(p9, C.e9, 2.2, 0.95);
      }

      /* the volume bars, with the averages lit up during the pullback */
      var vo = fade(T, 10.4, 0.3) * (1 - fade(T, 16.2, 0.4));
      for (i = 0; i < N; i++) {
        var pr = prog(i, T); if (pr <= 0) continue;
        var b = BARS[i], col = b[3] >= b[0] ? C.up : C.dn;
        var dimIt = vo > 0 && i < M0 ? 1 - 0.6 * vo : 1;
        s += rect(x(i) - wB / 2, yv(b[4] * pr), wB, (L.vb - yv(b[4] * pr)), col, 0.75 * dimIt);
      }
      s += hl(x(M0) - wB, x(M1) + wB, yv(VOL_MOVE / 1000), C.up, "4 3", 1.6, vo);
      s += txt(x(M0), yv(VOL_MOVE / 1000) - 6, kv(VOL_MOVE) + " avg", C.up, 11.5, "start", 700, vo);
      s += hl(x(P0) - wB, x(P1) + wB, yv(VOL_PB / 1000), C.gold, "4 3", 1.6, vo);
      s += txt(x(P0), yv(VOL_PB / 1000) - 6, Math.round(VOL_PCT) + "%", C.gold, 11.5, "start", 700, vo);

      /* candles */
      for (i = 0; i < N; i++) {
        var pr2 = prog(i, T);
        if (pr2 <= 0) continue;
        s += candle(x(i), y, BARS[i], pr2, wB);
      }

      /* don't chase */
      var co = fade(T, 7.6, 0.3) * (1 - fade(T, 10.0, 0.3));
      s += hl(x(18) - dx * 0.5, L.x1, y(CHASE), C.dn, "5 4", 1.6, co);
      s += hl(x(18) - dx * 0.5, L.x1, y(CHASE_STOP), C.e21, "5 4", 1.6, co);
      s += rect(x(18) + dx * 1.4, y(CHASE), dx * 1.6, y(CHASE_STOP) - y(CHASE), C.dn, 0.16 * co);
      s += tag(L.xTag, y(CHASE), (L.narrow ? "" : "chase ") + f2(CHASE), C.dn, co);
      s += tag(L.xTag, y(CHASE_STOP), (L.narrow ? "" : "21 EMA ") + f2(CHASE_STOP), C.e21, co, C.ink);
      s += txt(x(18) + dx * 3.4, (y(CHASE) + y(CHASE_STOP)) / 2, f2(CHASE - CHASE_STOP) + " risk", C.dn, 13, "start", 700, co);

      /* the pullback into the 9 EMA */
      var po = fade(T, TB[P1][1], 0.3) * (1 - fade(T, 16.2, 0.3));
      s += ring(x(P1), y(E9[P1]), 13 * FS, C.e9, 2.2, po);

      /* the entry and the stop */
      var eo = fade(T, 14.1, 0.35);
      if (eo > 0) {
        s += tri(x(TURN), y(BARS[TURN][2]) + 14 * FS, true, C.up, 11 * FS, eo);
        s += hl(x(TURN) - dx * 0.5, L.x1, y(ENTRY), C.ink, null, 1.5, eo * (T >= 21.6 ? 0.45 : 1));
        s += tag(L.xTag, y(ENTRY), "buy " + f2(ENTRY), C.ink, eo * (1 - fade(T, 21.6, 0.3)));
        var tightOn = T >= TB[NEWHI][0] + 0.3, stopY = tightOn ? TIGHT : STOPREF;
        var so = eo * (1 - fade(T, TB[OUT][1], 0.3));
        s += hl(x(TURN) - dx * 0.5, tightOn ? x(NEWHI) - dx * 0.5 : L.x1, y(STOPREF), C.e21, "5 4", 1.8, so * (tightOn ? 0.45 : 1));
        if (tightOn) s += hl(x(NEWHI) - dx * 0.5, L.x1, y(TIGHT), C.dn, null, 2, so);
        s += tag(L.xTag, y(stopY), tightOn ? "stop " + f2(TIGHT) : (L.narrow ? "21 " : "close < 21 EMA ") + f2(STOPREF), tightOn ? C.dn : C.e21, so, tightOn ? "#000" : C.ink);
        s += ring(x(NEWHI), y(BARS[NEWHI][1]), 11 * FS, C.cyan, 2, fade(T, TB[NEWHI][0] + 0.3, 0.3) * (1 - fade(T, 21.0, 0.4)));
      }

      /* the trims: red triangles above each bar as it trades through the price */
      var nTrim = 0;
      TRIMS.forEach(function (t, j) {
        var bi = t[0], pr3 = prog(bi, T); if (pr3 <= 0) return;
        if (partial(BARS[bi], pr3).hi < t[1]) return;
        nTrim++;
        var k = TRIMS.filter(function (u, m) { return u[0] === bi && m < j; }).length;
        s += tri(x(bi) + (k - 1) * 6 * FS, y(BARS[bi][1]) - (12 + k * 3) * FS, false, C.dn, 8 * FS, 0.95);
      });
      if (T >= 18.2) s += txt(L.x0, L.yt + 14 * FS, nTrim + " of " + TRIMS.length + " pieces sold · " + (nTrim * 5) + "% off", C.dn, 12.5, "start", 700, fade(T, 18.2, 0.3));

      /* the runner's trail: under the prior bar's low */
      var ro = fade(T, 21.8, 0.3);
      if (ro > 0) {
        var pts = [];
        for (var b2 = 29; b2 <= Math.min(OUT, Math.max(29, last)); b2++) {
          var lv = BARS[b2 - 1][2] - 0.01;
          pts.push((x(b2) - dx * 0.5).toFixed(1) + "," + y(lv).toFixed(1), (x(b2) + dx * 0.5).toFixed(1) + "," + y(lv).toFixed(1));
        }
        s += poly(pts, C.cyan, 2, ro);
        var outOn = T >= TB[OUT][0] + (TB[OUT][1] - TB[OUT][0]) * 0.7;
        if (outOn) {
          s += tri(x(OUT), y(RUN_OUT) + 14 * FS, false, C.cyan, 11 * FS, fade(T, TB[OUT][1] - 0.1, 0.3));
          s += tag(L.xTag, y(RUN_OUT), "out " + f2(RUN_OUT), C.cyan, fade(T, TB[OUT][1] - 0.1, 0.3));
        }
      }

      /* ---- the callouts ---- */
      var cx = L.cx, cy = L.cy;
      s += callout(cx, cy, ["In play", "Abnormal volume · a big range", "A reason: sector news", "Not drifting mid-range"], C.ink, fade(T, 0.4, 0.3) * (1 - fade(T, 3.6, 0.3)));
      s += callout(cx, cy, ["The outsized move", "98.30 to " + f2(MOVE_HI) + " in eight bars", "Volume " + kv(VOL_MOVE) + " a bar", "Now you know the direction"], C.up, fade(T, 3.9, 0.3) * (1 - fade(T, 7.4, 0.3)));
      s += callout(cx, cy, ["Don't chase it", "Buy " + f2(CHASE) + ", stop at the 21 EMA", f2(CHASE_STOP) + ": " + f2(CHASE - CHASE_STOP) + " of risk", "Right direction, wrong entry"], C.dn, fade(T, 7.6, 0.3) * (1 - fade(T, 10.0, 0.3)));
      s += callout(cx, cy, ["The first pullback", "Toward the 9 EMA, controlled", "Volume " + kv(VOL_PB) + " a bar:", Math.round(VOL_PCT) + "% of the move's"], C.gold, fade(T, 10.2, 0.3) * (1 - fade(T, 13.6, 0.3)));
      s += callout(cx, cy, ["Buy " + f2(ENTRY) + " at the 9 EMA", "Stop: a 2-min close under", "the 21 EMA, " + f2(STOPREF), "Risk " + f2(RISK) + " · size off it"], C.up, fade(T, 13.8, 0.3) * (1 - fade(T, 16.2, 0.3)));
      s += callout(cx, cy, ["Volume comes back", "980k, then 1.12M a bar", "The pullback was the weak side", "The trend resumes"], C.up, fade(T, 16.4, 0.3) * (1 - fade(T, 18.0, 0.3)));
      s += callout(cx, cy, ["New high: tighten and trim", "Stop up to " + f2(TIGHT), "70% off in 5% pieces", "Average " + f2(TRIM_AVG) + " · " + R_TRIM.toFixed(1) + "R"], C.dn, fade(T, 18.2, 0.3) * (1 - fade(T, 21.6, 0.3)));
      s += callout(cx, cy, ["Trail 30% on the prior bar", "Out " + f2(RUN_OUT) + " · " + R_RUN.toFixed(1) + "R", "The whole trade: " + R_ALL.toFixed(1) + "R", "A scalp, not the whole move"], C.cyan, fade(T, 21.8, 0.3));
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
    window.HHAnim = { seek: function (t) { setPlaying(false); T = t; draw(); }, END: END,
                      _levels: { ENTRY: ENTRY, STOPREF: STOPREF, RISK: RISK, CHASE: CHASE, CHASE_STOP: CHASE_STOP, TIGHT: TIGHT, TRIM_AVG: TRIM_AVG, RUN_OUT: RUN_OUT,
                                 R_TRIM: R_TRIM, R_RUN: R_RUN, R_ALL: R_ALL, VOL_MOVE: VOL_MOVE, VOL_PB: VOL_PB, VOL_PCT: VOL_PCT, E9: E9, E21: E21 } };   // exposed for testing
  })();

  /* =====================================================================
     2. Two pullbacks to the same 9 EMA: light volume vs heavy volume
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-hh-two]");
    if (!root) return;
    var svg = root.querySelector("svg");
    /* both start with the walkthrough's base and move (bars 4 to 19) */
    var head = BARS.slice(4, M1 + 1);
    var good = head.concat(BARS.slice(P0, 30));
    var bad = head.concat([
      [102.46, 102.52, 101.60, 101.70, 1380], [101.70, 101.80, 100.90, 101.00, 1520], [101.00, 101.20, 100.30, 100.42, 1640],
      [100.42, 100.60, 99.70, 99.84, 1710], [99.84, 100.30, 99.60, 100.18, 900], [100.18, 100.36, 99.40, 99.52, 1260],
      [99.52, 99.90, 99.20, 99.70, 820], [99.70, 99.88, 99.10, 99.24, 900], [99.24, 99.60, 98.96, 99.40, 700], [99.40, 99.58, 98.90, 99.02, 760]
    ]);
    var PB0 = M1 - 4 + 1;   // index of the first pullback bar inside these arrays
    function panel(bars, ox, oy, w, h, title, good) {
      var cl = bars.map(function (b) { return b[3]; }), e9 = emaSeries(cl, 9), e21 = emaSeries(cl, 21);
      var n = bars.length, dx = w / n, wb = Math.max(3, dx * 0.6), pmin = 97.4, pmax = 104.2, ph = h * 0.68, vt = oy + ph + 22, vb = oy + h;
      function x(i) { return ox + dx * (i + 0.5); }
      function y(p) { return oy + 24 + (ph - 24) * (1 - (p - pmin) / (pmax - pmin)); }
      var vmax = 1800;
      function yv(v) { return vb - v / vmax * (vb - vt); }
      var s = txt(ox, oy + 6, title, good ? C.up : C.dn, 15, "start", 700);
      s += rect(x(PB0) - dx * 0.5, oy + 16, dx * 5, vb - oy - 16, good ? C.up : C.dn, 0.07, null, 6);
      var p9 = [], p21 = [];
      bars.forEach(function (b, i) {
        s += candle(x(i), y, b, 1, wb);
        var col = b[3] >= b[0] ? C.up : C.dn;
        s += rect(x(i) - wb / 2, yv(b[4]), wb, vb - yv(b[4]), col, 0.7);
        p9.push(x(i).toFixed(1) + "," + y(e9[i]).toFixed(1)); p21.push(x(i).toFixed(1) + "," + y(e21[i]).toFixed(1));
      });
      s += poly(p21, C.e21, 1.8, 0.9) + poly(p9, C.e9, 2, 0.95);
      s += hl(ox, ox + w, vb, "#3a3a3c", null, 1);
      if (good) {
        s += ring(x(PB0 + 4), y(e9[PB0 + 4]), 11 * FS, C.e9, 2);
        s += tri(x(PB0 + 5), y(bars[PB0 + 5][2]) + 13 * FS, true, C.up, 10 * FS);
        s += txt(x(PB0 + 2), yv(600) - 8 * FS, "light", C.gold, 12, "middle", 700);
        s += txt(ox + w, oy + 6, "resumes", C.up, 13, "end", 600);
      } else {
        var cut = -1; for (var i = PB0; i < n; i++) if (cl[i] < e21[i]) { cut = i; break; }
        if (cut >= 0) { s += ring(x(cut), y(cl[cut]), 11 * FS, C.dn, 2); s += txt(x(cut), y(cl[cut]) + 40 * FS, "closes under the 21 EMA", C.dn, 12, "middle", 700); }
        s += txt(x(PB0 + 2), yv(1700) - 6 * FS, "heavy", C.dn, 12, "middle", 700);
        s += txt(ox + w, oy + 6, "skip it", C.dn, 13, "end", 600);
      }
      return s;
    }
    var narrow = null;
    function draw() {
      var n = svg.clientWidth > 0 && svg.clientWidth < 600;
      if (n === narrow) return; narrow = n;
      FS = n ? 1.25 : 1;
      var W = n ? 440 : 1180, H = n ? 780 : 360, s;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      s = '<rect width="' + W + '" height="' + H + '" rx="14" fill="' + C.bg + '"/>';
      if (n) s += panel(good, 16, 26, 408, 340, "Light volume pullback", true) + panel(bad, 16, 410, 408, 340, "Heavy opposing volume", false);
      else s += panel(good, 24, 26, 540, 300, "Light volume pullback", true) + panel(bad, 616, 26, 540, 300, "Heavy opposing volume", false);
      s += txt(W - 8, H - 6, "Illustrative · made-up bars", C.faint, 11, "end");
      svg.innerHTML = s;
      FS = 1;
    }
    draw();
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(draw, 150); });
  })();

  /* =====================================================================
     3. Volume: the pullback against the move
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-hh-vol]");
    if (!root) return;
    var ins = {}, out = root.querySelector(".hh-vout");
    root.querySelectorAll("input").forEach(function (el) { ins[el.name] = el; });
    function run() {
      var mv = parseFloat(ins.move.value), pb = parseFloat(ins.pb.value);
      if (!(mv > 0) || !(pb >= 0)) { out.className = "chk-out hh-vout"; out.innerHTML = "<b>&mdash;</b><p>Type the average volume per bar for the move and for the pullback.</p>"; return; }
      var pct = pb / mv * 100, cls, head, body;
      if (pct <= 60) { cls = "is-a"; head = Math.round(pct) + "% · lighter. That's the one."; body = "The move against the trend is a lot less convincing than the move itself. Watch for the pullback to slow at the 9 EMA, then for volume to come back as the trend resumes."; }
      else if (pct < 100) { cls = "is-b"; head = Math.round(pct) + "% · not much lighter"; body = "The pullback is drawing real volume. It isn't heavier than the move, but it's not the quiet, controlled pullback you want either. Be careful, and want everything else on the list."; }
      else { cls = "is-no"; head = Math.round(pct) + "% · heavy opposing volume"; body = "The pullback is trading heavier than the move did. That's the warning not to take the trade: the other side may be taking control."; }
      out.className = "chk-out hh-vout " + cls;
      out.innerHTML = "<b>" + head + "</b><p>" + body + "</p>";
    }
    root.addEventListener("input", run);
    run();
  })();

  /* =====================================================================
     4. Size it off the 21 EMA, then split it 70 / 30
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-hh-calc]");
    if (!root) return;
    var ins = {}, out = root.querySelector(".hh-cout");
    root.querySelectorAll("input").forEach(function (el) { ins[el.name] = el; });
    function num(k) { var v = parseFloat(ins[k].value); return isFinite(v) ? v : NaN; }
    function row(k, v, cls) { return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + k + "</span><b>" + v + "</b></div>"; }
    function run() {
      var e = num("entry"), m = num("ema"), risk = num("risk"), trim = num("trim");
      if (![e, m, risk, trim].every(isFinite) || e === m || risk <= 0) { out.innerHTML = row("Type the four numbers", "&mdash;"); return; }
      trim = Math.max(0, Math.min(100, trim));
      var lng = e > m, r = Math.abs(e - m), sh = Math.floor(risk / r);
      var tsh = Math.round(sh * trim / 100), rsh = sh - tsh, piece = Math.max(1, Math.round(sh * 0.05));
      var html = row("Side", lng ? "long" : "short");
      html += row("Out on a 2-min close " + (lng ? "under" : "over") + " the 21 EMA", "&asymp; " + f2(m));
      html += row("Risk a share, to the 21 EMA", f2(r));
      html += row("Shares", sh > 0 ? sh.toLocaleString("en-US") : "0, the 21 EMA is too far for the risk");
      if (sh > 0) {
        html += row("Trim into momentum (" + trim + "%)", tsh.toLocaleString("en-US") + " &middot; about " + Math.ceil(tsh / piece) + " pieces of " + piece.toLocaleString("en-US"));
        html += row("Runner, trailed on the prior bar's " + (lng ? "low" : "high"), rsh.toLocaleString("en-US"), "tot");
      }
      out.innerHTML = html;
    }
    root.addEventListener("input", run);
    run();
  })();

  /* =====================================================================
     5. Stack it: all eight, or pass
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-hh-check]");
    if (!root) return;
    var boxes = Array.prototype.slice.call(root.querySelectorAll("input[type=checkbox]")), out = root.querySelector(".hh-kout");
    function run() {
      var miss = boxes.filter(function (b) { return !b.checked; }).map(function (b) { return b.getAttribute("data-k"); });
      if (!miss.length) { out.className = "chk-out hh-kout is-a"; out.innerHTML = "<b>All eight · take it</b><p>Strong momentum, in play, the first pullback into the 9 EMA, the 21 EMA as the stop, momentum and volume fading into the entry, and a clear, defined risk.</p>"; return; }
      out.className = "chk-out hh-kout " + (miss.length <= 2 ? "is-b" : "is-no");
      out.innerHTML = "<b>Pass · " + (8 - miss.length) + " of 8</b><p>Missing: " + miss.join(", ") + ". If those things aren't there, the video's answer is simple: pass.</p>";
    }
    root.addEventListener("change", run);
    run();
  })();

  /* =====================================================================
     6. The six steps as a stepper, with a small chart of the walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-hh-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    var NS = steps.length;
    if (NS !== 6) return;
    var INFO = [
      { k: "In play",      c: C.ink,    tag: "Find · a stock in play" },
      { k: "The move",     c: C.up,     tag: "Watch · the outsized move, then let it go" },
      { k: "The pullback", c: C.gold,   tag: "Wait · the first pullback to the 9 EMA" },
      { k: "The entry",    c: C.e9,     tag: "Execute · as the pullback slows" },
      { k: "The stop",     c: C.e21,    tag: "Risk · a 2-minute close past the 21 EMA" },
      { k: "The exit",     c: C.cyan,   tag: "Manage · 70% into momentum, trail 30%" }
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
    fig.innerHTML = '<svg viewBox="0 0 560 320" role="img" aria-label="The walkthrough on 2-minute bars with the 9 and 21 EMAs and volume, with the current step highlighted"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    var xa = 18, xb = 470, yt = 40, yb = 222, vt = 238, vb = 296, PMN = 97.3, PMX = 104.9, VMX = 1700;
    var dx = (xb - xa) / N, wb = Math.max(3, dx * 0.6);
    function X(i) { return xa + dx * (i + 0.5); }
    function Y(p) { return yb - (p - PMN) / (PMX - PMN) * (yb - yt); }
    function YV(v) { return vb - v / VMX * (vb - vt); }
    var SF = 1;
    function t(x, y, s, col, anchor, w) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + (13 * SF).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' + (w ? ' font-weight="' + w + '"' : "") + ">" + s + "</text>"; }
    function band(a, b, col) { return rect(X(a) - dx * 0.5, yt - 8, dx * (b - a + 1), vb - yt + 8, col, 0.1, null, 4); }

    function chart(k) {
      var c = INFO[k].c, s = "";
      s += t(xa, 22, "2-minute · the walkthrough", C.faint);
      if (k === 1) s += band(M0, M1, C.up);
      if (k === 2) s += band(P0, P1, C.gold);
      var p9 = [], p21 = [];
      BARS.forEach(function (b, i) {
        var lit = true;
        s += candle(X(i), Y, b, 1, wb, lit ? 1 : 0.4);
        var hot = (k === 1 && i >= M0 && i <= M1) || (k === 2 && i >= P0 && i <= P1) || (k === 0) || (k === 5 && i >= 26);
        s += rect(X(i) - wb / 2, YV(b[4]), wb, vb - YV(b[4]), b[3] >= b[0] ? C.up : C.dn, hot ? 0.8 : 0.3);
        p9.push(X(i).toFixed(1) + "," + Y(E9[i]).toFixed(1)); p21.push(X(i).toFixed(1) + "," + Y(E21[i]).toFixed(1));
      });
      s += poly(p21, C.e21, k === 4 ? 2.8 : 1.6, k === 4 || k === 3 ? 1 : 0.55) + poly(p9, C.e9, k === 2 || k === 3 ? 2.8 : 1.6, k === 2 || k === 3 ? 1 : 0.55);
      s += hl(xa, xb, vb, "#3a3a3c", null, 1);
      if (k === 0) {
        var r0 = Y(BARS[0][2]), r1 = Y(104.62);
        s += '<line x1="' + (xb + 14) + '" x2="' + (xb + 14) + '" y1="' + r0.toFixed(1) + '" y2="' + r1.toFixed(1) + '" stroke="' + c + '" stroke-width="1.6"/>';
        s += hl(xb + 9, xb + 19, r0, c, null, 1.6) + hl(xb + 9, xb + 19, r1, c, null, 1.6);
        s += t(xb + 22, (r0 + r1) / 2, "range", c, "start", 700);
        s += t(X(M0), YV(1700) - 4, "abnormal volume", c, "start", 700);
        s += t(X(0), Y(103.9), "a reason: sector news", C.dim, "start");
      }
      if (k === 1) {
        s += t(X(M1) + 8, Y(MOVE_HI) - 4, "98.30 to " + f2(MOVE_HI), c, "start", 700);
        s += t(X(M1) + 8, Y(MOVE_HI) + 14, "don't chase", C.dn, "start", 600);
      }
      if (k === 2) {
        s += ring(X(P1), Y(E9[P1]), 10, C.e9, 2.2);
        s += t(X(P0), YV(1500), "volume " + Math.round(VOL_PCT) + "% of the move", c, "start", 700);
        s += t(xb + 6, Y(E9[N - 1]) + 4, "9", C.e9, "start", 700);
      }
      if (k === 3) {
        s += tri(X(TURN), Y(BARS[TURN][2]) + 12, true, C.up, 10);
        s += hl(X(TURN), xb, Y(ENTRY), C.ink, null, 1.6);
        s += t(xb, Y(ENTRY) + 18, "buy " + f2(ENTRY), C.ink, "end", 700);
        s += t(X(P0) - 4, Y(E9[P1]) + 34, "selling slows at the 9", c, "start", 700);
      }
      if (k === 4) {
        s += hl(X(TURN), xb, Y(STOPREF), C.e21, "5 4", 2);
        s += hl(X(TURN), xb, Y(ENTRY), C.ink, null, 1.4);
        s += t(xb, Y(STOPREF) + 18, "2-min close under the 21: out", c, "end", 700);
        s += t(xb, Y(ENTRY) - 8, "risk " + f2(RISK) + " vs " + f2(CHASE - CHASE_STOP) + " chasing", C.dim, "end", 600);
      }
      if (k === 5) {
        TRIMS.forEach(function (tr, j) {
          var kk = TRIMS.filter(function (u, m) { return u[0] === tr[0] && m < j; }).length;
          s += tri(X(tr[0]) + (kk - 1) * 5, Y(BARS[tr[0]][1]) - 10 - kk * 3, false, C.dn, 7);
        });
        s += hl(X(NEWHI), xb, Y(TIGHT), C.dn, null, 1.6);
        s += tri(X(OUT), Y(RUN_OUT) + 12, false, c, 10);
        s += t(X(NEWHI) - 4, Y(BARS[32][1]) - 26, "70% in 5% pieces", C.dn, "end", 700);
        s += t(xb, Y(TIGHT) + 16, "stop to the recent low", C.dn, "end", 600);
        s += t(X(OUT) + 10, Y(RUN_OUT) + 26, "30% out on a prior-bar break", c, "end", 700);
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

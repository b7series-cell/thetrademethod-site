/* =====================================================================
   gg-anim.js — the animations on the Gap Give and Go page.

   1. [data-gg-anim]  one Gap Give and Go long, start to finish, in six
      stages: the gap with its levels marked → the give, fast and on
      light volume → the neutral range where sellers can't stick it →
      the turn and the entry on the go, stop under the low of day →
      fighting for price at VWAP and back through the open → the
      targets, premarket high and the RVOL × ATR measured move.
      A tape meter (−8 to +8) and a volume pane move with the bars.
   2. [data-gg-two]   the same gap twice, on a loop: once the give keeps
      giving and there's never a go (no trade), once it gives, holds,
      and goes (the trade).
   3. [data-gg-calc]  the RVOL × ATR target, worked from four inputs.
   4. [data-gg-steps] the six steps as a click-through stepper with a
      small chart of the move, that step's leg lit up.

   Like sb-anim.js the walkthrough redraws for the space it has: under
   640px of drawing width it uses a tall, narrow layout with larger text.
   The bars are scripted and labelled "Illustrative". No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#22d3ee", gold: "#f4b942", orange: "#ff9f0a",
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

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-gg-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;

    /* 1-minute bars from 9:30, scripted, with volume in thousands of shares. */
    var BARS = [
      [23.70, 23.86, 23.62, 23.66, 420],                                            // 0  the open, after a 16% gap
      [23.66, 23.68, 23.42, 23.46, 250], [23.46, 23.50, 23.22, 23.26, 230],         // 1-2  the give
      [23.26, 23.30, 23.04, 23.12, 280],                                            // 3  the flush, low of day
      [23.12, 23.30, 23.10, 23.24, 120], [23.24, 23.34, 23.14, 23.18, 90],          // 4-9  the neutral range
      [23.18, 23.28, 23.10, 23.22, 80],  [23.22, 23.36, 23.16, 23.30, 110],
      [23.30, 23.32, 23.07, 23.16, 140], [23.16, 23.30, 23.14, 23.28, 90],
      [23.28, 23.56, 23.26, 23.50, 560],                                            // 10  the go
      [23.50, 23.60, 23.40, 23.56, 360],                                            // 11  the dip to 23.40 gets bought
      [23.56, 23.64, 23.48, 23.60, 260], [23.60, 23.78, 23.56, 23.74, 340],         // 13  back through the open
      [23.74, 23.84, 23.66, 23.80, 240], [23.80, 23.96, 23.76, 23.92, 300],
      [23.92, 24.14, 23.90, 24.08, 380],                                            // 16  premarket high
      [24.08, 24.12, 23.96, 24.02, 200], [24.02, 24.20, 24.00, 24.16, 240], [24.16, 24.34, 24.12, 24.30, 260],
      [24.30, 24.46, 24.26, 24.40, 220],
      [24.40, 24.56, 24.36, 24.52, 300],                                            // 21  the RVOL × ATR target
      [24.52, 24.58, 24.38, 24.44, 160], [24.44, 24.50, 24.30, 24.36, 140]
    ];
    var N = BARS.length, GIVE0 = 1, FLUSH = 3, R0 = 4, PRESS = 8, R1 = 9, GO = 10, DIP = 11, OPENX = 13, PMX = 16, TGX = 21;
    var OPEN = BARS[0][0], PMH = 24.10, KEY = 23.00, LOD = BARS[FLUSH][2], STOP = +(LOD - 0.01).toFixed(2);
    var RHI = 0; for (var r = R0; r <= R1; r++) RHI = Math.max(RHI, BARS[r][1]);
    var ENTRY = +(RHI + 0.02).toFixed(2), RISK = ENTRY - STOP;
    var ATR = 1.13, RVOL = 2.6, MOVE = RVOL / 2 * ATR, TGT = +(LOD + MOVE).toFixed(2);
    var R_PM = (PMH - ENTRY) / RISK, R_TG = (TGT - ENTRY) / RISK;
    var VW = [], cpv = 0, cv = 0;
    BARS.forEach(function (b) { cpv += (b[1] + b[2] + b[3]) / 3 * b[4]; cv += b[4]; VW.push(cpv / cv); });
    var GIVEVOL = (BARS[1][4] + BARS[2][4] + BARS[3][4]) / 3;
    function clock(i) { var m = 570 + i, h = Math.floor(m / 60), mm = m % 60; return h + ":" + (mm < 10 ? "0" : "") + mm; }

    /* the tape, −8 (sellers in full control) to +8 (buyers), a reading per bar */
    var TAPE = [2, -6, -8, -8, -1, 0, 0, 1, -3, 1, 8, 6, 5, 6, 5, 5, 4, 3, 4, 4, 3, 2, 0, -1];

    var STAGES = [
      { at: 0,    title: "The gap", text: "Strong earnings, an 8 out of 10 catalyst. The stock gaps up 16% and opens at " + f2(OPEN) + ". Marked before the bell: the premarket high, " + f2(PMH) + ", and the key level below, the daily breakout around " + f2(KEY) + "." },
      { at: 3.0,  title: "The give", text: "The first move is down, and it's fast: " + f2(OPEN - LOD) + " in three minutes into the " + f2(KEY) + " area, on lighter volume than the open. That's a −8 tape: sellers won't let it lift. Don't buy here. A give can keep on giving." },
      { at: 7.2,  title: "The neutral range", text: "Then it stops going down. Six bars between " + f2(BARS[R0][2]) + " and " + f2(RHI) + " on quiet volume, bids holding at 23.10. Sellers press it to " + f2(BARS[PRESS][2]) + " once and can't stick it. Neither side is in control, and there's nothing to do yet." },
      { at: 12.0, title: "The go", text: "The tape flips to +8: a bar clears the range high on " + BARS[GO][4] + "k shares, the biggest bar since the open. Buy " + f2(ENTRY) + " on the go. The stop goes under the low of the day, " + f2(STOP) + ": " + f2(RISK) + " of risk." },
      { at: 15.6, title: "Fight for price, then the open", text: "The first dip comes back to " + f2(BARS[DIP][2]) + ", right on VWAP, and the bid steps straight back in. That's the moment to be at full size. Buyers win the battle at VWAP, and price trades back through the open at " + f2(OPEN) + ". Add above VWAP only when the volume is really there." },
      { at: 19.6, title: "The targets", text: "The premarket high, " + f2(PMH) + ", is +" + R_PM.toFixed(1) + "R. The measured move: half of " + RVOL + " RVOL times a " + f2(ATR) + " ATR is " + f2(MOVE) + " from the low, " + f2(TGT) + ", +" + R_TG.toFixed(1) + "R. Sell into extensions and ride the rest until the trend ends." }
    ];
    var TB = [];
    for (var i = 0; i < N; i++) {
      if (i === 0) TB[i] = [0.5, 1.6];
      else if (i <= FLUSH) TB[i] = [3.4 + (i - 1) * 0.55, 3.4 + (i - 1) * 0.55 + 0.45];
      else if (i <= R1) TB[i] = [7.6 + (i - R0) * 0.6, 7.6 + (i - R0) * 0.6 + 0.5];
      else if (i === GO) TB[i] = [12.3, 13.4];
      else if (i <= PMX) TB[i] = [15.9 + (i - DIP) * 0.55, 15.9 + (i - DIP) * 0.55 + 0.48];
      else TB[i] = [19.9 + (i - PMX - 1) * 0.5, 19.9 + (i - PMX - 1) * 0.5 + 0.44];
    }
    var END = TB[N - 1][1] + 1.8;

    function size(n) {
      return n ? { W: 440, H: 790, x0: 14, x1: 300, yt: 250, yb: 610, vt: 640, vb: 720, xAx: 434, xTag: 306, cx: 14, cy: 14, mx: 14, my: 168, mw: 412 }
               : { W: 1180, H: 600, x0: 60, x1: 1000, yt: 100, yb: 440, vt: 468, vb: 548, xAx: 1172, xTag: 1010, cx: 60, cy: 18, mx: 700, my: 22, mw: 300 };
    }
    var PMIN = 22.86, PMAX = 24.66;

    function meter(T, L, val, op) {
      if (op <= 0) return "";
      var x0 = L.mx, w = L.mw, y0 = L.my, h = 10 * FS, s = '<g opacity="' + op.toFixed(3) + '">';
      s += txt(x0, y0 + 2, "The tape", C.dim, 12, "start", 600);
      var lab = val <= -6 ? "sellers in control" : val >= 6 ? "buyers in control" : Math.abs(val) <= 1 ? "neutral" : val < 0 ? "leaning sellers" : "leaning buyers";
      var col = val <= -3 ? C.dn : val >= 3 ? C.up : C.dim;
      s += txt(x0 + w, y0 + 2, (val > 0 ? "+" : "") + Math.round(val) + " · " + lab, col, 12, "end", 600);
      var by = y0 + 12 * FS;
      s += '<rect x="' + x0 + '" y="' + by.toFixed(1) + '" width="' + w + '" height="' + h.toFixed(1) + '" rx="5" fill="#2c2c2e"/>';
      s += rect(x0, by, w * 0.3, h, C.dn, 0.35) + rect(x0 + w * 0.7, by, w * 0.3, h, C.up, 0.35);
      var mxp = x0 + (val + 8) / 16 * w;
      s += '<rect x="' + (mxp - 3).toFixed(1) + '" y="' + (by - 4).toFixed(1) + '" width="6" height="' + (h + 8).toFixed(1) + '" rx="2" fill="' + col + '"/>';
      s += txt(x0, by + h + 15 * FS, "−8", C.faint, 11, "start") + txt(x0 + w / 2, by + h + 15 * FS, "0", C.faint, 11, "middle") + txt(x0 + w, by + h + 15 * FS, "+8", C.faint, 11, "end");
      return s + "</g>";
    }

    function frame(T, L) {
      var dx = (L.x1 - L.x0) / (N - 0.5), wB = Math.max(4, dx * 0.62);
      function x(i) { return L.x0 + dx * (i + 0.5); }
      function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
      var VMAX = 600; function vy(v) { return L.vb - v / VMAX * (L.vb - L.vt); }
      var s = "", p, k;
      for (p = 23.0; p <= 24.6 + 1e-9; p += 0.2) s += hl(L.x0, L.x1, y(p), "rgba(255,255,255,0.05)", null, 1) + (L.narrow ? "" : txt(L.xAx, y(p) + 4, p.toFixed(2), C.faint, 11, "end"));
      (L.narrow ? [0, 10, 20] : [0, 5, 10, 15, 20]).forEach(function (k) { if (k < N) s += txt(x(k), L.vb + 20 * FS, clock(k), C.faint, 11, "middle"); });
      s += txt(L.x0, L.vt - 6, "Volume", C.faint, 11, "start");
      s += txt(L.W - 8, L.H - 6, "Illustrative · 1-minute bars", C.faint, 11, "end");
      var last = -1; for (k = 0; k < N; k++) if (T >= TB[k][0]) last = k;

      /* levels marked before the open */
      var aL = fade(T, 0.2, 0.5);
      if (aL > 0) {
        var pmHit = T >= TB[PMX][1];
        s += hl(L.x0, pmHit ? x(PMX) : L.x1, y(PMH), pmHit ? C.up : C.dim, "2 4", 1.5, aL);
        s += tag(L.xTag, y(PMH), (L.narrow ? "PMH " : "Premarket high ") + f2(PMH), pmHit ? C.up : C.dim, aL * (T >= 19.6 && !L.narrow ? 0 : 1));
        var openX = T >= TB[OPENX][1];
        s += hl(x(0), openX ? x(OPENX) : L.x1, y(OPEN), openX ? C.up : C.blue, "6 4", 1.5, aL);
        s += tag(L.xTag, y(OPEN), "Open " + f2(OPEN), openX ? C.up : C.blue, aL * (T >= 12.0 && T < 15.6 ? 0 : 1));
        s += hl(L.x0, L.x1, y(KEY), C.gold, "5 4", 1.6, aL * 0.85);
        s += tag(L.xTag, y(KEY), (L.narrow ? "Key " : "Key level ") + f2(KEY), C.gold, aL * (1 - fade(T, 12.0, 0.3)));
      }
      /* the give: a red band down the flush */
      var aG = fade(T, TB[FLUSH][1], 0.4) * (1 - 0.6 * fade(T, 12.0, 0.4));
      if (aG > 0) {
        s += '<line x1="' + x(0).toFixed(1) + '" y1="' + y(BARS[0][1]).toFixed(1) + '" x2="' + x(FLUSH).toFixed(1) + '" y2="' + y(LOD).toFixed(1) + '" stroke="' + C.dn + '" stroke-width="3" stroke-dasharray="2 5" opacity="' + aG.toFixed(3) + '"/>';
        if (!L.narrow || T < 7.2) s += txt(x(1) - 10, y(23.36), "The give", C.dn, 13, "end", 700, aG);
      }
      /* the neutral range */
      var aR = fade(T, TB[R1][1], 0.4);
      if (aR > 0) {
        var rEnd = T >= TB[GO][0] ? x(GO) - dx / 2 : x(Math.max(last, R1)) + dx / 2;
        s += rect(x(R0) - dx / 2, y(RHI), rEnd - x(R0) + dx / 2, y(BARS[R0][2]) - y(RHI), C.dim, 0.10 * aR, C.dim);
        s += txt((x(R0) + rEnd) / 2, y(RHI) - 8, "Neutral", C.dim, 12, "middle", 700, aR * (L.narrow ? 1 - fade(T, 12.0, 0.3) : T < 19.6 ? 1 : 0.5));
      }
      /* VWAP, drawn as the bars print */
      var aV = fade(T, 12.0, 0.5);
      if (aV > 0 && last >= 1) {
        var pts = []; for (k = 0; k <= last; k++) pts.push(x(k).toFixed(1) + "," + y(VW[k]).toFixed(1));
        s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.cyan + '" stroke-width="2" opacity="' + (0.85 * aV).toFixed(3) + '"/>';
        s += txt(x(last) - wB, y(VW[last]) - 9 * FS, "VWAP", C.cyan, 12, "end", 600, aV);
      }

      /* candles and volume */
      for (k = 0; k < N; k++) {
        var pr = clamp01((T - TB[k][0]) / (TB[k][1] - TB[k][0]));
        if (pr <= 0) continue;
        s += candle(x(k), y, BARS[k], pr, wB, 1, k === GO && T >= TB[GO][1] ? "#3ef08a" : null);
        var vc = k === GO ? C.up : (k >= GIVE0 && k <= FLUSH) ? C.dn : BARS[k][3] >= BARS[k][0] ? "rgba(48,209,88,0.45)" : "rgba(255,69,58,0.45)";
        var vv = BARS[k][4] * clamp01(pr * 1.6);
        s += rect(x(k) - wB / 2, vy(vv), wB, L.vb - vy(vv), vc, 0.9);
      }
      var aGv = fade(T, TB[FLUSH][1], 0.3) * (1 - fade(T, 7.2, 0.3));
      if (aGv > 0) s += txt(x(2), vy(BARS[0][4]) - 6, "lighter than the open", C.dn, 11, "middle", 600, aGv);
      var aGo = fade(T, TB[GO][1], 0.3) * (1 - fade(T, 15.6, 0.3));
      if (aGo > 0) s += txt(x(GO) + wB, vy(BARS[GO][4]) + 10, BARS[GO][4] + "k", C.up, 12, "start", 700, aGo);
      if (T >= TB[PRESS][1] && T < 12.0) s += txt(x(PRESS), y(BARS[PRESS][2]) + 18 * FS, "can't stick", C.dim, 11, "middle", 600, fade(T, TB[PRESS][1], 0.3));

      /* entry and stop */
      var aE = fade(T, TB[GO][1], 0.4), xs = x(GO);
      if (aE > 0) {
        s += rect(xs, y(ENTRY), L.x1 - xs, y(STOP) - y(ENTRY), C.dn, 0.10 * aE);
        s += hl(xs, L.x1, y(ENTRY), C.ink, null, 1.8, aE);
        s += hl(x(FLUSH), L.x1, y(STOP), C.dn, null, 2, aE);
        s += tag(L.xTag, y(ENTRY) - (L.narrow ? 0 : 0), "Buy " + f2(ENTRY), C.ink, aE * (T >= 15.6 && T < 19.6 && !L.narrow ? 1 : T < 15.6 ? 1 : 0.9));
        s += tag(L.xTag, y(STOP), "Stop " + f2(STOP), C.dn, aE, "#000");
        s += '<circle cx="' + x(GO).toFixed(1) + '" cy="' + y(ENTRY).toFixed(1) + '" r="' + (9 * FS).toFixed(1) + '" fill="none" stroke="' + C.ink + '" stroke-width="2" opacity="' + aE.toFixed(3) + '"/>';
      }
      var aD = fade(T, TB[DIP][1], 0.3);
      if (aD > 0) s += '<circle cx="' + x(DIP).toFixed(1) + '" cy="' + y(BARS[DIP][2]).toFixed(1) + '" r="' + (7 * FS).toFixed(1) + '" fill="none" stroke="' + C.up + '" stroke-width="1.8" opacity="' + (aD * (1 - 0.6 * fade(T, 19.6, 0.4))).toFixed(3) + '"/>';
      /* the measured-move target */
      var aT = fade(T, 19.6, 0.4);
      if (aT > 0) {
        var tHit = T >= TB[TGX][1];
        s += hl(x(FLUSH), tHit ? x(TGX) : L.x1, y(TGT), C.gold, null, 2, aT);
        s += tag(L.xTag, y(TGT), (L.narrow ? "RVOL×ATR " : "RVOL × ATR ") + f2(TGT), C.gold, aT);
        if (!L.narrow) s += tag(L.xTag, y(PMH), "Premarket high " + f2(PMH), C.up, aT);
        s += '<line x1="' + x(FLUSH).toFixed(1) + '" x2="' + x(FLUSH).toFixed(1) + '" y1="' + y(LOD).toFixed(1) + '" y2="' + y(TGT).toFixed(1) + '" stroke="' + C.gold + '" stroke-width="1.4" stroke-dasharray="3 4" opacity="' + aT.toFixed(3) + '"/>';
        if (tHit) s += '<circle cx="' + x(TGX).toFixed(1) + '" cy="' + y(TGT).toFixed(1) + '" r="' + (9 * FS).toFixed(1) + '" fill="none" stroke="' + C.gold + '" stroke-width="2.2"/>';
        if (T >= TB[PMX][1]) s += '<circle cx="' + x(PMX).toFixed(1) + '" cy="' + y(PMH).toFixed(1) + '" r="' + (8 * FS).toFixed(1) + '" fill="none" stroke="' + C.up + '" stroke-width="2"/>';
      }

      /* the tape meter */
      var ti = Math.max(0, last), tv = TAPE[ti];
      if (last >= 0 && last < N) {
        var pr2 = clamp01((T - TB[ti][0]) / (TB[ti][1] - TB[ti][0])), prev = ti ? TAPE[ti - 1] : 0;
        tv = prev + (TAPE[ti] - prev) * pr2;
      }
      s += meter(T, L, tv, fade(T, 0.5, 0.4));

      /* one caption box at a time */
      var cx = L.cx, cy = L.cy;
      s += callout(cx, cy, ["Gap up 16% · opens " + f2(OPEN), "Premarket high " + f2(PMH) + " · key level " + f2(KEY)], C.blue, fade(T, 1.6, 0.4) * (1 - fade(T, 3.0, 0.3)));
      s += callout(cx, cy, ["The give: −" + f2(OPEN - LOD) + " in 3 minutes", "Avg volume " + Math.round(GIVEVOL) + "k vs " + BARS[0][4] + "k at the open", "Fast and light. Don't fight it."], C.dn, fade(T, TB[FLUSH][1], 0.3) * (1 - fade(T, 7.2, 0.3)));
      s += callout(cx, cy, ["Neutral: " + f2(BARS[R0][2]) + " to " + f2(RHI), "Pressed to " + f2(BARS[PRESS][2]) + ", can't stick it", "Wait for a distinct change"], C.dim, fade(T, TB[R1][1], 0.3) * (1 - fade(T, 12.0, 0.3)));
      s += callout(cx, cy, ["The go · " + clock(GO) + " · buy " + f2(ENTRY), "Stop " + f2(STOP) + ", under the low of day", "Risk " + f2(RISK) + " a share"], C.up, fade(T, TB[GO][1], 0.3) * (1 - fade(T, 15.6, 0.3)));
      s += callout(cx, cy, ["Dip to " + f2(BARS[DIP][2]) + " at VWAP, bought", "Then back through the open", "Be biggest here, not later"], C.ink, fade(T, TB[DIP][1], 0.3) * (1 - fade(T, 19.6, 0.3)));
      s += callout(cx, cy, ["Premarket high " + f2(PMH) + " = +" + R_PM.toFixed(1) + "R", "RVOL " + RVOL + " ÷ 2 × ATR " + f2(ATR) + " = " + f2(MOVE), "From the low: " + f2(TGT) + " = +" + R_TG.toFixed(1) + "R"], C.gold, fade(T, 19.9, 0.3));
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
      }, { threshold: 0.45 });
      io.observe(svg.parentNode || svg);
    }
    window.GGAnim = { _bars: BARS, _levels: { OPEN: OPEN, PMH: PMH, LOD: LOD, STOP: STOP, ENTRY: ENTRY, RISK: RISK, MOVE: MOVE, TGT: TGT, R_PM: R_PM, R_TG: R_TG, VWAP: VW } };   // exposed for testing
  })();

  /* =====================================================================
     2. Give or go: the same gap, two endings, on a loop
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-gg-two]");
    if (!root) return;
    var svgs = root.querySelectorAll("svg");
    if (svgs.length < 2) return;
    /* shared start: the gap and the give into the key level */
    var HEAD = [[23.70, 23.86, 23.62, 23.66], [23.66, 23.68, 23.42, 23.46], [23.46, 23.50, 23.22, 23.26], [23.26, 23.30, 23.04, 23.12]];
    var ENDS = [
      /* it keeps giving: no range, no turn, through the level and lower */
      [[23.12, 23.18, 22.94, 22.98], [22.98, 23.04, 22.80, 22.84], [22.84, 22.92, 22.74, 22.88], [22.88, 22.90, 22.66, 22.70],
       [22.70, 22.78, 22.58, 22.62], [22.62, 22.72, 22.56, 22.68], [22.68, 22.70, 22.48, 22.52], [22.52, 22.60, 22.44, 22.56],
       [22.56, 22.62, 22.40, 22.44], [22.44, 22.52, 22.38, 22.48]],
      /* it gives, holds and goes */
      [[23.12, 23.30, 23.10, 23.24], [23.24, 23.34, 23.14, 23.18], [23.18, 23.36, 23.10, 23.30], [23.30, 23.32, 23.07, 23.16],
       [23.16, 23.30, 23.14, 23.28], [23.28, 23.56, 23.26, 23.50], [23.50, 23.62, 23.42, 23.58], [23.58, 23.78, 23.54, 23.74],
       [23.74, 23.92, 23.70, 23.88], [23.88, 24.08, 23.84, 24.02]]
    ];
    var KEY = 23.00, LOD = 23.04, STOP = 23.03, ENTRY = 23.38, GOAT = HEAD.length + 5, PMIN = 22.30, PMAX = 24.20;
    var W = 560, H = 340, x0 = 22, x1 = 420, yt = 70, yb = 310, NB = HEAD.length + 10;
    var T = 0, LOOP = 9.5, raf = 0, lastNow = 0, on = false;

    function frame(T, which) {
      FS = svgs[0].clientWidth > 0 && svgs[0].clientWidth < 440 ? 1.45 : 1.15;
      var dx = (x1 - x0) / (NB - 0.5), wB = dx * 0.6, s = "";
      function x(i) { return x0 + dx * (i + 0.5); }
      function y(p) { return yb - (p - PMIN) / (PMAX - PMIN) * (yb - yt); }
      var bars = HEAD.concat(ENDS[which]), shown = Math.min(NB, Math.floor(T / 0.5) + 1), pr = (T % 0.5) / 0.5;
      if (REDUCED) { shown = NB; pr = 1; }
      var went = which === 1 && shown > GOAT;
      s += '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>';
      s += hl(x0, x1, y(KEY), C.gold, "5 4", 1.5, 0.85);
      s += tag(x1 + 6, y(KEY) + (which ? 12 : 0), "Key " + f2(KEY), C.gold, 1);
      if (which === 1 && shown > HEAD.length + 4) s += rect(x(HEAD.length) - dx / 2, y(23.36), dx * 5, y(23.07) - y(23.36), C.dim, 0.12, C.dim);
      if (went) {
        s += hl(x(GOAT), x1, y(ENTRY), C.ink, null, 1.6, 1);
        s += hl(x(3), x1, y(STOP), C.dn, null, 1.6, 1);
        s += tag(x1 + 6, y(ENTRY), "Buy", C.ink, 1);
        s += tag(x1 + 6, y(STOP) - 12, "Stop", C.dn, 1, "#000");
      }
      if (which === 0 && shown > HEAD.length + 1) s += txt(x(HEAD.length + 1), y(23.30), "no range, no turn", C.dim, 12, "middle", 600);
      for (var k = 0; k < shown; k++) s += candle(x(k), y, bars[k], k === shown - 1 ? pr : 1, wB, 1, which === 1 && k === GOAT && k < shown - 1 ? "#3ef08a" : null);
      if (went) s += '<circle cx="' + x(GOAT).toFixed(1) + '" cy="' + y(ENTRY).toFixed(1) + '" r="9" fill="none" stroke="' + C.ink + '" stroke-width="2"/>';
      var done = shown >= NB;
      var head = which ? "It gives, holds, then goes" : "It keeps on giving";
      var sub = which ? (went ? (done ? "Bought on the go, stop under the low of day." : "The go: buy it.") : "Waiting for the turn…")
                      : (done ? "No go, so no trade. Buying the give lost." : "Still giving. Nothing to buy.");
      s += txt(16, 26, head, which ? C.up : C.dn, 15, "start", 700);
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
     3. The RVOL × ATR target
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-gg-calc]");
    if (!root) return;
    var ins = {}, out = root.querySelector(".gg-out");
    root.querySelectorAll("input").forEach(function (el) { ins[el.name] = el; });
    function num(k) { var v = parseFloat(ins[k].value); return isFinite(v) ? v : NaN; }
    function run() {
      var atr = num("atr"), rvol = num("rvol"), low = num("low"), entry = num("entry");
      if (!(atr > 0 && rvol > 0 && low > 0 && entry > low)) { out.innerHTML = '<div class="row"><span>Enter an ATR, RVOL, the low of day and an entry above it.</span></div>'; return; }
      var mult = rvol / 2, move = mult * atr, tgt = low + move, stop = low - 0.01, risk = entry - stop, R = (tgt - entry) / risk;
      out.innerHTML =
        '<div class="row"><span>RVOL ' + rvol + ' &divide; 2</span><b>' + mult.toFixed(2) + ' ATR</b></div>' +
        '<div class="row"><span>&times; ATR ' + atr.toFixed(2) + '</span><b>' + move.toFixed(2) + '</b></div>' +
        '<div class="row"><span>From the low, ' + low.toFixed(2) + '</span><b>' + tgt.toFixed(2) + '</b></div>' +
        '<div class="row"><span>Risk: entry ' + entry.toFixed(2) + ' &minus; stop ' + stop.toFixed(2) + '</span><b>' + risk.toFixed(2) + '</b></div>' +
        '<div class="row tot"><span>Target in R</span><b>' + (R > 0 ? "+" : "") + R.toFixed(1) + 'R</b></div>';
    }
    root.addEventListener("input", run);
    run();
  })();

  /* =====================================================================
     4. The six steps as a stepper: one step at a time, with a small
        chart of the walkthrough's move and that step's leg lit up.
        Without the script the six steps simply show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-gg-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 6) return;
    var CL = [23.66, 23.46, 23.26, 23.12, 23.24, 23.18, 23.22, 23.30, 23.16, 23.28, 23.50, 23.56, 23.60, 23.74, 23.80, 23.92, 24.08, 24.02, 24.16, 24.30, 24.40, 24.52, 24.44, 24.36];
    var INFO = [
      { k: "The gap",         c: C.blue,  tag: "Prep · tape +2",   legs: [0, 0] },
      { k: "The give",        c: C.dn,    tag: "Wait · tape −8",   legs: [0, 3] },
      { k: "The range",       c: "#8e8e93", tag: "Wait · tape 0",  legs: [3, 9] },
      { k: "The go",          c: C.up,    tag: "Act · tape +8",    legs: [9, 10] },
      { k: "Fight for price", c: C.cyan,  tag: "Act · tape +6",    legs: [10, 13] },
      { k: "The targets",     c: C.gold,  tag: "Manage · tape +4", legs: [13, 23] }
    ];
    var cur = 0;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "The six steps");
    bar.innerHTML = '<span class="gs-line"><i></i></span>' + INFO.map(function (s, i) {
      return '<button type="button" role="tab" class="gs-step" data-i="' + i + '"><b>' + (i + 1) + "</b><span>" + s.k + "</span></button>";
    }).join("");
    var body = document.createElement("div"); body.className = "gs-body";
    var left = document.createElement("div"); left.className = "gs-left";
    var tag = document.createElement("p"); tag.className = "gs-tag";
    var nav = document.createElement("div"); nav.className = "gs-nav";
    nav.innerHTML = '<button type="button" class="pill gs-prev">&lsaquo; Back</button><button type="button" class="pill pill-buy gs-next"></button>';
    var fig = document.createElement("div"); fig.className = "gs-chart";
    fig.innerHTML = '<svg viewBox="0 0 560 280" role="img" aria-label="The walkthrough move with the current step highlighted"></svg>';
    left.appendChild(tag);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    function chart(k) {
      var W = 560, H = 280, pad = 24, mn = 22.95, mx = 24.62, n = CL.length, s = "";
      function x(i) { return pad + i * (W - pad * 2 - 70) / (n - 1); }
      function y(p) { return H - pad - (p - mn) / (mx - mn) * (H - pad * 2); }
      [[24.10, "Premarket high", "#8e8e93"], [23.70, "Open", C.blue], [23.00, "Key level", C.gold]].forEach(function (L) {
        s += '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + y(L[0]).toFixed(1) + '" y2="' + y(L[0]).toFixed(1) + '" stroke="' + L[2] + '" stroke-dasharray="4 5" opacity="0.55"/>';
        s += '<text x="' + (W - pad) + '" y="' + (y(L[0]) - 6).toFixed(1) + '" fill="' + L[2] + '" font-size="12" text-anchor="end" opacity="0.85">' + L[1] + "</text>";
      });
      s += '<polyline points="' + CL.map(function (v, i) { return x(i).toFixed(1) + "," + y(v).toFixed(1); }).join(" ") + '" fill="none" stroke="#3a3a3c" stroke-width="3" stroke-linejoin="round"/>';
      var st = INFO[k], pts = [];
      for (var i = st.legs[0]; i <= st.legs[1]; i++) pts.push(x(i).toFixed(1) + "," + y(CL[i]).toFixed(1));
      if (pts.length > 1) s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + st.c + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
      var e = st.legs[1];
      if (st.legs[1] - st.legs[0] <= 1) s += '<circle cx="' + x(e).toFixed(1) + '" cy="' + y(CL[e]).toFixed(1) + '" r="8" fill="none" stroke="' + st.c + '" stroke-width="2.4"/>';
      s += '<text x="' + pad + '" y="' + (H - 6) + '" fill="' + C.faint + '" font-size="11">Illustrative · the walkthrough above</text>';
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
      bar.querySelector(".gs-line i").style.width = (k / 5 * 100) + "%";
      root.style.setProperty("--gs", INFO[k].c);
      tag.textContent = "Step " + (k + 1) + " of 6 · " + INFO[k].tag;
      nav.querySelector(".gs-prev").disabled = k === 0;
      nav.querySelector(".gs-next").innerHTML = k < 5 ? "Next: " + INFO[k + 1].k + " &rsaquo;" : "Start over &rsaquo;";
      svg.innerHTML = chart(k);
      if (focus) bar.querySelectorAll(".gs-step")[k].focus();
    }
    bar.addEventListener("click", function (e) { var b = e.target.closest(".gs-step"); if (b) show(+b.getAttribute("data-i")); });
    bar.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" && cur < 5) { e.preventDefault(); show(cur + 1, true); }
      if (e.key === "ArrowLeft" && cur > 0) { e.preventDefault(); show(cur - 1, true); }
    });
    nav.querySelector(".gs-prev").addEventListener("click", function () { if (cur > 0) show(cur - 1); });
    nav.querySelector(".gs-next").addEventListener("click", function () { show(cur < 5 ? cur + 1 : 0); });
    show(0);
  })();
})();

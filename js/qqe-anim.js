/* =====================================================================
   qqe-anim.js — the animations on the QQE Mod page.

   1. [data-qqe-anim]  one buy trade on a 5-minute gold chart, start to
      finish, in six stages: price above the EMA 50 → the pullback turns
      the histogram red → it turns blue on a strong candle → enter at the
      next open, stop under the swing low → a 2R target, checked against
      the next resistance → the target fills.
   2. [data-qqe-steps] the six steps as a click-through stepper with a
      small chart of the same trade that changes with each step.
   3. [data-qqe-two]   the sell side on a loop: the same trade upside
      down, and the same sell skipped because support is too close.
   4. [data-qqe-calc]  the room check: entry, stop, the next level and
      the 2R target, with presets for the video's two skipped trades.
   5. [data-qqe-out]   the three times to stay out, each on a loop.

   The histogram is not drawn by hand. QQE() below is a line-for-line
   copy of the page's Pine code (RSI length 8, smoothing 5, everything
   else at its default), run on the made-up bars. Under 640px of drawing
   width the walkthrough redraws in a tall, narrow layout with larger
   text, like gg-anim.js. No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", qb: "#00c3ff", qr: "#ff0062", qg: "#707070", gold: "#f4b942", orange: "#ff9f0a", purple: "#bf5af2",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e" };
  var QCOL = { blue: C.qb, red: C.qr, gray: C.qg };
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
      '<rect x="' + (x - wBody / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + wBody.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1" fill="' + col + '"/></g>';
  }
  function tag(xTag, y, label, col, op, ink) {
    if (op <= 0) return "";
    var w = (label.length * 7 + 16) * FS, h = 20 * FS;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xTag.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="' + col + '"/>' +
      txt(xTag + 8 * FS, y + 4.5 * FS, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function ring(x, y, r, col, op, w) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2) + '"' + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function poly(pts, col, w, op, dash) {
    if (pts.length < 2 || (op != null && op <= 0)) return "";
    return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2) + '" stroke-linejoin="round" stroke-linecap="round"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function f2(v) { return v.toFixed(2); }
  function money(v) { return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  /* ---------------------------------------------------------------------
     The QQE MOD Pine, ported. ta.rsi and ta.ema seed with a simple
     average like Pine does; ta.cross is true in either direction.
     --------------------------------------------------------------------- */
  function sma(a, n) { return a.map(function (_, i) { if (i < n - 1) return NaN; var s = 0; for (var k = i - n + 1; k <= i; k++) s += a[k]; return s / n; }); }
  function ema(a, n) {
    var out = [], al = 2 / (n + 1), prev = NaN, seed = [];
    a.forEach(function (v) {
      if (isNaN(v)) { out.push(NaN); return; }
      if (isNaN(prev)) { seed.push(v); if (seed.length < n) { out.push(NaN); return; } prev = seed.reduce(function (x, y) { return x + y; }, 0) / n; out.push(prev); return; }
      prev = al * v + (1 - al) * prev; out.push(prev);
    });
    return out;
  }
  function rsi(src, n) {
    var out = [NaN], ag = NaN, al = NaN, g = [], l = [];
    for (var i = 1; i < src.length; i++) {
      var d = src[i] - src[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
      if (isNaN(ag)) {
        g.push(up); l.push(dn); if (g.length < n) { out.push(NaN); continue; }
        ag = g.reduce(function (a, b) { return a + b; }) / n; al = l.reduce(function (a, b) { return a + b; }) / n;
      } else { ag = (ag * (n - 1) + up) / n; al = (al * (n - 1) + dn) / n; }
      out.push(al === 0 ? 100 : ag === 0 ? 0 : 100 - 100 / (1 + ag / al));
    }
    return out;
  }
  function crossed(a, b, a1, b1) { return (a > b && a1 <= b1) || (a < b && a1 >= b1); }
  function calcQQE(src, len, sm, fac) {
    var r = rsi(src, len), s = ema(r, sm), atr = s.map(function (v, i) { return i ? Math.abs(s[i - 1] - v) : NaN; });
    var sa = ema(atr, len * 2 - 1), lb = [], sb = [], dir = [], tl = [];
    for (var i = 0; i < src.length; i++) {
      var d = sa[i] * fac, nS = s[i] + d, nL = s[i] - d, pl = i ? lb[i - 1] : NaN, ps = i ? sb[i - 1] : NaN, p1 = i ? s[i - 1] : NaN;
      lb[i] = (p1 > pl && s[i] > pl) ? Math.max(pl, nL) : nL;
      sb[i] = (p1 < ps && s[i] < ps) ? Math.min(ps, nS) : nS;
      var upX = i > 1 && crossed(s[i], sb[i - 1], s[i - 1], sb[i - 2]);
      var dnX = i > 1 && crossed(lb[i - 1], s[i], lb[i - 2], s[i - 1]);
      dir[i] = upX ? 1 : dnX ? -1 : (i ? dir[i - 1] : 0);
      tl[i] = dir[i] === 1 ? lb[i] : sb[i];
    }
    return { tl: tl, rsi: s };
  }
  function QQE(close) {
    var P = calcQQE(close, 8, 5, 3), S = calcQQE(close, 6, 5, 1.61), th = 3;
    var x = P.tl.map(function (v) { return v - 50; }), basis = sma(x, 50), col = [];
    for (var i = 0; i < close.length; i++) {
      if (isNaN(basis[i])) { col.push(null); continue; }
      var m = basis[i], v = 0; for (var k = i - 49; k <= i; k++) v += (x[k] - m) * (x[k] - m);
      var dev = 0.35 * Math.sqrt(v / 50), p = P.rsi[i] - 50, s = S.rsi[i] - 50;
      col.push(s > th && p > m + dev ? "blue" : s < -th && p < m - dev ? "red" : Math.abs(s) > th ? "gray" : null);
    }
    return { hist: S.rsi.map(function (v) { return v - 50; }), line: S.tl.map(function (v) { return v - 50; }), col: col };
  }

  /* ---------------------------------------------------------------------
     The trade: 5-minute bars, made up. The first 84 are warm-up for the
     EMA 50 and the indicator's 50-bar bands; the charts start at 84.
     --------------------------------------------------------------------- */
  var BARS = [
    [3980,3984.13,3978.4,3982.54],[3982.54,3984.73,3981.81,3983.45],[3983.45,3984.11,3979.08,3980.91],[3980.91,3982.46,3977.35,3979.29],[3979.29,3982.83,3978.3,3980.94],
    [3980.94,3981.4,3977.68,3979.24],[3979.24,3979.56,3977.75,3979.34],[3979.34,3981.72,3977.75,3980.05],[3980.05,3982.45,3978.52,3982.11],[3982.11,3984.36,3981.06,3983.61],
    [3983.61,3984.9,3981.67,3982.59],[3982.59,3985.67,3982.13,3984.05],[3984.05,3984.28,3983.02,3983.99],[3983.99,3985.36,3983.11,3984.51],[3984.51,3987.03,3983.75,3986.59],
    [3986.59,3987.1,3984.25,3985.2],[3985.2,3986.79,3983.28,3985.87],[3985.87,3989.27,3985.25,3988.09],[3988.09,3988.86,3984.96,3985.61],[3985.61,3986,3984.93,3985.65],
    [3985.65,3986.96,3984.04,3986.34],[3986.34,3988.96,3984.88,3987.46],[3987.46,3988.47,3984.14,3986.02],[3986.02,3986.54,3985.45,3986.08],[3986.08,3988.16,3985.29,3987.05],
    [3987.05,3989.96,3986.03,3989.45],[3989.45,3989.89,3986.01,3987.78],[3987.78,3988.82,3985.86,3987.12],[3987.12,3988.45,3985.67,3986.86],[3986.86,3989.41,3986.62,3988.68],
    [3988.68,3990.26,3988,3989.9],[3989.9,3993.4,3989.02,3992.2],[3992.2,3996.04,3990.23,3994.29],[3994.29,3994.83,3992.45,3994.55],[3994.55,3996.08,3991.08,3992.07],
    [3992.07,3992.75,3991.52,3991.96],[3991.96,3996.15,3991.76,3994.41],[3994.41,3997.28,3993.69,3995.98],[3995.98,3997.09,3994.76,3994.99],[3994.99,3995.57,3992.54,3994.09],
    [3994.09,3995.21,3992.98,3994.93],[3994.93,3997.44,3993.9,3996.54],[3996.54,3998.4,3994.44,3996.3],[3996.3,3997.68,3996.02,3997.28],[3997.28,3998.46,3996.13,3996.98],
    [3996.98,4000,3995.5,3998.6],[3998.6,4000.72,3998.25,3999.74],[3999.74,4000.17,3999.07,3999.76],[3999.76,4002.32,3998,4000.83],[4000.83,4003.29,4000.42,4002.83],
    [4002.83,4003.48,4001.43,4002.24],[4002.24,4003.07,4000.42,4002.77],[4002.77,4003.88,4001.21,4001.43],[4001.43,4001.78,4000.08,4001.04],[4001.04,4004.04,3999.62,4003.53],
    [4003.53,4003.76,4000.95,4002.48],[4002.48,4003.2,4000.87,4001.42],[4001.42,4005.22,4001.18,4003.73],[4003.73,4005.29,3999.91,4001.69],[4001.69,4003.69,4000.72,4001.89],
    [4001.89,4002.16,3999.04,4000.26],[4000.26,4001.59,3998.41,4000.92],[4000.92,4002.36,4000.11,4001.42],[4001.42,4002.14,4000.1,4001.78],[4001.78,4003.14,3999.7,4001.55],
    [4001.55,4004.1,4000.12,4003.48],[4003.48,4003.88,4001.37,4001.94],[4001.94,4003.26,4000.71,4002.68],[4002.68,4003.12,4000.43,4000.71],[4000.71,4001.63,3998.39,3998.72],
    [3998.72,4000.21,3996.89,3997.79],[3997.79,3998.47,3996.26,3997.66],[3997.66,3999.53,3995.87,3998.78],[3998.78,4000.23,3996.08,3997.26],[3997.26,3998.32,3995.97,3996.44],
    [3996.44,3999.83,3995.34,3998.12],[3998.12,3998.85,3997.25,3998.08],[3998.08,3999.23,3994.86,3996.08],[3996.08,3999.25,3994.6,3997.74],[3997.74,3998.94,3994.43,3996.24],
    [3996.24,3996.82,3994.32,3995.83],[3995.83,3998.71,3994.41,3998.5],[3998.5,3999.66,3996.51,3997.36],[3997.36,3999.02,3996.32,3996.64],[3996.64,4000.52,3996.28,3999.21],
    [3999.21,4003.23,3998.74,4001.87],[4001.87,4004.22,4001.55,4003.33],[4003.33,4005.65,4002.18,4004.03],[4004.03,4007.39,4002.81,4005.89],[4005.89,4009.5,4005.6,4008.29],
    [4008.29,4011.56,4007.62,4011.31],[4011.31,4013.38,4010.34,4013.16],[4013.16,4013.4,4010.86,4012.4],[4012.4,4012.61,4011.19,4011.84],[4011.84,4015.7,4011.6,4014.69],
    [4014.69,4016.72,4014.36,4016.31],[4016.31,4018.4,4015.82,4017.72],[4017.72,4018.86,4016.32,4018.16],[4018.16,4020.17,4017.06,4018.52],[4018.52,4019.58,4017.97,4018.91],
    [4018.91,4020.35,4018.13,4018.93],[4018.93,4019.21,4017.65,4018.01],[4018.01,4018.25,4017.21,4017.74],[4017.74,4018.62,4015.89,4017.58],[4017.58,4018.28,4014.83,4016.03],
    [4016.03,4016.78,4014.46,4015.56],[4015.56,4016.8,4014.88,4015.26],[4015.26,4016.56,4013.32,4014.34],[4014.34,4014.96,4012.39,4013.34],[4013.34,4014.5,4012.25,4013.17],
    [4013.17,4014.15,4011.78,4013.03],[4013.03,4013.34,4012.54,4012.98],[4012.98,4013.44,4011.87,4012.15],[4012.15,4012.64,4009.59,4010.63],[4010.63,4013.32,4010.13,4012.61],
    [4012.61,4015.01,4012.13,4014.33],[4014.33,4015.9,4013.64,4015.36],[4015.36,4017.17,4014.65,4016.93],[4016.93,4017.4,4015.46,4016.01],[4016.01,4016.37,4014.73,4015.06],
    [4015.06,4015.59,4014.01,4014.35],[4014.35,4015.53,4013.53,4014.73],[4014.73,4015.83,4014.1,4015.54],[4015.54,4021.94,4015.19,4021.54],[4021.54,4023.1,4021.18,4022.73],
    [4022.73,4025.14,4022.29,4024.87],[4024.87,4027.49,4024.54,4026.64],[4026.64,4028.87,4025.87,4028.59],[4028.59,4032.83,4027.86,4031.38],[4031.38,4035.15,4030.47,4033.71],
    [4033.71,4036.05,4032.6,4034.78],[4034.78,4035.78,4034.34,4035.37],[4035.37,4036.56,4033.51,4034.96],[4034.96,4037.56,4033.98,4037.06],[4037.06,4038.98,4036.49,4038.29],
    [4038.29,4041.15,4036.91,4039.92],[4039.92,4041.27,4039.4,4040.18],[4040.18,4041.68,4039.69,4040.28],[4040.28,4041.66,4039.4,4040.7],[4040.7,4044.73,4039.72,4043.65]
  ];
  var N = BARS.length, D0 = 84, PB = 106, SIG = 123, SWING = 121, HIT = 134;
  var CL = BARS.map(function (b) { return b[3]; }), E50 = ema(CL, 50), Q = QQE(CL);
  var ENTRY = BARS[SIG + 1][0], STOP = +(BARS[SWING][2] - 0.5).toFixed(2), RISK = +(ENTRY - STOP).toFixed(2), TGT = +(ENTRY + 2 * RISK).toFixed(2);
  var RES = 4046.00, ROOM = RES - ENTRY, ROOMR = ROOM / RISK, PRIORHI = BARS[100][1];
  var SB = BARS[SIG], SBODY = (SB[3] - SB[0]) / (SB[1] - SB[2]), AVGB = 0;
  for (var bi = SIG - 20; bi < SIG; bi++) AVGB += Math.abs(BARS[bi][3] - BARS[bi][0]);
  AVGB /= 20;
  var SBX = (SB[3] - SB[0]) / AVGB, SCLOSE = (SB[1] - SB[3]) / (SB[1] - SB[2]);
  /* the sell side is the same trade upside down: RSI flips to 100 − RSI, so blue becomes red */
  var MIR = 8040;
  var SBARS = BARS.map(function (b) { return [MIR - b[0], MIR - b[2], MIR - b[1], MIR - b[3]].map(function (v) { return +v.toFixed(2); }); });
  var SQ = QQE(SBARS.map(function (b) { return b[3]; })), SE50 = ema(SBARS.map(function (b) { return b[3]; }), 50);

  /* the price, the EMA 50 and the QQE Mod pane, shared by the walkthrough and the stepper */
  function drawQQE(s, q, x, k, qy, wB, h, op) {
    var c = q.col[k]; if (!c || h <= 0) return s;
    var v = q.hist[k] * h, y0 = qy(0), y1 = qy(v);
    return s + rect(x - wB / 2, Math.min(y0, y1), wB, Math.abs(y1 - y0), QCOL[c], op == null ? 1 : op);
  }

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-qqe-anim]");
    if (!root) return;
    var NARROW_BELOW = 640;
    var STAGES = [
      { at: 0,    title: "Above the EMA 50: buys only", text: "Gold on a 5-minute chart. Price is trading above the EMA 50 (orange), so only buy setups count. QQE Mod (below the chart) is blue: bullish momentum, both of its RSI calculations agree." },
      { at: 4.4,  title: "The pullback turns it red", text: "Price pulls back toward the EMA 50 but stays above it. The histogram goes gray, then red. Above the EMA, red isn't a sell. It's the setup: now wait for it to turn back to blue." },
      { at: 8.3,  title: "Red to blue, on a strong candle", text: "The histogram leaves red, and on this candle it turns blue. The candle is what makes it a trade: a long body (" + Math.round(SBODY * 100) + "% of its range, about " + SBX.toFixed(0) + "× the average body) that closes near its high and above the earlier " + f2(PRIORHI) + " high. Wait for it to close." },
      { at: 12.6, title: "Enter at the next open, stop under the swing low", text: "Once the signal candle closes, buy the open of the next candle: " + money(ENTRY) + ". The stop goes under the most recent swing low (" + money(BARS[SWING][2]) + "), at " + money(STOP) + ". That's " + f2(RISK) + " of risk. If that's more than your risk limit allows, skip the trade." },
      { at: 15.8, title: "A 2R target, with room to get there", text: "The target is twice the risk: " + money(ENTRY) + " + 2 × " + f2(RISK) + " = " + money(TGT) + ". Before buying, check the next resistance. Yesterday's high, " + money(RES) + ", is " + ROOMR.toFixed(1) + "R away, past the target. There's room, so the trade is on." },
      { at: 18.8, title: "The target fills", text: "Price never comes back to the stop. Eleven candles (55 minutes) later it trades through " + money(TGT) + ": +2R. QQE Mod stays blue the whole way. Not every signal works like this, which is why the stop and the room check matter." }
    ];
    var TB = [];
    for (var i = 0; i < N; i++) {
      if (i < D0) TB[i] = [-1, -0.5];
      else if (i < PB) TB[i] = [0.4 + (i - D0) * 0.17, 0.4 + (i - D0) * 0.17 + 0.15];
      else if (i <= 116) TB[i] = [4.7 + (i - PB) * 0.3, 4.7 + (i - PB) * 0.3 + 0.26];
      else if (i < SIG) TB[i] = [8.5 + (i - 117) * 0.32, 8.5 + (i - 117) * 0.32 + 0.28];
      else if (i === SIG) TB[i] = [10.8, 12.0];
      else TB[i] = [19.0 + (i - SIG - 1) * 0.34, 19.0 + (i - SIG - 1) * 0.34 + 0.3];
    }
    var END = TB[N - 1][1] + 1.6;

    function size(n) {
      return n ? { W: 440, H: 850, x0: 14, x1: 296, yt: 168, yb: 600, qt: 640, qb: 812, xTag: 302, cx: 14, cy: 14, first: 100, pmin: 4006, pmax: 4050 }
               : { W: 1180, H: 640, x0: 60, x1: 1000, yt: 104, yb: 400, qt: 438, qb: 598, xTag: 1008, xAx: 1172, cx: 60, cy: 16, first: D0, pmin: 3994, pmax: 4050 };
    }

    function frame(T, L) {
      var first = L.first, n = N - first;
      var dx = (L.x1 - L.x0) / (n - 0.5), wB = Math.max(2.2, dx * 0.62);
      function x(i) { return L.x0 + dx * (i - first + 0.5); }
      function y(p) { return L.yb - (p - L.pmin) / (L.pmax - L.pmin) * (L.yb - L.yt); }
      var qm = (L.qt + L.qb) / 2, qh = (L.qb - L.qt) / 2 - 6;
      function qy(v) { return qm - v / 50 * qh; }
      var s = "", k, p;
      for (p = Math.ceil(L.pmin / 10) * 10; p <= L.pmax; p += 10) s += hl(L.x0, L.x1, y(p), "rgba(255,255,255,0.05)", null, 1) + (L.narrow ? "" : txt(L.xAx, y(p) + 4, p.toLocaleString("en-US"), C.faint, 11, "end"));
      s += rect(L.x0 - 6, L.qt - 4, L.x1 - L.x0 + 12, L.qb - L.qt + 8, "#141416", 1);
      s += hl(L.x0, L.x1, qm, "rgba(255,255,255,0.35)", "2 4", 1);
      s += txt(L.x0 + 4, L.qt + 14 * FS, "QQE Mod · RSI 8, smoothing 5", C.faint, 11, "start", 600);
      s += txt(L.W - 8, L.H - 8, "Illustrative · gold, 5-minute bars", C.faint, 11, "end");
      var last = first - 1; for (k = first; k < N; k++) if (T >= TB[k][0]) last = k;

      /* the EMA 50 */
      var ep = [];
      for (k = first; k <= Math.max(first + 1, last); k++) ep.push(x(k).toFixed(1) + "," + y(E50[k]).toFixed(1));
      s += poly(ep, C.orange, 2.2, 0.95);
      var eTagOp = fade(T, 1.2, 0.4) * (1 - fade(T, 12.4, 0.3));
      if (eTagOp > 0 && last > first + 4) s += txt(x(Math.min(last, first + (L.narrow ? 6 : 10))), y(E50[Math.min(last, first + (L.narrow ? 6 : 10))]) + 20 * FS, "EMA 50", C.orange, 12, "middle", 700, eTagOp);

      /* candles and the histogram */
      var lp = [];
      for (k = first; k < N; k++) {
        var pr = clamp01((T - TB[k][0]) / (TB[k][1] - TB[k][0]));
        if (pr <= 0) continue;
        s += candle(x(k), y, BARS[k], pr, wB, 1, k === SIG && pr >= 1 ? "#3ef08a" : null);
        s = drawQQE(s, Q, x(k), k, qy, wB, clamp01(pr * 1.4), 0.95);
        lp.push(x(k).toFixed(1) + "," + qy(Q.line[k]).toFixed(1));
      }
      s += poly(lp, "#ffffff", 1.6, 0.85);

      /* stage 1: the red run, above the EMA */
      var aR = fade(T, 7.4, 0.4) * (1 - fade(T, 12.4, 0.3));
      if (aR > 0) s += txt(x(111), qy(-46) + (L.narrow ? 0 : 0), "red, still above the EMA", C.qr, 12, "middle", 700, aR);

      /* stage 2: the signal candle */
      var aS = fade(T, 12.0, 0.3);
      if (aS > 0) {
        s += ring(x(SIG), qy(Q.hist[SIG]) , 8 * FS, C.ink, aS * (1 - fade(T, 18.8, 0.4)));
        s += txt(x(SIG) + (L.narrow ? -8 : 0), qy(Q.hist[SIG]) - 14 * FS, "blue", C.qb, 12, L.narrow ? "end" : "middle", 700, aS * (1 - fade(T, 18.8, 0.4)));
        s += ring(x(SIG), y((SB[1] + SB[2]) / 2), 14 * FS, C.ink, aS * (1 - fade(T, 12.6, 0.3) * 0.6), 2);
      }
      /* stage 3: entry, stop, the swing low */
      var aE = fade(T, 12.8, 0.4), xs = x(SIG + 1), done = T >= TB[HIT][1], xEnd = done ? x(HIT) : L.x1;
      if (aE > 0) {
        s += rect(xs - wB / 2, y(ENTRY), xEnd - xs + wB / 2, y(STOP) - y(ENTRY), C.dn, 0.13 * aE);
        s += hl(xs - wB / 2, xEnd, y(ENTRY), C.ink, null, 1.8, aE);
        s += hl(xs - wB / 2, xEnd, y(STOP), C.dn, null, 2, aE);
        s += tag(L.xTag, y(ENTRY) - 9 * FS, "Buy " + f2(ENTRY), C.ink, aE);
        s += tag(L.xTag, y(STOP) + 10 * FS, "Stop " + f2(STOP), C.dn, aE, "#000");
        s += ring(x(SWING), y(BARS[SWING][2]), 7 * FS, C.dn, aE * (1 - fade(T, 18.8, 0.4)), 2.2);
        if (T < 19.0) s += '<circle cx="' + xs.toFixed(1) + '" cy="' + y(ENTRY).toFixed(1) + '" r="' + (4 * FS).toFixed(1) + '" fill="' + C.ink + '" opacity="' + aE.toFixed(3) + '"/>';
      }
      /* stage 4: the target and the next resistance */
      var aT = fade(T, 16.0, 0.4);
      if (aT > 0) {
        s += rect(xs - wB / 2, y(TGT), xEnd - xs + wB / 2, y(ENTRY) - y(TGT), C.up, 0.12 * aT);
        s += hl(xs - wB / 2, xEnd, y(TGT), C.up, null, 2, aT);
        s += tag(L.xTag, y(TGT), "2R " + f2(TGT), C.up, aT);
        s += hl(L.narrow ? L.x0 : x(D0 + 4), L.x1, y(RES), C.dim, "6 4", 1.4, aT);
        s += tag(L.xTag, y(RES) - 4 * FS, "Res " + f2(RES), "#8e8e93", aT);
        if (!L.narrow) s += txt(x(D0 + 4), y(RES) - 8, "Next resistance: yesterday's high", C.dim, 12, "start", 600, aT);
        /* the room, as a bracket on the right edge */
        var bx = L.x1 - 6, aRm = aT * (1 - fade(T, 18.8, 0.4));
        if (aRm > 0) {
          s += '<path d="M' + (bx - 6) + "," + y(ENTRY).toFixed(1) + " H" + bx + " V" + y(RES).toFixed(1) + " H" + (bx - 6) + '" fill="none" stroke="' + C.up + '" stroke-width="1.6" opacity="' + aRm.toFixed(3) + '"/>';
          s += txt(bx - 10, (y(ENTRY) + y(TGT)) / 2 + 4, "room " + ROOMR.toFixed(1) + "R ✓", C.up, 12, "end", 700, aRm);
        }
      }
      /* stage 5: the fill */
      var aH = fade(T, TB[HIT][1], 0.3);
      if (aH > 0) { s += ring(x(HIT), y(TGT), 9 * FS, C.up, aH, 2.4); s += txt(x(HIT), y(BARS[HIT][1]) - 16 * FS, "+2R", C.up, 13, "middle", 700, aH); }

      /* one caption box at a time */
      var cx = L.cx, cy = L.cy;
      s += callout(cx, cy, ["Price above the EMA 50", "Only buy setups count"], C.orange, fade(T, 1.0, 0.4) * (1 - fade(T, 4.4, 0.3)));
      s += callout(cx, cy, ["Pullback: QQE Mod turns red", "Still above the EMA 50, so wait"], C.qr, fade(T, 5.6, 0.3) * (1 - fade(T, 8.3, 0.3)));
      s += callout(cx, cy, ["Red → blue on a strong candle", "Body " + Math.round(SBODY * 100) + "% of the range, ~" + SBX.toFixed(0) + "× the average", "Closes near its high"], C.qb, fade(T, 11.4, 0.3) * (1 - fade(T, 12.6, 0.3)));
      s += callout(cx, cy, ["Buy the next open: " + money(ENTRY), "Stop under the swing low: " + money(STOP), "Risk " + f2(RISK)], C.ink, fade(T, 13.0, 0.3) * (1 - fade(T, 15.8, 0.3)));
      s += callout(cx, cy, ["Target 2R: " + money(TGT), "Next resistance " + money(RES) + " (" + ROOMR.toFixed(1) + "R)", "Room to the target ✓"], C.up, fade(T, 16.2, 0.3) * (1 - fade(T, 18.8, 0.3)));
      s += callout(cx, cy, ["Target filled: +2R", "11 candles, 55 minutes"], C.up, fade(T, TB[HIT][1] + 0.2, 0.3));
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
    chips.innerHTML = STAGES.map(function (s, i) { return '<button type="button" data-i="' + i + '">' + (i + 1) + ". " + s.title.replace(/[:,].*$/, "") + "</button>"; }).join("");
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
    window.QQEAnim = { _bars: BARS, _qqe: Q, _sell: SQ, _levels: { ENTRY: ENTRY, STOP: STOP, RISK: RISK, TGT: TGT, RES: RES, ROOMR: ROOMR, SBODY: SBODY, SBX: SBX, SCLOSE: SCLOSE } };   // exposed for testing
  })();

  /* =====================================================================
     2. The six steps as a stepper, with a small chart of the same trade
        that changes with each step. Without the script the steps show
        as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-qqe-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 6) return;
    var INFO = [
      { k: "The EMA 50",     c: C.orange, tag: "Filter · which side" },
      { k: "The color",      c: C.qb,     tag: "Trigger · red to blue" },
      { k: "The candle",     c: C.up,     tag: "Confirm · body and close" },
      { k: "The entry",      c: C.ink,    tag: "Act · next candle's open" },
      { k: "The stop",       c: C.dn,     tag: "Act · beyond the swing" },
      { k: "Target and room", c: C.gold,  tag: "Check · 2R before resistance" }
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
    fig.innerHTML = '<svg viewBox="0 0 560 360" role="img" aria-label="The walkthrough trade with the current step highlighted"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    function chart(k) {
      FS = 1;
      var W = 560, H = 360, x0 = 14, x1 = 470, first = 96, mn = 4004, mx = 4050, n = N - first, s = "";
      var dx = (x1 - x0) / (n - 0.5), wB = dx * 0.62;
      function x(i) { return x0 + dx * (i - first + 0.5); }
      function y(p) { return 236 - (p - mn) / (mx - mn) * 206; }
      function qy(v) { return 306 - v / 50 * 40; }
      var i, ep = [], lit;
      s += rect(x0 - 4, 262, x1 - x0 + 8, 88, "#1d1d1f", 1);
      s += hl(x0, x1, 306, "rgba(255,255,255,0.3)", "2 4", 1);
      for (i = first; i < N; i++) ep.push(x(i).toFixed(1) + "," + y(E50[i]).toFixed(1));
      s += poly(ep, C.orange, k === 0 ? 3 : 1.8, k === 0 ? 1 : 0.45);
      if (k === 0) s += txt(x(100), y(E50[100]) + 18, "EMA 50", C.orange, 12, "middle", 700) + txt(x(98), y(4041), "price above: buys only", C.orange, 12, "start", 700);
      for (i = first; i < N; i++) {
        lit = k === 0 ? i <= SIG : k === 1 ? false : k === 2 ? i === SIG : k === 3 ? i === SIG + 1 : k === 4 ? i >= SWING - 3 && i <= SIG : i > SIG;
        s += candle(x(i), y, BARS[i], 1, wB, lit ? 1 : 0.28, k === 2 && i === SIG ? "#3ef08a" : null);
        s = drawQQE(s, Q, x(i), i, qy, wB, 1, k === 1 ? (i >= 104 && i <= SIG ? 1 : 0.35) : 0.4);
      }
      if (k === 1) {
        s += ring(x(SIG), qy(Q.hist[SIG]), 8, C.ink, 1, 2) + txt(x(SIG) + 12, qy(Q.hist[SIG]) + 4, "blue", C.qb, 12, "start", 700);
        s += txt(x(112), qy(-40) + 4, "red", C.qr, 12, "middle", 700);
      }
      if (k === 2) {
        s += ring(x(SIG), y((SB[1] + SB[2]) / 2), 15, C.up, 1, 2.2);
        s += txt(x(SIG) - 20, y(SB[1]) - 22, "Long body, closes near the high", C.up, 12, "end", 700);
        s += txt(x(SIG) - 20, y(SB[1]) - 6, "~" + SBX.toFixed(0) + "× the average body", C.dim, 12, "end", 600);
      }
      if (k >= 3) {
        s += hl(x(SIG + 1) - wB, x1, y(ENTRY), C.ink, null, 1.6, k === 3 ? 1 : 0.6);
        s += txt(x1 + 4, y(ENTRY) + 4, f2(ENTRY), C.ink, 11, "start", 700, k === 3 ? 1 : 0.7);
        if (k === 3) { s += '<circle cx="' + x(SIG + 1).toFixed(1) + '" cy="' + y(ENTRY).toFixed(1) + '" r="5" fill="' + C.ink + '"/>'; s += txt(x(SIG + 1) + 8, y(ENTRY) + 18, "buy the open after the close", C.ink, 12, "start", 700); }
      }
      if (k >= 4) {
        s += rect(x(SIG + 1) - wB, y(ENTRY), x1 - x(SIG + 1) + wB, y(STOP) - y(ENTRY), C.dn, k === 4 ? 0.2 : 0.08);
        s += hl(x(SWING) - wB, x1, y(STOP), C.dn, null, 1.8, 1);
        s += txt(x1 + 4, y(STOP) + 4, f2(STOP), C.dn, 11, "start", 700);
        if (k === 4) { s += ring(x(SWING), y(BARS[SWING][2]), 7, C.dn, 1, 2.2); s += txt(x(SWING) - 10, y(STOP) + 18, "under the swing low · risk " + f2(RISK), C.dn, 12, "end", 700); }
      }
      if (k === 5) {
        s += rect(x(SIG + 1) - wB, y(TGT), x1 - x(SIG + 1) + wB, y(ENTRY) - y(TGT), C.up, 0.12);
        s += hl(x(SIG + 1) - wB, x1, y(TGT), C.up, null, 1.8, 1) + txt(x1 + 4, y(TGT) + 4, f2(TGT), C.up, 11, "start", 700);
        s += hl(x0, x1, y(RES), C.dim, "6 4", 1.4, 1) + txt(x1 + 4, y(RES) + 4, f2(RES), C.dim, 11, "start", 700);
        s += txt(x(98), y(RES) - 6, "next resistance, " + ROOMR.toFixed(1) + "R away: room ✓", C.dim, 12, "start", 600);
        s += ring(x(HIT), y(TGT), 8, C.up, 1, 2.2) + txt(x(HIT) + 6, y(TGT) + 24, "+2R", C.up, 12, "start", 700);
      }
      s += txt(x0 + 2, 344, "QQE Mod", C.faint, 11, "start", 600);
      s += txt(W - 6, H - 6, "Illustrative · the walkthrough above", C.faint, 11, "end");
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
      tg.textContent = "Step " + (k + 1) + " of 6 · " + INFO[k].tag;
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

  /* =====================================================================
     3. The sell side, on a loop: the walkthrough upside down (it works),
        and the same sell with support just under the entry (skipped).
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-qqe-two]");
    if (!root) return;
    var svgs = root.querySelectorAll("svg");
    if (svgs.length < 2) return;
    var SENTRY = SBARS[SIG + 1][0], SSTOP = +(SBARS[SWING][1] + 0.5).toFixed(2), SRISK = +(SSTOP - SENTRY).toFixed(2), STGT = +(SENTRY - 2 * SRISK).toFixed(2);
    var SUP0 = 4013.0, SUP1 = 4014.6;
    /* what the skipped trade did instead: down into support, then back up */
    var after = [4017.2, 4016.0, 4015.1, 4014.4, 4014.9, 4014.1, 4015.6, 4017.4, 4018.9, 4020.6, 4021.4, 4022.9, 4024.0, 4023.2, 4025.1, 4026.3];
    var SKIP = SBARS.slice(0, SIG + 1), pc = SBARS[SIG][3];
    after.forEach(function (c, j) { var o = pc; SKIP.push([o, +(Math.max(o, c) + 0.6 + (j % 3) * 0.2).toFixed(2), +Math.max(SUP0 - 0.3, Math.min(o, c) - 0.5 - (j % 2) * 0.3).toFixed(2), c]); pc = c; });
    var first = 98, W = 560, H = 360, x0 = 18, x1 = 452, NB = N - first;
    var T = 0, STEP = 0.2, LOOP = NB * STEP + 5, raf = 0, lastNow = 0, on = false;

    function frame(T, which) {
      FS = svgs[0].clientWidth > 0 && svgs[0].clientWidth < 440 ? 1.45 : 1.1;
      var B = which ? SKIP : SBARS, mn = 3997, mx = 4031, s = "";
      var dx = (x1 - x0) / (NB - 0.5), wB = dx * 0.62;
      function x(i) { return x0 + dx * (i - first + 0.5); }
      function y(p) { return 262 - (p - mn) / (mx - mn) * 176; }
      function qy(v) { return 312 - v / 50 * 34; }
      var shown = Math.min(NB, Math.floor(T / STEP) + 1), pr = (T % STEP) / STEP;
      if (REDUCED) { shown = NB; pr = 1; }
      var lastK = first + shown - 1, k, ep = [];
      s += '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>';
      s += hl(x0, x1, 312, "rgba(255,255,255,0.3)", "2 4", 1);
      if (which) {
        s += rect(x0, y(SUP1), x1 - x0, y(SUP0) - y(SUP1), C.up, 0.13);
        s += txt(x0 + 4, y(SUP0) + 14 * FS, "Support zone", C.up, 12, "start", 700);
      }
      for (k = first; k <= lastK; k++) ep.push(x(k).toFixed(1) + "," + y(SE50[k]).toFixed(1));
      s += poly(ep, C.orange, 2, 0.9);
      for (k = first; k <= lastK; k++) {
        var p = k === lastK ? pr : 1;
        s += candle(x(k), y, B[k], p, wB, 1, k === SIG && k < lastK ? "#ff6b61" : null);
        if (k <= SIG || !which) s = drawQQE(s, SQ, x(k), k, qy, wB, clamp01(p * 1.4), 0.95);
      }
      var hit = lastK > SIG;
      if (hit) {
        var xs = x(SIG + 1) - wB / 2;
        s += hl(xs, x1, y(SENTRY), C.ink, null, 1.6, 1) + hl(xs, x1, y(SSTOP), C.dn, null, 1.6, 1) + hl(xs, x1, y(STGT), which ? C.faint : C.up, which ? "4 3" : null, 1.6, 1);
        s += tag(x1 + 4, y(SENTRY), "Sell " + Math.round(SENTRY), C.ink, 1);
        s += tag(x1 + 4, y(SSTOP) - 6, "Stop", C.dn, 1, "#000");
        s += tag(x1 + 4, y(STGT), "2R", which ? "#8e8e93" : C.up, 1);
        s += ring(x(SIG), qy(SQ.hist[SIG]), 7, C.ink, 1, 1.8);
      }
      var done = shown >= NB;
      if (!which && lastK >= HIT) s += ring(x(HIT), y(STGT), 8, C.up, 1, 2.2);
      var sub = which ? (hit ? (done ? "Skipped: it bounced off support." : "Support sits between the entry and 2R.") : "Below the EMA 50, the same signal…")
                      : (hit ? (lastK >= HIT ? "2R target filled." : "Blue to red on a strong candle: sell.") : "Below the EMA 50: sells only…");
      s += txt(16, 26, which ? "Sell, skipped: support too close" : "Sell: the mirror image", which ? C.gold : C.dn, 15, "start", 700);
      s += txt(16, 26 + 22 * FS, sub, C.dim, 13, "start", done ? 600 : null);
      s += txt(W - 8, H - 8, "Illustrative · 5-minute", C.faint, 11, "end");
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
    window.QQEAnim = window.QQEAnim || {}; window.QQEAnim._sellLevels = { SENTRY: SENTRY, SSTOP: SSTOP, SRISK: SRISK, STGT: STGT };
  })();

  /* =====================================================================
     4. The room check: is the next level past the 2R target?
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-qqe-calc]");
    if (!root) return;
    var ins = {}, out = root.querySelector(".qqe-out"), bar = root.querySelector(".qqe-bar");
    root.querySelectorAll("input,select").forEach(function (el) { ins[el.name] = el; });
    var PRESETS = {
      walk:   { side: "buy",  entry: "4021.54", stop: "4013.03", level: "4046.00", r: "2" },
      res:    { side: "buy",  entry: "4021.54", stop: "4013.03", level: "4027.00", r: "2" },
      sup:    { side: "sell", entry: "4018.46", stop: "4026.97", level: "4014.60", r: "2" }
    };
    function num(k) { var v = parseFloat(ins[k].value); return isFinite(v) ? v : NaN; }
    function run() {
      var buy = ins.side.value === "buy", e = num("entry"), st = num("stop"), lv = num("level"), r = num("r");
      if (!(e > 0 && st > 0 && lv > 0 && r > 0) || (buy ? st >= e : st <= e) || (buy ? lv <= e : lv >= e)) {
        out.innerHTML = '<div class="row"><span>' + (buy ? "For a buy: stop under the entry, resistance above it." : "For a sell: stop above the entry, support below it.") + "</span></div>";
        bar.innerHTML = ""; return;
      }
      var risk = Math.abs(e - st), tgt = buy ? e + r * risk : e - r * risk, room = Math.abs(lv - e), roomR = room / risk, ok = roomR >= r;
      out.innerHTML =
        '<div class="row"><span>Risk: ' + e.toFixed(2) + " " + (buy ? "&minus;" : "to") + " " + st.toFixed(2) + "</span><b>" + risk.toFixed(2) + "</b></div>" +
        '<div class="row"><span>Target: ' + r + "R " + (buy ? "above" : "below") + " the entry</span><b>" + money(tgt) + "</b></div>" +
        '<div class="row"><span>Next ' + (buy ? "resistance" : "support") + "</span><b>" + money(lv) + "</b></div>" +
        '<div class="row"><span>Room before it</span><b>' + room.toFixed(2) + " (" + roomR.toFixed(1) + "R)</b></div>" +
        '<div class="row tot"><span>Verdict</span><b class="' + (ok ? "pos" : "neg") + '">' + (ok ? "Room to the target: take it" : "The level comes first: skip it") + "</b></div>";
      /* a bar from the entry out to the farther of the two */
      var far = Math.max(r, roomR) * 1.1, W = 560, x0 = 16, x1 = W - 16;
      function x(v) { return x0 + v / far * (x1 - x0); }
      FS = bar.clientWidth > 0 && bar.clientWidth < 420 ? 1.7 : 1;
      var t0 = 14 * FS, b0 = t0 + 12, bh = 18 * Math.min(FS, 1.4), b1 = b0 + bh, H = b1 + 14 + 14 * FS;
      bar.setAttribute("viewBox", "0 0 " + W + " " + H.toFixed(0));
      var s = rect(x0, b0, x(Math.min(roomR, r)) - x0, bh, ok ? C.up : C.gold, 0.85);
      if (!ok) s += rect(x(roomR), b0, x(r) - x(roomR), bh, C.dn, 0.35);
      s += '<line x1="' + x(roomR).toFixed(1) + '" x2="' + x(roomR).toFixed(1) + '" y1="' + (t0 + 4) + '" y2="' + (b1 + 8) + '" stroke="' + C.dim + '" stroke-width="2"/>';
      s += '<line x1="' + x(r).toFixed(1) + '" x2="' + x(r).toFixed(1) + '" y1="' + (b0 - 6) + '" y2="' + (b1 + 6) + '" stroke="' + C.up + '" stroke-width="2" stroke-dasharray="3 3"/>';
      s += txt(x0, H - 4, "entry", C.dim, 12, "start", 600);
      s += txt(x(r), H - 4, r + "R target", C.up, 12, roomR > r ? "middle" : "end", 700);
      s += txt(x(roomR), t0, (buy ? "resistance " : "support ") + roomR.toFixed(1) + "R", C.dim, 12, roomR > r * 0.6 ? "end" : "start", 700);
      bar.innerHTML = s;
    }
    root.addEventListener("input", run);
    root.addEventListener("change", run);
    root.querySelectorAll("[data-preset]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = PRESETS[b.getAttribute("data-preset")]; Object.keys(p).forEach(function (k) { ins[k].value = p[k]; });
        root.querySelectorAll("[data-preset]").forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        run();
      });
    });
    run();
  })();

  /* =====================================================================
     5. Three times to stay out, each on a loop
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-qqe-out]");
    if (!root) return;
    var svgs = root.querySelectorAll("svg");
    if (svgs.length < 3) return;
    var W = 360, H = 250, x0 = 12, x1 = 348, py0 = 34, py1 = 160, qm = 194;
    /* 1: price weaving through a flat EMA */
    var A = [], c = 100, k;
    for (k = 0; k < 30; k++) { var t = 100 + 3.4 * Math.sin(k * 0.55) + 0.6 * Math.sin(k * 1.7); A.push([c, Math.max(c, t) + 0.5, Math.min(c, t) - 0.5, t]); c = t; }
    var AH = A.map(function (_, i) { return 26 * Math.sin(i * 0.55 + 0.6); });
    /* 2: the colors flip back and forth, then one huge candle far from the EMA */
    var Bb = [], BH = [], BE = [];
    c = 100;
    for (k = 0; k < 30; k++) {
      var t2 = k < 22 ? 100.6 + 1.1 * Math.sin(k * 1.3) + (k % 4 === 0 ? 0.9 : 0) : k === 22 ? 107.6 : 107.6 + 0.4 * Math.sin(k);
      Bb.push([c, Math.max(c, t2) + 0.4, Math.min(c, t2) - 0.4, t2]); c = t2;
      BH.push(k < 22 ? 16 * Math.sin(k * 1.3 + 0.4) : 28); BE.push(100 + Math.max(0, k - 18) * 0.12);
    }
    /* 3: one candle still forming */
    var Cc = [[100, 100.8, 99.4, 100.4], [100.4, 101, 99.9, 100.2], [100.2, 100.6, 99.2, 99.6], [99.6, 100.4, 99.3, 100.1], [100.1, 100.9, 99.8, 100.6], [100.6, 101.1, 100.1, 100.3], [100.3, 100.8, 99.9, 100.5]];
    var T = 0, LOOP = 7, raf = 0, lastNow = 0, on = false;

    function base(s, title, sub, subCol) {
      return '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>' + s +
        hl(x0, x1, qm, "rgba(255,255,255,0.3)", "2 4", 1) + txt(x0, 20, title, C.ink, 13, "start", 700) + txt(x0, H - 10, sub, subCol || C.dim, 12, "start", 700);
    }
    function series(B, H2, E, mn, mx, shown, extra) {
      var n = B.length, dx = (x1 - x0) / (n - 0.5), wB = dx * 0.6, s = "", ep = [];
      function x(i) { return x0 + dx * (i + 0.5); }
      function y(p) { return py1 - (p - mn) / (mx - mn) * (py1 - py0); }
      for (var i = 0; i < shown; i++) ep.push(x(i).toFixed(1) + "," + y(E[i]).toFixed(1));
      s += poly(ep, C.orange, 2, 0.9);
      for (i = 0; i < shown; i++) {
        s += candle(x(i), y, B[i], 1, wB, 1);
        var v = H2[i], col = v > 8 ? C.qb : v < -8 ? C.qr : C.qg;
        s += rect(x(i) - wB / 2, Math.min(qm, qm - v), wB, Math.abs(v), col, 0.95);
      }
      return extra ? s + extra(x, y) : s;
    }
    function frame(T, which) {
      FS = svgs[0].clientWidth > 0 && svgs[0].clientWidth < 300 ? 1.3 : 1;
      var shown = REDUCED ? 30 : Math.min(30, Math.floor(T / 0.18) + 1), s;
      if (which === 0) {
        var E = A.map(function () { return 100; }), xs = 0;
        for (var i = 1; i < shown; i++) if ((A[i][3] - 100) * (A[i - 1][3] - 100) < 0) xs++;
        s = series(A, AH, E, 94.5, 105.5, shown);
        return base(s, "Price keeps crossing the EMA 50", shown >= 30 ? "Crossed " + xs + " times: sideways, stay out" : "Crossed " + xs + " times…", shown >= 30 ? C.gold : C.dim);
      }
      if (which === 1) {
        s = series(Bb, BH, BE, 97, 109.5, shown, function (x, y) {
          if (shown < 23) return "";
          return '<path d="M' + (x(22) + 9) + "," + y(BE[22]).toFixed(1) + " h5 V" + y(107.6).toFixed(1) + ' h-5" fill="none" stroke="' + C.gold + '" stroke-width="1.6"/>' +
            txt(x(22) - 10, (y(BE[22]) + y(107.6)) / 2, "far from", C.gold, 11, "end", 700) + txt(x(22) - 10, (y(BE[22]) + y(107.6)) / 2 + 13, "the EMA", C.gold, 11, "end", 700);
        });
        var flips = 0; for (i = 1; i < Math.min(shown, 22); i++) if ((BH[i] > 8) !== (BH[i - 1] > 8) && Math.abs(BH[i]) > 8) flips++;
        return base(s, "The colors keep flipping", shown >= 23 ? "No trend. And don't chase the big candle." : flips + " color changes, no trend…", shown >= 23 ? C.gold : C.dim);
      }
      /* the forming candle: blue mid-candle, gray at the close */
      var n = Cc.length + 1, dx = (x1 - x0) / (n + 1.5), wB = dx * 0.6, mn = 98.6, mx = 104.4;
      function x(i) { return x0 + dx * (i + 0.5); }
      function y(p) { return py1 - (p - mn) / (mx - mn) * (py1 - py0); }
      var ph = REDUCED ? 1 : clamp01(T / 5.4), up = ph < 0.55 ? ph / 0.55 : 1, back = ph < 0.55 ? 0 : (ph - 0.55) / 0.45;
      var hiP = 100.5 + 3.2 * up, cur = 100.5 + 3.2 * up - 3.0 * back;
      var live = [100.5, hiP, 100.1, cur];
      s = hl(x0, x(n - 1) + dx, y(100.2), C.orange, null, 2, 0.9);
      for (k = 0; k < Cc.length; k++) { s += candle(x(k), y, Cc[k], 1, wB, 1); s += rect(x(k) - wB / 2, qm - 6 - (k % 3) * 2, wB, 6 + (k % 3) * 2, C.qg, 0.9); }
      s += candle(x(Cc.length), y, live, 1, wB, 1, cur >= 100.5 ? C.up : C.dn);
      var hv = 4 + 30 * (cur - 100.5) / 3.2, colL = hv > 14 ? C.qb : C.qg;
      s += rect(x(Cc.length) - wB / 2, qm - Math.max(2, hv), wB, Math.max(2, hv), colL, 1);
      var secs = Math.max(0, Math.round(300 * (1 - ph))), mm = Math.floor(secs / 60), ss = secs % 60;
      s += txt(x1, 44, ph < 1 ? "closes in " + mm + ":" + (ss < 10 ? "0" : "") + ss : "closed", ph < 1 ? C.dim : C.ink, 12, "end", 700);
      if (ph < 1 && hv > 14) s += txt(x(Cc.length) + 12, qm - hv + 10, "blue… for now", C.qb, 11, "start", 700);
      return base(s, "The candle hasn't closed", ph >= 1 ? "At the close: a wick and gray. No signal." : "Don't enter yet…", ph >= 1 ? C.gold : C.dim);
    }
    function draw() { for (var i = 0; i < 3; i++) svgs[i].innerHTML = frame(T, i); }
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
})();

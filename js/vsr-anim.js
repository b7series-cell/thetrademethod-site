/* =====================================================================
   vsr-anim.js — animated walkthrough of a Volume S/R Rejection long.

   Plays one illustrative sequence through six stages:
   build the map → levels the volume earned (and a swing it didn't) →
   strength and the POC zone → the approach (a touch with sellers still
   in charge) → the rejection on the close → stop and target.

   Scripted data, labelled "Illustrative" on the chart. No market data.
   Buy/sell split per bar uses the indicator's estimate:
   buy = volume × (close − low) / (high − low).
   Mount: <section data-vsr-anim>…</section>
   ===================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-vsr-anim]");
  if (!root) return;
  var svg = root.querySelector("svg");
  var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
  var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay");
  var chips = root.querySelector(".anim-chips");
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- the sequence (illustrative) ---------- */
  var BARS = [ // o, h, l, c, relative volume
    [51.20, 51.28, 50.95, 51.00, 1.0], [51.00, 51.05, 50.70, 50.75, 1.0], [50.75, 50.82, 50.45, 50.50, 1.1], [50.50, 50.58, 50.22, 50.28, 1.2],
    [50.28, 50.35, 50.02, 50.10, 1.5], [50.10, 50.18, 49.95, 50.12, 2.4], [50.12, 50.45, 50.08, 50.40, 1.6], [50.40, 50.75, 50.35, 50.70, 1.2],
    [50.70, 51.10, 50.62, 51.02, 1.1], [51.02, 51.45, 50.95, 51.38, 1.2], [51.38, 51.80, 51.30, 51.72, 1.4], [51.72, 52.08, 51.66, 51.90, 2.1],
    [51.90, 51.95, 51.55, 51.60, 1.5], [51.60, 51.68, 51.25, 51.30, 1.0], [51.30, 51.42, 51.10, 51.38, 0.6], [51.38, 51.50, 51.30, 51.45, 0.4],
    [51.45, 51.48, 51.15, 51.20, 0.6], [51.20, 51.25, 50.90, 50.95, 0.9], [50.95, 51.02, 50.68, 50.72, 1.0], [50.72, 50.80, 50.45, 50.50, 1.1],
    [50.50, 50.58, 50.25, 50.30, 1.2], [50.30, 50.36, 50.04, 50.12, 1.4], [50.12, 50.47, 49.96, 50.40, 2.2], [50.40, 50.70, 50.35, 50.66, 1.4],
    [50.66, 50.95, 50.58, 50.90, 1.3], [50.90, 51.12, 50.82, 51.05, 1.2], [51.05, 51.20, 50.90, 50.98, 1.0], [50.98, 51.35, 50.95, 51.30, 1.2],
    [51.30, 51.62, 51.25, 51.55, 1.3], [51.55, 51.80, 51.48, 51.74, 1.2], [51.74, 51.95, 51.68, 51.80, 1.3]
  ];
  var SUP = 50.00, RES = 52.00, ATR = 1.00, SUP_SCORE = 78, RES_SCORE = 61;
  var SW_LO = 5, SW_HI = 11, SW_RAW = 15, TOUCH = 21, SIG = 22, HIT = 30;
  var ENTRY = BARS[SIG][3], STOP = 49.85, TARGET = 51.90, RISK = ENTRY - STOP;
  function buyShare(b) { return b[1] > b[2] ? (b[3] - b[2]) / (b[1] - b[2]) : 0.5; }
  function priorShare(i) {   // volume-weighted buy share of the 3 bars before i
    var bv = 0, tv = 0;
    for (var q = i - 3; q < i; q++) { bv += BARS[q][4] * buyShare(BARS[q]); tv += BARS[q][4]; }
    return bv / tv;
  }
  var SIG_BUY = buyShare(BARS[SIG]), SIG_PRIOR = priorShare(SIG), TOUCH_BUY = buyShare(BARS[TOUCH]);
  function pct(x) { return Math.round(x * 100) + "%"; }

  /* the rolling profile: 600 bars, most of them off screen (illustrative rows) */
  var PROF = [ // row low, volume (POC = 1), buy share
    [49.40, 0.22, 0.62], [49.60, 0.38, 0.64], [49.80, 0.70, 0.66], [50.00, 0.86, 0.63], [50.20, 0.52, 0.58], [50.40, 0.36, 0.52],
    [50.60, 0.30, 0.50], [50.80, 0.27, 0.48], [51.00, 0.30, 0.46], [51.20, 0.22, 0.45], [51.40, 0.18, 0.44], [51.60, 0.34, 0.40],
    [51.80, 0.68, 0.36], [52.00, 1.00, 0.34], [52.20, 0.48, 0.38], [52.40, 0.20, 0.40]
  ];
  var POC_ROW = 13, ROW = 0.20;

  /* ---------- timeline (seconds) ---------- */
  var STAGES = [
    { at: 0,    title: "Build the map", text: "The rolling profile stacks the last 600 bars' volume by price: teal is estimated buying, indigo is estimated selling. The longest row, the point of control, sits at " + RES.toFixed(2) + "." },
    { at: 5.5,  title: "Levels the volume earned", text: "The swing low at " + BARS[SW_LO][2].toFixed(2) + " and the swing high at " + BARS[SW_HI][1].toFixed(2) + " sit on heavy volume, so they become levels five bars later. The small swing at " + BARS[SW_RAW][1].toFixed(2) + " has almost nothing under it: no level." },
    { at: 11.5, title: "Strength and the POC zone", text: "Support scores " + SUP_SCORE + " (thick line, big rings); resistance scores " + RES_SCORE + ". The point of control sits right on resistance, the strongest zone on the chart, which makes it the target for any long from support." },
    { at: 16,   title: "The approach", text: "Price falls back to support on selling. One bar touches the level but closes red, with only " + pct(TOUCH_BUY) + " of its volume buying. A touch with sellers still in charge is not a trade." },
    { at: 20.5, title: "Rejection on the close", text: "The next bar dips to " + BARS[SIG][2].toFixed(2) + ", then closes back above support at " + ENTRY.toFixed(2) + ": green, with " + pct(SIG_BUY) + " buying, up " + Math.round((SIG_BUY - SIG_PRIOR) * 100) + " points on the prior three bars. BUY prints on the close, not before." },
    { at: 26,   title: "Stop and target", text: "Enter at " + ENTRY.toFixed(2) + ". Stop " + STOP.toFixed(2) + ", just past the break line (support minus 0.10 ATR). Target " + TARGET.toFixed(2) + ", just under the resistance and POC zone. Price gets there: +" + ((TARGET - ENTRY) / RISK).toFixed(2) + "R." }
  ];
  var END = 34.5;
  var TB = [];                                   // bar timing [start, end]
  for (var i = 0; i < BARS.length; i++) {
    if (i <= 19) TB[i] = [0.2 + i * 0.13, 0.2 + i * 0.13 + 0.2];
    else if (i === 20) TB[i] = [16.3, 17.3];
    else if (i === TOUCH) TB[i] = [17.5, 19.0];
    else if (i === SIG) TB[i] = [20.8, 24.0];
    else TB[i] = [26.6 + (i - 23) * 0.7, 26.6 + (i - 23) * 0.7 + 0.6];
  }

  /* ---------- geometry ---------- */
  var W = 1180, H = 500, YT = 46, YB = 356, PMIN = 49.40, PMAX = 52.60, VT = 392, VB = 478;
  var XP = 880, PW = 118, XTAG = 1012, XAX = 1172;
  function y(p) { return YB - (p - PMIN) / (PMAX - PMIN) * (YB - YT); }
  function x(i) { return 70 + i * 25; }
  var XEND = XP - 14;

  /* ---------- drawing helpers ---------- */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function txt(xx, yy, s, col, size, anchor, weight, op) {
    return '<text x="' + xx + '" y="' + yy + '" fill="' + col + '" font-size="' + (size || 13) + '" text-anchor="' + (anchor || "start") + '"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  function hline(x1, x2, p, col, dash, w, op) {
    return '<line x1="' + x1 + '" x2="' + x2 + '" y1="' + y(p).toFixed(1) + '" y2="' + y(p).toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function tag(p, label, col, op, dy, ink) {
    if (op <= 0) return "";
    var yy = y(p) + (dy || 0);
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + XTAG + '" y="' + (yy - 10) + '" width="122" height="20" rx="5" fill="' + col + '"/>' +
      txt(XTAG + 8, yy + 4.5, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function candle(xx, b, prog, wBody, op) {
    if (prog <= 0) return "";
    var o = b[0], h = b[1], l = b[2], c = b[3], up = c >= o;
    var path = up ? [o, l, h, c] : [o, h, l, c], seg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(seg)), f = seg - idx;
    var cur = prog >= 1 ? c : path[idx] + (path[idx + 1] - path[idx]) * f;
    var hi = o, lo = o;
    for (var q = 0; q <= idx; q++) { hi = Math.max(hi, path[q]); lo = Math.min(lo, path[q]); }
    hi = Math.max(hi, cur); lo = Math.min(lo, cur);
    var col = cur >= o ? "#30d158" : "#ff453a", top = y(Math.max(o, cur)), bh = Math.max(1.5, Math.abs(y(o) - y(cur)));
    return { svg: '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + xx + '" x2="' + xx + '" y1="' + y(hi).toFixed(1) + '" y2="' + y(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.5"/>' +
      '<rect x="' + (xx - wBody / 2) + '" y="' + top.toFixed(1) + '" width="' + wBody + '" height="' + bh.toFixed(1) + '" rx="2" fill="' + col + '"/></g>',
      bar: [o, hi, lo, cur] };
  }
  function callout(xx, yy, lines, col, op, anchorRight) {
    if (op <= 0) return "";
    var w = 14 + Math.max.apply(null, lines.map(function (s) { return s.length; })) * 7.1, h = 10 + lines.length * 17;
    var x0 = anchorRight ? xx - w : xx;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0.toFixed(0) + '" y="' + yy.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h + '" rx="8" fill="#2c2c2e" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, k) { s += txt((x0 + 10).toFixed(0), (yy + 20 + k * 17).toFixed(0), ln, k === 0 ? col : "#d1d1d6", 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  function rings(cx, p, n, col, op) {
    var s = "";
    for (var r = n; r >= 1; r--) {
      s += '<circle cx="' + cx + '" cy="' + y(p).toFixed(1) + '" r="' + (3 + r * 4) + '" fill="' + (r === 1 ? "#ffcd40" : col) + '" opacity="' +
        ((r === 1 ? 1 : [0, 0, 0.5, 0.32, 0.2][r]) * op).toFixed(3) + '"/>';
    }
    return s;
  }

  /* ---------- one frame ---------- */
  function frame(T) {
    var s = '<rect width="' + W + '" height="' + H + '" fill="#1d1d1f"/>';
    [49.5, 50, 50.5, 51, 51.5, 52, 52.5].forEach(function (p) {
      s += hline(56, XP - 6, p, "rgba(255,255,255,0.05)", null, 1) + txt(XAX, y(p) + 4, p.toFixed(2), "#6e6e73", 11, "end");
    });
    s += txt(60, 28, "Price · any intraday timeframe", "#86868b", 12);
    s += txt(XP, 28, "Rolling profile · 600 bars", "#86868b", 12);
    s += txt(60, VT - 10, "Estimated buy / sell volume, per bar", "#86868b", 12);
    s += '<line x1="56" x2="' + (XP - 6) + '" y1="' + VB + '" y2="' + VB + '" stroke="#3a3a3c"/>';
    s += txt(XAX, 494, "Illustrative", "#6e6e73", 11, "end");

    /* stage 1: the profile grows in */
    PROF.forEach(function (row, k) {
      var g = fade(T, 0.4 + k * 0.14, 0.8), w = PW * row[1] * g, bw = w * row[2];
      if (g <= 0) return;
      var yt = y(row[0] + ROW) + 1.5, yb = y(row[0]) - 1.5;
      s += '<rect x="' + XP + '" y="' + yt.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (yb - yt).toFixed(1) + '" fill="#2b9e8f"/>';
      s += '<rect x="' + (XP + bw).toFixed(1) + '" y="' + yt.toFixed(1) + '" width="' + (w - bw).toFixed(1) + '" height="' + (yb - yt).toFixed(1) + '" fill="#4a58b6"/>';
    });
    var a = fade(T, 3.2, 0.5);
    if (a > 0) {
      var pr = PROF[POC_ROW], pt = y(pr[0] + ROW) + 1.5, pb = y(pr[0]) - 1.5;
      s += '<rect x="' + XP + '" y="' + pt.toFixed(1) + '" width="' + PW + '" height="' + (pb - pt).toFixed(1) + '" fill="none" stroke="#ff9f0a" stroke-width="1.6" opacity="' + a.toFixed(3) + '"/>';
      s += txt(XP + PW, pt - 5, "POC", "#ff9f0a", 12, "end", 700, a);
    }
    s += callout(XP - 12, y(51.0), ["Point of control", "Most volume of the last", "600 bars, at " + RES.toFixed(2)], "#ff9f0a", a * (1 - fade(T, 5.5, 0.5)), true);

    /* stage 4: the POC zone across the chart */
    a = fade(T, 12.6, 0.6);
    if (a > 0) s += '<rect x="' + x(SW_HI + 5) + '" y="' + y(RES + 0.1).toFixed(1) + '" width="' + (XP - x(SW_HI + 5)) + '" height="' + (y(RES - 0.1) - y(RES + 0.1)).toFixed(1) + '" fill="#ff9f0a" opacity="' + (0.13 * a).toFixed(3) + '"/>';

    /* levels */
    var supA = fade(T, 6.8, 0.4), resA = fade(T, 8.6, 0.4);
    var supEnd = x(SW_LO + 5) + (XEND - x(SW_LO + 5)) * fade(T, 6.8, 1.0);
    var resEnd = x(SW_HI + 5) + (XEND - x(SW_HI + 5)) * fade(T, 8.6, 1.0);
    if (supA > 0) s += '<line x1="' + x(SW_LO + 5) + '" x2="' + supEnd.toFixed(1) + '" y1="' + y(SUP) + '" y2="' + y(SUP) + '" stroke="#30d158" stroke-width="4" opacity="' + supA.toFixed(3) + '"/>';
    if (resA > 0) s += '<line x1="' + x(SW_HI + 5) + '" x2="' + resEnd.toFixed(1) + '" y1="' + y(RES) + '" y2="' + y(RES) + '" stroke="#ff453a" stroke-width="2.5" opacity="' + (0.85 * resA).toFixed(3) + '"/>';
    s += rings(x(SW_LO + 5), SUP, 4, "#30d158", supA) + rings(x(SW_HI + 5), RES, 2, "#ff453a", resA);
    var sc = fade(T, 11.6, 0.4);
    s += txt(XEND - 2, y(SUP) - 10, String(SUP_SCORE), "#30d158", 13, "end", 700, sc);
    s += txt(XEND - 2, y(RES) - 10, String(RES_SCORE), "#ff453a", 13, "end", 700, sc);
    s += tag(SUP, "Support " + SUP.toFixed(2), "#30d158", supA, -7);
    s += tag(RES, "Resist. " + RES.toFixed(2), "#ff453a", resA, -8, "#fff");

    /* swing markers: raw pivot → confirmation five bars later */
    function swing(i, p, at, col, below) {
      var g = fade(T, at, 0.3) * (1 - fade(T, at + 4.6, 0.6));
      if (g <= 0) return "";
      var yy = y(p) + (below ? 12 : -12);
      return '<g opacity="' + g.toFixed(3) + '"><circle cx="' + x(i) + '" cy="' + yy.toFixed(1) + '" r="4" fill="' + col + '"/>' +
        '<path d="M ' + x(i) + ',' + yy.toFixed(1) + ' Q ' + x(i + 2.5) + ',' + (yy + (below ? 18 : -18)).toFixed(1) + ' ' + x(i + 5) + ',' + (y(p) + (below ? 4 : -4)).toFixed(1) +
        '" fill="none" stroke="' + col + '" stroke-width="1.2" stroke-dasharray="2 3"/></g>';
    }
    s += swing(SW_LO, BARS[SW_LO][2], 6.0, "#98989d", true) + swing(SW_HI, BARS[SW_HI][1], 7.8, "#98989d", false);
    s += callout(x(SW_LO + 5) + 20, y(SUP) + 14, ["Swing low on 2.4× volume", "Heavy node under it: a level", "(confirmed five bars later)"], "#30d158", fade(T, 6.8, 0.4) * (1 - fade(T, 11.4, 0.5)));
    /* the swing the volume didn't back */
    a = fade(T, 9.4, 0.3) * (1 - fade(T, 11.4, 0.5));
    if (a > 0) {
      var rx = x(SW_RAW), ry = y(BARS[SW_RAW][1]) - 14;
      s += '<g opacity="' + a.toFixed(3) + '"><circle cx="' + rx + '" cy="' + ry + '" r="4" fill="#98989d"/>' +
        '<path d="M ' + (rx + 6) + ',' + ry + ' H ' + (rx + 120) + '" stroke="#98989d" stroke-width="1.2" stroke-dasharray="3 4"/>' +
        txt(rx + 126, ry + 4, "✕", "#ff6961", 15, "start", 700) + "</g>";
      s += callout(rx - 40, YT + 2, ["Swing, no volume", "Thin rows under it: no level"], "#98989d", a);
    }
    a = fade(T, 11.8, 0.4) * (1 - fade(T, 15.6, 0.5));
    s += callout(XEND - 6, y(RES) + 16, ["Score " + RES_SCORE + " · thinner line", "Lighter volume at the swing"], "#ff453a", a, true);
    s += callout(x(SW_LO + 5) + 8, y(SUP) + 20, ["Score " + SUP_SCORE + " · thick line, big rings", "Heavy volume at the swing"], "#30d158", a);
    a = fade(T, 12.8, 0.4) * (1 - fade(T, 16.2, 0.5));
    s += callout(x(SW_HI + 6), y(RES) - 66, ["POC on resistance", "The strongest zone on the chart:", "the target for a long from support"], "#ff9f0a", a);

    /* candles + volume */
    var vMax = 2.6;
    function vy(v) { return VB - v / vMax * (VB - VT - 8); }
    var lastBar = null;
    BARS.forEach(function (b, j) {
      var p = clamp01((T - TB[j][0]) / (TB[j][1] - TB[j][0]));
      if (p <= 0) return;
      var after = j > HIT, cd = candle(x(j), b, p, 14, after ? 0.35 : 1);
      s += cd.svg;
      var cb = cd.bar, sh = cb[1] > cb[2] ? (cb[3] - cb[2]) / (cb[1] - cb[2]) : 0.5, v = b[4] * p, top = vy(v), bvy = VB - (VB - top) * sh;
      s += '<rect x="' + (x(j) - 8) + '" y="' + top.toFixed(1) + '" width="16" height="' + (bvy - top).toFixed(1) + '" fill="#fe3f00" opacity="' + (j < 20 ? 0.55 : 0.9) + '"/>';
      s += '<rect x="' + (x(j) - 8) + '" y="' + bvy.toFixed(1) + '" width="16" height="' + (VB - bvy).toFixed(1) + '" fill="#12cef8" opacity="' + (j < 20 ? 0.55 : 0.9) + '"/>';
      if (j >= 20 && j <= SIG) lastBar = { j: j, bar: cb, share: sh, closed: p >= 1 };
    });

    /* stage 4: the approach */
    a = fade(T, TB[TOUCH][1], 0.4) * (1 - fade(T, 20.6, 0.5));
    s += callout(x(TOUCH) - 20, y(SUP) + 40, ["Touch, but sellers in charge", "Red close, " + pct(TOUCH_BUY) + " buying: no trade"], "#ff6961", a, true);
    a = fade(T, 16.2, 0.4) * (1 - fade(T, 20.6, 0.5));
    if (a > 0) s += '<rect x="' + (x(SW_RAW + 4) - 10) + '" y="' + (VT - 2) + '" width="' + (x(TOUCH) - x(SW_RAW + 4) + 20) + '" height="' + (VB - VT + 4) + '" rx="6" fill="none" stroke="#fe3f00" stroke-width="1.2" stroke-dasharray="4 4" opacity="' + a.toFixed(3) + '"/>' +
      txt(x(TOUCH) + 16, VT + 16, "selling dominates the approach", "#fe3f00", 12, "start", 600, a);

    /* the current-candle table */
    a = fade(T, 16.2, 0.4);
    if (a > 0 && lastBar) {
      var live = !lastBar.closed, bs = lastBar.share, isSig = lastBar.j === SIG && lastBar.closed;
      var tx = 70, ty = 50, status = live ? "Watching levels" : isSig ? "BUY confirmed" : "Watching levels";
      s += '<g opacity="' + a.toFixed(3) + '"><rect x="' + tx + '" y="' + ty + '" width="230" height="92" rx="7" fill="#2c2c2e" stroke="' + (isSig ? "#30d158" : "#48484a") + '"/>' +
        txt(tx + 12, ty + 20, "Current candle · " + (live ? "LIVE" : "CLOSED"), live ? "#ff9f0a" : "#d1d1d6", 12, "start", 600) +
        txt(tx + 12, ty + 40, "Buy", "#12cef8", 12) + txt(tx + 218, ty + 40, pct(bs), "#12cef8", 12, "end", 600) +
        txt(tx + 12, ty + 58, "Sell", "#fe3f00", 12) + txt(tx + 218, ty + 58, pct(1 - bs), "#fe3f00", 12, "end", 600) +
        txt(tx + 12, ty + 78, "Status", "#a1a1a6", 12) + txt(tx + 218, ty + 78, status, isSig ? "#30d158" : "#d1d1d6", 12, "end", 600) + "</g>";
    }

    /* stage 5: the rejection on the close */
    a = fade(T, TB[SIG][1], 0.3);
    if (a > 0) {
      var bx = x(SIG), by = y(BARS[SIG][2]) + 12;
      s += '<g opacity="' + a.toFixed(3) + '"><path d="M ' + bx + ',' + by.toFixed(1) + ' l 7,9 h 22 v 24 h -58 v -24 h 22 z" fill="#30d158"/>' +
        txt(bx, by + 26, "BUY", "#000", 12, "middle", 800) + "</g>";
      var cl = fade(T, TB[SIG][1] + 0.2, 0.4) * (1 - fade(T, 27.2, 0.5));
      s += callout(bx + 24, y(BARS[SIG][1]) - 104, ["On the close, all four:",
        "✓ touched support (low " + BARS[SIG][2].toFixed(2) + ")", "✓ closed back above, green",
        "✓ " + pct(SIG_BUY) + " buying, +" + Math.round((SIG_BUY - SIG_PRIOR) * 100) + " pts vs prior 3"], "#30d158", cl);
    }
    a = fade(T, 21.4, 0.4) * (1 - fade(T, TB[SIG][1], 0.3));
    s += callout(x(SIG) + 22, y(BARS[SIG][1]) - 70, ["Still forming", "The live table can flip.", "Wait for the close."], "#ff9f0a", a);

    /* stage 6: entry, stop, target */
    var xe = x(SIG);
    a = fade(T, 26.1, 0.4);
    var lineEnd = Math.min(XEND, Math.max(xe + 40, x(Math.min(HIT, SIG + Math.max(0, Math.floor((T - 26.6) / 0.7) + 1)))));
    s += hline(xe, lineEnd, ENTRY, "#2997ff", null, 1.6, a) + tag(ENTRY, "Entry " + ENTRY.toFixed(2), "#2997ff", a, 0, "#fff");
    a = fade(T, 26.6, 0.4);
    s += hline(xe, lineEnd, STOP, "#ff453a", "5 4", 1.6, a) + tag(STOP, "Stop " + STOP.toFixed(2), "#ff453a", a, 9, "#fff");
    if (a > 0) s += '<rect x="' + (xe + 9) + '" y="' + y(ENTRY).toFixed(1) + '" width="7" height="' + (y(STOP) - y(ENTRY)).toFixed(1) + '" fill="#ff453a" opacity="' + (0.16 * a).toFixed(3) + '"/>';
    a = fade(T, 27.1, 0.4);
    s += hline(xe, XEND, TARGET, "#f5f5f7", "2 4", 1.4, a) + tag(TARGET, "Target " + TARGET.toFixed(2), "#f5f5f7", a, 10);
    a = fade(T, 27.4, 0.4) * (1 - fade(T, 30.5, 0.6));
    s += callout(xe + 56, y(STOP) + 18, ["Risk " + RISK.toFixed(2) + " · stop past the break line", "Support " + SUP.toFixed(2) + " − 0.10 ATR = " + (SUP - 0.1 * ATR).toFixed(2)], "#ff6961", a);
    a = fade(T, TB[HIT][1], 0.4);
    if (a > 0) {
      s += '<circle cx="' + x(HIT) + '" cy="' + y(TARGET).toFixed(1) + '" r="7" fill="none" stroke="#f5f5f7" stroke-width="2" opacity="' + a.toFixed(3) + '"/>';
      s += callout(x(HIT) - 14, y(RES + 0.1) - 54, ["Target hit · +" + ((TARGET - ENTRY) / RISK).toFixed(2) + "R", "Out just under the POC zone"], "#f5f5f7", a, true);
    }
    svg.innerHTML = s;
  }

  /* ---------- captions + controls ---------- */
  function stageAt(T) { var k = 0; STAGES.forEach(function (st, i) { if (T >= st.at) k = i; }); return k; }
  var shown = -1;
  function caption(T) {
    var k = stageAt(T);
    if (k === shown) return;
    shown = k;
    cap.n.textContent = (k + 1) + " / " + STAGES.length;
    cap.t.textContent = STAGES[k].title;
    cap.b.textContent = STAGES[k].text;
    chips.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-current", i === k ? "step" : "false"); });
  }
  chips.innerHTML = STAGES.map(function (st, i) { return '<button type="button" data-i="' + i + '">' + (i + 1) + ". " + st.title + "</button>"; }).join("");

  var T = END, playing = false, last = 0, raf = 0;
  var scroller = root.querySelector(".anim-scroll");
  function follow() {   // narrow screens: keep the action in view while it plays
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 2) return;
    var fx = T < 5.5 ? W : T < 11.5 ? x(SW_HI + 5) : T < 16 ? W : T < 26 ? x(SIG + 3) : x(HIT) + 30;
    scroller.scrollLeft = Math.max(0, fx / W * scroller.scrollWidth - scroller.clientWidth * 0.7);
  }
  function draw() { frame(T); caption(T); follow(); }
  function tick(now) {
    if (!playing) return;
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    T += dt;
    if (T >= END) { T = END; setPlaying(false); }
    draw();
    if (playing) raf = requestAnimationFrame(tick);
  }
  function setPlaying(on) {
    playing = on;
    btnPlay.textContent = on ? "Pause" : (T >= END ? "Play" : "Resume");
    btnPlay.setAttribute("aria-pressed", on ? "true" : "false");
    if (on) { last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
  }
  btnPlay.addEventListener("click", function () {
    if (playing) { setPlaying(false); return; }
    if (T >= END) T = 0;
    setPlaying(true);
  });
  btnReplay.addEventListener("click", function () { T = 0; draw(); setPlaying(true); });
  chips.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var k = +b.getAttribute("data-i");
    if (REDUCED) { T = k + 1 < STAGES.length ? STAGES[k + 1].at - 0.01 : END; draw(); return; }
    T = STAGES[k].at; draw(); setPlaying(true);
  });

  draw();   // at rest: the finished trade, fully annotated

  /* play once, from the top, the first time it scrolls into view */
  if (!REDUCED && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); T = 0; draw(); setPlaying(true); }
    }, { threshold: 0.5 });
    io.observe(svg);
  }
})();

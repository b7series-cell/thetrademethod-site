/* =====================================================================
   zl-anim.js — animated walkthrough of the Zero Lag Trend Pullback long.

   Six stages: two lines and a volume average → white crosses over green
   (a possible reversal, not a trade) → wait for a close between the lines
   (the pullback arms) → a close back over white on below-average volume
   (no trade, still armed) → a green candle closes over white on
   above-average volume (BUY 104.65) → stop on the green line (103.30),
   target 2R (107.35), the green line holds and the target fills.

   The bars, the two lines and the volume are scripted and labelled
   "Illustrative"; the levels follow the page's rules exactly. No market
   data.
   Mount: <section data-zl-anim>…</section>
   ===================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-zl-anim]");
  if (!root) return;
  var svg = root.querySelector("svg");
  var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
  var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay");
  var chips = root.querySelector(".anim-chips");
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COL = { fast: "#f5f5f7", slow: "#30d158", up: "#30d158", dn: "#ff453a", entry: "#2997ff", tp: "#30d158", sl: "#ff453a", gold: "#f4b942", grey: "#8e8e93" };

  /* ---------- the example: 5-minute closes (scripted), lines as smooth curves ---------- */
  var C = [102.6];
  function seg(a, b, n, curve) { for (var i = 1; i <= n; i++) { var f = i / n; C.push(a + (b - a) * (curve === "out" ? 1 - Math.pow(1 - f, 2) : curve === "in" ? f * f : f)); } }
  seg(102.6, 98.4, 12, "out");                  // 1-12   the downtrend leg
  seg(98.4, 98.9, 3);                           // 13-15  base
  seg(98.9, 105.8, 17, "out");                  // 16-32  the rally; white crosses over green
  C.push(105.5, 105.2, 104.9);                  // 33-35  stalls
  var PB0 = C.length; C.push(103.9, 103.65, 103.5, 103.8);   // 36-39 closes between the lines
  var LV = C.length; C.push(104.75);            // 40     over white, volume under its average
  C.push(104.05, 103.9);                        // 41-42  back between, still armed
  var SIG = C.length; C.push(104.65);           // 43     BUY
  seg(104.65, 103.62, 5, "out");                // 44-48  dips toward green
  seg(103.62, 107.7, 12, "in");                 // 49-60  the run
  C.push(107.5, 107.35, 107.45, 107.3);         // 61-64
  var N = C.length;
  function interp(keys, i) {
    for (var k = 0; k < keys.length - 1; k++) {
      var a = keys[k], b = keys[k + 1];
      if (i >= a[0] && i <= b[0]) { var f = (i - a[0]) / (b[0] - a[0]), s = (1 - Math.cos(Math.PI * f)) / 2; return a[1] + (b[1] - a[1]) * s; }
    }
    return keys[keys.length - 1][1];
  }
  var SK = [[0, 103.4], [10, 101.4], [18, 100.4], [26, 100.7], [34, 102.3], [43, 103.3], [52, 103.55], [64, 104.75]];
  var FK = [[0, 102.7], [8, 99.9], [14, 99.0], [20, 99.9], [26, 101.6], [33, 104.5], [38, 104.55], [43, 104.1], [48, 104.0], [56, 105.2], [64, 107.1]];
  var F = [], S = [];
  for (var i = 0; i < N; i++) { F.push(interp(FK, i)); S.push(interp(SK, i)); }
  var CROSS = 0; for (i = 1; i < N; i++) if (!CROSS && F[i] > S[i] && F[i - 1] <= S[i - 1]) CROSS = i;
  var ENTRY = C[SIG], SL = 103.30, R = ENTRY - SL, TP = ENTRY + 2 * R;

  var rng = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  var BARS = C.map(function (c, i) {
    var o = i ? C[i - 1] + (rng() - 0.5) * 0.16 : 102.85;
    var hi = Math.max(o, c) + 0.04 + rng() * 0.18, lo = Math.min(o, c) - 0.04 - rng() * 0.18;
    return [o, hi, lo, c];
  });
  BARS[PB0] = [104.85, 104.95, 103.82, 103.9];
  BARS[LV] = [103.85, 104.85, 103.78, 104.75];
  BARS[LV + 1] = [104.7, 104.78, 103.98, 104.05];
  BARS[LV + 2] = [104.02, 104.12, 103.8, 103.9];
  BARS[SIG] = [103.95, 104.75, 103.88, 104.65];
  for (i = SIG + 1; i <= SIG + 6; i++) BARS[i][2] = Math.max(BARS[i][2], 103.46);   // the dip holds above the stop
  BARS[SIG + 5][2] = 103.46;
  for (i = SIG + 1; i < N; i++) if (i < 59) BARS[i][1] = Math.min(BARS[i][1], TP - 0.08);
  var TPBAR = -1;
  for (i = SIG + 1; i < N; i++) if (TPBAR < 0 && BARS[i][1] >= TP) TPBAR = i;
  /* volume: heavy into the low and the rally, light on the pullback; average = 20 bars */
  var VOL = C.map(function (c, i) {
    var r = rng() * 0.25;
    return i <= 12 ? 1.3 + r : i <= 15 ? 0.95 + r : i <= 32 ? 1.4 + r * 1.6 : i < LV ? 0.62 + r * 0.5 : i === LV ? 0.74 : i < SIG ? 0.58 + r * 0.3 : i === SIG ? 1.9 : i <= SIG + 6 ? 0.68 + r * 0.4 : 1.15 + r * 1.2;
  });
  var VMA = VOL.map(function (v, i) { var s = 0; for (var k = i - 19; k <= i; k++) s += k < 0 ? 1.15 : VOL[k]; return s / 20; });
  function minute(i) { return 600 + 5 * i; }          // the clock starts at 10:00 ET
  function clock(m) { var h = Math.floor(m / 60) % 24, mm = m % 60; return (h > 12 ? h - 12 : h) + ":" + (mm < 10 ? "0" : "") + mm; }

  /* ---------- timeline ---------- */
  var STAGES = [
    { at: 0,    title: "Two lines and a volume average", text: "Zero-lag EMA 50 in white, zero-lag EMA 100 in green, and volume with its 20-bar average. White under green is a downtrend. Nothing to buy here." },
    { at: 5.0,  title: "White crosses over green", text: "The white line crosses above the green one: the downtrend may be over. It's a warning light, not an entry. A cross can just be a deep pullback, or the start of a range." },
    { at: 10.2, title: "Wait for a close between the lines", text: "Price pulls back and closes below the white line but above the green one. That's the pullback inside the new uptrend, and it arms the long side." },
    { at: 13.8, title: "Back over white: check the volume", text: "A green candle closes back above white, but its volume is under the 20-bar average. No trade. The pullback stays armed while price holds above green." },
    { at: 17.6, title: "The trigger", text: "A green candle closes back above white on volume well over its average: BUY at that close, " + ENTRY.toFixed(2) + "." },
    { at: 21.0, title: "Stop on green, target 2R", text: "The stop goes on the green line, " + SL.toFixed(2) + ". Risk " + R.toFixed(2) + ", so the 2R target is " + TP.toFixed(2) + ". In a real uptrend the green line holds as support, and here it does." }
  ];
  var TB = [];
  for (i = 0; i < N; i++) {
    if (i <= 15) TB[i] = [0.6 + i * 0.26, 0.6 + i * 0.26 + 0.28];
    else if (i <= 32) TB[i] = [5.2 + (i - 16) * 0.25, 5.2 + (i - 16) * 0.25 + 0.27];
    else if (i < LV) TB[i] = [10.4 + (i - 33) * 0.4, 10.4 + (i - 33) * 0.4 + 0.38];
    else if (i === LV) TB[i] = [14.0, 14.8];
    else if (i < SIG) TB[i] = [16.0 + (i - LV - 1) * 0.5, 16.0 + (i - LV - 1) * 0.5 + 0.45];
    else if (i === SIG) TB[i] = [17.8, 19.0];
    else TB[i] = [23.0 + (i - SIG - 1) * 0.32, 23.0 + (i - SIG - 1) * 0.32 + 0.3];
  }
  var END = TB[N - 1][1] + 1.6;

  /* ---------- geometry ---------- */
  var W = 1180, H = 520, YT = 44, YB = 366, PMIN = 97.4, PMAX = 108.6, VT = 392, VB = 470, VMAX = 2.3, XTAG = 1016, XAX = 1172, XEND = 1008;
  function y(p) { return YB - (p - PMIN) / (PMAX - PMIN) * (YB - YT); }
  function yv(v) { return VB - v / VMAX * (VB - VT); }
  function x(i) { return 66 + i * 14.6; }

  /* ---------- helpers ---------- */
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
  function tag(p, label, col, op, ink) {
    if (op <= 0) return "";
    var yy = y(p);
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + XTAG + '" y="' + (yy - 10) + '" width="124" height="20" rx="5" fill="' + col + '"/>' +
      txt(XTAG + 8, yy + 4.5, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function candle(xx, b, prog, wBody, op) {
    if (prog <= 0) return "";
    var o = b[0], h = b[1], l = b[2], c = b[3], up = c >= o;
    var pth = up ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
    var cur = prog >= 1 ? c : pth[idx] + (pth[idx + 1] - pth[idx]) * f;
    var hi = o, lo = o;
    for (var k = 0; k <= idx; k++) { hi = Math.max(hi, pth[k]); lo = Math.min(lo, pth[k]); }
    hi = Math.max(hi, cur); lo = Math.min(lo, cur);
    var col = cur >= o ? COL.up : COL.dn, top = y(Math.max(o, cur)), bh = Math.max(1.5, Math.abs(y(o) - y(cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + xx + '" x2="' + xx + '" y1="' + y(hi).toFixed(1) + '" y2="' + y(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.2"/>' +
      '<rect x="' + (xx - wBody / 2) + '" y="' + top.toFixed(1) + '" width="' + wBody + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }
  function callout(xx, yy, lines, col, op, anchorRight) {
    if (op <= 0) return "";
    var w = 14 + Math.max.apply(null, lines.map(function (s) { return s.length; })) * 7.1, h = 10 + lines.length * 17;
    var x0 = anchorRight ? xx - w : xx;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0.toFixed(0) + '" y="' + yy.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h + '" rx="8" fill="#2c2c2e" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, k) { s += txt((x0 + 10).toFixed(0), (yy + 20 + k * 17).toFixed(0), ln, k === 0 ? col : "#d1d1d6", 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  function line(arr, i0, i1, col, w, op) {
    if (i1 < i0) return "";
    var pts = [];
    for (var k = i0; k <= i1; k++) pts.push(x(k).toFixed(1) + "," + y(arr[k]).toFixed(1));
    return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round" opacity="' + op.toFixed(3) + '"/>';
  }
  /* the zone between the lines, green while white is over green, red while under */
  function zone(i0, i1, op) {
    if (i1 <= i0 || op <= 0) return "";
    var s = "", k = i0;
    while (k < i1) {
      var upz = F[k] > S[k], j = k;
      while (j < i1 && (F[j + 1] > S[j + 1]) === upz) j++;
      var top = [], bot = [];
      for (var q = k; q <= Math.min(j + 1, i1); q++) { top.push(x(q).toFixed(1) + "," + y(F[q]).toFixed(1)); bot.unshift(x(q).toFixed(1) + "," + y(S[q]).toFixed(1)); }
      s += '<polygon points="' + top.concat(bot).join(" ") + '" fill="' + (upz ? COL.up : COL.dn) + '" opacity="' + op.toFixed(3) + '"/>';
      k = j + 1;
    }
    return s;
  }

  /* ---------- one frame ---------- */
  function frame(T) {
    var s = '<rect width="' + W + '" height="' + H + '" fill="#1d1d1f"/>';
    for (var p = 98; p <= 108; p += 2) s += hline(56, XEND, p, "rgba(255,255,255,0.05)", null, 1) + txt(XAX, y(p) + 4, p.toFixed(2), "#6e6e73", 11, "end");
    s += '<line x1="56" x2="' + XEND + '" y1="' + VB + '" y2="' + VB + '" stroke="rgba(255,255,255,0.08)"/>';
    [0, 12, 24, 36, 48, 60].forEach(function (k) { s += txt(x(k), VB + 22, clock(minute(k)), "#6e6e73", 11, "middle"); });
    s += txt(60, 26, "5-minute bars", "#86868b", 12) + txt(60, VT - 6, "Volume · white = 20-bar average", "#86868b", 11);
    s += txt(XAX, 510, "Illustrative", "#6e6e73", 11, "end");

    var last = -1;
    for (var k = 0; k < N; k++) if (T >= TB[k][0]) last = k;
    var done = TPBAR >= 0 && T >= TB[TPBAR][1];
    var after = function (j) { return TPBAR >= 0 && j > TPBAR; };
    /* zone, lines */
    var zOp = 0.07 + 0.09 * fade(T, 10.2, 0.4) * (1 - fade(T, 13.8, 0.5));
    if (last >= 1) {
      s += zone(0, last, zOp);
      s += line(S, 0, last, COL.slow, 2.4, 1) + line(F, 0, last, COL.fast, 2.2, 1);
      if (last >= 10) s += txt(x(3), y(S[3]) - 10, "ZL 100", COL.slow, 12, "start", 600) + txt(x(9), y(F[9]) - 9, "ZL 50", COL.fast, 12, "start", 600);
    }
    /* volume and its average */
    for (k = 0; k <= last; k++) {
      var pr = clamp01((T - TB[k][0]) / (TB[k][1] - TB[k][0]));
      var vh = VOL[k] * pr, b = BARS[k], hl = k === SIG ? COL.gold : k === LV ? COL.grey : (b[3] >= b[0] ? COL.up : COL.dn);
      s += '<rect x="' + (x(k) - 4.5) + '" y="' + yv(vh).toFixed(1) + '" width="9" height="' + (VB - yv(vh)).toFixed(1) + '" rx="1" fill="' + hl + '" opacity="' + (k === SIG || k === LV ? 0.95 : after(k) ? 0.2 : 0.45) + '"/>';
    }
    if (last >= 1) {
      var vp = []; for (k = 0; k <= last; k++) vp.push(x(k).toFixed(1) + "," + yv(VMA[k]).toFixed(1));
      s += '<polyline points="' + vp.join(" ") + '" fill="none" stroke="#f5f5f7" stroke-width="1.4" opacity="0.85"/>';
    }
    BARS.forEach(function (bb, j) {
      var pr2 = clamp01((T - TB[j][0]) / (TB[j][1] - TB[j][0]));
      if (pr2 > 0) s += candle(x(j), bb, pr2, 9, after(j) ? 0.35 : 1);
    });

    /* stage 1 */
    s += callout(x(4), y(106.6), ["White under green: downtrend", "No longs. Wait."], "#d1d1d6", fade(T, 2.4, 0.4) * (1 - fade(T, 5.2, 0.4)));
    /* stage 2: the cross */
    var aX = fade(T, TB[CROSS][1], 0.3);
    if (aX > 0) {
      var cy = y((F[CROSS] + S[CROSS]) / 2);
      s += '<circle cx="' + x(CROSS) + '" cy="' + cy.toFixed(1) + '" r="10" fill="none" stroke="' + COL.gold + '" stroke-width="2" opacity="' + (aX * (1 - 0.6 * fade(T, 10.2, 0.5))).toFixed(3) + '"/>';
      s += callout(x(CROSS) + 18, y(99.4), ["White crosses over green", "Possible reversal. Not a trade."], COL.gold, aX * (1 - fade(T, 10.4, 0.4)));
    }
    /* stage 3: closes between the lines */
    for (k = PB0; k < LV; k++) {
      var a3 = fade(T, TB[k][1], 0.25);
      if (a3 > 0) s += '<circle cx="' + x(k) + '" cy="' + (y(BARS[k][2]) + 9).toFixed(1) + '" r="3.2" fill="' + COL.gold + '" opacity="' + (a3 * (1 - 0.6 * fade(T, 21, 0.5))).toFixed(3) + '"/>';
    }
    s += callout(x(PB0) - 10, y(101.6), ["Closed between white and green", "Pullback armed · long side"], COL.gold, fade(T, TB[PB0][1], 0.4) * (1 - fade(T, 13.8, 0.4)));
    /* stage 4: the low-volume reclaim */
    var aL = fade(T, TB[LV][1], 0.3);
    if (aL > 0) {
      s += '<circle cx="' + x(LV) + '" cy="' + (yv(VOL[LV]) - 8).toFixed(1) + '" r="3" fill="' + COL.grey + '" opacity="' + aL.toFixed(3) + '"/>';
      s += txt(x(LV), y(BARS[LV][1]) - 12, "no trade", COL.grey, 11.5, "middle", 600, aL * (1 - 0.5 * fade(T, 21, 0.5)));
      s += callout(x(PB0) - 10, y(101.6), ["Over white, but volume " + VOL[LV].toFixed(2) + " vs avg " + VMA[LV].toFixed(2), "Below average: no trade. Still armed."], COL.grey, aL * (1 - fade(T, 17.6, 0.4)));
    }
    /* stage 5: the trigger */
    var aS = fade(T, TB[SIG][1], 0.3), xe = x(SIG);
    if (aS > 0) {
      s += '<g opacity="' + aS.toFixed(3) + '"><path d="M' + xe + ' ' + (y(BARS[SIG][2]) + 10) + ' l-6 10 h12 z" fill="' + COL.up + '"/>' +
        txt(xe, y(BARS[SIG][2]) + 34, "BUY", COL.up, 12, "middle", 700) + "</g>";
      s += '<circle cx="' + xe + '" cy="' + (yv(VOL[SIG]) - 8).toFixed(1) + '" r="3.5" fill="' + COL.gold + '" opacity="' + aS.toFixed(3) + '"/>';
      s += callout(xe + 20, y(101.6), ["Green close over white · " + clock(minute(SIG)), "Volume " + (VOL[SIG] / VMA[SIG]).toFixed(1) + "× its average → BUY " + ENTRY.toFixed(2)], COL.up, aS * (1 - fade(T, 21.0, 0.4)));
    }
    var aE = fade(T, 19.2, 0.4);
    s += hline(xe, XEND, ENTRY, COL.entry, null, 1.6, aE) + tag(ENTRY, "Entry " + ENTRY.toFixed(2), COL.entry, aE, "#fff");
    /* stage 6: stop on green, target 2R */
    var aT = fade(T, 21.2, 0.4), aT2 = fade(T, 21.8, 0.4);
    s += hline(xe, XEND, SL, COL.sl, "5 4", 1.6, aT) + tag(SL, "Stop " + SL.toFixed(2), COL.sl, aT, "#fff");
    s += hline(xe, XEND, TP, COL.tp, "5 4", 1.6, aT2) + tag(TP, "Target " + TP.toFixed(2), COL.tp, aT2);
    if (aT > 0) {
      var bx = XEND - 26;
      s += '<g opacity="' + aT.toFixed(3) + '"><line x1="' + bx + '" x2="' + bx + '" y1="' + y(SL) + '" y2="' + y(ENTRY) + '" stroke="#f5f5f7" stroke-width="1.5"/>' +
        txt(bx - 8, y((SL + ENTRY) / 2) + 4, "1R = " + R.toFixed(2), "#f5f5f7", 12, "end", 600) + "</g>";
      s += '<g opacity="' + aT2.toFixed(3) + '"><line x1="' + bx + '" x2="' + bx + '" y1="' + y(ENTRY) + '" y2="' + y(TP) + '" stroke="' + COL.tp + '" stroke-width="1.5" stroke-dasharray="4 3"/>' +
        txt(bx - 8, y((ENTRY + TP) / 2) + 4, "2R", COL.tp, 12, "end", 600) + "</g>";
    }
    s += callout(xe + 20, y(101.9), ["Stop on the green line as it stood", "at entry. Below it, the trend is wrong."], COL.sl, fade(T, 21.4, 0.4) * (1 - fade(T, TB[SIG + 4][0], 0.4)));
    var hold = SIG + 5, aH = fade(T, TB[hold][1], 0.3);
    if (aH > 0) {
      s += '<circle cx="' + x(hold) + '" cy="' + y(BARS[hold][2]).toFixed(1) + '" r="8" fill="none" stroke="' + COL.slow + '" stroke-width="1.8" opacity="' + aH.toFixed(3) + '"/>';
      s += callout(x(hold) + 16, y(101.9), ["The green line holds", "Support in a real uptrend"], COL.slow, aH * (1 - fade(T, TB[Math.max(0, TPBAR)][0], 0.4)));
    }
    if (TPBAR >= 0) {
      var aP = fade(T, TB[TPBAR][1], 0.3);
      if (aP > 0) s += '<circle cx="' + x(TPBAR) + '" cy="' + y(TP).toFixed(1) + '" r="7" fill="none" stroke="' + COL.tp + '" stroke-width="2" opacity="' + aP.toFixed(3) + '"/>';
      s += callout(x(TPBAR) - 14, y(TP) - 62, ["Target hit · " + TP.toFixed(2), "+2R in " + ((TPBAR - SIG) * 5) + " minutes"], COL.tp, aP, true);
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

  var T = END, playing = false, lastNow = 0, raf = 0;
  var scroller = root.querySelector(".anim-scroll");
  function follow() {
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 2) return;
    var last = 0;
    for (var k = 0; k < N; k++) if (T >= TB[k][0]) last = k;
    var sw = scroller.scrollWidth, cw = scroller.clientWidth;
    if (T < 21.0) scroller.scrollLeft = Math.max(0, (x(last) + 110) / W * sw - cw * 0.8);
    else scroller.scrollLeft = (x(SIG) - 30) / W * sw;               // the entry, the levels and their tags
  }
  function draw() { frame(T); caption(T); follow(); }
  function tick(now) {
    if (!playing) return;
    var dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
    T += dt;
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
  btnPlay.addEventListener("click", function () { if (playing) { setPlaying(false); return; } if (T >= END) T = 0; setPlaying(true); });
  btnReplay.addEventListener("click", function () { T = 0; draw(); setPlaying(true); });
  chips.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var k = +b.getAttribute("data-i");
    if (REDUCED) { T = k + 1 < STAGES.length ? STAGES[k + 1].at - 0.01 : END; draw(); return; }
    T = STAGES[k].at; draw(); setPlaying(true);
  });

  draw();
  if (!REDUCED && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); T = 0; draw(); setPlaying(true); }
    }, { threshold: 0.5 });
    io.observe(svg.parentNode || svg);
  }
})();

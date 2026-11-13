/* =====================================================================
   vp-anim.js — animated walkthrough of the Volume Profile System.

   Six stages, following the page: build yesterday's profile (PC, VAH,
   VAL) → carry it into today, where yesterday's close above the value area
   puts the PC bounce in play → the PC bounce long → the value area
   reversal, shown aside (it needs a close inside, so it isn't in play
   today) → the value area breakout long → a fixed 2R on both.

   The prices are scripted and labelled "Illustrative". No market data.
   Mount: <section data-vp-anim>…</section>
   ===================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-vp-anim]");
  if (!root) return;
  var svg = root.querySelector("svg");
  var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
  var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay");
  var chips = root.querySelector(".anim-chips");
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- the example ---------- */
  var PC = 100.80, VAH = 102.20, VAL = 99.60, TK = 0.01, RR = 2;
  var COL = { pc: "#ff453a", va: "#2997ff", tp: "#30d158", sl: "#ff453a", entry: "#f5f5f7" };
  var rng = (function () { var s = 21; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  function bars(path, noise) {
    var out = [], prev = path[0];
    path.forEach(function (c, i) {
      var o = i ? prev + (rng() - 0.5) * noise : c - 0.1;
      out.push([o, Math.max(o, c) + 0.04 + rng() * noise, Math.min(o, c) - 0.04 - rng() * noise, c]); prev = c;
    });
    return out;
  }
  function seg(arr, a, b, n, curve) { for (var i = 1; i <= n; i++) { var f = i / n; arr.push(a + (b - a) * (curve === "out" ? 1 - Math.pow(1 - f, 2) : curve === "in" ? f * f : f)); } }

  /* yesterday: chop around the PC, then a late push above the value area */
  var yp = [100.5];
  [101.6, 100.2, 101.3, 99.9, 101.0, 100.4, 101.9, 100.7, 99.8, 100.9, 101.5, 100.6].forEach(function (t, i) { seg(yp, yp[yp.length - 1], t, 3); });
  seg(yp, yp[yp.length - 1], 102.9, 4, "in");
  var Y = bars(yp, 0.18), NY = Y.length;

  /* today: drift down to the PC, bounce, break out above the value area, pull back, break the high */
  var tp = [103.1];
  seg(tp, 103.1, 101.45, 9, "out");                    // 1-9
  tp.push(101.05, 101.12);                              // 10-11: the touch, then the rejection close
  var TOUCH = 11;
  seg(tp, 101.12, 101.95, 6);                           // 12-17
  seg(tp, 101.95, 102.6, 4);                            // 18-21
  var BRK = tp.length; tp.push(102.62); tp.push(103.3);  // 22 the breakout bar, 23 the peak
  seg(tp, 103.3, 102.66, 4, "out");                     // 24-27 the pullback
  tp.push(102.8, 103.0, 103.2);                         // 28-30
  var BOS = tp.length; tp.push(103.55);                 // 31 the break of structure
  seg(tp, 103.55, 105.8, 13, "out");                    // 32-44
  var D = bars(tp, 0.12), ND = D.length;
  D[TOUCH] = [100.98, 101.16, PC - 0.01, 101.12];        // long lower wick through the PC, closes above it
  D[TOUCH - 1] = [101.40, 101.45, 101.00, 101.05];
  D[BRK] = [102.45, 102.95, 102.40, 102.62];             // closes above VAH, reaches 25% of the VA width past it
  D[BRK + 1] = [102.62, 103.42, 102.55, 103.30];          // the peak
  for (var k = BRK + 2; k <= BRK + 5; k++) D[k][2] = Math.max(D[k][2], 102.50);
  D[BRK + 5][2] = 102.48;                                 // the pullback low, within 15% of VAH
  D[BOS] = [103.22, 103.62, 103.15, 103.55];              // closes above the peak
  for (k = TOUCH + 1; k < BRK; k++) D[k][2] = Math.max(D[k][2], PC + 0.05);
  var E1 = D[TOUCH][3], S1 = PC - 2 * TK, R1 = E1 - S1, T1 = E1 + RR * R1;
  var PB = 102.48, E2 = D[BOS][3], S2 = Math.min(PB, D[BOS][2]) - 2 * TK, R2 = E2 - S2, T2 = E2 + RR * R2;
  var HIT1 = -1, HIT2 = -1;
  for (k = TOUCH + 1; k < ND; k++) if (HIT1 < 0 && D[k][1] >= T1) HIT1 = k;
  for (k = BOS + 1; k < ND; k++) if (HIT2 < 0 && D[k][1] >= T2) HIT2 = k;
  if (HIT2 < 0) { D[ND - 1][1] = T2 + 0.05; HIT2 = ND - 1; }

  /* the profile (illustrative): heaviest at the PC, 70% between VAL and VAH */
  var ROWS = [];
  for (var p = 98.6; p < 103.5; p += 0.2) {
    var mid = p + 0.1, d = (mid - PC) / 1.05, v = Math.exp(-d * d / 2) * (mid > VAH ? 0.55 : 1) + 0.05;
    ROWS.push([p, p + 0.2, v]);
  }
  var VMAX = Math.max.apply(null, ROWS.map(function (r) { return r[2]; }));

  /* ---------- timeline ---------- */
  var STAGES = [
    { at: 0,    title: "Build yesterday's profile", text: "Volume by price across the whole previous session. The longest row is the point of control, " + PC.toFixed(2) + "; the value area, " + VAL.toFixed(2) + " to " + VAH.toFixed(2) + ", holds 70% of the volume." },
    { at: 5.4,  title: "Carry the levels into today", text: "Yesterday's profile is finished, so its levels hold still. Yesterday closed above the value area: the PC bounce is in play today and the value area reversal isn't." },
    { at: 8.0,  title: "Setup 1: the PC bounce", text: "Price drifts back to the PC. One bar wicks through it and closes back above with a long rejection wick: long " + E1.toFixed(2) + ", stop two ticks under the PC at " + S1.toFixed(2) + ", target 2R at " + T1.toFixed(2) + "." },
    { at: 15.0, title: "Setup 2: the value area reversal", text: "Not in play today: it needs yesterday to close inside the value area. On those days, a close outside the value area followed by a full candle closing back inside is the entry, stop past the extreme." },
    { at: 19.0, title: "Setup 3: the value area breakout", text: "A close above VAH that reaches a quarter of the value area's width past it, a pullback that holds near VAH, then a close above the breakout's high: long " + E2.toFixed(2) + ", stop under the pullback at " + S2.toFixed(2) + "." },
    { at: 28.2, title: "Fixed 2R, every setup", text: "Two different setups off the same profile, the same session, each with its own stop and the same 2R target. Both reached it here; plenty of days, one or both stop out." }
  ];
  var TY = [], TD = [];
  for (k = 0; k < NY; k++) TY[k] = [0.3 + k * 0.085, 0.3 + k * 0.085 + 0.12];
  for (k = 0; k < ND; k++) {
    if (k <= TOUCH) TD[k] = [8.2 + k * 0.3, 8.2 + k * 0.3 + 0.26];
    else if (k <= TOUCH + 6) TD[k] = [12.6 + (k - TOUCH - 1) * 0.3, 12.6 + (k - TOUCH - 1) * 0.3 + 0.26];
    else if (k <= BOS) TD[k] = [19.2 + (k - TOUCH - 7) * 0.32, 19.2 + (k - TOUCH - 7) * 0.32 + 0.28];
    else TD[k] = [24.6 + (k - BOS - 1) * 0.28, 24.6 + (k - BOS - 1) * 0.28 + 0.24];
  }
  var END = 31.2;

  /* ---------- geometry ---------- */
  var W = 1180, H = 500, YT = 44, YB = 430, PMIN = 98.2, PMAX = 106.4, XTAG = 1012, XAX = 1172, XEND = 990, XDAY = 455;
  function y(pp) { return YB - (pp - PMIN) / (PMAX - PMIN) * (YB - YT); }
  function xy(i) { return 70 + i * (XDAY - 90) / NY; }
  function xd(i) { return XDAY + 22 + i * (XEND - XDAY - 40) / ND; }

  /* ---------- helpers ---------- */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function txt(xx, yy, s, col, size, anchor, weight, op) {
    return '<text x="' + xx + '" y="' + yy + '" fill="' + col + '" font-size="' + (size || 13) + '" text-anchor="' + (anchor || "start") + '"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  function hline(x1, x2, pp, col, dash, w, op) {
    return '<line x1="' + x1 + '" x2="' + x2 + '" y1="' + y(pp).toFixed(1) + '" y2="' + y(pp).toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function tag(pp, label, col, op, dy, ink) {
    if (op <= 0) return "";
    var yy = y(pp) + (dy || 0);
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + XTAG + '" y="' + (yy - 10) + '" width="122" height="20" rx="5" fill="' + col + '"/>' +
      txt(XTAG + 8, yy + 4.5, label, ink || "#000", 12, "start", 600) + "</g>";
  }
  function candle(xx, b, prog, wBody, op, yf) {
    if (prog <= 0) return "";
    yf = yf || y;
    var o = b[0], h = b[1], l = b[2], c = b[3], up = c >= o;
    var pth = up ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
    var cur = prog >= 1 ? c : pth[idx] + (pth[idx + 1] - pth[idx]) * f;
    var hi = o, lo = o;
    for (var q = 0; q <= idx; q++) { hi = Math.max(hi, pth[q]); lo = Math.min(lo, pth[q]); }
    hi = Math.max(hi, cur); lo = Math.min(lo, cur);
    var col = cur >= o ? "#30d158" : "#ff453a", top = yf(Math.max(o, cur)), bh = Math.max(1.5, Math.abs(yf(o) - yf(cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + xx + '" x2="' + xx + '" y1="' + yf(hi).toFixed(1) + '" y2="' + yf(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.2"/>' +
      '<rect x="' + (xx - wBody / 2) + '" y="' + top.toFixed(1) + '" width="' + wBody + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }
  function callout(xx, yy, lines, col, op, anchorRight) {
    if (op <= 0) return "";
    var w = 14 + Math.max.apply(null, lines.map(function (s) { return s.length; })) * 7.1, h = 10 + lines.length * 17;
    var x0 = anchorRight ? xx - w : xx;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0.toFixed(0) + '" y="' + yy.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h + '" rx="8" fill="#2c2c2e" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, q) { s += txt((x0 + 10).toFixed(0), (yy + 20 + q * 17).toFixed(0), ln, q === 0 ? col : "#d1d1d6", 13, "start", q === 0 ? 600 : null); });
    return s + "</g>";
  }
  function arrowUp(xx, yy, col, label, op) {
    if (op <= 0) return "";
    return '<g opacity="' + op.toFixed(3) + '"><path d="M' + xx + " " + yy + ' l-6 10 h12 z" fill="' + col + '"/>' + txt(xx, yy + 24, label, col, 12, "middle", 700) + "</g>";
  }

  /* ---------- stage 4: the value area reversal, aside ---------- */
  function revInset(T) {
    var op = fade(T, 15.1, 0.4) * (1 - fade(T, 18.6, 0.5));
    if (op <= 0) return "";
    var X0 = 80, X1 = 440, Y0 = 70, Y1 = 330;
    function yi(pp) { return Y1 - 40 - (pp - 98.8) / (103 - 98.8) * (Y1 - Y0 - 90); }
    var pts = [[100.4, 100.6, 99.9, 100.0], [100.0, 100.2, 99.3, 99.4], [99.4, 99.5, 98.9, 99.1], [99.1, 99.9, 99.0, 99.8], [99.8, 100.5, 99.7, 100.4]];
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + X0 + '" y="' + Y0 + '" width="' + (X1 - X0) + '" height="' + (Y1 - Y0) + '" rx="14" fill="#161617" stroke="#3a3a3c"/>';
    s += txt(X0 + 18, Y0 + 26, "On a day that closed inside the value area", "#86868b", 12);
    s += '<rect x="' + (X0 + 18) + '" y="' + yi(102.2) + '" width="' + (X1 - X0 - 36) + '" height="' + (yi(99.6) - yi(102.2)) + '" fill="#2997ff" opacity="0.08"/>';
    s += '<line x1="' + (X0 + 18) + '" x2="' + (X1 - 18) + '" y1="' + yi(99.6) + '" y2="' + yi(99.6) + '" stroke="#2997ff" stroke-dasharray="5 4"/>' + txt(X1 - 22, yi(99.6) - 6, "VAL", "#2997ff", 11, "end", 600);
    var shown = Math.min(pts.length, Math.floor(clamp01((T - 15.4) / 1.6) * pts.length) + 1);
    for (var i = 0; i < shown; i++) s += candle(X0 + 70 + i * 40, pts[i], 1, 14, 1, yi);
    var a = fade(T, 17.1, 0.3);
    s += txt(X0 + 150, yi(98.9) + 22, "closes outside", "#ff6961", 12, "middle", 600, fade(T, 16.2, 0.3)) +
      txt(X0 + 230, yi(100.6) - 10, "a full candle back inside: entry", COL.tp, 12, "middle", 600, a);
    return s + "</g>";
  }

  /* ---------- one frame ---------- */
  function frame(T) {
    var s = '<rect width="' + W + '" height="' + H + '" fill="#1d1d1f"/>';
    for (var pp = 99; pp <= 106; pp += 1) s += hline(56, XEND, pp, "rgba(255,255,255,0.05)", null, 1) + txt(XAX, y(pp) + 4, pp.toFixed(2), "#6e6e73", 11, "end");
    s += '<line x1="' + XDAY + '" x2="' + XDAY + '" y1="' + YT + '" y2="' + YB + '" stroke="#3a3a3c" stroke-dasharray="3 4"/>';
    s += txt(70, 30, "Yesterday · the profile session", "#86868b", 12) + txt(XDAY + 22, 30, "Today", "#86868b", 12, "start", null, fade(T, 5.4, 0.4));
    s += txt(XAX, 488, "Illustrative", "#6e6e73", 11, "end");

    /* yesterday's bars, dimmed once today starts */
    var dimY = 1 - 0.55 * fade(T, 8.0, 0.6);
    Y.forEach(function (b, i) { var pr = clamp01((T - TY[i][0]) / (TY[i][1] - TY[i][0])); if (pr > 0) s += candle(xy(i), b, pr, 6, dimY); });

    /* the profile, growing leftward from the session's end */
    var gp = clamp01((T - 2.6) / 1.8), pw = 230;
    if (gp > 0) ROWS.forEach(function (r) {
      var inPc = PC >= r[0] && PC < r[1], inVa = r[0] >= VAL - 1e-9 && r[1] <= VAH + 1e-9, w = pw * r[2] / VMAX * gp;
      s += '<rect x="' + (XDAY - 6 - w).toFixed(1) + '" y="' + y(r[1]).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(1, y(r[0]) - y(r[1]) - 1.5).toFixed(1) +
        '" fill="' + (inPc ? "rgba(255,69,58,0.55)" : inVa ? "rgba(41,151,255,0.30)" : "rgba(142,142,147,0.22)") + '" opacity="' + dimY.toFixed(3) + '"/>';
    });

    /* the levels: drawn on yesterday, then carried across today */
    var aL = fade(T, 4.6, 0.4), ext = clamp01((T - 5.6) / 1.0), xr = XDAY + (XEND - XDAY) * ext;
    s += hline(70, Math.max(XDAY, xr), PC, COL.pc, null, 2, aL) + hline(70, Math.max(XDAY, xr), VAH, COL.va, "6 4", 1.5, aL) + hline(70, Math.max(XDAY, xr), VAL, COL.va, "6 4", 1.5, aL);
    s += tag(PC, "PC " + PC.toFixed(2), COL.pc, aL, 0, "#fff") + tag(VAH, "VAH " + VAH.toFixed(2), COL.va, aL, 0, "#fff") + tag(VAL, "VAL " + VAL.toFixed(2), COL.va, aL, 0, "#fff");
    var aC = fade(T, 6.0, 0.4) * (1 - fade(T, 8.6, 0.5));
    if (aC > 0) s += '<circle cx="' + xy(NY - 1) + '" cy="' + y(Y[NY - 1][3]).toFixed(1) + '" r="8" fill="none" stroke="#f5f5f7" stroke-width="1.6" opacity="' + aC.toFixed(3) + '"/>';
    s += callout(XDAY + 30, y(105.9), ["Closed above the value area", "PC bounce in play · VA reversal off"], "#f5f5f7", aC);

    /* today's bars */
    D.forEach(function (b, i) {
      var pr = clamp01((T - TD[i][0]) / (TD[i][1] - TD[i][0]));
      if (pr > 0) s += candle(xd(i), b, pr, 7, (i > HIT2 + 1) ? 0.4 : 1);
    });

    /* setup 1 · the PC bounce */
    var a1 = fade(T, TD[TOUCH][1], 0.3);
    if (a1 > 0) {
      s += '<circle cx="' + xd(TOUCH) + '" cy="' + y(PC).toFixed(1) + '" r="8" fill="none" stroke="#f5f5f7" stroke-width="1.6" opacity="' + (a1 * (1 - fade(T, 15, 0.5))).toFixed(3) + '"/>';
      s += arrowUp(xd(TOUCH), y(D[TOUCH][2]) + 12, COL.tp, "PC", a1);
      var t1end = xd(HIT1 >= 0 ? HIT1 : TOUCH + 6);
      s += hline(xd(TOUCH), t1end, E1, COL.entry, null, 1.4, a1) + hline(xd(TOUCH), t1end, S1, COL.sl, "4 3", 1.6, a1) + hline(xd(TOUCH), t1end, T1, COL.tp, "4 3", 1.6, a1);
      s += callout(xd(TOUCH) + 16, y(99.5) - 4, ["PC bounce: long " + E1.toFixed(2), "Stop " + S1.toFixed(2) + " · 2R target " + T1.toFixed(2)], COL.tp, a1 * (1 - fade(T, 15.0, 0.5)));
    }
    if (HIT1 >= 0) {
      var h1 = fade(T, TD[HIT1][1], 0.3);
      if (h1 > 0) s += '<circle cx="' + xd(HIT1) + '" cy="' + y(T1).toFixed(1) + '" r="6" fill="none" stroke="' + COL.tp + '" stroke-width="2" opacity="' + h1.toFixed(3) + '"/>' + txt(xd(HIT1), y(T1) - 12, "+2R", COL.tp, 12, "middle", 700, h1);
    }

    /* setup 3 · the breakout */
    var ab = fade(T, TD[BRK][1], 0.3) * (1 - fade(T, 27.0, 0.5));
    if (ab > 0) {
      s += '<line x1="' + xd(BRK) + '" x2="' + xd(BRK) + '" y1="' + y(VAH) + '" y2="' + y(VAH + 0.25 * (VAH - VAL)) + '" stroke="#ffd60a" stroke-width="2" opacity="' + ab.toFixed(3) + '"/>' +
        txt(xd(BRK) - 8, y(VAH + 0.32) , "25% of the VA width", "#ffd60a", 12, "end", 600, ab);
    }
    var ap = fade(T, TD[BRK + 5][1], 0.3) * (1 - fade(T, 27.0, 0.5));
    s += txt(xd(BRK + 5), y(PB) + 26, "pullback holds near VAH", "#d1d1d6", 12, "middle", 600, ap);
    var a3 = fade(T, TD[BOS][1], 0.3);
    if (a3 > 0) {
      s += hline(xd(BRK + 1) - 6, xd(BOS) + 6, D[BRK + 1][1], "#f5f5f7", "2 3", 1.2, a3 * (1 - fade(T, 27.0, 0.5)));
      s += arrowUp(xd(BOS), y(D[BOS][2]) + 12, COL.tp, "BRK", a3);
      var t2end = xd(HIT2);
      s += hline(xd(BOS), t2end, E2, COL.entry, null, 1.4, a3) + hline(xd(BOS), t2end, S2, COL.sl, "4 3", 1.6, a3) + hline(xd(BOS), t2end, T2, COL.tp, "4 3", 1.6, a3);
      s += callout(xd(BOS) - 18, y(105.95), ["Break of structure: long " + E2.toFixed(2), "Stop " + S2.toFixed(2) + " · 2R target " + T2.toFixed(2)], COL.tp, a3 * (1 - fade(T, 27.6, 0.5)), true);
    }
    var h2 = fade(T, TD[HIT2][1], 0.3);
    if (h2 > 0) s += '<circle cx="' + xd(HIT2) + '" cy="' + y(T2).toFixed(1) + '" r="6" fill="none" stroke="' + COL.tp + '" stroke-width="2" opacity="' + h2.toFixed(3) + '"/>' + txt(xd(HIT2), y(T2) - 12, "+2R", COL.tp, 12, "middle", 700, h2);
    s += callout(XDAY + 30, y(105.95), ["Two setups, one profile", "PC bounce +2R · VA breakout +2R"], COL.tp, fade(T, 28.4, 0.5));
    svg.innerHTML = s + revInset(T);
  }

  /* ---------- captions + controls ---------- */
  function stageAt(T) { var q = 0; STAGES.forEach(function (st, i) { if (T >= st.at) q = i; }); return q; }
  var shown = -1;
  function caption(T) {
    var q = stageAt(T);
    if (q === shown) return;
    shown = q;
    cap.n.textContent = (q + 1) + " / " + STAGES.length;
    cap.t.textContent = STAGES[q].title;
    cap.b.textContent = STAGES[q].text;
    chips.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-current", i === q ? "step" : "false"); });
  }
  chips.innerHTML = STAGES.map(function (st, i) { return '<button type="button" data-i="' + i + '">' + (i + 1) + ". " + st.title + "</button>"; }).join("");

  var T = END, playing = false, lastNow = 0, raf = 0;
  var scroller = root.querySelector(".anim-scroll");
  function follow() {
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 2) return;
    var sw = scroller.scrollWidth, cw = scroller.clientWidth, fx;
    if (T < 8) fx = T < 5.4 ? XDAY : XDAY + 200;
    else if (T >= 15 && T < 19) fx = 460;
    else if (T >= 28.2) { scroller.scrollLeft = (xd(BRK) - 60) / W * sw; return; }
    else { var last = 0; for (var q = 0; q < ND; q++) if (T >= TD[q][0]) last = q; fx = xd(last) + 110; }
    scroller.scrollLeft = Math.max(0, fx / W * sw - cw * 0.8);
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
    var q = +b.getAttribute("data-i");
    if (REDUCED) { T = q + 1 < STAGES.length ? STAGES[q + 1].at - 0.01 : END; if (q === 3) T = 18.0; if (q === 4) T = TD[BOS][1] + 1.2; if (q === 2) T = TD[TOUCH + 6][1]; draw(); return; }
    T = STAGES[q].at; draw(); setPlaying(true);
  });

  draw();
  if (!REDUCED && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); T = 0; draw(); setPlaying(true); }
    }, { threshold: 0.5 });
    io.observe(svg);
  }
})();

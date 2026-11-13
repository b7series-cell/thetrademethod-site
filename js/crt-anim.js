/* =====================================================================
   crt-anim.js — animated walkthrough of the Three-Candle CRT long.

   Six stages, following the page: the 1H bias (a key low swept and
   reclaimed) → candle 1 marks the range → candle 2 sweeps the low and
   closes back inside → candle 3 has the clock: the first break of candle
   2's high → the rebreak entry on 1-minute bars → target at candle 1's
   high first, stop dragged to exactly 1.5R, and the run to the target.

   The prices are scripted and labelled "Illustrative". No market data.
   Mount: <section data-crt-anim>…</section>
   ===================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-crt-anim]");
  if (!root) return;
  var svg = root.querySelector("svg");
  var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
  var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay");
  var chips = root.querySelector(".anim-chips");
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- the example ---------- */
  var C1 = [483.20, 484.00, 481.00, 481.40], C2 = [481.40, 482.50, 480.30, 482.10];
  var LVL = C2[1], TP = C1[1], RR = 1.5, SL = LVL - (TP - LVL) / RR;          // 482.50 · 484.00 · 481.50
  var COL = { c1: "#ff9f0a", lvl: "#2997ff", tp: "#30d158", sl: "#ff453a", bias: "#30d158", box: "#8e8e93" };

  /* 1-minute bars from 10:00 (minute 30): first break, close back inside, rebreak, run to the target */
  var M = [], closes = [482.20, 482.32, 482.45, 482.56, 482.38, 482.28, 482.22, 482.34, 482.66];
  var rng = (function () { var s = 13; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  var prev = C2[3];
  closes.forEach(function (c) { var o = prev + (rng() - 0.5) * 0.04; M.push([o, Math.max(o, c) + 0.03 + rng() * 0.05, Math.min(o, c) - 0.03 - rng() * 0.05, c]); prev = c; });
  M[2][1] = Math.min(M[2][1], 482.47);                     // no break before 10:03
  M[3] = [482.45, 482.64, 482.41, 482.56];                 // 10:03 first break
  M[4] = [482.55, 482.58, 482.33, 482.38];                 // 10:04 closes back inside
  M[8] = [482.36, 482.70, 482.33, 482.66];                 // 10:08 rebreak → entry at 482.50
  var FIRST = 3, BACK = 4, ENTRY = 8;
  for (var k = 1; k <= 22; k++) {
    var f = k / 22, c = 482.66 + (484.12 - 482.66) * (1 - Math.pow(1 - f, 1.6)) + (rng() - 0.5) * 0.06;
    var o = prev + (rng() - 0.5) * 0.04;
    M.push([o, Math.max(o, c) + 0.03 + rng() * 0.06, Math.max(SL + 0.4, Math.min(o, c) - 0.03 - rng() * 0.06), c]); prev = c;
  }
  var TPBAR = -1;
  for (k = ENTRY + 1; k < M.length; k++) if (TPBAR < 0 && M[k][1] >= TP) TPBAR = k;
  var NM = TPBAR >= 0 ? Math.min(M.length, TPBAR + 4) : M.length;

  /* ---------- timeline ---------- */
  var STAGES = [
    { at: 0,    title: "Set the bias on the 1-hour first", text: "The 1-hour chart's key low is swept, and the same candle closes back above it. That sweep-and-reclaim makes the bias bullish: from here, only long CRTs count." },
    { at: 4.8,  title: "Candle 1 marks the range", text: "The 9:30 fifteen-minute candle closes. Its high, " + C1[1].toFixed(2) + ", and low, " + C1[2].toFixed(2) + ", are the reference. Nothing to do yet." },
    { at: 8.0,  title: "Candle 2 sweeps the low and closes back inside", text: "The 9:45 candle wicks under candle 1's low to " + C2[2].toFixed(2) + ", then closes back inside the range at " + C2[3].toFixed(2) + ". Liquidity taken and rejected. The trigger is candle 2's high, " + LVL.toFixed(2) + "." },
    { at: 11.2, title: "Candle 3 has the clock", text: "The trade has to trigger before the 10:00 candle closes. At 10:03 price breaks " + LVL.toFixed(2) + " for the first time. With the rebreak entry, that first break isn't the entry yet." },
    { at: 14.4, title: "The rebreak entry, on 1-minute bars", text: "A bar closes back below the level, then price breaks it a second time at 10:08. That second break is the entry: a buy stop at " + LVL.toFixed(2) + "." },
    { at: 17.8, title: "Target first, then drag the stop to 1.5R", text: "The target goes on candle 1's high, " + TP.toFixed(2) + ": " + (TP - LVL).toFixed(2) + " of reward. The stop is dragged to whatever makes that exactly 1.5R: " + SL.toFixed(2) + ", " + (LVL - SL).toFixed(2) + " of risk." }
  ];
  var TB = [];
  for (k = 0; k < NM; k++) {
    if (k <= FIRST) TB[k] = [11.6 + k * 0.42, 11.6 + k * 0.42 + 0.36];
    else if (k <= ENTRY) TB[k] = [14.6 + (k - FIRST - 1) * 0.5, 14.6 + (k - FIRST - 1) * 0.5 + 0.42];
    else TB[k] = [19.8 + (k - ENTRY - 1) * 0.3, 19.8 + (k - ENTRY - 1) * 0.3 + 0.26];
  }
  var END = TB[NM - 1][1] + 1.6;

  /* ---------- geometry: minutes from 9:30 across the chart ---------- */
  var W = 1180, H = 500, YT = 46, YB = 430, PMIN = 479.8, PMAX = 484.6, XTAG = 1012, XAX = 1172, XEND = 990;
  function y(p) { return YB - (p - PMIN) / (PMAX - PMIN) * (YB - YT); }
  function x(min) { return 90 + min * 13; }
  function xm(k) { return x(30 + k + 0.5); }
  function clock(min) { var t = 570 + min, h = Math.floor(t / 60), m = t % 60; return (h > 12 ? h - 12 : h) + ":" + (m < 10 ? "0" : "") + m; }

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
  function tag(p, label, col, op, dy, ink) {
    if (op <= 0) return "";
    var yy = y(p) + (dy || 0);
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
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + xx + '" x2="' + xx + '" y1="' + yf(hi).toFixed(1) + '" y2="' + yf(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="' + (wBody > 40 ? 2 : 1.2) + '"/>' +
      '<rect x="' + (xx - wBody / 2) + '" y="' + top.toFixed(1) + '" width="' + wBody + '" height="' + bh.toFixed(1) + '" rx="' + (wBody > 40 ? 4 : 1.5) + '" fill="' + col + '"' + (wBody > 40 ? ' fill-opacity="0.85"' : "") + "/></g>";
  }
  function callout(xx, yy, lines, col, op, anchorRight) {
    if (op <= 0) return "";
    var w = 14 + Math.max.apply(null, lines.map(function (s) { return s.length; })) * 7.1, h = 10 + lines.length * 17;
    var x0 = anchorRight ? xx - w : xx;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0.toFixed(0) + '" y="' + yy.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h + '" rx="8" fill="#2c2c2e" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, q) { s += txt((x0 + 10).toFixed(0), (yy + 20 + q * 17).toFixed(0), ln, q === 0 ? col : "#d1d1d6", 13, "start", q === 0 ? 600 : null); });
    return s + "</g>";
  }

  /* ---------- stage 1: the 1-hour bias inset ---------- */
  var H1 = [[478.6, 479.4, 477.9, 479.1], [479.1, 480.2, 478.8, 479.9], [479.9, 480.4, 478.4, 478.7], [478.7, 479.6, 476.9, 477.4],
            [477.4, 478.9, 477.2, 478.6], [478.6, 479.8, 478.1, 479.5], [479.5, 480.1, 478.9, 479.2], [479.2, 479.4, 477.6, 477.9],
            [477.9, 478.2, 476.3, 477.8], [477.8, 479.7, 477.6, 479.5]];
  var KEYL = 476.9;
  function inset(T) {
    var op = fade(T, 0.1, 0.5) * (1 - fade(T, 4.3, 0.5));
    if (op <= 0) return "";
    var X0 = 200, X1 = 900, Y0 = 70, Y1 = 410, lo = 475.6, hi = 481;
    function yh(p) { return Y1 - 30 - (p - lo) / (hi - lo) * (Y1 - Y0 - 80); }
    function xh(i) { return X0 + 70 + i * 52; }
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + X0 + '" y="' + Y0 + '" width="' + (X1 - X0) + '" height="' + (Y1 - Y0) + '" rx="14" fill="#161617" stroke="#3a3a3c"/>';
    s += txt(X0 + 22, Y0 + 28, "1-hour bars", "#86868b", 12) + txt(X1 - 22, Y0 + 28, "Illustrative", "#6e6e73", 11, "end");
    var shown = Math.min(H1.length, Math.floor(clamp01((T - 0.3) / 2.2) * H1.length) + 1);
    var a = fade(T, 0.9, 0.4);
    s += '<line x1="' + xh(3) + '" x2="' + xh(9) + '" y1="' + yh(KEYL) + '" y2="' + yh(KEYL) + '" stroke="' + COL.c1 + '" stroke-width="1.6" stroke-dasharray="6 4" opacity="' + a.toFixed(3) + '"/>' +
      txt(xh(3) - 8, yh(KEYL) + 4, "key low", COL.c1, 12, "end", 600, a);
    for (var i = 0; i < shown; i++) s += candle(xh(i), H1[i], 1, 22, 1, yh);
    var b = fade(T, 2.6, 0.4);
    if (b > 0) {
      s += '<circle cx="' + xh(8) + '" cy="' + yh(476.3) + '" r="16" fill="none" stroke="#f5f5f7" stroke-width="1.5" stroke-dasharray="3 3" opacity="' + b.toFixed(3) + '"/>';
      s += callout(xh(8) - 26, Y0 + 46, ["Swept the key low, closed back above", "Bias: bullish, longs only"], COL.bias, b, true);
    }
    return s + "</g>";
  }

  /* ---------- one frame ---------- */
  function frame(T) {
    var s = '<rect width="' + W + '" height="' + H + '" fill="#1d1d1f"/>';
    var main = fade(T, 4.4, 0.5);
    for (var p = 480; p <= 484.5; p += 0.5) s += hline(56, XEND, p, "rgba(255,255,255,0.05)", null, 1, main) + txt(XAX, y(p) + 4, p.toFixed(2), "#6e6e73", 11, "end", null, main);
    [0, 15, 30, 45, 60].forEach(function (mn) { s += txt(x(mn), YB + 24, clock(mn), "#6e6e73", 11, "middle", null, main); });
    s += txt(60, 28, "15-minute candles · 1-minute bars inside candle 3", "#86868b", 12, "start", null, main);
    s += txt(XAX, 488, "Illustrative", "#6e6e73", 11, "end");
    var bias = fade(T, 4.6, 0.4);
    s += '<g opacity="' + bias.toFixed(3) + '"><rect x="' + (XEND - 150) + '" y="14" width="150" height="22" rx="11" fill="rgba(48,209,88,0.15)"/>' + txt(XEND - 75, 29, "1H bias: bullish", COL.bias, 12, "middle", 600) + "</g>";

    /* candle 1 and candle 2 as fifteen-minute candles */
    var p1 = clamp01((T - 5.0) / 1.6), p2 = clamp01((T - 8.2) / 1.8);
    var later = 1 - 0.55 * fade(T, 11.2, 0.6);
    s += candle(x(7.5), C1, p1, 150, later) + candle(x(22.5), C2, p2, 150, later);
    if (p1 > 0) s += txt(x(7.5), YT - 4 + 0, "C1 · 9:30", "#d1d1d6", 12, "middle", 600, main);
    if (p2 > 0) s += txt(x(22.5), YT - 4, "C2 · 9:45", "#d1d1d6", 12, "middle", 600, main);
    var a = fade(T, 6.6, 0.4);
    s += hline(x(0), XEND, C1[1], COL.c1, "6 4", 1.4, a * (1 - fade(T, 17.9, 0.3))) + hline(x(0), x(30), C1[2], COL.c1, "6 4", 1.4, a);
    s += txt(x(0) + 4, y(C1[1]) - 8, "C1 high " + C1[1].toFixed(2), COL.c1, 12, "start", 600, a) + txt(x(0) + 4, y(C1[2]) + 18, "C1 low " + C1[2].toFixed(2), COL.c1, 12, "start", 600, a);
    s += callout(x(29), y(480.1) - 6, ["The sweep", "Wick under C1's low, close back inside"], COL.c1, fade(T, 10.0, 0.4) * (1 - fade(T, 13.6, 0.5)));

    /* candle 3: the clock, the level, the 1-minute bars */
    a = fade(T, 11.3, 0.4);
    if (a > 0) {
      var clockEnd = 1 - fade(T, 17.6, 0.5);
      s += '<rect x="' + x(30) + '" y="' + YT + '" width="' + (x(45) - x(30)) + '" height="' + (YB - YT) + '" fill="#2997ff" opacity="' + (0.06 * a * clockEnd).toFixed(3) + '"/>' +
        '<rect x="' + x(30) + '" y="' + YT + '" width="' + (x(45) - x(30)) + '" height="' + (YB - YT) + '" fill="none" stroke="' + COL.lvl + '" stroke-dasharray="4 4" opacity="' + (0.6 * a * clockEnd).toFixed(3) + '"/>' +
        txt(x(37.5), YT + 16, "C3 · 10:00 · the clock", COL.lvl, 12, "middle", 600, a * clockEnd);
      s += hline(x(15), XEND, LVL, COL.lvl, "6 4", 1.6, a) + tag(LVL, "Trigger " + LVL.toFixed(2), COL.lvl, a, 0, "#fff");
    }
    M.slice(0, NM).forEach(function (b, q) {
      var pr = clamp01((T - TB[q][0]) / (TB[q][1] - TB[q][0]));
      if (pr > 0) s += candle(xm(q), b, pr, 8, TPBAR >= 0 && q > TPBAR ? 0.4 : 1);
    });
    var aF = fade(T, TB[FIRST][1], 0.3);
    if (aF > 0) s += '<circle cx="' + xm(FIRST) + '" cy="' + y(M[FIRST][1]) + '" r="7" fill="none" stroke="#f5f5f7" stroke-width="1.6" opacity="' + aF.toFixed(3) + '"/>';
    s += callout(xm(FIRST) - 14, y(483.55), ["First break", "Not the entry with the rebreak"], "#f5f5f7", aF * (1 - fade(T, 15.0, 0.4)), true);
    var aB = fade(T, TB[BACK][1], 0.3) * (1 - fade(T, 17.8, 0.5));
    s += callout(xm(BACK) + 10, y(481.85), ["Closed back below", "Waiting for the second break"], "#d1d1d6", aB);
    var aE = fade(T, TB[ENTRY][1], 0.3);
    if (aE > 0) {
      s += '<g opacity="' + aE.toFixed(3) + '"><path d="M' + xm(ENTRY) + " " + (y(M[ENTRY][2]) + 10) + ' l-6 10 h12 z" fill="' + COL.tp + '"/>' + txt(xm(ENTRY), y(M[ENTRY][2]) + 34, "Long", COL.tp, 12, "middle", 700) + "</g>";
      s += callout(xm(ENTRY) + 14, y(483.75), ["Rebreak: long " + LVL.toFixed(2), "Buy stop at candle 2's high"], COL.tp, aE * (1 - fade(T, 19.6, 0.5)));
    }

    /* stage 6: target first, stop dragged to 1.5R */
    var xe = xm(ENTRY), aT = fade(T, 18.0, 0.4);
    s += hline(xe, XEND, TP, COL.tp, null, 1.8, aT) + tag(TP, "Target " + TP.toFixed(2), COL.tp, aT);
    var drag = clamp01((T - 18.6) / 0.8), slNow = C2[2] + (SL - C2[2]) * (1 - Math.pow(1 - drag, 2));
    var aS = fade(T, 18.4, 0.3);
    s += hline(xe, XEND, slNow, COL.sl, "5 4", 1.8, aS) + tag(slNow, "Stop " + slNow.toFixed(2), COL.sl, aS, 0, "#fff");
    s += callout(xe + 70, y(480.9), ["Stop dragged to " + SL.toFixed(2), "Risk " + (LVL - SL).toFixed(2) + " · reward " + (TP - LVL).toFixed(2) + " · 1.5R"], COL.sl, fade(T, 19.4, 0.4) * (1 - fade(T, END - 1.2, 0.6)));
    if (TPBAR >= 0) {
      var aH = fade(T, TB[TPBAR][1], 0.3);
      if (aH > 0) s += '<circle cx="' + xm(TPBAR) + '" cy="' + y(TP).toFixed(1) + '" r="7" fill="none" stroke="' + COL.tp + '" stroke-width="2" opacity="' + aH.toFixed(3) + '"/>';
      s += callout(xm(TPBAR) - 14, y(TP) - 66, ["Target hit · " + TP.toFixed(2), "+1.5R"], COL.tp, aH, true);
    }
    svg.innerHTML = s + inset(T);
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
    if (T < 4.4) fx = 550;
    else if (T < 11.2) fx = x(T < 8 ? 7.5 : 22.5) + 140;
    else if (T < 17.8) { var last = 0; for (var q = 0; q < NM; q++) if (T >= TB[q][0]) last = q; fx = xm(last) + 120; }
    else { scroller.scrollLeft = (xm(ENTRY) - 60) / W * sw; return; }
    scroller.scrollLeft = Math.max(0, fx / W * sw - cw * 0.75);
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
    if (REDUCED) { T = q === 0 ? 3.8 : q + 1 < STAGES.length ? STAGES[q + 1].at - 0.01 : END; draw(); return; }
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

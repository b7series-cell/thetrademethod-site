/* =====================================================================
   sb-anim.js — the animations on the Silver Bullet page.

   1. [data-sb-anim]  one Silver Bullet long, start to finish, in six
      stages: the window opens with its liquidity marked → the sweep of a
      swing low → the displacement candle and its fair value gap → the
      limit at the gap's near edge, stop past the sweep, target on the
      nearest unswept high → the fill → the target.
   2. [data-sb-miss]  why the fills lose: the same setup twice, once
      where price comes back and fills the order and keeps going to the
      stop, once where it never comes back and runs to the target with
      no fill. Loops while on screen.

   Like kt-anim.js the walkthrough redraws for the space it has: under
   640px of drawing width it uses a tall, narrow layout with larger text.
   The bars are scripted and labelled "Illustrative"; the levels follow
   the indicator's rules exactly. No market data.
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
    var o = b[0], h = b[1], l = b[2], c = b[3], up = c >= o;
    var pth = up ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
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

  /* =====================================================================
     1. The walkthrough
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-sb-anim]");
    if (!root) return;
    var NARROW_BELOW = 640, TICK = 0.01;

    /* 1-minute bars from 9:44, scripted. Bar 6 is the swing low, bar 11 the hour's high. */
    var BARS = [
      [101.10, 101.22, 101.02, 101.06], [101.06, 101.14, 100.92, 100.96], [100.96, 101.02, 100.78, 100.82], [100.82, 100.88, 100.62, 100.66],
      [100.66, 100.72, 100.48, 100.54], [100.54, 100.60, 100.44, 100.50], [100.50, 100.56, 100.40, 100.47], [100.47, 100.66, 100.45, 100.62],
      [100.62, 100.84, 100.58, 100.80], [100.80, 101.04, 100.76, 101.00], [101.00, 101.30, 100.96, 101.26], [101.26, 101.52, 101.20, 101.44],
      [101.44, 101.48, 101.22, 101.28], [101.28, 101.34, 101.06, 101.10], [101.10, 101.18, 100.94, 100.98], [100.98, 101.04, 100.84, 100.88],
      [100.88, 100.94, 100.72, 100.76], [100.76, 100.82, 100.60, 100.64], [100.64, 100.70, 100.50, 100.55], [100.55, 100.62, 100.44, 100.48],
      [100.48, 100.56, 100.36, 100.52],                                                    // 20  the sweep, 10:04
      [100.52, 100.62, 100.46, 100.58],                                                    // 21  candle 1
      [100.58, 101.14, 100.56, 101.12],                                                    // 22  the displacement
      [101.12, 101.20, 100.80, 100.92],                                                    // 23  candle 3: the gap is 100.62 to 100.80
      [100.92, 101.00, 100.84, 100.88], [100.88, 100.96, 100.82, 100.86],
      [100.86, 100.90, 100.76, 100.82],                                                    // 26  the fill, a tick through 100.80
      [100.82, 100.98, 100.80, 100.96], [100.96, 101.10, 100.92, 101.06], [101.06, 101.18, 101.00, 101.14], [101.14, 101.26, 101.08, 101.22],
      [101.22, 101.30, 101.12, 101.18], [101.18, 101.38, 101.14, 101.34], [101.34, 101.46, 101.28, 101.42],
      [101.42, 101.56, 101.36, 101.50],                                                    // 34  target
      [101.50, 101.58, 101.40, 101.46], [101.46, 101.50, 101.30, 101.36], [101.36, 101.44, 101.26, 101.40]
    ];
    var N = BARS.length, PIV = 6, HI = 11, WIN = 16, SW = 20, C1 = 21, DSP = 22, C3 = 23, FILL = 26, TP = 34;
    var SWING = BARS[PIV][2], HOURHI = BARS[HI][1];
    var ENTRY = BARS[C3][2], GAPBOT = BARS[C1][1], STOP = +(BARS[SW][2] - TICK).toFixed(2), TARGET = HOURHI, RISK = ENTRY - STOP;
    var RR = (TARGET - ENTRY) / RISK, BODY = BARS[DSP][3] - BARS[DSP][0];
    var ATR = (function () { var a = 0; for (var t = 0; t < DSP; t++) { var b = BARS[t], tr = t ? Math.max(b[1] - b[2], Math.abs(b[1] - BARS[t - 1][3]), Math.abs(b[2] - BARS[t - 1][3])) : b[1] - b[2]; a = t < 14 ? a + tr / 14 : (a * 13 + tr) / 14; } return a; })();
    function clock(i) { var m = 584 + i, h = Math.floor(m / 60), mm = m % 60; return (h > 12 ? h - 12 : h) + ":" + (mm < 10 ? "0" : "") + mm; }
    function f2(v) { return v.toFixed(2); }

    var STAGES = [
      { at: 0,    title: "The window opens", text: "Three one-hour windows, New York time: 3 to 4 am, 10 to 11 am and 2 to 3 pm. Before this one opens, the liquidity is already marked: a swing low at " + f2(SWING) + " and the high of the hour before the window, " + f2(HOURHI) + "." },
      { at: 7.0,  title: "The sweep", text: "At " + clock(SW) + " a candle's low trades " + f2(BARS[SW][2]) + ", at least a tick under the swing low. A wick is enough; an exact touch isn't. It's the window's first sweep of a low, so the indicator now looks for a long." },
      { at: 10.0, title: "Displacement leaves a gap", text: "A strong candle up: its body is " + f2(BODY) + ", more than one ATR (" + f2(ATR) + "). The candle before it topped at " + f2(GAPBOT) + " and the one after bottomed at " + f2(ENTRY) + ", so price skipped that range. That's the fair value gap." },
      { at: 13.4, title: "The limit, stop and target", text: "A buy limit at the gap's near edge, " + f2(ENTRY) + ". The stop goes a tick under the sweep's low, " + f2(STOP) + ". The target is the nearest untouched high, " + f2(TARGET) + ": " + RR.toFixed(1) + " times the risk. Under 1.5R the setup would be skipped." },
      { at: 17.0, title: "The fill", text: "Price comes back and trades a tick through " + f2(ENTRY) + " before the window ends, so the order fills. Had price reached " + f2(TARGET) + " first, the order would have been cancelled." },
      { at: 20.0, title: "Target, stop or the clock", text: "This one reaches " + f2(TARGET) + " for +" + RR.toFixed(1) + "R before costs. It could also have hit the stop, or been closed an hour after the window. In the 16-year test only about one trade in four won." }
    ];
    var TB = [];
    for (var i = 0; i < N; i++) {
      if (i < WIN) TB[i] = [0.4 + i * 0.32, 0.4 + i * 0.32 + 0.3];
      else if (i < SW) TB[i] = [5.6 + (i - WIN) * 0.38, 5.6 + (i - WIN) * 0.38 + 0.34];
      else if (i === SW) TB[i] = [7.2, 8.2];
      else if (i === C1) TB[i] = [9.6, 10.0];
      else if (i === DSP) TB[i] = [10.2, 11.2];
      else if (i === C3) TB[i] = [11.5, 12.1];
      else if (i < FILL) TB[i] = [15.6 + (i - C3 - 1) * 0.5, 15.6 + (i - C3 - 1) * 0.5 + 0.45];
      else if (i === FILL) TB[i] = [17.2, 18.2];
      else if (i <= TP) TB[i] = [20.2 + (i - FILL - 1) * 0.36, 20.2 + (i - FILL - 1) * 0.36 + 0.32];
      else TB[i] = [23.6 + (i - TP - 1) * 0.3, 23.6 + (i - TP - 1) * 0.3 + 0.28];
    }
    var END = TB[N - 1][1] + 1.6;

    function size(n) {
      return n ? { W: 440, H: 650, x0: 14, x1: 300, yt: 170, yb: 590, xAx: 434, xTag: 306, cx: 14, cy: 14 }
               : { W: 1180, H: 520, x0: 60, x1: 1000, yt: 96, yb: 470, xAx: 1172, xTag: 1010, cx: 60, cy: 18 };
    }
    var PMIN = 100.22, PMAX = 101.70;

    function frame(T, L) {
      var dx = (L.x1 - L.x0) / (N - 0.5), wB = Math.max(4, dx * 0.62);
      function x(i) { return L.x0 + dx * (i + 0.5); }
      function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
      var s = "", p, k;
      for (p = 100.4; p <= 101.6 + 1e-9; p += 0.2) s += hl(L.x0, L.x1, y(p), "rgba(255,255,255,0.05)", null, 1) + (L.narrow ? "" : txt(L.xAx, y(p) + 4, p.toFixed(2), C.faint, 11, "end"));
      (L.narrow ? [0, 16, 32] : [0, 8, 16, 24, 32]).forEach(function (k) { if (k < N) s += txt(x(k), L.yb + 22 * FS, clock(k), C.faint, 11, "middle"); });
      s += txt(L.W - 8, L.H - 6, "Illustrative · 1-minute bars", C.faint, 11, "end");

      /* the window: a tint from 10:00 to the right edge */
      var aW = fade(T, TB[WIN][0], 0.5);
      if (aW > 0) {
        s += rect(x(WIN) - dx / 2, L.yt - 30 * FS, L.x1 - x(WIN) + dx / 2, L.yb - L.yt + 30 * FS, C.cyan, 0.07 * aW);
        s += hl(x(WIN) - dx / 2, L.x1, L.yt - 30 * FS, C.cyan, null, 3, aW * 0.9);
        s += txt(x(WIN) - dx / 2 + 6, L.yt - 38 * FS, "AM window · 10:00–11:00 NY", C.cyan, 12, "start", 700, aW);
      }
      var last = -1; for (k = 0; k < N; k++) if (T >= TB[k][0]) last = k;

      /* the swing low: grey until swept, then gold and ended at the sweep */
      var aS = fade(T, TB[PIV + 5][1], 0.4);
      if (aS > 0) {
        var swept = T >= TB[SW][1], endS = swept ? x(SW) : x(Math.max(last, PIV)) + 10;
        s += hl(x(PIV), endS, y(SWING), swept ? C.gold : C.dim, swept ? "5 4" : null, 2, aS);
        s += tag(swept ? x(SW) + 10 : L.xTag, y(SWING), swept ? (L.narrow ? "Swept" : "Swing low swept") : (L.narrow ? "Swing " : "Swing low ") + f2(SWING), swept ? C.gold : C.dim, aS * (swept ? 1 - 0.5 * fade(T, 13.4, 0.4) : 1));
        if (swept) s += txt(x(SW), y(BARS[SW][2]) + 18 * FS, "&#10005;", C.gold, 15, "middle", 700, fade(T, TB[SW][1], 0.3));
      }
      /* the hour's high: the target later */
      var aH = fade(T, TB[WIN][0], 0.4);
      if (aH > 0) {
        var hit = T >= TB[TP][1];
        s += hl(x(HI), hit ? x(TP) : L.x1, y(HOURHI), T >= 13.6 ? C.up : C.dim, "2 4", 1.5, aH);
        if (T < 13.6) s += tag(L.xTag, y(HOURHI), (L.narrow ? "1H " : "1H high ") + f2(HOURHI), C.dim, aH);
      }

      /* the fair value gap */
      var aG = fade(T, TB[C3][1], 0.4);
      if (aG > 0) {
        var gEnd = T >= TB[FILL][1] ? x(FILL) : x(Math.max(last, C3)) + dx / 2;
        s += rect(x(C1) - dx / 2, y(ENTRY), gEnd - x(C1) + dx / 2, y(GAPBOT) - y(ENTRY), C.up, 0.22 * aG, C.up);
        if (T < 17.2) s += txt(x(C1) - dx / 2 - 6, y((ENTRY + GAPBOT) / 2) + 4, "FVG", C.up, 12, "end", 700, aG);
      }

      /* candles; the displacement candle painted */
      for (k = 0; k < N; k++) {
        var pr = clamp01((T - TB[k][0]) / (TB[k][1] - TB[k][0]));
        if (pr > 0) s += candle(x(k), y, BARS[k], pr, wB, k > TP ? 0.35 : 1, k === DSP && T >= TB[DSP][1] ? "#3ef08a" : null);
      }
      var aD = fade(T, TB[DSP][1], 0.3) * (1 - fade(T, 13.4, 0.4));
      if (aD > 0) s += txt(x(DSP) + 12, y(BARS[DSP][3]) - 4, "body " + f2(BODY) + " &gt; ATR " + f2(ATR), C.ink, 12, "start", 600, aD);

      /* entry, stop, target */
      var aE = fade(T, 13.6, 0.4), xs = x(C3), xe = T >= TB[TP][1] ? x(TP) : L.x1;
      if (aE > 0) {
        s += rect(xs, y(ENTRY), xe - xs, y(STOP) - y(ENTRY), C.dn, 0.10 * aE);
        s += rect(xs, y(TARGET), xe - xs, y(ENTRY) - y(TARGET), C.up, 0.08 * aE);
        s += hl(xs, xe, y(ENTRY), C.ink, T >= TB[FILL][1] ? null : "5 4", 1.8, aE);
        s += hl(xs, xe, y(STOP), C.dn, null, 2, aE);
        s += hl(xs, xe, y(TARGET), C.up, null, 2, aE);
        s += tag(L.xTag, y(ENTRY), (T >= TB[FILL][1] ? "Filled " : "Limit ") + f2(ENTRY), C.ink, aE);
        s += tag(L.xTag, y(STOP), "Stop " + f2(STOP), C.dn, aE, "#000");
        s += tag(L.xTag, y(TARGET), "Target " + f2(TARGET), C.up, aE);
      }
      var aF = fade(T, TB[FILL][1], 0.3);
      if (aF > 0) s += '<circle cx="' + x(FILL).toFixed(1) + '" cy="' + y(ENTRY).toFixed(1) + '" r="' + (9 * FS).toFixed(1) + '" fill="none" stroke="' + C.ink + '" stroke-width="2" opacity="' + aF.toFixed(3) + '"/>';
      var aT = fade(T, TB[TP][1], 0.3);
      if (aT > 0) s += '<circle cx="' + x(TP).toFixed(1) + '" cy="' + y(TARGET).toFixed(1) + '" r="' + (9 * FS).toFixed(1) + '" fill="none" stroke="' + C.up + '" stroke-width="2.2" opacity="' + aT.toFixed(3) + '"/>';

      /* one caption box at a time */
      var cx = L.cx, cy = L.cy;
      s += callout(cx, cy, ["Liquidity marked before 10:00", "Swing low " + f2(SWING) + " · 1H high " + f2(HOURHI)], C.cyan, fade(T, 5.0, 0.4) * (1 - fade(T, 7.0, 0.3)));
      s += callout(cx, cy, ["Swing low swept · " + clock(SW), "Low " + f2(BARS[SW][2]) + " &lt; " + f2(SWING) + " by 4 ticks", "A swept low starts the search for a long"], C.gold, fade(T, TB[SW][1], 0.3) * (1 - fade(T, 10.0, 0.3)));
      s += callout(cx, cy, ["Displacement · " + clock(DSP), "Gap " + f2(GAPBOT) + " to " + f2(ENTRY) + " (" + (ENTRY - GAPBOT).toFixed(2) + ")", "Needs at least 0.1 ATR: " + (0.1 * ATR).toFixed(2)], C.up, fade(T, TB[C3][1], 0.3) * (1 - fade(T, 13.4, 0.3)));
      s += callout(cx, cy, ["Limit " + f2(ENTRY) + " · stop " + f2(STOP), "Risk " + f2(RISK) + " · target " + f2(TARGET), "Reward " + f2(TARGET - ENTRY) + " = " + RR.toFixed(1) + "R, at least 1.5R"], C.ink, fade(T, 13.6, 0.3) * (1 - fade(T, 17.0, 0.3)));
      s += callout(cx, cy, ["Filled at " + f2(ENTRY) + " · " + clock(FILL), "Low " + f2(BARS[FILL][2]) + ", a tick through the limit"], C.ink, fade(T, TB[FILL][1], 0.3) * (1 - fade(T, 20.0, 0.3)));
      s += callout(cx, cy, ["Target " + f2(TARGET) + " · " + clock(TP), "+" + RR.toFixed(1) + "R before costs", "Most fills in the study hit the stop"], C.up, fade(T, TB[TP][1], 0.3));
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
    window.SBAnim = { _bars: BARS, _levels: { SWING: SWING, ENTRY: ENTRY, GAPBOT: GAPBOT, STOP: STOP, TARGET: TARGET, RR: RR, ATR: ATR, BODY: BODY } };   // exposed for testing
  })();

  /* =====================================================================
     2. Why the fills lose: the same gap, two endings, on a loop
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-sb-miss]");
    if (!root) return;
    var svgs = root.querySelectorAll("svg");
    if (svgs.length < 2) return;
    /* shared start: a sweep, the displacement and the gap (limit 100.80, stop 100.35, target 101.52) */
    var HEAD = [
      [100.70, 100.76, 100.52, 100.56], [100.56, 100.62, 100.42, 100.46], [100.46, 100.54, 100.36, 100.50],
      [100.50, 100.62, 100.46, 100.58], [100.58, 101.14, 100.56, 101.12], [101.12, 101.20, 100.80, 100.94]
    ];
    var ENDS = [
      /* price comes back: the order fills, and the move keeps going the wrong way */
      [[100.94, 100.98, 100.82, 100.86], [100.86, 100.88, 100.74, 100.78], [100.78, 100.82, 100.60, 100.64], [100.64, 100.70, 100.50, 100.54],
       [100.54, 100.60, 100.44, 100.48], [100.48, 100.52, 100.32, 100.36], [100.36, 100.42, 100.26, 100.30], [100.30, 100.38, 100.24, 100.34]],
      /* price never comes back: no fill, and it runs to the target */
      [[100.94, 101.08, 100.88, 101.04], [101.04, 101.16, 100.98, 101.12], [101.12, 101.26, 101.06, 101.22], [101.22, 101.34, 101.14, 101.30],
       [101.30, 101.44, 101.24, 101.40], [101.40, 101.56, 101.34, 101.50], [101.50, 101.58, 101.40, 101.46], [101.46, 101.52, 101.36, 101.42]]
    ];
    var ENTRY = 100.80, GAPBOT = 100.62, STOP = 100.35, TARGET = 101.52, PMIN = 100.15, PMAX = 101.72;
    var FILLS = [1, -1], HITS = [5, 5];                    // bar (after the head) where the order fills, and where stop / target trades
    var W = 560, H = 330, x0 = 26, x1 = 410, yt = 60, yb = 300, NB = HEAD.length + 8;
    var T = 0, LOOP = 9.5, raf = 0, lastNow = 0, on = false;

    function frame(T, which) {
      FS = svgs[0].clientWidth > 0 && svgs[0].clientWidth < 440 ? 1.45 : 1.15;
      var dx = (x1 - x0) / (NB - 0.5), wB = dx * 0.6, s = "";
      function x(i) { return x0 + dx * (i + 0.5); }
      function y(p) { return yb - (p - PMIN) / (PMAX - PMIN) * (yb - yt); }
      var bars = HEAD.concat(ENDS[which]), shown = Math.min(NB, Math.floor(T / 0.42) + 1), pr = (T % 0.42) / 0.42;
      if (REDUCED) { shown = NB; pr = 1; }
      var fillAt = FILLS[which] < 0 ? -1 : HEAD.length + FILLS[which], hitAt = HEAD.length + HITS[which];
      var filled = fillAt >= 0 && shown > fillAt, hit = shown > hitAt;
      s += '<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>';
      s += rect(x(3) - dx / 2, y(ENTRY), x1 - x(3) + dx / 2, y(GAPBOT) - y(ENTRY), C.up, shown > 5 ? 0.2 : 0, C.up);
      s += hl(x(5), x1, y(ENTRY), C.ink, filled ? null : "5 4", 1.6, shown > 5 ? 1 : 0);
      s += hl(x(5), x1, y(STOP), C.dn, null, 1.8, shown > 5 ? 1 : 0);
      s += hl(x(5), x1, y(TARGET), C.up, null, 1.8, shown > 5 ? 1 : 0);
      if (shown > 5) {
        s += tag(x1 + 6, y(TARGET), "Target", C.up, 1);
        s += tag(x1 + 6, y(ENTRY), filled ? "Filled" : "Limit", C.ink, 1);
        s += tag(x1 + 6, y(STOP), "Stop", C.dn, 1, "#000");
      }
      for (var k = 0; k < shown; k++) s += candle(x(k), y, bars[k], k === shown - 1 ? pr : 1, wB, 1);
      if (filled) s += '<circle cx="' + x(fillAt).toFixed(1) + '" cy="' + y(ENTRY).toFixed(1) + '" r="9" fill="none" stroke="' + C.ink + '" stroke-width="2"/>';
      if (hit) s += '<circle cx="' + x(hitAt).toFixed(1) + '" cy="' + y(which ? TARGET : STOP).toFixed(1) + '" r="9" fill="none" stroke="' + (which ? C.up : C.dn) + '" stroke-width="2.2"/>';
      var head = which ? "Never comes back" : "Comes back to the gap", sub = !hit ? (which ? "No fill yet…" : filled ? "Filled. Now it has to hold." : "Waiting for the limit…")
        : which ? "No fill. It ran to the target without you." : "Filled, then stopped: −1R";
      s += txt(16, 24, head, which ? C.up : C.dn, 15, "start", 700);
      s += txt(16, 24 + 22 * FS, sub, C.dim, 13, "start", hit ? 600 : null);
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
})();

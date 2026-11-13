/* =====================================================================
   kt-anim.js — animated walkthrough of one Knock Twice long.

   Six stages: the old high (a confirmed swing) → the break (a close
   through it) → stay away (the new high is confirmed, 5 bars clear of the
   old level, leg 0.6–3 ATR) → the knock (a touch that closes back above:
   the entry, stop a tick under the knock candle) → the break of the new
   high (BOS confirmed) → T2, the measured move.

   Like rvol-anim.js this redraws for the space it has: under 640px of
   drawing width it uses a tall, narrow layout with larger text instead of
   a wide chart you'd have to scroll sideways.

   The bars are scripted and labelled "Illustrative"; the levels follow the
   indicator's rules exactly. No market data.
   Mount: <section class="anim" data-kt-anim>…</section>
   ===================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-kt-anim]");
  if (!root) return;
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", gold: "#f4b942", orange: "#ff9f0a", grey: "#8e8e93",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e" };
  var NARROW_BELOW = 640, FS = 1;

  /* ---------- the example: 5-minute bars, scripted ---------- */
  var OLD = 101.20, TICK = 0.01, TOL = 0.04;
  var BARS = [
    [100.30, 100.52, 100.22, 100.48], [100.48, 100.70, 100.40, 100.66], [100.66, 100.88, 100.58, 100.84], [100.84, 101.02, 100.76, 100.97],
    [100.97, 101.10, 100.86, 101.05], [101.05, 101.20, 100.92, 100.98], [100.98, 101.04, 100.70, 100.76], [100.76, 100.86, 100.52, 100.58],
    [100.58, 100.66, 100.38, 100.44], [100.44, 100.62, 100.36, 100.56], [100.56, 100.82, 100.50, 100.78], [100.78, 100.90, 100.62, 100.68],
    [100.68, 100.84, 100.58, 100.80], [100.80, 100.94, 100.70, 100.74], [100.74, 100.92, 100.66, 100.88], [100.88, 101.02, 100.80, 100.96],
    [100.96, 101.12, 100.90, 101.04], [101.04, 101.16, 100.96, 101.10],
    [101.10, 101.52, 101.06, 101.45],                                                     // 18  the break
    [101.45, 101.66, 101.40, 101.62], [101.62, 101.80, 101.56, 101.76], [101.76, 101.90, 101.70, 101.86], [101.86, 101.92, 101.78, 101.82],   // 22 new high 101.92
    [101.82, 101.88, 101.66, 101.70], [101.70, 101.78, 101.54, 101.58], [101.58, 101.66, 101.44, 101.48],
    [101.48, 101.56, 101.34, 101.40], [101.40, 101.48, 101.30, 101.36], [101.36, 101.42, 101.26, 101.30],
    [101.30, 101.38, 101.12, 101.34],                                                     // 29  the knock
    [101.34, 101.52, 101.30, 101.48], [101.48, 101.66, 101.42, 101.62], [101.62, 101.80, 101.56, 101.76], [101.76, 101.88, 101.70, 101.84], [101.84, 101.91, 101.78, 101.86],
    [101.86, 102.10, 101.82, 102.04],                                                     // 35  BOS: close over 101.92
    [102.04, 102.22, 101.98, 102.18], [102.18, 102.30, 102.08, 102.14], [102.14, 102.34, 102.06, 102.30], [102.30, 102.48, 102.24, 102.42],
    [102.42, 102.54, 102.34, 102.38], [102.38, 102.66, 102.32, 102.60], [102.60, 102.72, 102.50, 102.56],
    [102.56, 102.62, 102.40, 102.46], [102.46, 102.52, 102.30, 102.36]
  ];
  for (var w = 0; w < 18; w++) BARS[w][2] = +(BARS[w][2] - 0.08).toFixed(2);   // wider early ranges
  var N = BARS.length, PIV = 5, BRK = 18, XB = 22, KN = 29, BOS = 35;
  var NEW = BARS[XB][1], LEG = NEW - OLD, ATR = (function () {            // ATR(14), Wilder, as the indicator computes it
    var a = 0;
    for (var t = 0; t <= KN; t++) {
      var b = BARS[t], tr = t ? Math.max(b[1] - b[2], Math.abs(b[1] - BARS[t - 1][3]), Math.abs(b[2] - BARS[t - 1][3])) : b[1] - b[2];
      a = t < 14 ? a + tr / 14 : (a * 13 + tr) / 14;
    }
    return a;
  })();
  var STOP = Math.min(BARS[KN][2], OLD - TOL) - TICK, ENTRY = BARS[KN][3], T2 = NEW + LEG, RISK = ENTRY - STOP;
  var TPB = -1; for (var i = BOS + 1; i < N; i++) if (TPB < 0 && BARS[i][1] >= T2) TPB = i;
  function clock(i) { var m = 600 + 5 * i, h = Math.floor(m / 60), mm = m % 60; return (h > 12 ? h - 12 : h) + ":" + (mm < 10 ? "0" : "") + mm; }

  var STAGES = [
    { at: 0,    title: "The old high", text: "A swing high counts once 3 bars on each side are lower. This one is at " + OLD.toFixed(2) + ". It's the highest unbroken swing in the last 48 bars, so it's the level to watch." },
    { at: 6.0,  title: "The break", text: "A 5-minute candle closes above " + OLD.toFixed(2) + ". That opens the setup. It isn't an entry yet. Breakouts that close straight back under the level are cancelled." },
    { at: 9.0,  title: "Stay away", text: "Price runs to a new high, " + NEW.toFixed(2) + ", and 3 lower bars confirm it. Then it has to stay clear of the old high for at least 5 bars. The leg is " + LEG.toFixed(2) + ", " + (LEG / ATR).toFixed(1) + " ATR, inside the 0.6 to 3 ATR window." },
    { at: 14.6, title: "The knock", text: "Price comes back and touches " + OLD.toFixed(2) + ", then closes back above it at " + ENTRY.toFixed(2) + ". The old ceiling held as a floor. That's the knock. The stop goes a tick under the knock candle, " + STOP.toFixed(2) + ". Risk " + RISK.toFixed(2) + "." },
    { at: 19.0, title: "The break of the new high", text: "A close above " + NEW.toFixed(2) + " confirms the break of structure. If it doesn't come within 24 bars, or price closes back under the old high, the setup is off." },
    { at: 23.0, title: "T2: the measured move", text: "T2 is the new high plus one more leg: " + NEW.toFixed(2) + " + " + LEG.toFixed(2) + " = " + T2.toFixed(2) + ". From the knock that's " + ((T2 - ENTRY) / RISK).toFixed(1) + " times the risk." }
  ];
  var TB = [];
  for (i = 0; i < N; i++) {
    if (i < BRK) TB[i] = [0.5 + i * 0.3, 0.5 + i * 0.3 + 0.28];
    else if (i === BRK) TB[i] = [6.2, 7.0];
    else if (i < KN) TB[i] = [9.2 + (i - BRK - 1) * 0.5, 9.2 + (i - BRK - 1) * 0.5 + 0.45];
    else if (i === KN) TB[i] = [14.8, 15.9];
    else if (i < BOS) TB[i] = [17.8 + (i - KN - 1) * 0.22, 17.8 + (i - KN - 1) * 0.22 + 0.2];
    else if (i === BOS) TB[i] = [19.2, 20.2];
    else TB[i] = [23.2 + (i - BOS - 1) * 0.3, 23.2 + (i - BOS - 1) * 0.3 + 0.28];
  }
  var END = TB[N - 1][1] + 1.6;

  /* ---------- helpers ---------- */
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
  function callout(x, y, lines, col, op, right) {
    if (op <= 0) return "";
    var w = 18 + Math.max.apply(null, lines.map(function (s) { return s.replace(/&[a-z]+;/g, "x").length; })) * 7.2 * FS, h = 10 + lines.length * 18 * FS;
    var x0 = right ? x - w : x;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" rx="8" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, k) { s += txt(x0 + 10, y + 21 * FS + k * 18 * FS, ln, k === 0 ? col : C.dim, 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  function candle(x, yf, b, prog, wBody, op) {
    if (prog <= 0) return "";
    var o = b[0], h = b[1], l = b[2], c = b[3], up = c >= o;
    var pth = up ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
    var cur = prog >= 1 ? c : pth[idx] + (pth[idx + 1] - pth[idx]) * f;
    var hi = o, lo = o;
    for (var k = 0; k <= idx; k++) { hi = Math.max(hi, pth[k]); lo = Math.min(lo, pth[k]); }
    hi = Math.max(hi, cur); lo = Math.min(lo, cur);
    var col = cur >= o ? C.up : C.dn, top = yf(Math.max(o, cur)), bh = Math.max(1.5, Math.abs(yf(o) - yf(cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + yf(hi).toFixed(1) + '" y2="' + yf(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.3"/>' +
      '<rect x="' + (x - wBody / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + wBody.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }
  function tag(xTag, y, label, col, op, ink) {
    if (op <= 0) return "";
    var w = (label.length * 7 + 16) * FS, h = 20 * FS;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xTag.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="' + col + '"/>' +
      txt(xTag + 8 * FS, y + 4.5 * FS, label, ink || "#000", 12, "start", 600) + "</g>";
  }

  /* ---------- layouts ---------- */
  function size(n) {
    return n ? { W: 440, H: 600, x0: 14, x1: 318, yt: 104, yb: 560, xAx: 434, xTag: 322, cx: 14, cy: 14 }
             : { W: 1180, H: 520, x0: 60, x1: 1000, yt: 96, yb: 470, xAx: 1172, xTag: 1010, cx: 60, cy: 18 };
  }
  var PMIN = 100.15, PMAX = 102.95;

  function frame(T, L) {
    var dx = (L.x1 - L.x0) / (N - 0.5), wB = Math.max(4, dx * 0.62);
    function x(i) { return L.x0 + dx * (i + 0.5); }
    function y(p) { return L.yb - (p - PMIN) / (PMAX - PMIN) * (L.yb - L.yt); }
    var s = "", p;
    for (p = 100.5; p <= 102.5 + 1e-9; p += 0.5) s += hl(L.x0, L.x1, y(p), "rgba(255,255,255,0.05)", null, 1) + (L.narrow ? "" : txt(L.xAx, y(p) + 4, p.toFixed(2), C.faint, 11, "end"));
    (L.narrow ? [0, 15, 30, 45] : [0, 6, 12, 18, 24, 30, 36, 42]).forEach(function (k) { if (k < N) s += txt(x(k), L.yb + 22 * FS, clock(k), C.faint, 11, "middle"); });
    s += txt(L.W - 8, L.H - 6, "Illustrative · 5-minute bars", C.faint, 11, "end");

    var last = -1; for (var k = 0; k < N; k++) if (T >= TB[k][0]) last = k;
    var after = function (j) { return TPB >= 0 && j > TPB; };

    /* the old high: grey until the knock, then green and dashed */
    var aO = fade(T, TB[PIV + 3][1], 0.4);
    if (aO > 0) {
      var knocked = T >= TB[KN][1], endO = knocked ? x(KN) + 8 : x(Math.max(last, PIV)) + 10;
      s += hl(x(PIV), endO, y(OLD), knocked ? C.up : C.dim, knocked ? "6 4" : null, 2, aO);
      s += tag(L.xTag, y(OLD), (L.narrow ? "Old " : "Old high ") + OLD.toFixed(2), knocked ? C.up : C.dim, aO * (T < 23 ? 1 : 0.6));
      s += '<circle cx="' + x(PIV).toFixed(1) + '" cy="' + (y(BARS[PIV][1]) - 8).toFixed(1) + '" r="3.5" fill="' + C.dim + '" opacity="' + (aO * (1 - 0.5 * fade(T, 6, 0.4))).toFixed(3) + '"/>';
    }
    /* the new high */
    var aN = fade(T, TB[XB + 3][1], 0.4);
    if (aN > 0) {
      var broke = T >= TB[BOS][1], endN = broke ? x(BOS) + 8 : x(Math.max(last, XB)) + 10;
      s += hl(x(XB), endN, y(NEW), C.up, null, 2, aN);
      s += tag(L.xTag, y(NEW), (L.narrow ? "New " : "New high ") + NEW.toFixed(2), C.up, aN * (T < 23 ? 1 : 0.6));
    }
    /* clean bars between the extreme and the knock */
    var aC = fade(T, 12.4, 0.4) * (1 - fade(T, 14.8, 0.4));
    if (aC > 0) {
      s += '<rect x="' + (x(BRK + 1) - dx / 2).toFixed(1) + '" y="' + y(OLD + 0.04).toFixed(1) + '" width="' + (x(KN - 1) - x(BRK + 1) + dx).toFixed(1) + '" height="' + (y(OLD) - y(OLD + 0.04) + 18).toFixed(1) + '" fill="' + C.gold + '" opacity="' + (0.12 * aC).toFixed(3) + '"/>';
      s += txt((x(BRK + 1) + x(KN - 1)) / 2, y(OLD) + 14 * FS, (KN - BRK - 1) + " bars clear of the old high", C.gold, 12, "middle", 600, aC);
    }
    /* leg bracket */
    var aLg = fade(T, 12.0, 0.4) * (1 - 0.6 * fade(T, 23.2, 0.4));
    if (aLg > 0) {
      var bx = x(BRK) - dx * 0.9;
      s += '<g opacity="' + aLg.toFixed(3) + '"><line x1="' + bx.toFixed(1) + '" x2="' + bx.toFixed(1) + '" y1="' + y(OLD).toFixed(1) + '" y2="' + y(NEW).toFixed(1) + '" stroke="' + C.ink + '" stroke-width="1.5"/>' +
        '<line x1="' + (bx - 4).toFixed(1) + '" x2="' + (bx + 4).toFixed(1) + '" y1="' + y(NEW).toFixed(1) + '" y2="' + y(NEW).toFixed(1) + '" stroke="' + C.ink + '" stroke-width="1.5"/>' +
        txt(bx - 6, y((OLD + NEW) / 2) + 4, "leg " + LEG.toFixed(2), C.ink, 12, "end", 600) + "</g>";
    }

    /* candles */
    for (k = 0; k < N; k++) {
      var pr = clamp01((T - TB[k][0]) / (TB[k][1] - TB[k][0]));
      if (pr > 0) s += candle(x(k), y, BARS[k], pr, wB, after(k) ? 0.35 : 1);
    }

    /* markers */
    var aB = fade(T, TB[BRK][1], 0.3);
    if (aB > 0) s += txt(x(BRK), y(BARS[BRK][1]) - 10, "break", C.ink, 11.5, "middle", 600, aB * (1 - fade(T, 11.8, 0.4)));
    var aK = fade(T, TB[KN][1], 0.3);
    if (aK > 0) {
      s += '<circle cx="' + x(KN).toFixed(1) + '" cy="' + y(OLD).toFixed(1) + '" r="' + (11 * FS).toFixed(1) + '" fill="none" stroke="' + C.gold + '" stroke-width="2.2" opacity="' + aK.toFixed(3) + '"/>';
      s += txt(x(KN), y(BARS[KN][2]) + 30 * FS, "KNOCK", C.gold, 12, "middle", 700, aK);
    }
    var aBo = fade(T, TB[BOS][1], 0.3);
    if (aBo > 0) s += '<g opacity="' + aBo.toFixed(3) + '"><path d="M' + x(BOS).toFixed(1) + " " + (y(BARS[BOS][1]) - 8).toFixed(1) + ' l-6 -10 h12 z" fill="' + C.up + '"/>' +
      txt(x(BOS), y(BARS[BOS][1]) - 24, "BOS &#10003;", C.up, 12, "middle", 700) + "</g>";

    /* entry, stop, T2 */
    var aE = fade(T, 15.9, 0.4), xe = x(KN);
    s += hl(xe, L.x1, y(STOP), C.orange, "5 4", 1.6, aE);
    s += tag(L.xTag, y(STOP) + 22 * FS, "Stop " + STOP.toFixed(2), C.orange, aE, "#000");
    var aT = fade(T, TB[BOS][1] + 0.2, 0.4);
    s += hl(x(BOS), L.x1, y(T2), C.up, "5 4", 1.6, aT) + tag(L.xTag, y(T2), "T2 " + T2.toFixed(2), C.up, aT);
    if (TPB >= 0) {
      var aP = fade(T, TB[TPB][1], 0.3);
      if (aP > 0) s += '<circle cx="' + x(TPB).toFixed(1) + '" cy="' + y(T2).toFixed(1) + '" r="7" fill="none" stroke="' + C.up + '" stroke-width="2" opacity="' + aP.toFixed(3) + '"/>';
    }

    /* one caption box at a time, top left of the chart */
    var cx = L.cx, cy = L.cy;
    s += callout(cx, cy, ["Swing high " + OLD.toFixed(2), "3 lower bars each side confirm it"], C.dim, fade(T, TB[PIV + 3][1], 0.4) * (1 - fade(T, 6.0, 0.3)));
    s += callout(cx, cy, ["Close above " + OLD.toFixed(2) + " · " + clock(BRK), "The setup opens. Not an entry."], C.ink, fade(T, TB[BRK][1], 0.3) * (1 - fade(T, 9.0, 0.3)));
    s += callout(cx, cy, ["New high " + NEW.toFixed(2) + " · leg " + (LEG / ATR).toFixed(1) + " ATR", "Now it has to stay away from " + OLD.toFixed(2)], C.up, fade(T, 9.4, 0.3) * (1 - fade(T, 14.6, 0.3)));
    s += callout(cx, cy, ["The knock · " + clock(KN), "Low " + BARS[KN][2].toFixed(2) + ", close " + ENTRY.toFixed(2) + " back above", "Stop " + STOP.toFixed(2) + " · risk " + RISK.toFixed(2)], C.gold, fade(T, TB[KN][1], 0.3) * (1 - fade(T, 19.0, 0.3)));
    s += callout(cx, cy, ["Close " + BARS[BOS][3].toFixed(2) + " over " + NEW.toFixed(2) + " · " + clock(BOS), "Break of structure confirmed"], C.up, fade(T, TB[BOS][1], 0.3) * (1 - fade(T, 23.0, 0.3)));
    if (TPB >= 0) s += callout(cx, cy, ["T2 " + T2.toFixed(2) + " · " + clock(TPB), "+" + ((T2 - ENTRY) / RISK).toFixed(1) + "R from the knock"], C.up, fade(T, TB[TPB][1], 0.3));
    return s;
  }

  /* ---------- the player: captions, chips, play / replay, autoplay on view, responsive layout ---------- */
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

  window.KTAnim = { _bars: BARS, _levels: { OLD: OLD, NEW: NEW, LEG: LEG, ENTRY: ENTRY, STOP: STOP, T2: T2 } };   // exposed for testing
})();

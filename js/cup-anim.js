/* =====================================================================
   cup-anim.js — animated walkthrough of the Cup and Handle trade plan.

   Plays the page's worked example (cup low ~280, resistance 340, ATR 8,
   buy stop 340 limit 340.25, 12-point trailing stop from 328.25, half off at 360, rest at 380) through six
   stages: uptrend → the cup read by volume → the handle → clean air and
   the trifecta → trigger on the break → stop and two targets.

   The price path is scripted and labelled "Illustrative"; the levels are
   the page's own numbers. No market data.
   Mount: <section data-cup-anim>…</section>
   ===================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-cup-anim]");
  if (!root) return;
  var svg = root.querySelector("svg");
  var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
  var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay");
  var chips = root.querySelector(".anim-chips");
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- the example ---------- */
  var RES = 340, LOW = 280, ATR = 8, TRIG = 340.25, STOP = +(TRIG - 1.5 * ATR).toFixed(2), T1 = 360, T2 = 380, MM = RES + (RES - LOW);
  var RISK = TRIG - STOP;

  /* closes along the path (scripted), then OHLC around them */
  var path = [];
  function seg(a, b, n, curve) { for (var i = 1; i <= n; i++) { var f = i / n; path.push(a + (b - a) * (curve === "out" ? 1 - Math.pow(1 - f, 2) : curve === "in" ? f * f : f)); } }
  path.push(302);
  seg(302, 338, 8);                 // 0-8   prior uptrend into the left rim
  seg(338, 290, 9, "out");          // 9-17  the decline, heavy volume
  seg(290, 281, 4, "out");          // 18-21 into the base
  seg(281, 283, 7);                 // 22-28 the rounded bottom, quiet
  seg(283, 336, 14, "in");          // 29-42 the recovery, volume returns
  seg(336, 339, 2);                 // 43-44 right rim
  seg(339, 332, 4, "out");          // 45-48 the handle drifts lower
  seg(332, 335, 3);                 // 49-51 handle tightens
  var BREAK = path.length;          // 52    breakout bar
  path.push(344);
  seg(344, 361, 7);                 // 53-59 run to target one
  seg(361, 353, 3, "out");          // 60-62 pullback holds
  seg(353, 381, 8, "in");           // 63-70 target two
  var N = path.length;
  var rng = (function () { var s = 7; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  var BARS = path.map(function (c, i) {
    var o = i ? path[i - 1] + (rng() - 0.5) * 1.6 : c - 1.5;
    var hi = Math.max(o, c) + 0.6 + rng() * 2.2, lo = Math.min(o, c) - 0.6 - rng() * 2.2;
    return [o, hi, lo, c];
  });
  BARS[BREAK] = [335.5, 345.2, 334.8, 344];          // opens under the trigger, closes well above
  BARS[44][1] = 339.6; BARS[8][1] = 340.0;           // the rims define 340
  var T1_BAR = -1, T2_BAR = -1;
  for (var q = BREAK; q < N; q++) { if (T1_BAR < 0 && BARS[q][1] >= T1) T1_BAR = q; if (T2_BAR < 0 && BARS[q][1] >= T2) T2_BAR = q; }
  /* volume: heavy early in the decline, dry in the base, rising on the recovery, dry in the handle, big on the break */
  var VOL = path.map(function (c, i) {
    var v = i <= 8 ? 1.0 : i <= 13 ? 1.9 - (i - 9) * 0.12 : i <= 17 ? 1.2 : i <= 28 ? 0.55 : i <= 42 ? 0.7 + (i - 29) * 0.06 : i <= 44 ? 1.3 : i < BREAK ? 0.5 : i === BREAK ? 2.4 : 1.1;
    return v * (0.85 + rng() * 0.3);
  });
  /* rising 50-day SMA under the base (illustrative) */
  function sma50(i) { return 270 + i * 0.4; }
  function sma200(i) { return 259 + i * 0.24; }

  /* ---------- timeline ---------- */
  var STAGES = [
    { at: 0,  title: "Confirm the uptrend", text: "Price is above its 20, 50 and 200-day averages and the 50-day is sloping up. Without that trend a rounded shape is just a shape." },
    { at: 4,  title: "The cup, read by its volume", text: "Heavy selling volume on the way down from " + RES + ", volume drying up as the base forms near " + LOW + ", then volume returning as price recovers to the old high. The rising 50-day sits right under the base." },
    { at: 12, title: "The handle tightens", text: "Price pulls back a little below " + RES + " and holds the upper half of the cup, on volume below its average. Sellers are running out right before they need to." },
    { at: 16, title: "Clean air and the trifecta", text: "Nothing to the left above " + RES + " to cap the move, and the stock, its sector and the market are all bullish together." },
    { at: 20, title: "Trigger on the break", text: "A buy stop-limit order: it triggers when price breaks " + RES + ", the last two candles' highs, and pays no more than " + TRIG.toFixed(2) + ". It fills only when price proves the break, here on more than twice the average volume." },
    { at: 24, title: "Stop and two targets", text: "A trailing stop 1.5 × the " + ATR + "-point ATR = 12 points below, starting at " + STOP.toFixed(2) + ". Half off at " + T1 + ", where the trail already sits above the entry, the rest at " + T2 + ", short of the textbook " + MM + ". About " + (((T1 - TRIG) + (T2 - TRIG)) / 2 / RISK).toFixed(1) + "R on the whole position." }
  ];
  var END = 34;
  var TB = [];
  for (var i = 0; i < N; i++) {
    if (i <= 8) TB[i] = [0.3 + i * 0.25, 0.3 + i * 0.25 + 0.3];
    else if (i < 45) TB[i] = [4.3 + (i - 9) * 0.2, 4.3 + (i - 9) * 0.2 + 0.25];
    else if (i < BREAK) TB[i] = [12.3 + (i - 45) * 0.42, 12.3 + (i - 45) * 0.42 + 0.35];
    else if (i === BREAK) TB[i] = [20.6, 22.6];
    else TB[i] = [24.6 + (i - BREAK - 1) * 0.42, 24.6 + (i - BREAK - 1) * 0.42 + 0.35];
  }

  /* ---------- geometry ---------- */
  var W = 1180, H = 520, YT = 40, YB = 372, PMIN = 254, PMAX = 410, VT = 400, VB = 478, XTAG = 1012, XAX = 1172;
  function y(p) { return YB - (p - PMIN) / (PMAX - PMIN) * (YB - YT); }
  function x(i) { return 66 + i * 13.4; }
  var XEND = 1000;

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
  function candle(xx, b, prog, wBody, op) {
    if (prog <= 0) return "";
    var o = b[0], h = b[1], l = b[2], c = b[3], up = c >= o;
    var pth = up ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
    var cur = prog >= 1 ? c : pth[idx] + (pth[idx + 1] - pth[idx]) * f;
    var hi = o, lo = o;
    for (var k = 0; k <= idx; k++) { hi = Math.max(hi, pth[k]); lo = Math.min(lo, pth[k]); }
    hi = Math.max(hi, cur); lo = Math.min(lo, cur);
    var col = cur >= o ? "#30d158" : "#ff453a", top = y(Math.max(o, cur)), bh = Math.max(1.5, Math.abs(y(o) - y(cur)));
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
  function poly(fn, i0, i1, col, w, op, dash) {
    var pts = [];
    for (var k = i0; k <= i1; k++) pts.push(x(k).toFixed(1) + "," + y(fn(k)).toFixed(1));
    return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + ' opacity="' + op.toFixed(3) + '"/>';
  }

  /* ---------- one frame ---------- */
  function frame(T) {
    var s = '<rect width="' + W + '" height="' + H + '" fill="#1d1d1f"/>';
    [280, 300, 320, 340, 360, 380, 400].forEach(function (p) { s += hline(56, XEND, p, "rgba(255,255,255,0.05)", null, 1) + txt(XAX, y(p) + 4, p.toFixed(2), "#6e6e73", 11, "end"); });
    s += txt(60, 26, "Daily bars", "#86868b", 12);
    s += txt(60, VT - 8, "Volume", "#86868b", 12);
    s += '<line x1="56" x2="' + XEND + '" y1="' + VB + '" y2="' + VB + '" stroke="#3a3a3c"/>';
    s += txt(XAX, 508, "Illustrative", "#6e6e73", 11, "end");

    /* moving averages, growing with the bars */
    var last = -1;
    for (var k = 0; k < N; k++) if (T >= TB[k][0]) last = k;
    if (last >= 1) {
      var a = fade(T, 0.6, 0.6);
      s += poly(sma200, 0, last, "#8e8e93", 1.4, a * 0.8, "4 4") + poly(sma50, 0, last, "#2997ff", 2, a);
      if (last >= 6) s += txt(x(Math.min(last, 30)), y(sma50(Math.min(last, 30))) + 18, "50-day, rising", "#2997ff", 12, "start", 600, a) +
        txt(x(Math.min(last, 30)), y(sma200(Math.min(last, 30))) + 16, "200-day", "#8e8e93", 11, "start", null, a);
    }
    s += callout(x(1), y(372), ["Uptrend first", "Above the 20, 50 and 200-day;", "the 50-day sloping up"], "#2997ff", fade(T, 1.4, 0.4) * (1 - fade(T, 4.6, 0.5)));

    /* resistance and the cup outline */
    a = fade(T, 11.4, 0.5);
    s += hline(x(8) - 8, XEND, RES, "#ff9f0a", null, 1.6, a) + tag(RES, "Resistance " + RES, "#ff9f0a", a * (1 - fade(T, 20.4, 0.4)), -2);
    if (a > 0) {
      var arc = "M " + x(8) + "," + y(340) + " C " + x(16) + "," + y(268) + " " + x(36) + "," + y(268) + " " + x(44) + "," + y(340);
      s += '<path d="' + arc + '" fill="none" stroke="#ff9f0a" stroke-width="1.4" stroke-dasharray="3 5" opacity="' + (0.7 * a).toFixed(3) + '"/>';
      s += txt(x(26), y(LOW) + 30, "cup low ~" + LOW + " · depth " + (RES - LOW), "#ff9f0a", 12, "middle", 600, a);
    }

    /* stage 4: clean air + trifecta */
    a = fade(T, 16.2, 0.5) * (1 - fade(T, 24.4, 0.6));
    if (a > 0) {
      s += '<rect x="' + (x(8) - 8) + '" y="' + y(392) + '" width="' + (XEND - x(8) + 8) + '" height="' + (y(RES) - y(392)) + '" fill="#30d158" opacity="' + (0.06 * a).toFixed(3) + '"/>';
      s += txt(x(10), y(386), "clean air: nothing to the left above " + RES, "#30d158", 12, "start", 600, a);
      ["Stock bullish", "Sector bullish", "Market bullish"].forEach(function (lbl, k) {
        var g = fade(T, 16.8 + k * 0.7, 0.3) * (1 - fade(T, 24.4, 0.6));
        s += callout(x(49) + 6, y(400) + k * 34, ["✓ " + lbl], "#30d158", g);
      });
    }

    /* bars + volume */
    var vmax = 2.6;
    function vy(v) { return VB - v / vmax * (VB - VT - 10); }
    s += '<line x1="56" x2="' + XEND + '" y1="' + vy(1) + '" y2="' + vy(1) + '" stroke="#ffd60a" stroke-dasharray="3 4" opacity="' + (0.6 * fade(T, 4.4, 0.5)).toFixed(3) + '"/>' +
      txt(XEND - 4, vy(1) - 4, "50-day average volume", "#ffd60a", 11, "end", null, 0.8 * fade(T, 4.4, 0.5));
    BARS.forEach(function (b, j) {
      var p = clamp01((T - TB[j][0]) / (TB[j][1] - TB[j][0]));
      if (p <= 0) return;
      var after = T2_BAR >= 0 && j > T2_BAR;
      s += candle(x(j), b, p, 8, after ? 0.35 : 1);
      var v = VOL[j] * p, col = j === BREAK ? "#ffd60a" : (j >= 9 && j <= 13) ? "#ff6961" : (j >= 18 && j <= 28) || (j >= 45 && j < BREAK) ? "#636366" : (j >= 33 && j <= 44) ? "#30d158" : "#48484a";
      s += '<rect x="' + (x(j) - 4.5) + '" y="' + vy(v).toFixed(1) + '" width="9" height="' + (VB - vy(v)).toFixed(1) + '" rx="1" fill="' + col + '" opacity="' + (after ? 0.35 : 0.9) + '"/>';
    });

    /* stage 2 callouts */
    s += callout(x(10), y(374), ["Heavy selling early", "Profit-taking off the old high"], "#ff6961", fade(T, 5.6, 0.4) * (1 - fade(T, 12, 0.5)));
    s += callout(x(18), VT + 2, ["Volume dries up in the base"], "#a1a1a6", fade(T, 7.6, 0.4) * (1 - fade(T, 12, 0.5)));
    s += callout(x(30), y(374), ["Volume returns on the recovery", "Above its average: real buying"], "#30d158", fade(T, 10.0, 0.4) * (1 - fade(T, 12.4, 0.5)));

    /* stage 3: the handle */
    a = fade(T, 13.4, 0.4) * (1 - fade(T, 16.2, 0.5));
    if (a > 0) {
      s += '<rect x="' + (x(45) - 7) + '" y="' + y(341) + '" width="' + (x(BREAK - 1) - x(45) + 14) + '" height="' + (y(329) - y(341)) + '" rx="4" fill="none" stroke="#f5f5f7" stroke-width="1.2" stroke-dasharray="3 3" opacity="' + a.toFixed(3) + '"/>';
      s += callout(x(45) - 14, y(380), ["The handle", "Upper half of the cup,", "volume under its average"], "#f5f5f7", a, true);
    }

    /* stage 5: the trigger */
    a = fade(T, 20.2, 0.4);
    s += hline(x(BREAK) - 30, XEND, TRIG, "#2997ff", "6 4", 1.6, a) + tag(TRIG, "Buy stop " + RES, "#2997ff", a * ((T1_BAR >= 0 && T >= TB[T1_BAR][1]) ? 0 : 1), -12, "#fff");
    a = fade(T, TB[BREAK][1], 0.3);
    if (a > 0) {
      s += '<circle cx="' + x(BREAK) + '" cy="' + y(TRIG).toFixed(1) + '" r="6" fill="none" stroke="#2997ff" stroke-width="2" opacity="' + a.toFixed(3) + '"/>';
      s += callout(x(BREAK) - 12, y(300), ["Filled " + TRIG.toFixed(2), "Price confirmed the break,", "volume 2.4× its average"], "#2997ff", a * (1 - fade(T, 25.4, 0.5)), true);
    }

    /* stage 6: stop and targets */
    var xe = x(BREAK);
    a = fade(T, 24.1, 0.4);
    var trimmed = T1_BAR >= 0 && T >= TB[T1_BAR][1];
    s += hline(xe, XEND, trimmed ? T1 - 1.5 * ATR : STOP, "#ff453a", "5 4", 1.6, a) + tag(trimmed ? T1 - 1.5 * ATR : STOP, trimmed ? "Trail " + (T1 - 1.5 * ATR).toFixed(2) : "Trail " + STOP.toFixed(2), "#ff453a", a, 0, "#fff");
    a = fade(T, 24.5, 0.4);
    s += hline(xe, XEND, T1, "#30d158", null, 1.6, a) + tag(T1, "Target 1 · " + T1, "#30d158", a);
    s += hline(xe, XEND, T2, "#30d158", null, 1.6, a) + tag(T2, "Target 2 · " + T2, "#30d158", a);
    s += hline(xe, XEND, MM, "#8e8e93", "2 4", 1.2, a) + tag(MM, "Measured " + MM, "#48484a", a, 0, "#f5f5f7");
    s += callout(xe + 40, y(STOP) + 8, ["Trail stop " + STOP.toFixed(2) + " · 1.5 × ATR " + ATR, "Risk " + RISK.toFixed(2) + " a share"], "#ff6961", fade(T, 24.8, 0.4) * (1 - fade(T, 28.6, 0.5)));
    if (T1_BAR >= 0) {
      a = fade(T, TB[T1_BAR][1], 0.3);
      s += callout(x(T1_BAR) - 10, y(T1) - 64, ["Half off at " + T1, "+" + ((T1 - TRIG) / RISK).toFixed(2) + "R · rest risk-free"], "#30d158", a * (1 - fade(T, TB[Math.min(N - 1, T1_BAR + 5)][1], 0.5)), true);
    }
    if (T2_BAR >= 0) {
      a = fade(T, TB[T2_BAR][1], 0.3);
      if (a > 0) s += '<circle cx="' + x(T2_BAR) + '" cy="' + y(T2).toFixed(1) + '" r="7" fill="none" stroke="#30d158" stroke-width="2" opacity="' + a.toFixed(3) + '"/>';
      s += callout(x(T2_BAR) - 14, y(T2) - 62, ["Rest out at " + T2 + " · +" + ((T2 - TRIG) / RISK).toFixed(2) + "R", "Whole trade ≈ " + (((T1 - TRIG) + (T2 - TRIG)) / 2 / RISK).toFixed(1) + "R"], "#30d158", a, true);
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
  function follow() {
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 2) return;
    var fx = T < 4 ? x(8) : T < 12 ? x(Math.min(44, 9 + Math.floor((T - 4.3) / 0.2))) : T < 20 ? x(BREAK) : x(N - 1) + 60;
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
    io.observe(svg);
  }
})();

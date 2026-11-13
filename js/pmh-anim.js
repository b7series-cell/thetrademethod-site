/* =====================================================================
   pmh-anim.js — animated walkthrough of the Premarket High Break.

   Plays one illustrative morning through the page's six stages:
   before the bell → the gate at 9:30 → the trigger (a stuff first, then
   the real close above PMH on volume) → candle check → entry and stop →
   manage (trim at a whole number, trail the runner on the 9 EMA).

   Scripted data, labelled "Illustrative" on the chart. No market data.
   Mount: <section data-pmh-anim>…</section>

   Also: [data-pmh-steps] turns the six step cards into a click-through
   stepper, with "the whole trade on one chart" beside the current step.
   Without the script the six steps simply show as cards.
   ===================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-pmh-anim]");
  if (!root) return;
  var svg = root.querySelector("svg");
  var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
  var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay");
  var chips = root.querySelector(".anim-chips");
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- the morning (illustrative) ---------- */
  var PDC = 48.20, PDH = 48.90, PMH = 50.60;
  var PM = [ // 30-minute pre-market bars, 4:00 → 9:00
    [48.95, 49.30, 48.90, 49.20], [49.20, 49.55, 49.10, 49.45], [49.45, 49.60, 49.30, 49.40], [49.40, 49.85, 49.35, 49.80],
    [49.80, 50.05, 49.70, 49.95], [49.95, 50.10, 49.75, 49.85], [49.85, 50.30, 49.80, 50.25], [50.25, 50.45, 50.10, 50.20],
    [50.20, 50.55, 50.15, 50.45], [50.45, 50.60, 50.20, 50.30], [50.30, 50.40, 50.05, 50.15]
  ];
  var PMV = [0.15, 0.12, 0.10, 0.14, 0.18, 0.16, 0.22, 0.25, 0.42, 0.38, 0.30];
  var RTH = [ // 2-minute bars from 9:30
    [50.20, 50.72, 50.10, 50.40], [50.40, 50.48, 50.12, 50.22], [50.22, 51.32, 50.05, 51.22], [51.22, 51.60, 51.15, 51.55],
    [51.55, 51.95, 51.45, 51.88], [51.88, 52.10, 51.80, 52.02], [52.02, 52.40, 51.95, 52.35], [52.35, 52.80, 52.30, 52.72],
    [52.72, 53.10, 52.60, 52.98], [52.98, 53.05, 52.70, 52.80], [52.80, 53.20, 52.75, 53.15], [53.15, 53.40, 53.05, 53.30],
    [53.30, 53.35, 52.95, 53.05], [53.05, 53.15, 52.80, 52.90], [52.90, 53.00, 52.55, 52.60], [52.60, 52.70, 52.25, 52.32]
  ];
  var RVOL = [2.1, 1.4, 3.6, 1.8, 1.6, 1.4, 1.3, 1.2, 1.5, 1.0, 1.1, 0.9, 0.9, 0.8, 1.0, 0.9];
  var TRIG = 2, ENTRY = RTH[TRIG][3], STOP = +(RTH[TRIG][2] - 0.01).toFixed(2), RISK = ENTRY - STOP;
  var TRIM = 53.00, TRIM_BAR = 8;

  /* 9 EMA on the 2-minute closes, and the first close under it after entry */
  var ema = [], k = 2 / 10, EXIT_BAR = -1;
  RTH.forEach(function (b, i) { ema.push(i ? b[3] * k + ema[i - 1] * (1 - k) : b[3]); });
  for (var i = TRIG + 3; i < RTH.length; i++) if (RTH[i][3] < ema[i]) { EXIT_BAR = i; break; }
  var EXIT = RTH[EXIT_BAR][3];
  function r(x) { return (x / RISK).toFixed(1); }

  /* ---------- timeline (seconds) ---------- */
  var STAGES = [
    { at: 0,  title: "Before the bell", text: "Pre-market prints a range on the news. Its high, " + PMH.toFixed(2) + ", is the most anyone would pay all morning, with hours to study the chart. Yesterday's high (" + PDH.toFixed(2) + ") and close (" + PDC.toFixed(2) + ") sit below." },
    { at: 6,  title: "The gate at 9:30", text: "The open prints above yesterday's high and above the prior close. Both, not one. Everyone who bought yesterday is green, so nobody is waiting to sell at breakeven." },
    { at: 9,  title: "The trigger", text: "The first candle wicks through the premarket high and closes back under it: touched, not closed, so no trade. Two candles later one closes above it on " + RVOL[TRIG] + "× relative volume. That is the trigger." },
    { at: 17, title: "Check the candle", text: "Real green body, upper wick no more than half the body. This one: body " + (RTH[TRIG][3] - RTH[TRIG][0]).toFixed(2) + ", upper wick " + (RTH[TRIG][1] - RTH[TRIG][3]).toFixed(2) + ". It passes." },
    { at: 20, title: "Entry and stop", text: "Enter at the close of the breakout candle, " + ENTRY.toFixed(2) + ". The stop goes under that candle's low, " + STOP.toFixed(2) + ": $" + RISK.toFixed(2) + " a share, " + (RISK / ENTRY * 100).toFixed(1) + "%. Size from that distance, never from the level." },
    { at: 23, title: "Manage it", text: "Trim into strength at the whole number, " + TRIM.toFixed(2) + " (+" + r(TRIM - ENTRY) + "R). Trail the runner on the 9 EMA and get out on the first 2-minute close under it: " + EXIT.toFixed(2) + " (+" + r(EXIT - ENTRY) + "R)." }
  ];
  var END = 33;
  var T_PM = function (j) { return 0.3 + j * 0.42; };               // pre-market bars pop in
  var CANDLES = [];                                                  // RTH bar timing [start, end]
  CANDLES[0] = [9.4, 11.6]; CANDLES[1] = [12.0, 13.0]; CANDLES[2] = [13.4, 16.0];
  for (var j = 3; j < RTH.length; j++) CANDLES[j] = [23.4 + (j - 3) * 0.55, 23.4 + (j - 3) * 0.55 + 0.5];

  /* ---------- geometry ---------- */
  var W = 1180, YT = 56, YB = 392, PMIN = 48.0, PMAX = 54.0, VT = 418, VB = 492;
  function y(p) { return YB - (p - PMIN) / (PMAX - PMIN) * (YB - YT); }
  function xPM(j) { return 76 + j * 26; }
  function xR(j) { return 418 + j * 38; }
  var XEND = 1010;

  /* ---------- drawing helpers ---------- */
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function txt(x, yy, s, col, size, anchor, weight, op) {
    return '<text x="' + x + '" y="' + yy + '" fill="' + col + '" font-size="' + (size || 13) + '" text-anchor="' + (anchor || "start") + '"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  function hline(x1, x2, p, col, dash, w, op) {
    return '<line x1="' + x1 + '" x2="' + x2 + '" y1="' + y(p).toFixed(1) + '" y2="' + y(p).toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1.5) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function tag(xx, p, label, col, op) {   // right-axis price tag
    var yy = y(p);
    return '<g opacity="' + (op == null ? 1 : op).toFixed(3) + '"><rect x="' + xx + '" y="' + (yy - 10) + '" width="118" height="20" rx="5" fill="' + col + '"/>' +
      txt(xx + 8, yy + 4.5, label, "#000", 12, "start", 600) + "</g>";
  }
  /* a candle partly formed: price walks o → (l, h | h, l) → c */
  function candle(x, b, prog, wBody, colUp, colDn, op, glow) {
    if (prog <= 0) return "";
    var o = b[0], h = b[1], l = b[2], c = b[3], up = c >= o;
    var path = up ? [o, l, h, c] : [o, h, l, c], seg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(seg)), f = seg - idx;
    var cur = prog >= 1 ? c : path[idx] + (path[idx + 1] - path[idx]) * f;
    var hi = o, lo = o;
    for (var q = 0; q <= idx; q++) { hi = Math.max(hi, path[q]); lo = Math.min(lo, path[q]); }
    hi = Math.max(hi, cur); lo = Math.min(lo, cur);
    var isUp = cur >= o, col = isUp ? colUp : colDn, top = y(Math.max(o, cur)), bh = Math.max(1.5, Math.abs(y(o) - y(cur)));
    var g = "";
    if (glow) g += '<rect x="' + (x - wBody / 2 - 6) + '" y="' + (y(hi) - 6) + '" width="' + (wBody + 12) + '" height="' + (y(lo) - y(hi) + 12) + '" rx="6" fill="#ffd60a" opacity="' + (0.16 * glow).toFixed(3) + '"/>';
    return '<g opacity="' + (op == null ? 1 : op) + '">' + g +
      '<line x1="' + x + '" x2="' + x + '" y1="' + y(hi).toFixed(1) + '" y2="' + y(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.5"/>' +
      '<rect x="' + (x - wBody / 2) + '" y="' + top.toFixed(1) + '" width="' + wBody + '" height="' + bh.toFixed(1) + '" rx="2" fill="' + col + '"/></g>';
  }
  function callout(x, yy, lines, col, op, anchorRight) {
    if (op <= 0) return "";
    var w = 12 + Math.max.apply(null, lines.map(function (s) { return s.length; })) * 7.1, h = 10 + lines.length * 17;
    var x0 = anchorRight ? x - w : x;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0 + '" y="' + yy + '" width="' + w.toFixed(0) + '" height="' + h + '" rx="8" fill="#2c2c2e" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, i) { s += txt(x0 + 10, yy + 20 + i * 17, ln, i === 0 ? col : "#d1d1d6", 13, "start", i === 0 ? 600 : null); });
    return s + "</g>";
  }

  /* ---------- one frame ---------- */
  function frame(T) {
    var s = "";
    /* backdrop */
    s += '<rect width="' + W + '" height="520" fill="#1d1d1f"/>';
    s += '<rect x="60" y="' + YT + '" width="' + (xPM(10) + 18 - 60) + '" height="' + (VB - YT) + '" fill="rgba(142,142,147,0.06)"/>';
    [49, 50, 51, 52, 53, 54].forEach(function (p) { s += hline(60, XEND, p, "rgba(255,255,255,0.05)", null, 1) + txt(1172, y(p) + 4, p.toFixed(2), "#6e6e73", 11, "end"); });
    s += txt(66, 26, "Pre-market · 30-minute bars", "#86868b", 12);
    s += txt(404, 26, "Regular session · 2-minute bars", "#86868b", 12);
    s += '<line x1="392" x2="392" y1="' + (YT - 6) + '" y2="' + VB + '" stroke="#48484a" stroke-dasharray="3 4"/>';
    s += txt(392, 512, "9:30", "#a1a1a6", 12, "middle", 600);
    s += txt(xPM(0), 512, "4:00", "#6e6e73", 11, "middle") + txt(xPM(10), 512, "9:00", "#6e6e73", 11, "middle");
    s += txt(xR(5), 512, "9:40", "#6e6e73", 11, "middle") + txt(xR(10), 512, "9:50", "#6e6e73", 11, "middle") + txt(xR(15), 512, "10:00", "#6e6e73", 11, "middle");
    s += txt(1172, 512, "Illustrative", "#6e6e73", 11, "end");

    /* yesterday's levels */
    var a = fade(T, 0, 0.6);
    s += hline(60, XEND, PDH, "#ff9f0a", "6 5", 1.4, a) + tag(1014, PDH, "PDH " + PDH.toFixed(2), "#ff9f0a", a);
    s += hline(60, XEND, PDC, "#8e8e93", "6 5", 1.2, a) + tag(1014, PDC, "Close " + PDC.toFixed(2), "#8e8e93", a);

    /* pre-market candles + volume */
    PM.forEach(function (b, j) {
      var p = fade(T, T_PM(j), 0.35);
      s += candle(xPM(j), b, p, 12, "#8e8e93", "#636366", 1);
      if (p > 0) s += '<rect x="' + (xPM(j) - 6) + '" y="' + (VB - PMV[j] * 22 * p) + '" width="12" height="' + (PMV[j] * 22 * p) + '" fill="#48484a"/>';
    });
    /* PMH */
    a = fade(T, 5.0, 0.5);
    s += hline(xPM(9), XEND, PMH, "#30d158", null, 2, a) + tag(1014, PMH, "PMH " + PMH.toFixed(2), "#30d158", a);
    s += callout(xPM(3) - 20, y(PMH) - 62, ["Pre-market high", "The most anyone paid all morning"], "#30d158", a * (1 - fade(T, 9, 0.5)));

    /* stage 2: the gate */
    a = fade(T, 6.3, 0.4);
    if (a > 0) {
      s += '<circle cx="' + xR(0) + '" cy="' + y(RTH[0][0]) + '" r="6" fill="#f5f5f7" opacity="' + (a * (1 - fade(T, 9.2, 0.5))).toFixed(3) + '"/>';
      s += callout(xR(0) + 16, y(RTH[0][0]) + 18, ["Open " + RTH[0][0].toFixed(2),
        (T >= 7.0 ? "✓ above yesterday's high" : ""), (T >= 7.7 ? "✓ above the prior close" : "")].filter(Boolean), "#f5f5f7", a * (1 - fade(T, 9.2, 0.5)));
    }

    /* volume threshold line */
    a = fade(T, 9.2, 0.5);
    var vy = function (v) { return VB - Math.min(v, 4) / 4 * (VB - VT); };
    s += '<line x1="400" x2="' + XEND + '" y1="' + vy(3) + '" y2="' + vy(3) + '" stroke="#ffd60a" stroke-dasharray="3 4" opacity="' + (a * 0.7) + '"/>' +
         txt(XEND - 4, vy(3) - 5, "3× relative volume", "#ffd60a", 11, "end", null, a * 0.8);

    /* RTH candles */
    RTH.forEach(function (b, j) {
      var c = CANDLES[j], p = clamp01((T - c[0]) / (c[1] - c[0]));
      if (p <= 0) return;
      var after = j > EXIT_BAR;
      var glow = j === TRIG ? clamp01((T - (c[0] + 1.6)) / 0.6) : 0;
      s += candle(xR(j), b, p, 22, "#30d158", "#ff453a", after ? 0.35 : 1, glow);
      var v = RVOL[j] * p;
      s += '<rect x="' + (xR(j) - 11) + '" y="' + vy(v) + '" width="22" height="' + (VB - vy(v)) + '" rx="2" fill="' +
        (j === TRIG ? "#ffd60a" : "#48484a") + '" opacity="' + (after ? 0.35 : 1) + '"/>';
    });

    /* stage 3 callouts */
    a = fade(T, 11.6, 0.4) * (1 - fade(T, 15.4, 0.5));
    s += callout(xR(0) - 14, y(RTH[0][1]) - 74, ["Touched, not closed", "Wicked through PMH, closed under it.", "No trade."], "#ff6961", a, false);
    a = fade(T, 16.0, 0.4) * (1 - fade(T, 20, 0.5));
    s += callout(xR(TRIG) + 20, y(RTH[TRIG][1]) - 70, ["The trigger", "Closed above PMH", "on " + RVOL[TRIG] + "× relative volume"], "#ffd60a", a, false);

    /* stage 4: candle check bracket (right of the trigger candle) */
    a = fade(T, 17.2, 0.4) * (1 - fade(T, 20, 0.4));
    if (a > 0) {
      var bx = xR(TRIG) + 20, b2 = RTH[TRIG];
      s += '<g opacity="' + a.toFixed(3) + '"><path d="M' + bx + "," + y(b2[3]) + " h8 V" + y(b2[0]) + ' h-8" fill="none" stroke="#f5f5f7" stroke-width="1.4"/>' +
        '<path d="M' + bx + "," + y(b2[1]) + " h8 V" + y(b2[3]) + ' h-8" fill="none" stroke="#ffd60a" stroke-width="1.4"/>' +
        txt(bx + 16, y(b2[1]) + 4, "upper wick " + (b2[1] - b2[3]).toFixed(2), "#ffd60a", 12, "start", 600) +
        txt(bx + 16, (y(b2[3]) + y(b2[0])) / 2 + 4, "body " + (b2[3] - b2[0]).toFixed(2), "#f5f5f7", 12, "start", 600) +
        txt(bx + 16, (y(b2[3]) + y(b2[0])) / 2 + 22, "\u2713 wick under half the body", "#30d158", 12, "start") + "</g>";
    }

    /* stage 5: entry, stop, risk */
    a = fade(T, 20.2, 0.4);
    var xe = xR(TRIG);
    var lineEnd = T >= 23 ? Math.min(XEND, xR(Math.max(TRIG, Math.min(EXIT_BAR, Math.floor((T - 23.4) / 0.55) + 3)))) : xe + 60;
    s += hline(xe, lineEnd, ENTRY, "#2997ff", null, 1.6, a) + tag(1014, ENTRY, "Entry " + ENTRY.toFixed(2), "#2997ff", a);
    a = fade(T, 20.9, 0.4);
    s += hline(xe, lineEnd, STOP, "#ff453a", "5 4", 1.6, a) + tag(1014, STOP, "Stop " + STOP.toFixed(2), "#ff453a", a);
    if (a > 0) s += '<rect x="' + (xe + 14) + '" y="' + y(ENTRY) + '" width="44" height="' + (y(STOP) - y(ENTRY)) + '" fill="#ff453a" opacity="' + (0.14 * a).toFixed(3) + '"/>';
    a = fade(T, 21.5, 0.4) * (1 - fade(T, 25, 0.6));
    s += callout(xe + 66, y(STOP) + 8, ["Risk $" + RISK.toFixed(2) + " a share", (RISK / ENTRY * 100).toFixed(1) + "% · size from this"], "#ff6961", a);

    /* stage 6: 9 EMA, trim, exit */
    var lastVis = -1;
    RTH.forEach(function (b, j) { if (T >= CANDLES[j][1]) lastVis = j; });
    if (T >= 23 && lastVis >= TRIG) {
      var pts = [];
      for (var j2 = TRIG; j2 <= Math.min(lastVis, EXIT_BAR); j2++) pts.push(xR(j2) + "," + y(ema[j2]).toFixed(1));
      s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#bf5af2" stroke-width="2" opacity="' + fade(T, 23, 0.6).toFixed(3) + '"/>';
      if (lastVis >= TRIG + 4) s += txt(xR(TRIG + 4) - 8, y(ema[TRIG + 4]) - 10, "9 EMA", "#bf5af2", 12, "end", 600, fade(T, CANDLES[TRIG + 4][1], 0.5));
    }
    var tTrim = CANDLES[TRIM_BAR][1], tExit = CANDLES[EXIT_BAR][1];
    a = fade(T, tTrim, 0.3);
    if (a > 0) {
      s += hline(xR(TRIM_BAR) - 30, xR(TRIM_BAR) + 30, TRIM, "#ff9f0a", null, 2, a);
      s += callout(xR(TRIM_BAR) + 18, y(53.4) - 58, ["Trim " + TRIM.toFixed(2) + " · +" + r(TRIM - ENTRY) + "R", "Whole number, into strength"], "#ff9f0a", a, false);
    }
    a = fade(T, tExit, 0.3);
    if (a > 0) {
      s += '<circle cx="' + xR(EXIT_BAR) + '" cy="' + y(EXIT) + '" r="7" fill="none" stroke="#bf5af2" stroke-width="2" opacity="' + a + '"/>';
      s += callout(xR(EXIT_BAR) + 12, y(EXIT) + 18, ["Runner out " + EXIT.toFixed(2) + " · +" + r(EXIT - ENTRY) + "R", "First close under the 9 EMA"], "#bf5af2", a, true);
    }
    svg.innerHTML = s;
  }

  /* ---------- captions + controls ---------- */
  function stageAt(T) { var k2 = 0; STAGES.forEach(function (st, i) { if (T >= st.at) k2 = i; }); return k2; }
  var shown = -1;
  function caption(T) {
    var k2 = stageAt(T);
    if (k2 === shown) return;
    shown = k2;
    cap.n.textContent = (k2 + 1) + " / " + STAGES.length;
    cap.t.textContent = STAGES[k2].title;
    cap.b.textContent = STAGES[k2].text;
    chips.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-current", i === k2 ? "step" : "false"); });
  }
  chips.innerHTML = STAGES.map(function (st, i) { return '<button type="button" data-i="' + i + '">' + (i + 1) + ". " + st.title + "</button>"; }).join("");

  var T = END, playing = false, last = 0, raf = 0;
  var scroller = root.querySelector(".anim-scroll");
  function follow() {   // narrow screens: keep the action in view while it plays
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 2) return;
    var fx = T < 6 ? xPM(10) : T < 23 ? xR(3) : xR(Math.min(RTH.length - 1, Math.max(3, Math.floor((T - 23.4) / 0.55) + 3)));
    if (T >= END) fx = W;
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
    var i2 = +b.getAttribute("data-i");
    if (REDUCED) { T = i2 + 1 < STAGES.length ? STAGES[i2 + 1].at - 0.01 : END; draw(); return; }
    T = STAGES[i2].at; draw(); setPlaying(true);
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

/* =====================================================================
   [data-pmh-steps] — the six steps as a click-through stepper, one step
   at a time beside "the whole trade on one chart" (moved in from its
   panel). Chart parts carry data-s="<step numbers>"; the current step's
   parts stay lit and the rest dim. Same pattern as gap-give-and-go.html.
   ===================================================================== */
(function () {
  "use strict";

  var root = document.querySelector("[data-pmh-steps]");
  if (!root) return;
  var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
  if (steps.length !== 6) return;
  var INFO = [
    { k: "Before the bell",  c: "#2997ff", tag: "Prep · before 9:30" },
    { k: "The gate at 9:30", c: "#f4b942", tag: "Gate · the open" },
    { k: "The trigger",      c: "#30d158", tag: "Act · 2-minute close" },
    { k: "Check the candle", c: "#30d158", tag: "Check · body and wick" },
    { k: "Entry and stop",   c: "#22d3ee", tag: "Act · fill and stop" },
    { k: "Manage it",        c: "#f4b942", tag: "Manage · trim and trail" }
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
  left.appendChild(tag);
  steps.forEach(function (st) { left.appendChild(st); });
  left.appendChild(nav);
  body.appendChild(left);

  /* bring the annotated chart in beside the steps; its old panel goes */
  var whole = document.querySelector(".pmh-whole");
  var wsvg = whole && whole.querySelector("svg");
  if (wsvg) {
    var fig = document.createElement("div"); fig.className = "gs-chart";
    fig.innerHTML = '<p class="gs-cap">The whole trade on one chart</p>';
    fig.appendChild(wsvg);
    body.appendChild(fig);
    whole.parentNode.removeChild(whole);
  } else {
    body.style.gridTemplateColumns = "1fr";
  }
  root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
  var lit = wsvg ? Array.prototype.slice.call(wsvg.querySelectorAll("[data-s]")) : [];

  function show(k, focus) {
    cur = k;
    steps.forEach(function (st, i) { st.hidden = i !== k; });
    bar.querySelectorAll(".gs-step").forEach(function (b, i) {
      b.classList.toggle("is-done", i < k); b.classList.toggle("is-on", i === k);
      b.setAttribute("aria-selected", i === k ? "true" : "false");
      b.querySelector("b").textContent = i < k ? "✓" : String(i + 1);
    });
    bar.querySelector(".gs-line i").style.width = (k / 5 * 100) + "%";
    lit.forEach(function (el) {   // light this step's part of the chart, dim the rest
      el.style.opacity = (" " + el.getAttribute("data-s") + " ").indexOf(" " + (k + 1) + " ") >= 0 ? "" : "0.14";
    });
    root.style.setProperty("--gs", INFO[k].c);
    tag.textContent = "Step " + (k + 1) + " of 6 · " + INFO[k].tag;
    nav.querySelector(".gs-prev").disabled = k === 0;
    nav.querySelector(".gs-next").innerHTML = k < 5 ? "Next: " + INFO[k + 1].k + " &rsaquo;" : "Start over &rsaquo;";
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

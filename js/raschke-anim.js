/* =====================================================================
   raschke-anim.js — the animated walkthroughs on linda-raschke.html.

     [data-rr-anim="spike"]     the volume spike test: 5-minute spike, 1-minute swing high
     [data-rr-anim="day"]       the main idea: two-day rhythm, first-hour range, trend day
     [data-rr-anim="exits"]     one entry, four exits in ATR, and the 15% trailing stop
     [data-rr-anim="allout"]    scaling out in five pieces vs all in, all out
     [data-rr-anim="unit"]      even bet size from the average dollar range
     [data-rr-anim="drawdown"]  discretionary trader cuts size, system keeps it
     [data-rr-steps]            the four profit centers, as a click-through stepper

   Same player as of-anim.js / gbf-anim.js: each chart redraws in a
   narrow layout on a phone instead of scrolling sideways, and on a phone
   the callouts sit in a band above the chart so they never cover it.

   Every bar and trade is made up, labelled "Illustrative". No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#64d2ff", gold: "#f4b942", orange: "#ff9f0a", grey: "#8e8e93",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e" };
  var NARROW_BELOW = 640;
  var FS = 1;

  /* ---------- shared drawing helpers ---------- */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function ease(v) { v = clamp01(v); return v * v * (3 - 2 * v); }
  function lerp(a, b, m) { return a + (b - a) * m; }
  function win(T, a, b) { return fade(T, a, 0.4) * (b != null ? 1 - fade(T, b, 0.3) : 1); }
  function txt(x, y, s, col, size, anchor, weight, op) {
    if (op != null && op <= 0) return "";
    return '<text x="' + (+x).toFixed(1) + '" y="' + (+y).toFixed(1) + '" fill="' + col + '" font-size="' + ((size || 13) * FS).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  /* footprint numbers: a fixed size, not scaled up on a phone (the cells are sized for them) */
  function num(x, y, s, col, size, anchor, weight, op) {
    if (op != null && op <= 0) return "";
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + size.toFixed(1) + '" text-anchor="' + (anchor || "start") + '" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"' +
      (weight ? ' font-weight="' + weight + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + ">" + s + "</text>";
  }
  function line(x1, y1, x2, y2, col, w, dash, op) {
    if (op != null && op <= 0) return "";
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + (w || 1) + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function rect(x, y, w, h, col, rx, op) {
    if (w <= 0 || h <= 0 || (op != null && op <= 0)) return "";
    return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + (rx || 0) + '" fill="' + col + '"' +
      (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }
  function frameRect(x, y, w, h, col, sw, op, rx) {
    if (op <= 0) return "";
    return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + (rx == null ? 3 : rx) + '" fill="none" stroke="' + col + '" stroke-width="' + (sw || 2) + '" opacity="' + op.toFixed(3) + '"/>';
  }
  function callout(x, y, lines, col, op, right) {
    if (op <= 0) return "";
    var w = 18 + Math.max.apply(null, lines.map(function (s) { return s.replace(/&[a-z]+;/g, "x").length; })) * 7.3 * FS, h = 10 + lines.length * 18 * FS;
    var x0 = right ? x - w : x;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) + '" rx="8" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>';
    lines.forEach(function (ln, k) { s += txt(x0 + 10, y + 21 * FS + k * 18 * FS, ln, k === 0 ? col : C.dim, 13, "start", k === 0 ? 600 : null); });
    return s + "</g>";
  }
  /* desktop: in the column right of the chart. phone: in the band above the chart */
  function note(g, lines, col, op, wy) { return g.n ? callout(14, 36, lines, col, op) : callout(g.nx, wy == null ? g.y0 : wy, lines, col, op); }
  function pill(x, y, s, col, op, anchor) {
    if (op <= 0) return "";
    var w = s.length * 7.2 * FS + 18, h = 22 * FS, xa = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xa.toFixed(1) + '" y="' + (y - h + 6).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + (h / 2).toFixed(1) + '" fill="' + col + '"/>' +
      txt(xa + w / 2, y - 1, s, "#000", 12, "middle", 700) + "</g>";
  }
  function tag(x, y, s, col, op, anchor) {
    if (op <= 0) return "";
    var w = s.replace(/&[a-z]+;/g, "x").length * 6.9 * FS + 14, h = 19 * FS, xa = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xa.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="6" fill="' + C.bg + '" fill-opacity="0.92" stroke="' + col + '" stroke-opacity="0.5"/>' +
      txt(xa + w / 2, y + 4 * FS, s, col, 12, "middle", 700) + "</g>";
  }
  function candle(x, yf, b, prog, wBody, op) {
    if (prog <= 0) return "";
    var o = b[0], h = b[1], l = b[2], c = b[3];
    var pth = c >= o ? [o, l, h, c] : [o, h, l, c], sg = clamp01(prog) * 3, idx = Math.min(2, Math.floor(sg)), f = sg - idx;
    var cur = prog >= 1 ? c : pth[idx] + (pth[idx + 1] - pth[idx]) * f;
    var hi = o, lo = o;
    for (var k = 0; k <= idx; k++) { hi = Math.max(hi, pth[k]); lo = Math.min(lo, pth[k]); }
    hi = Math.max(hi, cur); lo = Math.min(lo, cur);
    var col = cur >= o ? C.up : C.dn, top = yf(Math.max(o, cur)), bh = Math.max(1.5, Math.abs(yf(o) - yf(cur)));
    return '<g opacity="' + (op == null ? 1 : op) + '"><line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + yf(hi).toFixed(1) + '" y2="' + yf(lo).toFixed(1) + '" stroke="' + col + '" stroke-width="1.3"/>' +
      '<rect x="' + (x - wBody / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + wBody.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + col + '"/></g>';
  }

  /* ---------- the player: captions, chips, play / replay, autoplay on view, responsive layout ---------- */
  function player(root, spec) {
    var svg = root.querySelector("svg");
    var cap = { n: root.querySelector(".anim-n"), t: root.querySelector(".anim-title"), b: root.querySelector(".anim-text") };
    var btnPlay = root.querySelector(".anim-play"), btnReplay = root.querySelector(".anim-replay"), chips = root.querySelector(".anim-chips");
    var box = root.querySelector(".anim-scroll") || svg.parentNode;
    var ST = spec.stages, END = spec.end, T = END, playing = false, lastNow = 0, raf = 0, shown = -1, L = null;
    function layout() {
      var narrow = box.clientWidth > 0 && box.clientWidth < NARROW_BELOW;
      if (L && L.narrow === narrow) return false;
      L = spec.size(narrow); L.narrow = narrow;
      svg.setAttribute("viewBox", "0 0 " + L.W + " " + L.H);
      root.classList.toggle("is-narrow", narrow);
      return true;
    }
    function stageAt(t) { var k = 0; ST.forEach(function (s, i) { if (t >= s.at) k = i; }); return k; }
    function caption() {
      var k = stageAt(T);
      if (k === shown) return;
      shown = k;
      cap.n.textContent = (k + 1) + " / " + ST.length;
      cap.t.textContent = ST[k].title;
      cap.b.textContent = ST[k].text;
      chips.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-current", i === k ? "step" : "false"); });
    }
    function draw() { FS = L.narrow ? 1.18 : 1; svg.innerHTML = '<rect width="' + L.W + '" height="' + L.H + '" fill="' + C.bg + '"/>' + spec.frame(T, L); caption(); }
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
    chips.innerHTML = ST.map(function (s, i) { return '<button type="button" data-i="' + i + '">' + (i + 1) + ". " + s.title + "</button>"; }).join("");
    btnPlay.addEventListener("click", function () { if (playing) { setPlaying(false); return; } if (T >= END) T = 0; setPlaying(true); });
    btnReplay.addEventListener("click", function () { T = 0; draw(); setPlaying(true); });
    chips.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var k = +b.getAttribute("data-i");
      if (REDUCED) { T = k + 1 < ST.length ? ST[k + 1].at - 0.01 : END; draw(); return; }
      T = ST[k].at; draw(); setPlaying(true);
    });
    layout(); draw();
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (layout()) draw(); }, 120); });
    if (!REDUCED && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); T = 0; draw(); setPlaying(true); }
      }, { threshold: 0.35 });
      io.observe(svg.parentNode || svg);
    }
  }


  /* ---------- seeded randomness, so every replay draws the same footprints ---------- */
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }


  /* ---------- chart helpers for this page ---------- */
  function fmt(v, d) { return (+v).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function mkBars(closes, open0, seed, wick) {
    var r = rng(seed), out = [], prev = open0;
    closes.forEach(function (c) {
      var o = prev, w = wick || 1;
      out.push({ o: o, h: Math.max(o, c) + r() * w, l: Math.min(o, c) - r() * w, c: c });
      prev = c;
    });
    return out;
  }
  function drawBars(B, X, Y, cnt, bw, opFn) {
    var s = "", full = Math.floor(cnt);
    for (var i = 0; i < B.length && i < Math.ceil(cnt); i++) {
      var p = i < full ? 1 : cnt - full;
      if (p <= 0) continue;
      var b = B[i];
      s += candle(X(i), Y, [b.o, b.h, b.l, b.c], p, bw, opFn ? opFn(i) : 1);
    }
    return s;
  }
  /* geometry: desktop puts notes in a column at the right, a phone puts them in a band on top */
  function geo(L, o) {
    o = o || {};
    if (L.narrow) return { n: 1, x0: 16, x1: L.W - 62, y0: o.band || 170, y1: L.H - (o.vol ? 118 : 40), vy1: L.H - 40, nx: 0 };
    return { n: 0, x0: o.x0 || 46, x1: o.x1 || 750, y0: o.y0 || 40, y1: L.H - (o.vol ? 138 : 50), vy1: L.H - 50, nx: 822 };
  }
  function note2(g, lines, col, op, wy) { return g.n ? callout(14, 18, lines, col, op) : callout(g.nx, wy == null ? g.y0 : wy, lines, col, op); }
  function axis(g, lo, hi, step, Y, dp, op) {
    var s = "", v0 = Math.ceil(lo / step) * step;
    for (var v = v0; v <= hi + 1e-9; v += step) {
      var y = Y(v);
      s += line(g.x0, y, g.x1, y, "#2c2c2e", 1, null, op == null ? 1 : op);
      s += txt(g.x1 + 6, y + 4, fmt(v, dp || 0), C.faint, 11, "start", null, op == null ? 1 : op);
    }
    return s;
  }
  function stamp(L, s) { return txt(L.W - 14, L.H - 10, s || "Illustrative · made-up bars", C.faint, 11, "end"); }
  /* piecewise-linear timeline: [[T, value], ...] */
  function track(pts, T) {
    if (T <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) if (T <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; return lerp(a[1], b[1], (T - a[0]) / (b[0] - a[0] || 1)); }
    return pts[pts.length - 1][1];
  }
  function dot(x, y, r, col, op, stroke) {
    if (op != null && op <= 0) return "";
    return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + (stroke ? "none" : col) + '"' + (stroke ? ' stroke="' + col + '" stroke-width="2.4"' : "") + (op != null ? ' opacity="' + op.toFixed(3) + '"' : "") + "/>";
  }

  /* =====================================================================
     1 · The volume spike test
     ===================================================================== */
  function spikeSpec() {
    var C5 = [4800, 4802, 4805, 4804, 4807, 4809, 4808, 4810, 4811.5, 4809, 4806, 4803, 4801, 4799, 4798.5, 4800, 4803, 4806, 4808, 4810.5, 4815, 4816.5, 4815, 4813, 4811, 4810, 4809.5, 4808, 4809, 4808];
    var B5 = mkBars(C5, 4799, 11, 0.9), r = rng(5), V5 = [], i;
    B5[8].h = 4812.25;
    for (i = 9; i <= 19; i++) B5[i].h = Math.min(B5[i].h, 4811.75);
    B5[20].l = Math.min(B5[20].l, 4809.75); B5[20].h = 4816.75;
    for (i = 0; i < 30; i++) V5.push(i < 3 ? 0.66 - i * 0.08 : 0.2 + r() * 0.16);
    V5[20] = 1; V5[21] = 0.5; V5[29] = 0.42; V5[28] = 0.36;
    var C1 = [4808.5, 4809.25, 4810, 4809.5, 4810.5, 4811, 4811.5, 4813.5, 4815, 4816, 4816.5, 4815.75, 4815, 4814.5, 4814.75];
    var B1 = mkBars(C1, 4808, 21, 0.4);
    for (i = 0; i <= 6; i++) B1[i].h = Math.min(B1[i].h, 4812);
    B1[7].l = 4811.25; B1[7].h = 4814;
    var V1 = [0.2, 0.18, 0.22, 0.17, 0.2, 0.24, 0.26, 1, 0.62, 0.42, 0.3, 0.2, 0.16, 0.15, 0.14];
    var SH = 4812.25;
    var ST = [
      { at: 0, title: "A normal 5-minute chart", text: "Volume surges off the open, dries up into the middle of the session, then one bar prints about three times the normal volume. Volume changes with the time of day all day long, which is one reason raw order flow is so hard to normalize." },
      { at: 4, title: "Find the volume spike", text: "Pick any intraday volume spike. Gold, crude oil, bonds, currencies, index futures and copper all do it. Note the bar, then drop down to a 1-minute chart." },
      { at: 7.5, title: "Drop to the 1-minute", text: "See exactly where the volume came in. About 80% of the time, Raschke says, it lands right on a previous little intraday swing high or swing low." },
      { at: 12, title: "The algos at work", text: "Lots of algorithms trigger when a channel high or low gets penetrated. The algo buys, price goes tick, tick, tick, and if it stalls by a set amount the algo goes flat, faster than you can blink." },
      { at: 15.5, title: "Run the test yourself", text: "Check ten spikes on your own market. If most land on prior swing points, you've seen the big players' footprints on a plain bar chart, with no footprint software." }
    ];
    return {
      stages: ST, end: 20,
      size: function (n) { return n ? { W: 440, H: 780 } : { W: 1180, H: 540 }; },
      frame: function (T, L) {
        var g = geo(L, { vol: true }), s = "";
        var op5 = 1 - fade(T, 7.5, 0.8), op1 = fade(T, 7.9, 0.6);
        var vy0 = g.y1 + 26, vy1 = g.vy1;
        if (op5 > 0) {
          var lo = 4796, hi = 4819, N = 30;
          var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
          var bw = (g.x1 - g.x0) / N * 0.62, cnt = 1 + clamp01(T / 3.5) * 29;
          s += '<g opacity="' + op5.toFixed(3) + '">';
          s += axis(g, lo, hi, 5, Y);
          s += txt(g.x0, g.y0 - 14, "5-minute bars", C.faint, 12, "start", 600);
          var swOp = fade(T, 4.6, 0.5);
          if (swOp > 0) { s += line(X(8), Y(SH), g.x1, Y(SH), C.gold, 1.6, "6 5", swOp); s += tag(X(8) - 6, Y(SH) - 16, "swing high", C.gold, swOp, "start"); }
          s += drawBars(B5, X, Y, cnt, bw, function (k) { return T >= 4 && k !== 20 ? 0.55 : 1; });
          for (var k = 0; k < Math.min(N, Math.ceil(cnt)); k++) {
            var vh = V5[k] * (vy1 - vy0), col = k === 20 && T >= 4 ? C.gold : k < 3 && T < 4 ? C.orange : "#48484a";
            s += rect(X(k) - bw / 2, vy1 - vh, bw, vh, col, 1.5);
          }
          s += txt(g.x0, vy0 - 6, "volume", C.faint, 11, "start");
          var sp = fade(T, 4.2, 0.5);
          if (sp > 0) { s += dot(X(20), vy1 - (vy1 - vy0) - 2, 13, C.gold, sp, true); s += tag(X(20) + 18, vy0 + 8, "3× normal", C.gold, sp, "start"); }
          s += note2(g, ["Volume surges off the open", "Then it dries up. Time of day", "moves volume all session long."], C.orange, win(T, 0.8, 3.9), g.y0);
          s += note2(g, ["One bar, three times the volume", "Where exactly did it come in?", "Drop to a 1-minute chart."], C.gold, win(T, 4.4, 7.4), g.y0);
          s += "</g>";
        }
        if (op1 > 0) {
          var lo1 = 4806, hi1 = 4818, N1 = 15;
          var X1 = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N1; }, Y1 = function (v) { return g.y1 - (v - lo1) / (hi1 - lo1) * (g.y1 - g.y0); };
          var bw1 = (g.x1 - g.x0) / N1 * 0.58, cnt1 = clamp01((T - 8) / 3) * 15, dimOthers = T >= 15.5 ? 0.35 : 1;
          s += '<g opacity="' + (op1 * dimOthers).toFixed(3) + '">';
          s += axis(g, lo1, hi1, 2, Y1);
          s += txt(g.x0, g.y0 - 14, "1-minute bars · inside the spike", C.faint, 12, "start", 600);
          var lop = fade(T, 8.3, 0.5);
          s += line(g.x0, Y1(SH), g.x1, Y1(SH), C.gold, 1.8, "6 5", lop);
          s += tag(g.x1 - 4, Y1(SH) + 18, "prior swing high " + fmt(SH, 2), C.gold, lop, "end");
          s += drawBars(B1, X1, Y1, cnt1, bw1);
          for (var m = 0; m < Math.min(N1, Math.ceil(cnt1)); m++) {
            var vh1 = V1[m] * (vy1 - vy0);
            s += rect(X1(m) - bw1 / 2, vy1 - vh1, bw1, vh1, m === 7 ? C.gold : "#48484a", 1.5);
          }
          s += txt(g.x0, vy0 - 6, "volume", C.faint, 11, "start");
          var hit = fade(T, 10.4, 0.5) * (T < 12 ? 1 : 0.6);
          if (hit > 0) { s += dot(X1(7), Y1(SH), 14, C.gold, hit, true); s += line(X1(7), Y1(SH) + 16, X1(7), vy1 - (vy1 - vy0), C.gold, 1.4, "3 4", hit); }
          s += note2(g, ["The volume landed on the level", "The 1-minute spike prints on the", "bar that takes out the prior", "swing high. Not a coincidence."], C.gold, win(T, 10.6, 11.9), g.y0);
          ["tick", "tick", "tick"].forEach(function (w, q) { s += tag(X1(8 + q), Y1(B1[8 + q].h) - 14, w, C.up, win(T, 12.2 + q * 0.5, 15.4), "middle"); });
          var fl = win(T, 13.8, 15.4);
          if (fl > 0) { s += tag(X1(14.4), Y1(B1[12].l) + 24, "stalls: algo goes flat", C.orange, fl, "end"); }
          s += note2(g, ["Algos trigger off the break", "A channel high gets taken out,", "the algo buys: tick, tick, tick.", "It stalls, the algo goes flat.", "Seconds, not minutes."], C.up, win(T, 12.4, 15.4), g.y0);
          s += "</g>";
        }
        var ta = fade(T, 15.7, 0.5);
        if (ta > 0) {
          var cx = g.n ? 220 : (g.x0 + g.x1) / 2, cy = g.n ? 400 : 230, rr = g.n ? 15 : 17, gap = g.n ? 40 : 52;
          s += '<g opacity="' + ta.toFixed(3) + '">';
          s += rect(cx - (g.n ? 200 : 300), cy - (g.n ? 92 : 100), g.n ? 400 : 600, g.n ? 210 : 200, C.box, 16, 0.96);
          s += txt(cx, cy - (g.n ? 54 : 58), "Ten volume spikes, checked on the 1-minute", C.ink, 15, "middle", 700);
          for (var q = 0; q < 10; q++) {
            var on = q !== 3 && q !== 7, px2 = cx + (q - 4.5) * gap * (g.n ? 0.92 : 1);
            s += dot(px2, cy, rr, on ? C.gold : "#48484a", fade(T, 16 + q * 0.18, 0.3));
          }
          s += txt(cx, cy + (g.n ? 50 : 56), "8 of 10 on a prior swing high or low", C.gold, 14, "middle", 700, fade(T, 18, 0.4));
          s += txt(cx, cy + (g.n ? 78 : 82), "Raschke's number: about 80%. Run it on your market.", C.dim, 12.5, "middle", null, fade(T, 18.3, 0.4));
          s += "</g>";
        }
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     2 · The main idea of the day: two-day rhythm, first-hour range, trend day
     ===================================================================== */
  function daySpec() {
    var D = [{ o: 4812, h: 4814.5, l: 4789, c: 4791 }, { o: 4791.5, h: 4793.5, l: 4762.5, c: 4766 }];
    var CI = [4756, 4762, 4754, 4759, 4764, 4761, 4763, 4765, 4764, 4769, 4772, 4775, 4778, 4781, 4785, 4787, 4785, 4782, 4780, 4781, 4779, 4782, 4785, 4788, 4790, 4793, 4795, 4797, 4799, 4800, 4798, 4797, 4799, 4796, 4798, 4800, 4801, 4799, 4800];
    var B = mkBars(CI, 4760, 31, 1.6), i;
    B[2].l = 4752; B[4].h = 4766;
    for (i = 0; i <= 5; i++) { B[i].h = Math.min(B[i].h, 4766); B[i].l = Math.max(B[i].l, 4752); }
    for (i = 6; i <= 8; i++) B[i].h = Math.min(B[i].h, 4765.75);
    for (i = 9; i < B.length; i++) B[i].l = Math.max(B[i].l, 4766.5);
    var FH = 4766, FL = 4752, N = B.length;
    var ST = [
      { at: 0, title: "The day before", text: "Two high-to-low days in a row: open near the high, close near the low. Raschke's two-day rhythm (from the Taylor trading technique) says the sellers have exhausted themselves, so lean toward a low-to-high day." },
      { at: 3, title: "The first hour", text: "Box the first hour's range. Breakout and range-expansion trades work best right off a session opening." },
      { at: 6.5, title: "Outside the range", text: "Is the market trading outside the first hour's range? Here it holds above the high, so the trend for the day is up. Trend for the day: that's your friend." },
      { at: 9.5, title: "Catch a swing", text: "The S&P usually makes two or three swings a day that last 60 to 90 minutes. Her day trading was one to three trades, trying to catch one or two of them." },
      { at: 15.5, title: "The main idea", text: "Get the main idea right: is it a low-to-high day or a high-to-low day? Entries matter, but she calls this 90% of the game. Profitable trades can be held another day or two." }
    ];
    return {
      stages: ST, end: 19,
      size: function (n) { return n ? { W: 440, H: 720 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var g = geo(L), s = "", lo = 4747, hi = 4818;
        var Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var ix0 = g.x0, ix1 = g.n ? g.x0 + 92 : g.x0 + 150, cx0 = g.n ? ix1 + 18 : ix1 + 36, cx1 = g.x1;
        var cnt = track([[3, 0], [5.5, 6], [6.5, 6], [8.5, 10], [9.5, 10], [14.5, N]], T);
        s += axis({ x0: g.x0, x1: g.x1 }, lo, hi, 10, Y);
        /* daily inset */
        s += txt(ix0, g.y0 - 14, "Daily", C.faint, 12, "start", 600);
        s += txt(cx0, g.y0 - 14, "Today · 10-minute bars", C.faint, 12, "start", 600);
        s += line(cx0 - (g.n ? 9 : 18), g.y0 - 8, cx0 - (g.n ? 9 : 18), g.y1, "#3a3a3c", 1);
        var DX = function (k) { return ix0 + (k + 0.5) * (ix1 - ix0) / 3; }, dbw = (ix1 - ix0) / 3 * 0.55;
        var dd = clamp01(T / 2.4) * 2;
        s += drawBars(D, DX, Y, dd, dbw, function () { return T >= 3 ? 0.6 : 1; });
        ["down", "down"].forEach(function (w, k) { s += tag(DX(k), Y(D[k].l) + 18, g.n ? "H→L" : "high→low", C.dn, fade(T, 0.7 + k * 1.1, 0.4) * (T >= 3 ? 0.6 : 1), "middle"); });
        if (cnt > 0) {
          var shown = B.slice(0, Math.max(1, Math.ceil(cnt))), dh = -1e9, dl = 1e9;
          shown.forEach(function (b) { dh = Math.max(dh, b.h); dl = Math.min(dl, b.l); });
          var cur = B[Math.max(0, Math.ceil(cnt) - 1)].c;
          s += candle(DX(2), Y, [4760, Math.max(dh, 4760), Math.min(dl, 4760), cur], 1, dbw);
          s += tag(DX(2), Y(dh) - 16, g.n ? "L→H?" : "low→high?", C.up, fade(T, 15.6, 0.4), "middle");
        }
        /* intraday */
        var X = function (k) { return cx0 + (k + 0.5) * (cx1 - cx0) / N; }, bw = (cx1 - cx0) / N * 0.6;
        var bx = fade(T, 5.6, 0.5);
        if (bx > 0) {
          s += rect(X(0) - bw, Y(FH), X(5) - X(0) + 2 * bw, Y(FL) - Y(FH), C.blue, 3, 0.16 * bx);
          s += line(X(0) - bw, Y(FH), cx1, Y(FH), C.blue, 1.4, "6 5", bx);
          s += line(X(0) - bw, Y(FL), cx1, Y(FL), C.blue, 1.4, "6 5", bx * 0.6);
          s += tag(cx1 - 4, Y(FH) + 16, "first hour high " + fmt(FH), C.blue, bx, "end");
          s += tag(cx1 - 4, Y(FL) + 16, "first hour low " + fmt(FL), C.blue, bx * 0.7, "end");
        }
        [[9, 15], [21, 29]].forEach(function (sw, k) {
          var op = fade(T, 12 + k * 2.4, 0.5);
          if (op <= 0) return;
          var a = B[sw[0]].l, b = B[sw[1]].h;
          s += rect(X(sw[0]) - bw, Y(b) - 6, X(sw[1]) - X(sw[0]) + 2 * bw, Y(a) - Y(b) + 12, C.up, 4, 0.14 * op);
          s += tag((X(sw[0]) + X(sw[1])) / 2, Y(b) - 18, (sw[1] - sw[0] + 1) * 10 + " min", C.up, op, "middle");
        });
        s += drawBars(B, X, Y, cnt, bw);
        s += tag(X(9), Y(B[9].h) - 18, "outside the range", C.up, win(T, 7.4, 9.6), "middle");
        var nb = g.n ? null : g.y0;
        s += note2(g, ["Two high-to-low days", "Sellers have exhausted", "themselves. Raschke's rhythm:", "look for a low-to-high day."], C.dn, win(T, 0.6, 2.9), nb);
        s += note2(g, ["First hour: mark the range", "4,752 to 4,766. Later, ask one", "question: are we trading", "outside it?"], C.blue, win(T, 5.8, 6.4), nb);
        s += note2(g, ["Outside the first hour's range", "Price holds above 4,766: the", "trend for the day is up."], C.up, win(T, 7, 9.4), nb);
        s += note2(g, ["Two or three swings a day", "Each lasts 60 to 90 minutes.", "Catch one or two of them: one", "to three trades, not fifty."], C.up, win(T, 10, 15.4), nb);
        s += note2(g, ["Get the main idea right", "Low-to-high or high-to-low day?", "Get that right and that's 90%", "of the game."], C.gold, fade(T, 15.7, 0.4), nb);
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     3 · Four exits, one entry: the actuarial table
     ===================================================================== */
  function exitsSpec() {
    var CL = [4893, 4896, 4900, 4902, 4904, 4903, 4907, 4909, 4908, 4911, 4913, 4912, 4915, 4917, 4916, 4919, 4922, 4921, 4924, 4926, 4925, 4928, 4931, 4930, 4933, 4935, 4937, 4936, 4933, 4930, 4927, 4924, 4921, 4918, 4915, 4912, 4910, 4912, 4909, 4911];
    var B = mkBars(CL, 4891, 41, 0.8), i, E = 4900, A = 10, N = B.length;
    for (i = 3; i < N; i++) B[i].h = Math.min(B[i].h, 4938.5);
    B[3].h = Math.min(B[3].h, 4904.6); B[4].h = 4906; B[22].h = 4932; B[26].h = 4939;
    for (i = 3; i <= 21; i++) B[i].h = Math.min(B[i].h, 4929.6);
    B[34].l = 4914.5; B[35].l = 4911.2;
    /* volatility stop: 2.5 ATR under the highest high so far, never lowered */
    var STOP = [], hh = B[2].h, stp = E - 2.5 * A, out = -1;
    for (i = 3; i < N; i++) {
      if (out < 0 && B[i].l <= stp) out = i;
      STOP.push({ i: i, v: stp });
      hh = Math.max(hh, B[i].h); stp = Math.max(stp, hh - 2.5 * A);
    }
    var TR = STOP[out - 3].v, TS = 14;
    var GRID = "SBSTSRSBTSBSRTSBTSRB".split("");
    var GC = { S: C.blue, B: C.gold, T: C.cyan, R: C.up };
    var ST = [
      { at: 0, title: "Measure in ATR", text: "Raschke measures exits in average true range on the time frame you trade. Here one ATR is 10 points. Same entry, four ways out." },
      { at: 3.5, title: "Small target", text: "Play for half an ATR. Most of the time, especially intraday and in discretionary trading, a small target is the exit that pays." },
      { at: 6.5, title: "Large target", text: "Play for three ATRs, or a standard-deviation move, when the move is just starting." },
      { at: 11, title: "Trail a stop", text: "A volatility stop 2.5 ATRs under the highest high, in the spirit of Welles Wilder's public-domain stop and reverse. On the best trades any trailing method keeps you in. On this one it gives back more than half." },
      { at: 15, title: "Time stop", text: "Hold for a set number of bars or days, then get out, win or lose." },
      { at: 18.5, title: "The actuarial table", text: "Log which exit would have been best on every trade, the way an insurer builds life tables. In her research, a trailing stop was the best exit only about 15% of the time." }
    ];
    return {
      stages: ST, end: 23,
      size: function (n) { return n ? { W: 440, H: 760 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var g = geo(L), s = "", lo = 4886, hi = 4944;
        var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
        var bw = (g.x1 - g.x0) / N * 0.6;
        var cnt = track([[0, 0], [3, 3], [3.5, 3], [4.6, 5], [6.5, 5], [10.5, 23], [11, 23], [14.5, N]], T);
        var dimAll = T >= 18.5 ? 0.22 : 1, focus = T >= 15 && T < 18.5;
        s += '<g opacity="' + dimAll + '">';
        s += axis(g, lo, hi, 10, Y);
        /* entry + ATR ruler */
        var eo = fade(T, 1.2, 0.4);
        s += line(X(2), Y(E), g.x1, Y(E), C.ink, 1.2, "3 4", eo * 0.6);
        s += g.n ? pill(X(2) + 14, Y(E) + 34, "long 4,900", C.ink, eo, "start") : pill(X(2) - 10, Y(E) + 26, "long 4,900", C.ink, eo, "end");
        var ro = win(T, 1.8, 6.2);
        if (ro > 0) {
          s += line(X(3) + 8, Y(E), X(3) + 8, Y(E + A), C.gold, 3, null, ro);
          s += tag(X(3) + 16, Y(E + A / 2), "1 ATR = 10", C.gold, ro, "start");
        }
        function lvl(v, col, label, op, at) {
          if (op <= 0) return "";
          return line(X(2), Y(v), g.x1, Y(v), col, 1.6, "6 5", op) + tag(g.x1 - 4, Y(v) - 13, label, col, op, "end");
        }
        var fo = function (a) { return focus ? 0.3 : a; };
        s += lvl(E + 5, C.blue, "small target +5", fo(fade(T, 3.6, 0.4)));
        s += lvl(E + 30, C.gold, "large target +30", fo(fade(T, 6.6, 0.4)));
        s += drawBars(B, X, Y, cnt, bw, function () { return focus ? 0.45 : 1; });
        if (cnt > 4.5) s += dot(X(4), Y(E + 5), 10, C.blue, fo(1), true);
        if (cnt > 22.5) s += dot(X(22), Y(E + 30), 10, C.gold, fo(1), true);
        /* trailing stop */
        var to = fade(T, 11, 0.4);
        if (to > 0) {
          var pts = STOP.filter(function (p) { return p.i < cnt && p.i <= out && p.v >= lo + 1; }).map(function (p) { return [X(p.i), Y(p.v)]; });
          if (pts.length > 1) {
            var d = "M" + pts[0][0].toFixed(1) + "," + pts[0][1].toFixed(1);
            for (var k = 1; k < pts.length; k++) d += "H" + pts[k][0].toFixed(1) + "V" + pts[k][1].toFixed(1);
            s += '<path d="' + d + '" fill="none" stroke="' + C.up + '" stroke-width="2.2" opacity="' + fo(to).toFixed(3) + '"/>';
          }
          if (cnt > out + 0.5) { s += dot(X(out), Y(TR), 10, C.up, fo(1), true); s += tag(X(out) - 14, Y(TR) + 20, "trail out " + fmt(TR) + " · +" + fmt(TR - E), C.up, fo(to), "end"); }
        }
        /* time stop */
        var tso = fade(T, 15.2, 0.4);
        if (tso > 0) {
          s += line(X(TS), g.y0, X(TS), g.y1, C.cyan, 1.8, "5 4", tso);
          s += tag(X(TS), g.y0 + 6, "12 bars", C.cyan, tso, "middle");
          s += dot(X(TS), Y(B[TS].c), 10, C.cyan, tso, true);
          s += tag(X(TS) + 14, Y(B[TS].c) + 20, "time stop · +" + fmt(B[TS].c - E), C.cyan, tso, "start");
        }
        s += "</g>";
        var nb = g.n ? null : g.y0;
        s += note2(g, ["One entry, one unit of risk", "Long at 4,900. ATR on this chart", "is 10 points: the ruler every", "exit gets measured in."], C.ink, win(T, 0.6, 3.4), nb);
        s += note2(g, ["Exit 1 · small target", "Half an ATR: +5 points.", "Hit in two bars."], C.blue, win(T, 3.8, 6.4), nb);
        s += note2(g, ["Exit 2 · large target", "Three ATRs: +30 points.", "For a move that's just starting."], C.gold, win(T, 6.8, 10.9), nb);
        s += note2(g, ["Exit 3 · trail a stop", "2.5 ATR under the highest high,", "raised, never lowered. Out at", "4,914: +14 points."], C.up, win(T, 11.2, 14.9), nb);
        s += note2(g, ["Exit 4 · time stop", "Hold 12 bars, then out:", "+16 points at the close."], C.cyan, win(T, 15.3, 18.4), nb);
        var ta = fade(T, 18.7, 0.5);
        if (ta > 0) {
          var px0 = g.n ? 22 : 86, pw = g.n ? 396 : 640, py0 = g.n ? 186 : 70, ph = g.n ? 380 : 350;
          s += '<g opacity="' + ta.toFixed(3) + '">' + rect(px0, py0, pw, ph, C.box, 16, 0.97);
          s += txt(px0 + 22, py0 + 34, "This trade", C.ink, 15, "start", 700);
          var rows = [["Small target · 0.5 ATR", "+5", C.blue], ["Large target · 3 ATR", "+30", C.gold], ["Trailing stop", "+14", C.up], ["Time stop · 12 bars", "+16", C.cyan]];
          rows.forEach(function (rw, k) {
            var y = py0 + 64 + k * 28 * FS;
            s += rect(px0 + 22, y - 11, 10, 10, rw[2], 2);
            s += txt(px0 + 40, y, rw[0], C.dim, 13);
            s += txt(px0 + pw - 22, y, rw[1] + " pts", rw[2], 13, "end", 700);
          });
          var gy = py0 + 64 + 4 * 28 * FS + 24;
          s += txt(px0 + 22, gy, "Best exit, 20 made-up trades", C.ink, 15, "start", 700);
          var cols = 10, cw = (pw - 44) / cols, sz = Math.min(cw - 8, 30);
          GRID.forEach(function (c, k) {
            var x = px0 + 22 + (k % cols) * cw, y = gy + 18 + Math.floor(k / cols) * (sz + 8);
            s += rect(x, y, sz, sz, GC[c], 6, fade(T, 19.2 + k * 0.08, 0.3) * (c === "R" ? 1 : 0.8));
          });
          var ly = gy + 18 + 2 * (sz + 8) + 22 * FS;
          var leg = [["small 8", C.blue], ["large 5", C.gold], ["time 4", C.cyan], ["trail 3 = 15%", C.up]];
          leg.forEach(function (lg, k) {
            var x = px0 + 22 + (g.n ? (k % 2) * 190 : k * 150), y = ly + (g.n ? Math.floor(k / 2) * 24 * FS : 0);
            s += rect(x, y - 11, 10, 10, lg[1], 2) + txt(x + 16, y, lg[0], lg[1], 13, "start", 700, fade(T, 21, 0.4));
          });
          s += "</g>";
        }
        return s + stamp(L);
      }
    };
  }

  /* =====================================================================
     4 · All in, all out vs scaling out
     ===================================================================== */
  function alloutSpec() {
    var CA = [-0.3, -0.15, 0, 0.2, 0.45, 0.62, 0.7, 0.95, 1.08, 1.0, 1.2, 1.35, 1.58, 1.7, 1.85, 1.8, 2.05, 2.2, 2.4, 2.6, 2.5, 2.3, 2.0, 1.8, 1.65, 1.7];
    var CB = [-0.3, -0.15, 0, 0.15, 0.3, 0.2, 0.05, -0.2, -0.35, -0.5, -0.7, -0.85, -1.08, -1.2, -1.1, -1.3, -1.25, -1.35];
    var BA = mkBars(CA, -0.4, 51, 0.09), BB = mkBars(CB, -0.4, 52, 0.09), i;
    for (i = 3; i < BA.length; i++) BA[i].l = Math.max(BA[i].l, Math.min(BA[i].o, BA[i].c) - 0.05);
    BA[19].h = 2.66;
    var SC = [0.5, 0.75, 1.0, 1.5], SIG = 22;
    var HIT = SC.map(function (v) { for (var k = 3; k < BA.length; k++) if (BA[k].h >= v) return k; return 0; });
    var STOPB = -1, hitB = 0;
    for (i = 3; i < BB.length; i++) if (BB[i].l <= STOPB) { hitB = i; break; }
    var SCALED = (0.5 + 0.75 + 1 + 1.5 + 2) / 5;
    var LED = [[SCALED, 2], [-1, -1], [SCALED, 2], [-1, -1], [SCALED, 2], [-1, -1]];
    var SW = 6.5;
    function chart(T, L, B, kind) {
      var g = geo(L), s = "", lo = -1.5, hi = 2.9, N = 26;
      var X = function (k) { return g.x0 + (k + 0.5) * (g.x1 - g.x0) / N; }, Y = function (v) { return g.y1 - (v - lo) / (hi - lo) * (g.y1 - g.y0); };
      var bw = (g.x1 - g.x0) / N * 0.6, cnt = Math.min(B.length, clamp01(T / 4.6) * B.length);
      for (var v = -1; v <= 2.5; v += 0.5) {
        s += line(g.x0, Y(v), g.x1, Y(v), v === 0 ? "#48484a" : "#2c2c2e", 1);
        s += txt(g.x1 + 6, Y(v) + 4, (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), v % 1 ? 1 : 0) + "R", C.faint, 11);
      }
      s += line(g.x0, Y(-1), g.x1, Y(-1), C.dn, 1.4, "6 5", 0.8) + tag(g.x0 + 4, Y(-1) + 16, "stop −1R", C.dn, 0.9, "start");
      s += drawBars(B, X, Y, cnt, bw);
      if (kind === "A") {
        SC.forEach(function (v, k) {
          if (cnt <= HIT[k] + 0.5) return;
          s += dot(X(HIT[k]), Y(v), 8, C.orange, 1);
          s += tag(X(HIT[k]) + (k % 2 ? 12 : -12), Y(v) + (k % 2 ? 20 : -16), (L.narrow ? "+" : "1/5 at +") + fmt(v, v % 1 ? (v === 0.75 ? 2 : 1) : 0) + "R", C.orange, 1, k % 2 ? "start" : "end");
        });
        if (cnt > SIG + 0.5) {
          s += dot(X(SIG), Y(2), 11, C.up, 1, true);
          s += tag(X(SIG) + 14, Y(2) + 22, "exit signal +2R", C.up, 1, "start");
        }
      } else if (hitB && cnt > hitB + 0.5) {
        s += dot(X(hitB), Y(-1), 11, C.dn, 1, true);
        s += tag(X(hitB) + 14, Y(-1) - 16, "all 5 pieces stopped", C.dn, 1, "start");
      }
      return { s: s, g: g };
    }
    var ST = [
      { at: 0, title: "Scaling out", text: "Perry Kaufman's math for scaling out of five pieces: take the first three close together, because the odds of the move lasting drop off quickly, then the fourth, then a runner. Here the runner leaves on the exit signal at +2R." },
      { at: SW, title: "Then the loser", text: "People scale out on the winners, but when the stop gets hit they're clipped on the whole thing. No pieces come off on the way down." },
      { at: SW * 2, title: "Six trades", text: "Same entries, same exit signal, made-up numbers. Scaling turns each +2R winner into a +1.15R winner. The losses don't shrink at all." },
      { at: SW * 2 + 4.5, title: "Her rule", text: "Raschke is almost always all in, all out: if there's a reason to take part of it off, there's a reason to take the whole thing off. Put on a unit, take off a unit, on to the next." }
    ];
    return {
      stages: ST, end: SW * 2 + 8.5,
      size: function (n) { return n ? { W: 440, H: 760 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var s = "";
        if (T < SW) {
          var a = chart(T, L, BA, "A"), g = a.g;
          s += a.s;
          s += note2(g, ["Scale out in five pieces", "+0.5R, +0.75R, +1R close together,", "then +1.5R, then the runner on", "the signal at +2R.", "Average: +" + fmt(SCALED, 2) + "R."], C.orange, win(T, 2.6, SW - 0.2), g.n ? null : g.y0);
          s += note2(g, ["All in, all out", "The whole position leaves on", "the same signal: +2R."], C.up, g.n ? 0 : win(T, 4.6, SW - 0.2), g.y0 + 140);
        } else if (T < SW * 2) {
          var b = chart(T - SW, L, BB, "B");
          s += b.s;
          s += note2(b.g, ["The loser", "No pieces come off on the way", "down. All five get clipped at", "the stop: −1R either way."], C.dn, win(T - SW, 2.4, SW - 0.2), b.g.n ? null : b.g.y0);
        } else {
          var t = T - SW * 2, n = L.narrow, gg = geo(L), cw = n ? 196 : 330, gx = [n ? 22 : 60, n ? 230 : 430], top = n ? 210 : 70, rh = n ? 64 : 52, unit = n ? 30 : 70;
          ["Scale out · 5 pieces", "All in, all out"].forEach(function (h, c) {
            var x0 = gx[c], zx = x0 + (n ? 100 : 150), run = 0;
            s += txt(x0, top - 22, h, c ? C.up : C.orange, 15, "start", 700);
            s += line(zx, top - 6, zx, top + 6 * rh, "#48484a", 1.4);
            LED.forEach(function (rw, k) {
              var op = fade(t, 0.3 + k * 0.5, 0.35); if (op <= 0) return;
              var v = rw[c], y = top + k * rh + rh / 2, w = Math.abs(v) * unit;
              run += v;
              s += txt(x0, y + 5, "trade " + (k + 1), C.faint, 12, "start", null, op);
              s += rect(v >= 0 ? zx : zx - w, y - 11, w, 22, v >= 0 ? (c ? C.up : C.orange) : C.dn, 4, op);
              s += txt(v >= 0 ? zx + w + 6 : zx + 6, y + 5, (v >= 0 ? "+" : "−") + fmt(Math.abs(v), v % 1 ? 2 : 0) + "R", C.dim, 12, "start", 600, op);
            });
            var tot = LED.reduce(function (a2, rw) { return a2 + rw[c]; }, 0), to = fade(t, 3.6, 0.4);
            s += txt(x0, top + 6 * rh + 34 * FS, "Total " + (tot >= 0 ? "+" : "−") + fmt(Math.abs(tot), 2) + "R", c ? C.up : C.orange, 18, "start", 800, to);
          });
          s += note2(gg, ["Same six trades", "Scaled: +0.45R", "All in, all out: +3.00R"], C.up, n ? 0 : fade(t, 4.6, 0.4), 70);
          if (n) s += note2(gg, ["Same six trades, same signals", "Scaled: +0.45R · all out: +3.00R"], C.up, fade(t, 4.6, 0.4));
        }
        return s + stamp(L, "Illustrative · made-up trades");
      }
    };
  }

  /* =====================================================================
     5 · Even bet size from the average dollar range
     ===================================================================== */
  function unitSpec() {
    var M = [
      { k: "S&P 500 futures", r0: 5000, r1: 5000, col: C.blue },
      { k: "Gold", r0: 2500, r1: 2500, col: C.gold },
      { k: "Crude oil", r0: 1250, r1: 1000, col: C.orange },
      { k: "Corn", r0: 500, r1: 625, col: C.up }
    ];
    var UNIT = 5000;
    var ST = [
      { at: 0, title: "Dollar range", text: "Raschke sizes from the average daily range in dollars: the average true range times what a point is worth. Her example: corn might move $500 a day per contract, the S&P $5,000. The gold and crude ranges here are made up." },
      { at: 4, title: "Make the bets even", text: "Divide, and you can trade 10 corn contracts for every S&P contract. Every market now carries the same dollar swing: one unit." },
      { at: 8.5, title: "Size the unit", text: "When she managed money, it worked out to about one unit per $100,000. New money came in, the unit grew. Her order was simply: buy one unit of silver." },
      { at: 12.5, title: "Every quarter", text: "She recalculates at the start of each quarter and doesn't vary the bet in between, because she doesn't know where the winners or the losers will be." }
    ];
    return {
      stages: ST, end: 17,
      size: function (n) { return n ? { W: 440, H: 780 } : { W: 1180, H: 500 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var bx0 = n ? 22 : 250, bx1 = n ? 418 : 680, top = n ? 214 : 70, rh = n ? 132 : 92, sc = (bx1 - bx0) / UNIT;
        var q = ease(fade(T, 12.8, 1.2)), units = T >= 8.5 ? 3 : 1;
        s += line(bx1, top - 30, bx1, top + 4 * rh - 30, C.faint, 1, "4 4", fade(T, 4.2, 0.4));
        s += tag(bx1, top - 38, "1 unit = $5,000 of daily range", C.faint, fade(T, 4.2, 0.4), "end");
        M.forEach(function (m, k) {
          var y = top + k * rh, r = lerp(m.r0, m.r1, q), per = Math.round(UNIT / r), grow = clamp01(T / 2.5 - k * 0.15);
          var ly = n ? y - 6 : y + 12, by = n ? y + 4 : y - 4;
          s += txt(n ? bx0 : 46, ly, m.k, C.ink, 15, "start", 700);
          s += txt(n ? bx1 : 46, n ? ly : ly + 22, "$" + fmt(Math.round(r / 5) * 5) + " a day per contract", C.dim, 12.5, n ? "end" : "start");
          var stack = fade(T, 4.2 + k * 0.4, 0.5), cnt = stack > 0 ? per : 1;
          for (var c = 0; c < cnt; c++) {
            var w = r * sc, x = bx0 + c * w;
            if (x + w > bx1 + 1) break;
            var op = c === 0 ? 1 : stack;
            s += rect(x + 1, by, Math.max(1, (c === 0 ? w * grow : w) - 2), 28, m.col, 3, op * (c === 0 ? 1 : 0.75));
          }
          var lbl = per * units + (per * units === 1 ? " contract" : " contracts");
          s += tag(n ? bx0 + 4 : bx1 + 12, n ? by + 50 : by + 14, lbl, m.col, stack, "start");
          if (T >= 12.5 && m.r0 !== m.r1) s += tag(n ? bx1 - 4 : bx1 + 12, n ? by + 50 : by + 42, "was " + (UNIT / m.r0 * units), C.faint, fade(T, 13.6, 0.4), n ? "end" : "start");
        });
        var ao = fade(T, 8.7, 0.4);
        if (ao > 0) s += pill(n ? 220 : 465, n ? top + 4 * rh - 20 : top + 4 * rh - 10, "$300,000 account = 3 units", C.gold, ao, "middle");
        var nb = n ? null : 70;
        s += note2(g, ["Average daily range, in dollars", "ATR × point value, per contract.", "S&P $5,000 a day, corn $500."], C.blue, win(T, 0.8, 3.9), nb);
        s += note2(g, ["Even bets", "10 corn contracts swing as many", "dollars a day as 1 S&P. Each", "row is now one unit."], C.up, win(T, 4.4, 8.4), nb);
        s += note2(g, ["One unit per $100,000", "$300,000 account: 3 units in", "every market. No market gets", "a bigger bet than another."], C.gold, win(T, 9, 12.4), nb);
        s += note2(g, ["Next quarter: recompute", "Corn's range is up to $625:", "8 per unit. Crude's is down to", "$1,000: 5 per unit. Then leave", "it alone until next quarter."], C.orange, fade(T, 13, 0.4), nb);
        return s + stamp(L, "Illustrative · gold and crude ranges made up");
      }
    };
  }

  /* =====================================================================
     6 · Drawdowns: the discretionary trader cuts size, the system doesn't
     ===================================================================== */
  function drawdownSpec() {
    var RD = [1, 2, -1, 1, -1, -1, -1, -1, -1, 1, -1, 1, 2, 1], SD = [1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1];
    var RS = [1, 2, -1, 1, -1, -1, -1, -1, -1, -1, 6, 1, -1, 2];
    function eq(R, S) { var e = [0], t = 0; R.forEach(function (r, k) { t += r * (S ? S[k] : 1); e.push(t); }); return e; }
    var ED = eq(RD, SD), ES = eq(RS);
    var ST = [
      { at: 0, title: "Two traders", text: "A discretionary trader and a trader running a tested system, each risking one unit a trade. Made-up results." },
      { at: 3.5, title: "The streak", text: "Both go into a drawdown. Everybody has six losers in a row at some point, Raschke says, so size for it from the start." },
      { at: 7, title: "Discretionary: cut size", text: "Discretionary and losing? Something is wrong: not enough sleep, a regime change you haven't recognized, or sloppy, unforced errors. Cut back until you regroup and find out why the drawdown happened." },
      { at: 11, title: "System: keep size", text: "Trading a system, the last thing you want to do is cut size in a drawdown, because that's often right before it springs and has a big win." },
      { at: 15, title: "Know your school", text: "Two opposite approaches, both grounded in math. The mistake is mixing them: cutting a system in its drawdown, or pressing on through a discretionary slump." }
    ];
    function panel(P, E, R, S, cnt, title, col, op, hl) {
      var s = '<g opacity="' + op.toFixed(3) + '">', lo = -4, hi = 6;
      var X = function (k) { return P.x0 + k / 14 * (P.x1 - P.x0); }, Y = function (v) { return P.e1 - (v - lo) / (hi - lo) * (P.e1 - P.e0); };
      s += txt(P.x0, P.e0 - 14, title, col, 15, "start", 700);
      [-3, 0, 3, 6].forEach(function (v) { s += line(P.x0, Y(v), P.x1, Y(v), v === 0 ? "#48484a" : "#2c2c2e", 1) + txt(P.x1 + 5, Y(v) + 4, (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) + "R", C.faint, 10.5); });
      var full = Math.floor(cnt), pts = [];
      for (var k = 0; k <= full && k < E.length; k++) pts.push([X(k), Y(E[k])]);
      if (cnt > full && full + 1 < E.length) pts.push([X(full + (cnt - full)), Y(lerp(E[full], E[full + 1], cnt - full))]);
      if (pts.length > 1) s += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="2.6" stroke-linejoin="round"/>';
      pts.forEach(function (p, k) { if (k) s += dot(p[0], p[1], 3.2, R[k - 1] > 0 ? C.up : C.dn); });
      s += txt(P.x0, P.s0 - 8, "size per trade", C.faint, 11);
      for (var j = 0; j < Math.min(14, Math.ceil(cnt)); j++) {
        var sz = S ? S[j] : 1, h = sz * (P.s1 - P.s0 - 6), w = (P.x1 - P.x0) / 14 * 0.6;
        s += rect(X(j + 0.5) - w / 2, P.s1 - h, w, h, hl && hl(j) ? C.orange : "#636366", 2);
      }
      return s + "</g>";
    }
    return {
      stages: ST, end: 19,
      size: function (n) { return n ? { W: 440, H: 900 } : { W: 1180, H: 500 }; },
      frame: function (T, L) {
        var n = L.narrow, g = geo(L), s = "";
        var cd = track([[0, 0], [3, 4], [3.5, 4], [6.5, 8], [7, 8], [10.5, 14]], T), cs = track([[0, 0], [3, 4], [3.5, 4], [6.5, 8], [11, 8], [14.5, 14]], T);
        var PD = n ? { x0: 22, x1: 390, e0: 210, e1: 420, s0: 446, s1: 500 } : { x0: 46, x1: 370, e0: 60, e1: 330, s0: 370, s1: 440 };
        var PS = n ? { x0: 22, x1: 390, e0: 580, e1: 790, s0: 816, s1: 870 } : { x0: 430, x1: 754, e0: 60, e1: 330, s0: 370, s1: 440 };
        var oD = T >= 11 && T < 15 ? 0.4 : 1, oS = T >= 7 && T < 11 ? 0.4 : 1;
        s += panel(PD, ED, RD, SD, cd, "Discretionary trader", C.cyan, oD, function (j) { return SD[j] < 1; });
        s += panel(PS, ES, RS, null, cs, "Mechanical system", C.gold, oS, function (j) { return j === 10 && T >= 11; });
        var XD = function (k) { return PD.x0 + k / 14 * (PD.x1 - PD.x0); }, YD = function (v) { return PD.e1 - (v + 4) / 10 * (PD.e1 - PD.e0); };
        var XS = function (k) { return PS.x0 + k / 14 * (PS.x1 - PS.x0); }, YS = function (v) { return PS.e1 - (v + 4) / 10 * (PS.e1 - PS.e0); };
        s += tag(XD(8), YD(-1) + 22, "half size", C.orange, win(T, 7.6, 15) * oD, "middle");
        s += tag(XD(14), YD(4.4), "cause found · full size", C.cyan, win(T, 9.9, 15) * oD, "end");
        s += tag(XS(8), YS(-3) + 22, "6 losers in a row", C.dn, win(T, 11.2, 15) * oS, "middle");
        s += tag(XS(10), YS(3) - 22, "+6R", C.up, win(T, 12.6, 19), "middle");
        var nb = n ? null : 60;
        s += note2(g, ["Two traders, same start", "Left: a discretionary trader.", "Right: a mechanical system.", "Both risk 1R a trade."], C.ink, win(T, 0.5, 3.4), nb);
        s += note2(g, ["Both hit a losing streak", "Four losers in a row so far.", "Six in a row is a given, she", "says. Size for it up front."], C.dn, win(T, 3.7, 6.9), nb);
        s += note2(g, ["Discretionary: cut size", "Something is wrong: sleep, a", "regime change, sloppy errors.", "Half size until you find it,", "then back to full."], C.cyan, win(T, 7.2, 10.9), nb);
        s += note2(g, ["System: keep size", "Six losers in a row, same size.", "That's when it's ready to", "spring: +6R on the next trade."], C.gold, win(T, 11.2, 14.9), nb);
        s += note2(g, ["Two opposite schools", "Both have sound math. Know", "which one you are before the", "drawdown, not in the middle."], C.up, fade(T, 15.2, 0.4), nb);
        return s + stamp(L, "Illustrative · made-up trades");
      }
    };
  }

  var SPECS = { spike: spikeSpec, day: daySpec, exits: exitsSpec, allout: alloutSpec, unit: unitSpec, drawdown: drawdownSpec };
  document.querySelectorAll("[data-rr-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-rr-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     The four profit centers, as a click-through stepper.
     Without the script the four show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-rr-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 4) return;
    var INFO = [
      { k: "Day trades",   c: C.blue,   tag: "S&P scalping · one to three trades a day" },
      { k: "Overnight",    c: C.up,     tag: "In one day, out the next" },
      { k: "Swing setups", c: C.gold,   tag: "Higher time frame pullback, lower time frame divergence" },
      { k: "Seasonal",     c: C.orange, tag: "Time-of-year tendencies" }
    ];
    var LAST = INFO.length - 1;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "Linda Raschke's four profit centers");
    bar.innerHTML = '<span class="gs-line"><i></i></span>' + INFO.map(function (s, i) {
      return '<button type="button" role="tab" class="gs-step" data-i="' + i + '"><b>' + (i + 1) + "</b><span>" + s.k + "</span></button>";
    }).join("");
    var body = document.createElement("div"); body.className = "gs-body";
    var left = document.createElement("div"); left.className = "gs-left";
    var tg = document.createElement("p"); tg.className = "gs-tag";
    var nav = document.createElement("div"); nav.className = "gs-nav";
    nav.innerHTML = '<button type="button" class="pill gs-prev">&lsaquo; Back</button><button type="button" class="pill pill-buy gs-next"></button>';
    var fig = document.createElement("div"); fig.className = "gs-chart";
    fig.innerHTML = '<svg viewBox="0 0 560 300" role="img" aria-label="A small picture of the current profit center"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    function chartAt(k) {
      var narrow = fig.clientWidth > 0 && fig.clientWidth < 460, W = 560, H = narrow ? 440 : 300, s = "", F = narrow ? 1.45 : 1;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      function t(x, y, str, col, size, anchor, weight) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" fill="' + col + '" font-size="' + (size * F).toFixed(1) + '" font-weight="' + (weight || 600) + '" text-anchor="' + (anchor || "start") + '">' + str + "</text>"; }
      function poly(pts, col, w, dash) { return '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + (w || 2.4) + '" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>"; }
      var top = 30, bot = H - 50;
      if (k === 0) {
        var P = [[30, 0.55], [70, 0.62], [100, 0.4], [150, 0.3], [190, 0.36], [240, 0.72], [290, 0.8], [320, 0.66], [360, 0.62], [400, 0.7], [450, 0.42], [500, 0.36], [530, 0.4]];
        var Y = function (v) { return bot - v * (bot - top); };
        [[100, 150, 240, 290], [400, 450, 500, 500]].forEach(function () {});
        s += '<rect x="150" y="' + Y(0.82).toFixed(1) + '" width="140" height="' + (Y(0.28) - Y(0.82)).toFixed(1) + '" rx="8" fill="' + C.blue + '" opacity="0.14"/>';
        s += '<rect x="400" y="' + Y(0.72).toFixed(1) + '" width="100" height="' + (Y(0.34) - Y(0.72)).toFixed(1) + '" rx="8" fill="' + C.blue + '" opacity="0.14"/>';
        s += poly(P.map(function (p) { return [p[0], Y(p[1])]; }), C.ink);
        s += t(220, Y(0.82) - 10, "60–90 min", C.blue, 12, "middle", 700) + t(450, Y(0.72) - 10, "60–90 min", C.blue, 12, "middle", 700);
        s += t(30, bot + 28, "One S&P session: catch one or two swings", C.dim, 12, "start", 500);
      } else if (k === 1) {
        var D = [[4, 9.4, 3.2, 3.6], [3.8, 4.2, 1.2, 1.4], [1.5, 6.8, 1.1, 6.5], [6.5, 8.2, 5.8, 7.9]];
        var Yd = function (v) { return bot - v / 10 * (bot - top); };
        D.forEach(function (d, i) {
          var x = 90 + i * 110, up = d[3] >= d[0], col = up ? C.up : C.dn;
          s += '<line x1="' + x + '" x2="' + x + '" y1="' + Yd(d[1]).toFixed(1) + '" y2="' + Yd(d[2]).toFixed(1) + '" stroke="' + col + '" stroke-width="2"/>';
          s += '<rect x="' + (x - 22) + '" y="' + Yd(Math.max(d[0], d[3])).toFixed(1) + '" width="44" height="' + Math.max(2, Math.abs(Yd(d[0]) - Yd(d[3]))).toFixed(1) + '" rx="3" fill="' + col + '"/>';
        });
        s += t(145, Yd(9.6) - 4, "two high→low days", C.dn, 12, "middle", 700);
        s += t(310, Yd(7.2) - 6, "buy the low→high day", C.up, 12, "middle", 700);
        s += t(420, Yd(8.6) - 8, "held another day", C.up, 12, "middle", 700);
        s += t(30, bot + 28, "Profitable: hold a day or two. Not: it's a day trade.", C.dim, 12, "start", 500);
      } else if (k === 2) {
        var mid = top + (bot - top) * 0.6;
        var Yp = function (v) { return top + 10 + (1 - v) * (mid - top - 30); }, Yo = function (v) { return bot - v * (bot - mid - 16); };
        var PP = [[30, 0.9], [90, 0.7], [140, 0.78], [200, 0.42], [250, 0.55], [320, 0.12], [370, 0.3], [420, 0.06], [470, 0.32], [530, 0.6]];
        var OO = [[30, 0.85], [90, 0.5], [140, 0.6], [200, 0.2], [250, 0.4], [320, 0.1], [370, 0.4], [420, 0.28], [470, 0.55], [530, 0.8]];
        s += poly(PP.map(function (p) { return [p[0], Yp(p[1])]; }), C.ink);
        s += poly(OO.map(function (p) { return [p[0], Yo(p[1])]; }), C.cyan, 2);
        s += poly([[320, Yp(0.12) + 10], [420, Yp(0.06) + 10]], C.dn, 2, "5 4") + poly([[320, Yo(0.1) + 10], [420, Yo(0.28) + 10]], C.up, 2, "5 4");
        s += t(370, Yp(0.06) + 34, "lower low", C.dn, 12, "middle", 700) + t(370, Yo(0.1) + 34, "higher low", C.up, 12, "middle", 700);
        s += t(30, top + 6, "weekly: correcting", C.gold, 12, "start", 700) + t(30, mid + 8, "daily momentum", C.cyan, 12, "start", 700);
        s += t(30, bot + 28, "Buy divergence at the end of the swing", C.dim, 12, "start", 500);
      } else {
        var MO = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"], SV = [0.5, 0.45, 0.4, 0.42, 0.55, 0.7, 0.82, 0.6, 0.45, 0.38, 0.44, 0.5];
        var bw = (W - 60) / 12;
        SV.forEach(function (v, i) {
          var x = 30 + i * bw, h = v * (bot - top - 20), on = i >= 3 && i <= 6;
          s += '<rect x="' + (x + 6).toFixed(1) + '" y="' + (bot - h).toFixed(1) + '" width="' + (bw - 12).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" fill="' + (on ? C.orange : "#48484a") + '"/>';
          s += t(x + bw / 2, bot + 18, MO[i], C.faint, 11, "middle", 500);
        });
        s += t(30, top + 6, "the same months, most years", C.orange, 12, "start", 700);
      }
      s += t(W - 16, H - 8, "Illustrative", C.faint, 11, "end", 400);
      return s;
    }
    function show(k, focus) {
      steps.forEach(function (st, i) { st.hidden = i !== k; });
      bar.querySelectorAll(".gs-step").forEach(function (b, i) {
        b.classList.toggle("is-done", i < k); b.classList.toggle("is-on", i === k);
        b.setAttribute("aria-selected", i === k ? "true" : "false");
        b.querySelector("b").textContent = i < k ? "✓" : String(i + 1);
      });
      bar.querySelector(".gs-line i").style.width = (k / LAST * 100) + "%";
      root.style.setProperty("--gs", INFO[k].c);
      tg.textContent = "Profit center " + (k + 1) + " of " + INFO.length + " · " + INFO[k].tag;
      nav.querySelector(".gs-prev").disabled = k === 0;
      nav.querySelector(".gs-next").innerHTML = k < LAST ? "Next: " + INFO[k + 1].k + " &rsaquo;" : "Back to 1 &rsaquo;";
      FS = 1;
      svg.innerHTML = chartAt(k);
      root.dataset.cur = k;
      if (focus) bar.querySelectorAll(".gs-step")[k].focus();
    }
    bar.addEventListener("click", function (e) { var b = e.target.closest(".gs-step"); if (b) show(+b.getAttribute("data-i")); });
    bar.addEventListener("keydown", function (e) {
      var k = +root.dataset.cur;
      if (e.key === "ArrowRight") { e.preventDefault(); show(Math.min(LAST, k + 1), true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(Math.max(0, k - 1), true); }
    });
    nav.querySelector(".gs-prev").addEventListener("click", function () { show(Math.max(0, +root.dataset.cur - 1)); });
    nav.querySelector(".gs-next").addEventListener("click", function () { var k = +root.dataset.cur; show(k < LAST ? k + 1 : 0); });
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { svg.innerHTML = chartAt(+root.dataset.cur); }, 150); });
    show(0);
  })();
})();

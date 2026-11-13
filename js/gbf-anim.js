/* =====================================================================
   gbf-anim.js — the animated walkthroughs on get-better-faster.html.

     [data-gbf-anim="setup"]     one setup: explain it before it happens
     [data-gbf-anim="playbook"]  same breakout shape, two different opportunities
     [data-gbf-anim="reps"]      live-only reps vs compressed reps, same four weeks
     [data-gbf-anim="seeit"]     the see-it moment: cut when it stops acting right, hold when it does
     [data-gbf-anim="review"]    review like film: what the data says the problem is
     [data-gbf-anim="restart"]   the strategy hopper resets the clock; the builder compounds
     [data-gbf-steps]            the learning cycle as a click-through stepper

   Same player and chart frame as fp-anim.js: each chart redraws in a
   narrow layout on a phone instead of scrolling sideways, and on a phone
   the callouts sit in a band above the chart so they never cover candles.

   Every chart is made-up bars or made-up trades, labelled "Illustrative".
   No market data.
   ===================================================================== */

(function () {
  "use strict";

  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { up: "#30d158", dn: "#ff453a", blue: "#2997ff", cyan: "#64d2ff", gold: "#f4b942", orange: "#ff9f0a", grey: "#8e8e93",
            ink: "#f5f5f7", dim: "#d1d1d6", faint: "#6e6e73", bg: "#1d1d1f", box: "#2c2c2e" };
  var NARROW_BELOW = 640;   // px of drawing width under which the narrow layout is used
  var FS = 1;               // text scale: larger in the narrow layout so labels stay readable on a phone

  /* ---------- shared drawing helpers ---------- */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fade(T, at, dur) { return clamp01((T - at) / (dur || 0.4)); }
  function ease(v) { v = clamp01(v); return v * v * (3 - 2 * v); }
  function lerp(a, b, m) { return a + (b - a) * m; }
  function txt(x, y, s, col, size, anchor, weight, op) {
    if (op != null && op <= 0) return "";
    return '<text x="' + (+x).toFixed(1) + '" y="' + (+y).toFixed(1) + '" fill="' + col + '" font-size="' + ((size || 13) * FS).toFixed(1) + '" text-anchor="' + (anchor || "start") + '"' +
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
  function callout(x, y, lines, col, op, right) {
    if (op <= 0) return "";
    var w = 18 + Math.max.apply(null, lines.map(function (s) { return s.replace(/&[a-z]+;/g, "x").length; })) * 7.3 * FS, h = 10 + lines.length * 18 * FS;
    var x0 = right ? x - w : x;
    var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + x0.toFixed(0) + '" y="' + y.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h + '" rx="8" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>';
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
      }, { threshold: 0.45 });
      io.observe(svg.parentNode || svg);
    }
  }

  /* ---------- made-up bars: a seeded path of segments, so every replay draws the same chart ---------- */
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* segs: { n, to | fn(i, n, from, idx), noise, wick, cap, flo, v }  or  { list: [{ c, h, l, v }] } */
  function path(seed, start, segs) {
    var R = rng(seed), out = [], p = start;
    function val(x, idx) { return typeof x === "function" ? x(idx) : x; }
    segs.forEach(function (sg) {
      var from = p, items = sg.list || new Array(sg.n);
      for (var i = 1; i <= items.length; i++) {
        var idx = out.length, it = sg.list ? sg.list[i - 1] : null, o = p, c, h, l, w = sg.wick != null ? sg.wick : 0.1;
        if (it) {
          c = it.c;
          h = it.h != null ? it.h : Math.max(o, c) + R() * w;
          l = it.l != null ? it.l : Math.min(o, c) - R() * w;
        } else {
          c = (sg.fn ? sg.fn(i, sg.n, from, idx) : lerp(from, sg.to, i / sg.n)) + (R() - 0.5) * 2 * (sg.noise || 0);
          var cap = val(sg.cap, idx), flo = val(sg.flo, idx);
          if (cap != null) c = Math.min(c, cap - 0.02);
          if (flo != null) c = Math.max(c, flo + 0.02);
          h = Math.max(o, c) + R() * w; l = Math.min(o, c) - R() * w;
          if (cap != null) h = Math.min(h, cap);
          if (flo != null) l = Math.max(l, flo);
        }
        var v = it && it.v != null ? it.v : sg.v != null ? sg.v * (0.8 + 0.4 * R()) : 0.35 * (0.7 + 0.6 * R());
        out.push({ o: o, h: h, l: l, c: c, v: v });
        p = c;
      }
    });
    return out;
  }
  function emaOf(B, n) { var e = null; return B.map(function (b) { e = e == null ? b.c : e + (b.c - e) * 2 / (n + 1); return e; }); }
  function usd(p) { return "$" + p.toFixed(2); }
  function win(T, a, b) { return fade(T, a, 0.4) * (b != null ? 1 - fade(T, b, 0.3) : 1); }

  /* ---------- the chart frame every walkthrough shares ---------- */
  function chart(cfg) {
    var B = cfg.bars, N = B.length, E = cfg.ema ? emaOf(B, cfg.ema) : null;
    function shownAt(T) {
      var R = cfg.reveal;
      if (T <= R[0][0]) return R[0][1];
      for (var k = 1; k < R.length; k++) if (T <= R[k][0]) return lerp(R[k - 1][1], R[k][1], ease((T - R[k - 1][0]) / (R[k][0] - R[k - 1][0])) * 0.25 + (T - R[k - 1][0]) / (R[k][0] - R[k - 1][0]) * 0.75);
      return R[R.length - 1][1];
    }
    function size(n) { return n ? { W: 440, H: cfg.vol ? 640 : 580 } : { W: 1180, H: cfg.vol ? 520 : 470 }; }
    function frame(T, L) {
      var n = L.narrow, s = "";
      var x0 = n ? 14 : 64, x1 = n ? 380 : 1080, y0 = n ? 152 : 52, y1 = n ? (cfg.vol ? 500 : 540) : (cfg.vol ? 392 : 432);
      function X(i) { return x0 + (i + 0.5) * (x1 - x0) / N; }
      function Y(p) { return y1 - (p - cfg.lo) / (cfg.hi - cfg.lo) * (y1 - y0); }
      var cw = Math.max(3, (x1 - x0) / N * 0.62);
      for (var p = Math.ceil(cfg.lo / cfg.step - 1e-9) * cfg.step; p <= cfg.hi + 1e-9; p += cfg.step) {
        s += line(x0, Y(p), x1, Y(p), "rgba(255,255,255,0.05)", 1);
        s += txt(x1 + 8, Y(p) + 4, (cfg.fmt || usd)(p), C.faint, 11);
      }
      s += txt(n ? 14 : 64, 28, cfg.title, C.faint, 12);
      var sh = shownAt(T), g = { T: T, n: n, L: L, X: X, Y: Y, x0: x0, x1: x1, y0: y0, y1: y1, cw: cw, shown: sh, bars: B, ema: E };
      if (cfg.under) s += cfg.under(T, g);
      if (E && sh > 1) {
        var eo = cfg.emaOp ? cfg.emaOp(T) : 1, pts = [];
        for (var j = 0; j < N && j < sh; j++) pts.push(X(j).toFixed(1) + "," + Y(E[j]).toFixed(1));
        if (eo > 0 && pts.length > 1) {
          s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.orange + '" stroke-width="2.4" stroke-linejoin="round" opacity="' + eo.toFixed(3) + '"/>';
          var je = Math.min(N - 1, Math.floor(sh - 0.01));
          s += txt(X(je) + 8, Y(E[je]) + 16, "9 EMA", C.orange, 12, "start", 700, eo);
        }
      }
      for (var i = 0; i < N && i < sh; i++) s += candle(X(i), Y, [B[i].o, B[i].h, B[i].l, B[i].c], Math.min(1, sh - i), cw);
      if (cfg.vol) {
        var vy1 = L.H - (n ? 30 : 26), vy0 = vy1 - (n ? 66 : 62);
        s += txt(x0, vy0 - 6, "Volume", C.faint, 11);
        for (var k = 0; k < N && k < sh; k++) {
          var hv = B[k].v * Math.min(1, sh - k) * (vy1 - vy0);
          s += rect(X(k) - cw / 2, vy1 - hv, cw, hv, B[k].c >= B[k].o ? C.up : C.dn, 1, 0.5);
        }
      }
      if (cfg.overlay) s += cfg.overlay(T, g);
      s += txt(L.W - 14, L.H - 8, "Illustrative · made-up bars", C.faint, 11, "end");
      return s;
    }
    return { stages: cfg.stages, end: cfg.end, frame: frame, size: size };
  }

  /* ---------- overlay helpers ---------- */
  function hl(g, p, i0, i1, col, w, dash, op) {
    var xa = i0 == null ? g.x0 : g.X(i0) - g.cw, xb = i1 == null ? g.x1 : Math.min(g.x1, g.X(i1) + g.cw);
    return line(xa, g.Y(p), xb, g.Y(p), col, w || 1.6, dash, op);
  }
  /* a callout: on a phone it sits in the band above the chart; on desktop at (wx, wy) */
  function note(g, lines, col, op, wx, wy, right) { return g.n ? callout(14, 40, lines, col, op) : callout(wx, wy, lines, col, op, right); }
  function pill(x, y, s, col, op, anchor) {
    if (op <= 0) return "";
    var w = s.length * 7.2 * FS + 18, h = 22 * FS, xa = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xa.toFixed(1) + '" y="' + (y - h + 6).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + (h / 2).toFixed(1) + '" fill="' + col + '"/>' +
      txt(xa + w / 2, y - 1, s, "#000", 12, "middle", 700) + "</g>";
  }
  function ring(x, y, r, col, op) { return op > 0 ? '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="2" opacity="' + op.toFixed(3) + '"/>' : ""; }
  function zone(g, i0, i1, lo, hi, col, op) {
    if (op <= 0) return "";
    var xa = g.X(i0) - g.cw, xb = g.X(i1) + g.cw;
    return '<rect x="' + xa.toFixed(1) + '" y="' + g.Y(hi).toFixed(1) + '" width="' + (xb - xa).toFixed(1) + '" height="' + (g.Y(lo) - g.Y(hi)).toFixed(1) + '" rx="4" fill="' + col + '" fill-opacity="0.12" stroke="' + col + '" stroke-opacity="0.7" opacity="' + op.toFixed(3) + '"/>';
  }
  function lab(g, p, s, col, op, x) { return txt(x != null ? x : g.x0 + 6, g.Y(p) - 7, s, col, 12, "start", 700, op); }

  var PURPLE = "#bf5af2";
  function sma(B, n) { return B.map(function (b, i) { var w = B.slice(Math.max(0, i - n + 1), i + 1), m = 0; w.forEach(function (x) { m += x.c; }); return m / w.length; }); }
  function sdev(B, n, M) { return B.map(function (b, i) { var w = B.slice(Math.max(0, i - n + 1), i + 1), s = 0; w.forEach(function (x) { s += (x.c - M[i]) * (x.c - M[i]); }); return Math.sqrt(s / w.length); }); }
  function poly(g, vals, upto, col, w, op, dash) {
    if (op <= 0) return "";
    var pts = [];
    for (var j = 0; j < vals.length && j < upto; j++) pts.push(g.X(j).toFixed(1) + "," + g.Y(vals[j]).toFixed(1));
    return pts.length > 1 ? '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + ' opacity="' + op.toFixed(3) + '"/>' : "";
  }
  /* a label on a dark chip, so it stays readable over candles */
  function tag(x, y, s, col, op, anchor) {
    if (op <= 0) return "";
    var w = s.replace(/&[a-z]+;/g, "x").length * 6.9 * FS + 14, h = 19 * FS, xa = anchor === "end" ? x - w : anchor === "middle" ? x - w / 2 : x;
    return '<g opacity="' + op.toFixed(3) + '"><rect x="' + xa.toFixed(1) + '" y="' + (y - h / 2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="6" fill="' + C.bg + '" fill-opacity="0.9"/>' +
      txt(xa + w / 2, y + 4 * FS, s, col, 12, "middle", 700) + "</g>";
  }
  /* numbered touch marker on a level */
  function touch(g, i, p, k, col, op, below) {
    if (op <= 0) return "";
    var y = g.Y(p) + (below ? 16 : -16);
    return ring(g.X(i), g.Y(p), 11, col, op) + txt(g.X(i), y + (below ? 8 : 0), String(k), col, 12, "middle", 800, op);
  }

  /* two charts shown one after the other: the first until SW, then the second */
  function twoWorlds(WA, WB, SW, stages, end) {
    return { size: WA.size, stages: stages, end: end, frame: function (T, L) { return T < SW ? WA.frame(T, L) : WB.frame(T - SW, L); } };
  }
  /* pills stacked down the left on desktop, two columns in the phone band */
  function pills(g, list, at, step, op) {
    var s = "";
    list.forEach(function (q, k) {
      var a = op * fade(g.T, at + k * step, 0.35);
      if (g.n) s += pill(14 + (k % 2) * 210, 60 + Math.floor(k / 2) * 30 * FS, q[1], q[2], a);
      else s += pill(g.x0 + 8, g.y0 + 22 + k * 28, q[0], q[2], a);
    });
    return s;
  }
  function cross(x, y, col, op) {
    return op > 0 ? '<g opacity="' + op.toFixed(3) + '">' + line(x - 7, y - 7, x + 7, y + 7, col, 2.4) + line(x - 7, y + 7, x + 7, y - 7, col, 2.4) + "</g>" : "";
  }

  /* =====================================================================
     1 · one setup: explain it before it happens
     ===================================================================== */
  function setupSpec() {
    var B = path(41, 20.4, [
      { n: 8, fn: function (i) { return 20.4 + 0.15 * Math.sin(i * 1.7); }, noise: 0.06, wick: 0.1, v: 0.3 },
      { list: [{ c: 20.95, h: 21.02, v: 0.9 }, { c: 20.6, v: 0.6 }] },
      { n: 3, to: 20.42, noise: 0.05, wick: 0.08, v: 0.35 },
      { n: 4, to: 21.1, noise: 0.05, wick: 0.08, v: 0.4 },
      { n: 6, fn: function (i) { return 21.36 + 0.1 * Math.sin(i * 1.9); }, noise: 0.04, wick: 0.1, cap: 21.5, flo: 21.25, v: 0.3 },
      { list: [{ c: 21.66, l: 21.42, v: 1 }] },
      { n: 6, to: 22.28, noise: 0.07, wick: 0.09, v: 0.6 },
      { list: [{ c: 22.36, h: 22.46, v: 0.6 }] }
    ]);
    var CH = 8, ENT = 23, LV = 21.5, SP = 21.2, TP = 22.4, EP = B[ENT].c;
    var S1 = 4.2, S2 = 8, S3 = 12.6, END = 18;
    var P = [
      ["Why in play · earnings beat, RVOL 4", "In play · news", C.blue],
      ["Level · $21.50, the morning high", "Level · $21.50", C.blue],
      ["Trigger · 5-min close over $21.50", "Trigger · close over", C.up],
      ["Wrong · back under $21.20", "Wrong · $21.20", C.dn],
      ["Target · $22.40, the prior high", "Target · $22.40", C.gold],
      ["Pass if · no volume on the break", "Pass · no volume", C.grey]
    ];
    return chart({
      bars: B, lo: 19.9, hi: 22.8, step: 0.5, vol: true, title: "Illustrative · a reaction, then a setup",
      reveal: [[0, 0], [3.4, CH + 2], [S1 + 0.3, CH + 2], [S1 + 2.6, 13], [S2, 13], [S2 + 3.6, ENT], [S3 + 0.2, ENT], [S3 + 0.8, ENT + 1], [S3 + 1.4, ENT + 1], [17.2, B.length]],
      stages: [
        { at: 0,  title: "Something is moving", text: "A stock pops on the screen and you buy it. No level, no trigger, no stop decided. It's an interest in the stock, not a setup." },
        { at: S1, title: "Then you explain it", text: "It fails, and afterward you try to explain why it was a setup. That's backwards: every trade becomes a brand new idea." },
        { at: S2, title: "Answer it before the trade", text: "A real setup can be explained before it happens: why it's in play, the level, the trigger, where you're wrong, the target, and what would make you pass." },
        { at: S3, title: "Then it's just execution", text: "The trigger prints and you take it the way you wrote it. It works, or it proves you wrong at a price you already knew." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "", aC = fade(T, 2.6, 0.3) * (1 - fade(T, S2, 0.5));
        s += cross(g.X(CH), g.Y(B[CH].h) - 4, C.dn, aC) + tag(g.X(CH) + 14, g.Y(B[CH].h) - 6, "bought the pop", C.dn, aC);
        var aA = fade(T, S1 + 1.2, 0.4) * (1 - fade(T, S2, 0.5));
        s += tag(g.X(11), g.Y(20.05), g.n ? "after: “a breakout?”" : "after the fact: “that was a breakout?”", C.dim, aA, "middle");
        var aP = fade(T, S2 + 0.3, 0.4), pOut = g.n ? 1 - fade(T, S3 + 3.2, 0.5) : 1;
        s += pills({ T: T, n: g.n, x0: g.x0, y0: g.y0 }, P, S2 + 0.5, 0.55, pOut);
        /* on a phone each line gets a price chip on the axis; the pills above say what it is */
        function lab2(p, s2, col, op, dy) { return g.n ? tag(g.x1 - 4, g.Y(p), usd(p), col, op) : tag(g.x1 - 2, g.Y(p) + dy * FS, s2, col, op, "end"); }
        s += hl(g, LV, 13, null, C.blue, 2, null, aP) + lab2(LV, "$21.50 · level", C.blue, aP, 14);
        var aR = fade(T, S2 + 2, 0.4);
        s += hl(g, SP, 13, null, C.dn, 1.6, "5 4", aR) + lab2(SP, "wrong · $21.20", C.dn, aR, 14);
        s += hl(g, TP, 13, null, C.gold, 1.6, "5 4", aR) + lab2(TP, "target · $22.40", C.gold, aR, -14);
        var aE = fade(T, S3 + 0.6, 0.3);
        s += hl(g, EP, ENT - 1, null, C.ink, 1.4, null, aE * 0.8) + ring(g.X(ENT), g.Y(B[ENT].c), 12, C.up, aE * (1 - fade(T, S3 + 3, 0.4)));
        s += txt(g.X(ENT) - g.cw - 6, g.Y(EP) - 8, "entry", C.ink, 12, "end", 700, aE);
        s += note(g, ["Written before the open", "executed as written"], C.up, fade(T, S3 + 3.8, 0.5) * (g.n ? 1 : 0), 0, 0);
        return s;
      }
    });
  }

  /* =====================================================================
     2 · playbook: the same breakout shape, two different opportunities
     ===================================================================== */
  function playbookSpec() {
    var base = [
      { n: 5, to: 47.6, noise: 0.1, wick: 0.12, cap: 48, v: 0.35 },
      { n: 6, fn: function (i) { return 47.7 + 0.12 * Math.sin(i * 1.6); }, noise: 0.05, wick: 0.1, cap: 48, flo: 47.4, v: 0.3 }
    ];
    var A = path(53, 46.9, base.concat([{ list: [{ c: 48.55, l: 47.8, v: 1 }] }, { n: 9, to: 50.7, noise: 0.12, wick: 0.13, v: 0.62 }]));
    var Bb = path(53, 46.9, base.concat([{ list: [{ c: 48.3, l: 47.8, v: 0.42 }] }, { n: 2, to: 48.82, noise: 0.04, wick: 0.08, cap: 49, v: 0.35 }, { n: 7, to: 46.95, noise: 0.1, wick: 0.12, v: 0.55 }]));
    var BRK = 11, SW = 9.6, S1 = 4.4, S3 = SW + 5.8, S4 = SW + 8.6, END = SW + 12.4;
    var GOOD = [["Fresh news ✓", "Fresh news ✓", C.up], ["RVOL 3.8 ✓", "RVOL 3.8 ✓", C.up], ["Room overhead ✓", "Room overhead ✓", C.up], ["Market strong ✓", "Market strong ✓", C.up]];
    var BAD = [["No catalyst ✗", "No catalyst ✗", C.dn], ["RVOL 0.9 ✗", "RVOL 0.9 ✗", C.dn], ["Resistance at $49 ✗", "Resistance $49 ✗", C.dn], ["Market a little weak ✗", "Market weak ✗", C.orange]];
    function world(B, good) {
      return chart({
        bars: B, lo: 46.2, hi: 51.3, step: 1, vol: true, title: good ? "Illustrative · breakout A" : "Illustrative · breakout B, the same shape",
        reveal: [[0, 0], [3.4, BRK], [S1 - 0.3, BRK], [S1 + 0.4, BRK + 1], [8.8, B.length]],
        stages: [], end: 1,
        overlay: function (T, g) {
          var s = "", a = fade(T, 0.3, 0.5), brk = T >= S1 + 0.4, failed = !good && g.shown > BRK + 5;
          var col = !brk ? C.blue : good ? C.up : failed ? C.dn : C.blue;
          s += hl(g, 48, 0, null, col, 2, failed ? "6 4" : null, a);
          s += tag(g.X(1), g.Y(48) - 14 * FS, failed ? "$48 · back under the base" : brk && good ? "$48 · broken, holding" : "$48 · the base", col, a);
          if (!good) s += hl(g, 49, 0, null, C.dn, 1.6, "5 4", a) + tag(g.x1 - 2, g.Y(49) - 13 * FS, "resistance · $49", C.dn, a, "end");
          s += ring(g.X(BRK), g.Y(B[BRK].c), 13, good ? C.up : C.orange, fade(T, S1 + 0.4, 0.3) * (1 - fade(T, S1 + 3, 0.5)));
          var pOut = g.n ? 1 - fade(T, 8.6, 0.4) : 1;
          s += pills(g, good ? GOOD : BAD, 1.2, 0.6, pOut);
          if (!good) s += note(g, ["Same shape on the surface", "not the same opportunity"], C.gold, fade(T, 9, 0.5), g.X(BRK + 1), g.Y(51.2));
          return s;
        }
      });
    }
    return twoWorlds(world(A, true), world(Bb, false), SW, [
      { at: 0,  title: "A breakout with everything behind it", text: "A tight base under $48. Fresh news, relative volume near 4, room to run overhead and a strong market." },
      { at: S1, title: "It breaks and runs", text: "The break holds and the stock keeps going. Screenshot it, and file it under the best version of the setup." },
      { at: SW, title: "The same shape, another day", text: "Same base, same break. But there's no catalyst, resistance sits a dollar overhead and the market is only okay, maybe a little weak." },
      { at: S3, title: "Not the same opportunity", text: "It stalls under resistance and falls back through the base. On the surface both were breakouts; the variables said pass." },
      { at: S4, title: "Rules start you, nuance pays", text: "The only way to learn the difference is to collect examples: the best versions, the average ones, and the traps that look close but fail." }
    ], END);
  }

  /* =====================================================================
     3 · compress your reps: same four weeks, very different rep counts
     ===================================================================== */
  function repsSpec() {
    var D = 20, LIVE = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0];
    var SRC = [
      { k: "Live trade", col: C.up, f: function (d) { return LIVE[d]; }, on: 0 },
      { k: "Replay", col: C.blue, f: function () { return 2; }, on: 1 },
      { k: "Chart review", col: C.cyan, f: function () { return 1; }, on: 1 },
      { k: "Best of the day", col: C.gold, f: function () { return 1; }, on: 1 },
      { k: "Historical study", col: PURPLE, f: function () { return 3; }, on: 2 },
      { k: "Watching tape", col: "#5e5ce6", f: function () { return 1; }, on: 2 },
      { k: "Best of the week", col: C.grey, f: function (d) { return d % 5 === 4 ? 5 : 0; }, on: 2 }
    ];
    var S1 = 4.4, S2 = 8.4, S3 = 12.2, END = 16.5, ON = [0, S1 + 0.3, S2 + 0.3];
    var TOT = { live: 0, all: 0 };
    for (var d = 0; d < D; d++) SRC.forEach(function (q) { var v = q.f(d); TOT.all += v; if (!q.on) TOT.live += v; });
    return {
      stages: [
        { at: 0,  title: "Live trading only", text: "The setup shows up once a day, maybe less, and some days you miss it. Four weeks of screen time: " + TOT.live + " real reps." },
        { at: S1, title: "Replay and review are reps too", text: "Replay the setup, review the charts after the close, study the best opportunity of the day. Each one is another rep." },
        { at: S2, title: "Study the past, watch the tape", text: "Historical examples, backtesting, tape, and the best trades of the week. Same setup, many more looks at it." },
        { at: S3, title: "Same calendar, more useful reps", text: "Same four weeks. " + TOT.live + " reps live only, " + TOT.all + " compressed. See it 500 times and you stop thinking about it the same way. You just see it." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 640 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var x0 = n ? 14 : 64, x1 = n ? 380 : 1080, y0 = n ? 160 : 88, y1 = n ? 360 : 300, hi = 210;
        var cb = n ? 520 : 470, chh = n ? 120 : 130;
        function X(i) { return x0 + i * (x1 - x0) / D; }
        function Y(v) { return y1 - v / hi * (y1 - y0); }
        var w = SRC.map(function (q) { return q.on ? ease(fade(T, ON[q.on], 1.2)) : 1; });
        var days = q0(T);
        function q0(t) { return t < S1 ? lerp(0, D, clamp01(t / (S1 - 0.6))) : D; }
        for (var p = 0; p <= hi; p += 50) {
          s += line(x0, Y(p), x1, Y(p), p === 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)", 1);
          s += txt(x1 + 8, Y(p) + 4, String(p), C.faint, 11);
        }
        s += txt(x0, 28, "Illustrative · reps of one setup, four weeks", C.faint, 12);
        s += txt(x0, y0 - 10, "Total reps", C.faint, 11);
        /* cumulative curves */
        var cl = [0], ca = [0];
        for (var d2 = 0; d2 < D; d2++) {
          var dayAll = 0; SRC.forEach(function (q, k) { dayAll += q.f(d2) * w[k]; });
          cl.push(cl[d2] + LIVE[d2]); ca.push(ca[d2] + dayAll);
        }
        function curve(V, col, wd, upto) {
          var pts = [], k = Math.floor(upto);
          for (var j = 0; j <= k && j <= D; j++) pts.push(X(j).toFixed(1) + "," + Y(V[j]).toFixed(1));
          if (k < D) { var f = upto - k; pts.push(lerp(X(k), X(k + 1), f).toFixed(1) + "," + Y(lerp(V[k], V[k + 1], f)).toFixed(1)); }
          return pts.length > 1 ? '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + wd + '" stroke-linejoin="round"/>' : "";
        }
        var aB = fade(T, S1 + 0.2, 0.4);
        if (aB > 0) s += '<g opacity="' + aB.toFixed(3) + '">' + curve(ca, C.blue, 2.8, D) + "</g>";
        s += curve(cl, C.up, 2.8, days);
        var kd = Math.min(D, Math.floor(days));
        s += txt(X(kd) - 4, Y(cl[kd]) - 10, "Live only · " + Math.round(cl[kd]), C.up, 12, "end", 700, fade(T, 0.6, 0.4));
        s += txt(X(D) - 4, Y(ca[D]) - 10, "Compressed · " + Math.round(ca[D]), C.blue, 12, "end", 700, aB);
        /* reps per day, stacked by source */
        s += txt(x0, cb - chh - 8, "Reps per day", C.faint, 11);
        s += line(x0, cb, x1, cb, "rgba(255,255,255,0.12)", 1);
        var bw = (x1 - x0) / D * 0.6;
        for (var d3 = 0; d3 < D && d3 < days; d3++) {
          var yy = cb, op = Math.min(1, days - d3);
          SRC.forEach(function (q, k) {
            var h = q.f(d3) * w[k] * chh / 14;
            if (h > 0) { s += rect(X(d3 + 0.5) - bw / 2, yy - h, bw, h - 1, q.col, 1, 0.85 * op); yy -= h; }
          });
        }
        for (var wk = 0; wk < 4; wk++) s += txt(X(wk * 5 + 2.5), cb + 16, "Week " + (wk + 1), C.faint, 11, "middle");
        /* legend */
        SRC.forEach(function (q, k) {
          var a = q.on ? fade(T, ON[q.on], 0.5) : 1, lx, ly;
          if (n) { lx = 14 + (k % 2) * 200; ly = 566 + Math.floor(k / 2) * 17; }
          else { lx = x0 + [0, 110, 200, 318, 456, 600, 722][k]; ly = 52; }
          s += rect(lx, ly - 9, 10, 10, q.col, 2, a) + txt(lx + 15, ly, q.k, C.dim, 11, "start", null, a);
        });
        s += note({ n: n }, ["Same four weeks", TOT.live + " reps vs " + TOT.all + " reps"], C.gold, fade(T, S3 + 0.4, 0.5), x0 + 10, y0 + 6);
        s += txt(L.W - 14, L.H - 8, "Illustrative · made-up rep counts", C.faint, 11, "end");
        return s;
      }
    };
  }

  /* =====================================================================
     6 · the see-it moment: cut when it stops acting right, hold when it does
     ===================================================================== */
  function seeitSpec() {
    var base = [{ n: 6, fn: function (i) { return 34.84 + 0.07 * Math.sin(i * 1.8); }, noise: 0.03, wick: 0.06, cap: 35, flo: 34.76, v: 0.32 }];
    var A = path(61, 34.82, base.concat([
      { list: [{ c: 35.2, l: 34.96, v: 0.85 }, { c: 35.26, v: 0.42 }, { c: 35.18, v: 0.3 }, { c: 35.22, v: 0.2 }, { c: 34.94, h: 35.24, v: 0.5 }] },
      { n: 4, to: 34.66, noise: 0.03, wick: 0.05, v: 0.45 },
      { n: 3, to: 34.48, noise: 0.04, wick: 0.06, v: 0.4 }
    ]));
    var Bb = path(61, 34.82, base.concat([
      { list: [{ c: 35.3, l: 34.96, v: 1 }, { c: 35.55, v: 0.85 }, { c: 35.8, v: 0.8 }] },
      { n: 3, to: 35.42, noise: 0.03, wick: 0.06, flo: 35.3, v: 0.32 },
      { list: [{ c: 35.7, l: 35.36, v: 0.82 }] },
      { n: 8, to: 36.72, noise: 0.07, wick: 0.08, v: 0.6 }
    ]));
    var ENT = 6, SEE = 10, EP = 35.2, SP = 34.7, STOPBAR = 13, TP = EP + 3 * (EP - SP);
    A[STOPBAR].l = Math.min(A[STOPBAR].l, 34.67);
    Bb[Bb.length - 1].h = Math.max(Bb[Bb.length - 1].h, TP + 0.05);
    var S1 = 4, S2 = 6.6, S3 = 9, S4 = 12.4, SW = 15.6, S5 = SW + 4.8, END = SW + 9.4;
    function world(B, good) {
      var lo = good ? 34.5 : 34.25, hi = good ? 37.0 : 35.65;
      return chart({
        bars: B, lo: lo, hi: hi, step: good ? 0.5 : 0.25, vol: true, title: good ? "Illustrative · the same trigger, acting right" : "Illustrative · a breakout that stops acting right",
        reveal: good ? [[0, 0], [3, ENT + 1], [4.4, ENT + 4], [5.8, 13], [8.6, B.length]]
                     : [[0, 0], [3.2, ENT + 1], [S1, ENT + 1], [S1 + 2, SEE], [S3 - 0.5, SEE], [S3, SEE + 1], [S4, SEE + 1], [S4 + 2.4, B.length]],
        stages: [], end: 1,
        overlay: function (T, g) {
          var s = "", a = fade(T, 0.3, 0.5), vy0 = L0(g);
          s += hl(g, 35, 0, null, C.blue, 2, null, a) + tag(g.X(0.5), g.Y(35) - 13 * FS, "$35 · the base", C.blue, a * (good && g.n ? 1 - fade(T, 5.8, 0.3) : 1));
          var aE = fade(T, 3.2, 0.3);
          s += hl(g, EP, ENT - 1, null, C.ink, 1.4, null, aE * 0.8) + txt(g.x1 - 2, g.Y(EP) - 7, "entry $35.20", C.ink, 12, "end", 700, aE);
          s += hl(g, SP, ENT - 1, null, C.dn, 1.6, "5 4", aE) + txt(g.x1 - 2, g.Y(SP) + 16, "stop $34.70 · −1R", C.dn, 12, "end", 700, aE);
          if (!good) {
            var a1 = fade(T, S1 + 1.6, 0.4) * (1 - fade(T, S4, 0.4));
            s += tag(g.X(8), g.Y(35.5), "should go quickly · it stalls", C.orange, a1, "middle");
            var a2 = fade(T, S2, 0.4) * (1 - fade(T, S4, 0.4));
            s += tag(g.X(8), vy0 - 14, "volume dying on the break", C.orange, a2, "middle");
            var a3 = fade(T, S3, 0.3);
            s += ring(g.X(SEE), g.Y(B[SEE].c), 13, C.orange, a3);
            s += pill(g.X(SEE) + 16, g.Y(B[SEE].c) + 26, g.n ? "See it · ≈ −0.5R" : "See it · back under · out ≈ −0.5R", C.orange, a3);
            var a4 = fade(T, S4 + 1.6, 0.4);
            s += cross(g.X(STOPBAR), g.Y(SP), C.dn, a4);
            s += note(g, ["Full stop: −1R", "See-it exit: about −0.5R"], C.gold, fade(T, S4 + 2.4, 0.5), g.X(11), g.Y(35.62));
          } else {
            var b1 = fade(T, 4.6, 0.4);
            s += tag(g.X(8), g.Y(36.1), "goes quickly", C.up, b1, "middle");
            s += tag(g.X(8), vy0 - 14, "volume expands", C.up, b1, "middle");
            var b2 = fade(T, 6, 0.4);
            s += tag(g.X(11), g.Y(34.84), "dip holds above $35", C.up, b2, "middle");
            var b3 = fade(T, 8.4, 0.4);
            s += hl(g, TP, ENT - 1, null, C.gold, 1.6, "5 4", fade(T, 4.8, 0.4)) + txt(g.X(ENT), g.Y(TP) - 8, "+3R · $36.70", C.gold, 12, "start", 700, fade(T, 4.8, 0.4));
            s += note(g, ["Acting like the version you studied", "so you hold it"], C.up, b3, g.X(0), g.Y(36.95));
          }
          return s;
        }
      });
    }
    function L0(g) { return g.L.H - (g.n ? 30 : 26) - (g.n ? 66 : 62); }
    return twoWorlds(world(A, false), world(Bb, true), SW, [
      { at: 0,  title: "The trigger", text: "A tight base under $35, then the break. Entry $35.20, stop $34.70 under the base: one full R is 50 cents." },
      { at: S1, title: "It should go quickly. It stalls.", text: "The breakout should move. Instead it sits there. That's information." },
      { at: S2, title: "Volume dies on the break", text: "Volume should expand on a breakout. It's fading bar by bar. More information, and the stop hasn't been touched." },
      { at: S3, title: "The see-it moment", text: "It closes back under the level it just broke. The trade is no longer acting like the version you studied, so you cut: about −0.5R." },
      { at: S4, title: "The full stop would have cost 1R", text: "Waiting for the stop because technically it hadn't hit means losing the full R every time you're wrong." },
      { at: SW, title: "And when it acts right", text: "Same base, same trigger. This time it goes quickly, volume expands and the first dip holds above the level." },
      { at: S5, title: "Hold the one acting right", text: "The skill cuts both ways: cut risk earlier when the thesis weakens, and hold longer when the trade is acting exactly the way it should. This one reaches +3R." }
    ], END);
  }

  /* =====================================================================
     7 · review like film: what the data says the problem is
     ===================================================================== */
  function reviewSpec() {
    var TOD = { k: ["9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "1:00", "2:00", "3:00"], v: [6.4, 4.1, 2.2, 0.9, -3.2, -4.0, -2.7, -1.8, -0.6] };
    var TYP = { k: ["Playbook A setups", "Playbook B setups", "Unplanned trades"], s: ["A setups", "B setups", "Unplanned"], v: [11.8, 2.4, -12.9] };
    var TRAITS = [["Fresh catalyst that day", 18], ["Taken before 10:30", 17], ["Relative volume over 2", 16], ["Market moving the same way", 15], ["Entered on the pullback, not a chase", 14]];
    var S1 = 3.6, S2 = 8.2, S3 = 12.8, END = 18.5;
    return {
      stages: [
        { at: 0,  title: "Vague review", text: "“I looked at my trades and I think I did okay.” That tells you nothing, and most traders are wrong about what their problem is." },
        { at: S1, title: "Sort it by time of day", text: "The same made-up month, by when each trade was taken. Fine in the morning, falls apart after 11:30. The fix isn't better entries; it's stopping earlier." },
        { at: S2, title: "Sort it by trade type", text: "The playbook trades made money. The unplanned ones gave almost all of it back. The best ideas work; the random trades are the problem." },
        { at: S3, title: "Study the winners too", text: "Line up the 20 best trades side by side and ask what they had in common. Losers teach you what to avoid; winners teach you what to look for and what to push." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 640 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "";
        var x0 = n ? 14 : 64, x1 = n ? 426 : 1116, y0 = n ? 190 : 92, y1 = n ? 560 : 440;
        s += txt(x0, 28, "Illustrative · one made-up month of trades", C.faint, 12);
        function bars(D, op, at, lo, hi, labels) {
          if (op <= 0) return "";
          var out = "", N = D.v.length, mid = y0 + (hi / (hi - lo)) * (y1 - 30 - y0);
          function Y(v) { return mid - v / (hi - lo) * (y1 - 30 - y0); }
          out += line(x0, mid, x1, mid, "rgba(255,255,255,0.2)", 1, null, op);
          var slot = (x1 - x0) / N, bw = slot * (N > 4 ? 0.58 : 0.42);
          D.v.forEach(function (v, k) {
            var g2 = ease(fade(T, at + 0.3 + k * 0.15, 0.6)), x = x0 + slot * (k + 0.5), yv = Y(v * g2);
            out += rect(x - bw / 2, Math.min(mid, yv), bw, Math.abs(yv - mid), v >= 0 ? C.up : C.dn, 3, op * 0.85);
            out += txt(x, v >= 0 ? yv - 8 : yv + 18, (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + "R", v >= 0 ? C.up : C.dn, 12, "middle", 700, op * g2);
            out += txt(x, y1 - 4, labels[k], C.dim, n && N > 4 ? 10 : 12, "middle", null, op);
          });
          return out;
        }
        var a0 = win(T, 0.3, S1 - 0.4);
        s += note({ n: n }, ["“I think my problem", "is my entries”"], C.dim, a0, x0 + 300, y0 + 80);
        if (!n) s += txt((x0 + x1) / 2, y0 + 210, "No sorting, no data, no idea", C.faint, 15, "middle", 600, a0);
        else s += txt(220, 360, "No sorting, no data, no idea", C.faint, 14, "middle", 600, a0);
        var a1 = win(T, S1, S2);
        s += txt(x0, y0 - 16, "R by time of day", C.faint, 12, "start", 700, a1);
        s += bars(TOD, a1, S1, -5, 7.5, TOD.k);
        var aF = fade(T, S1 + 2.2, 0.4) * a1;
        s += note({ n: n }, ["Before 11:30: +13.6R", "After 11:30: −12.3R"], C.dn, aF, x1 - 260, y0 - 6);
        var a2 = win(T, S2, S3);
        s += txt(x0, y0 - 16, "R by trade type", C.faint, 12, "start", 700, a2);
        s += bars(TYP, a2, S2, -14, 14, n ? TYP.s : TYP.k);
        s += note({ n: n }, ["Same month, same +1.3R total", "the random trades ate it"], C.gold, fade(T, S2 + 2, 0.4) * a2, x1 - 300, y0 - 6);
        var a3 = fade(T, S3, 0.4);
        if (a3 > 0) {
          s += txt(x0, y0 - 16, "What the 20 best trades had in common", C.faint, 12, "start", 700, a3);
          var rowH = n ? 66 : 62, mw = n ? x1 - x0 : 620;
          TRAITS.forEach(function (q, k) {
            var y = y0 + 18 + k * rowH, g3 = ease(fade(T, S3 + 0.4 + k * 0.3, 0.6));
            s += txt(x0, y, q[0], C.ink, 14, "start", 600, a3);
            s += rect(x0, y + 10, mw, 12, "rgba(255,255,255,0.08)", 6, a3);
            s += rect(x0, y + 10, mw * q[1] / 20 * g3, 12, C.up, 6, a3);
            s += txt(n ? x1 : x0 + mw + 14, n ? y : y + 21, q[1] + " of 20", C.up, 13, n ? "end" : "start", 700, a3 * g3);
          });
          if (!n) s += callout(x0 + 760, y0 + 40, ["That's your edge", "push it, size it, repeat it"], C.up, fade(T, S3 + 2.8, 0.5));
        }
        s += txt(L.W - 14, L.H - 8, "Illustrative · made-up trades", C.faint, 11, "end");
        return s;
      }
    };
  }

  /* =====================================================================
     9 · stop looking for the fast way: restarts vs compounding
     ===================================================================== */
  function restartSpec() {
    var N = 48, RESETS = [];
    for (var k = 0; k < 20; k++) RESETS.push(8 + Math.round(k * 2.05));
    var BUILD = [], HOP = [], last = 0;
    for (var i = 0; i <= N; i++) {
      var b = 2 + 90 * Math.pow(i / N, 1.4);
      if (i >= 7 && i <= 11) b -= 3 * Math.sin(Math.PI * (i - 7) / 4);
      BUILD.push(b);
      if (RESETS.indexOf(i) >= 0) last = i;
      HOP.push(i < 8 ? b : RESETS.indexOf(i) >= 0 ? 2 : 2 + (i - last) * 1.6);
    }
    var S1 = 3.6, S2 = 7.6, S3 = 12, END = 16.5;
    function shownAt(T) {
      if (T < S1) return lerp(0, 7, clamp01(T / (S1 - 0.4)));
      if (T < S2) return lerp(7, 12, clamp01((T - S1) / 3));
      return lerp(12, N, clamp01((T - S2) / (S3 - S2 - 0.4)));
    }
    return {
      stages: [
        { at: 0,  title: "Two traders start a setup", text: "Same start, same market. One keeps the setup. The other keeps looking for a faster way." },
        { at: S1, title: "A normal losing stretch", text: "Both hit a few losses in a row. The builder reviews it and keeps going. The hopper scraps the setup and starts a new one: the clock resets." },
        { at: S2, title: "Twenty restarts in two years", text: "Every week spent hunting for a new strategy is a week without reps on the current one. Years in the market, still a beginner." },
        { at: S3, title: "The boring path compounds", text: "One setup, studied, traded small, reviewed every time, with rules built from what you see. Not exciting. It compounds." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 600 } : { W: 1180, H: 500 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "", sh = shownAt(T);
        var x0 = n ? 14 : 64, x1 = n ? 380 : 1080, y0 = n ? 160 : 60, y1 = n ? 530 : 440;
        function X(i) { return x0 + i * (x1 - x0) / N; }
        function Y(v) { return y1 - v / 100 * (y1 - y0); }
        s += line(x0, y1, x1, y1, "rgba(255,255,255,0.18)", 1);
        [0, 12, 24, 36, 48].forEach(function (m) { s += txt(X(m), y1 + 18, (m / 2) + (n ? "m" : " months"), C.faint, 11, m === 0 ? "start" : m === N ? "end" : "middle"); });
        s += txt(x0, 28, "Illustrative · skill built over two years", C.faint, 12);
        s += txt(x0 - (n ? 0 : 0), y0 - 10, "Skill that carries over", C.faint, 11);
        var aSt = fade(T, S1 + 0.2, 0.4) * (1 - fade(T, S2 + 1, 0.5));
        if (aSt > 0) s += '<rect x="' + X(7).toFixed(1) + '" y="' + y0 + '" width="' + (X(11) - X(7)).toFixed(1) + '" height="' + (y1 - y0) + '" fill="' + C.dn + '" opacity="' + (aSt * 0.1).toFixed(3) + '"/>' +
          txt((X(7) + X(11)) / 2, y0 + 16, "losing stretch", C.dn, 12, "middle", 700, aSt);
        function curve(V, col, w) {
          var pts = [], k = Math.floor(sh);
          for (var j = 0; j <= k && j <= N; j++) pts.push(X(j).toFixed(1) + "," + Y(V[j]).toFixed(1));
          if (k < N) { var f = sh - k; pts.push(lerp(X(k), X(k + 1), f).toFixed(1) + "," + Y(lerp(V[k], V[k + 1], f)).toFixed(1)); }
          return pts.length > 1 ? '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round"/>' : "";
        }
        s += curve(HOP, C.orange, 2.4) + curve(BUILD, C.up, 2.8);
        var count = 0;
        RESETS.forEach(function (r, m) {
          if (sh < r) return;
          count++;
          s += line(X(r), Y(0) - 6, X(r), Y(0) + 4, C.dn, 2, null, 0.9);
          if (m === 0) s += tag(X(r), Y(14) - 14, "scrapped · new strategy", C.dn, fade(T, S1 + 1.6, 0.4) * (1 - fade(T, S2 + 1, 0.4)), "middle");
        });
        var k2 = Math.min(N, Math.floor(sh)), late = X(k2) > x1 - (n ? 110 : 140), lx = late ? X(k2) - 6 : X(k2) + 8, la = late ? "end" : "start";
        s += txt(lx, Y(BUILD[k2]) - 10, "Kept one setup", C.up, 12, la, 700, fade(T, 0.6, 0.4));
        s += txt(lx, Y(HOP[k2]) - 12, "Kept switching", C.orange, 12, la, 700, fade(T, 0.6, 0.4));
        s += note({ n: n }, ["Started over " + count + (count === 1 ? " time" : " times"), "the clock reset every time"], C.orange, fade(T, S2 + 0.6, 0.4) * (1 - fade(T, S3 + 2.6, 0.4)), x0 + 10, y0 + 4);
        s += note({ n: n }, ["Same two years", "only one of them built anything"], C.gold, fade(T, S3 + 3, 0.5), x0 + 10, y0 + 4);
        s += txt(L.W - 14, L.H - 8, "Illustrative · made-up curves", C.faint, 11, "end");
        return s;
      }
    };
  }

  var SPECS = { setup: setupSpec, playbook: playbookSpec, reps: repsSpec, seeit: seeitSpec, review: reviewSpec, restart: restartSpec };
  document.querySelectorAll("[data-gbf-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-gbf-anim")];
    if (f) player(root, f());
  });

  /* =====================================================================
     the learning cycle as a stepper: one step at a time, with a small
     chart of one setup and that step lit up. Without the script the
     five steps simply show as cards.
     ===================================================================== */
  (function () {
    var root = document.querySelector("[data-gbf-steps]");
    if (!root) return;
    var steps = Array.prototype.slice.call(root.querySelectorAll(".stage"));
    if (steps.length !== 5) return;
    var CL = [20.0, 20.3, 20.1, 20.38, 20.18, 20.4, 20.8, 21.02, 20.86, 21.3, 21.62, 21.5, 21.2, 21.0, 21.16, 21.04, 21.22, 21.1, 21.6, 21.82, 21.7, 22.1, 22.42, 22.32];
    var INFO = [
      { k: "See it",       c: C.blue,   tag: "Recognize the version you studied" },
      { k: "Trade it",     c: C.up,     tag: "Small size, plan written first" },
      { k: "Review it",    c: C.gold,   tag: "After the close, with context" },
      { k: "Correct it",   c: C.orange, tag: "One mistake, one fix" },
      { k: "See it again", c: C.cyan,   tag: "The next rep, a little cleaner" }
    ];
    var LAST = INFO.length - 1, cur = 0;
    root.classList.add("is-stepper");
    var bar = document.createElement("div"); bar.className = "gs-bar"; bar.setAttribute("role", "tablist"); bar.setAttribute("aria-label", "The learning cycle");
    bar.innerHTML = '<span class="gs-line"><i></i></span>' + INFO.map(function (s, i) {
      return '<button type="button" role="tab" class="gs-step" data-i="' + i + '"><b>' + (i + 1) + "</b><span>" + s.k + "</span></button>";
    }).join("");
    var body = document.createElement("div"); body.className = "gs-body";
    var left = document.createElement("div"); left.className = "gs-left";
    var tg = document.createElement("p"); tg.className = "gs-tag";
    var nav = document.createElement("div"); nav.className = "gs-nav";
    nav.innerHTML = '<button type="button" class="pill gs-prev">&lsaquo; Back</button><button type="button" class="pill pill-buy gs-next"></button>';
    var fig = document.createElement("div"); fig.className = "gs-chart";
    fig.innerHTML = '<svg viewBox="0 0 560 300" role="img" aria-label="One setup traded twice, with the current step of the learning cycle highlighted"></svg>';
    left.appendChild(tg);
    steps.forEach(function (st) { left.appendChild(st); });
    left.appendChild(nav);
    body.appendChild(left); body.appendChild(fig);
    root.innerHTML = ""; root.appendChild(bar); root.appendChild(body);
    var svg = fig.querySelector("svg");

    function chartAt(k) {
      var W = 560, H = 300, pad = 26, mn = 19.7, mx = 22.75, n = CL.length, s = "";
      var F = fig.clientWidth > 0 && fig.clientWidth < 460 ? 1.5 : 1;   // bigger labels when the chart is phone-sized
      function x(i) { return pad + i * (W - pad * 2) / (n - 1); }
      function y(p) { return H - pad - 10 - (p - mn) / (mx - mn) * (H - pad * 2 - 20); }
      function pl(a, b, col, w) {
        var pts = []; for (var i = a; i <= b; i++) pts.push(x(i).toFixed(1) + "," + y(CL[i]).toFixed(1));
        return '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
      }
      function hz(p, a, b, col, dash, label, op) {
        return '<g opacity="' + (op || 1) + '"><line x1="' + x(a).toFixed(1) + '" x2="' + x(b).toFixed(1) + '" y1="' + y(p).toFixed(1) + '" y2="' + y(p).toFixed(1) + '" stroke="' + col + '" stroke-width="1.6"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>" +
          (label ? '<text x="' + (x(b) + 4).toFixed(1) + '" y="' + (y(p) + 4).toFixed(1) + '" fill="' + col + '" font-size="' + 12 * F + '" font-weight="600">' + label + "</text>" : "") + "</g>";
      }
      function box(a, b, lo, hi, col, dash) {
        return '<rect x="' + (x(a) - 8).toFixed(1) + '" y="' + y(hi).toFixed(1) + '" width="' + (x(b) - x(a) + 16).toFixed(1) + '" height="' + (y(lo) - y(hi)).toFixed(1) + '" rx="6" fill="' + col + '" fill-opacity="0.1" stroke="' + col + '" stroke-opacity="0.8"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>";
      }
      function lbl(px, py, t, col, anchor) { return '<text x="' + px.toFixed(1) + '" y="' + py.toFixed(1) + '" fill="' + col + '" font-size="' + 13 * F + '" font-weight="600" text-anchor="' + (anchor || "start") + '">' + t + "</text>"; }
      s += hz(20.5, 0, 11, "#8e8e93", "4 5", null, 0.5) + hz(21.3, 12, 23, "#8e8e93", "4 5", null, 0.5);
      s += pl(0, n - 1, "#3a3a3c", 3);
      var c = INFO[k].c;
      if (k === 0) {
        s += box(0, 5, 19.92, 20.52, c) + pl(0, 5, c, 4) + lbl(x(0), y(20.52) - 10, "a base under the level: the setup", c);
      } else if (k === 1) {
        s += pl(5, 11, c, 4) + hz(20.25, 5, 11, C.dn, "5 4", "stop") + hz(21.6, 5, 11, C.gold, "5 4", "target");
        s += '<circle cx="' + x(6).toFixed(1) + '" cy="' + y(CL[6]).toFixed(1) + '" r="7" fill="' + c + '"/>' + lbl(x(6) - 10, y(CL[6]) + 4, "entry", c, "end");
      } else if (k === 2) {
        s += '<rect x="' + (x(0) - 12).toFixed(1) + '" y="' + (y(21.85)).toFixed(1) + '" width="' + (x(11) - x(0) + 24).toFixed(1) + '" height="' + (y(19.85) - y(21.85)).toFixed(1) + '" rx="8" fill="none" stroke="' + c + '" stroke-width="2" stroke-dasharray="7 5"/>';
        s += pl(0, 11, c, 4) + lbl(x(0) - 8, y(21.85) - 10, "screenshot it · save the context", c);
        s += lbl(x(11) + 18, y(20.9), "news · RVOL 3", C.dim) + lbl(x(11) + 18, y(20.9) + 18 * F, "market up", C.dim) + lbl(x(11) + 18, y(20.9) + 36 * F, "entry early?", C.orange);
      } else if (k === 3) {
        s += pl(4, 8, c, 4) + '<circle cx="' + x(5).toFixed(1) + '" cy="' + y(CL[5]).toFixed(1) + '" r="11" fill="none" stroke="' + C.dn + '" stroke-width="2"/>';
        s += '<circle cx="' + x(6).toFixed(1) + '" cy="' + y(CL[6]).toFixed(1) + '" r="11" fill="none" stroke="' + C.up + '" stroke-width="2"/>';
        s += lbl(x(5), y(CL[5]) + 30, "bought before the close", C.dn, "middle") + lbl(x(8) + 10, y(CL[6]) - 30, "rule: wait for the close over", c);
      } else {
        s += box(12, 17, 20.92, 21.32, c) + pl(12, 23, c, 4) + lbl(x(23), y(22.42) - 14, "rep 2 · cleaner", c, "end");
        s += lbl(x(0), y(22.6), "… rep 3, rep 50, rep 500", C.dim);
      }
      s += '<text x="' + pad + '" y="' + (H - 6) + '" fill="' + C.faint + '" font-size="11">Illustrative · made-up price path</text>';
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
      bar.querySelector(".gs-line i").style.width = (k / LAST * 100) + "%";
      root.style.setProperty("--gs", INFO[k].c);
      tg.textContent = "Step " + (k + 1) + " of " + INFO.length + " · " + INFO[k].tag;
      nav.querySelector(".gs-prev").disabled = k === 0;
      nav.querySelector(".gs-next").innerHTML = k < LAST ? "Next: " + INFO[k + 1].k + " &rsaquo;" : "Back to step 1 &rsaquo;";
      svg.innerHTML = chartAt(k);
      if (focus) bar.querySelectorAll(".gs-step")[k].focus();
    }
    bar.addEventListener("click", function (e) { var b = e.target.closest(".gs-step"); if (b) show(+b.getAttribute("data-i")); });
    bar.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" && cur < LAST) { e.preventDefault(); show(cur + 1, true); }
      if (e.key === "ArrowLeft" && cur > 0) { e.preventDefault(); show(cur - 1, true); }
    });
    nav.querySelector(".gs-prev").addEventListener("click", function () { if (cur > 0) show(cur - 1); });
    nav.querySelector(".gs-next").addEventListener("click", function () { show(cur < LAST ? cur + 1 : 0); });
    show(0);
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { svg.innerHTML = chartAt(cur); }, 120); });
  })();

  window.GBFAnim = { _specs: SPECS };            // exposed for checks in testing
})();

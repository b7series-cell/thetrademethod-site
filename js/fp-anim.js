/* =====================================================================
   fp-anim.js — the animated walkthroughs on four-pillars.html.

     [data-fp-anim="clutter"]     six indicators argue; strip them, the level is left
     [data-fp-anim="levels"]      pillar 1: mark the levels price keeps reacting to
     [data-fp-anim="context"]     pillar 2: same stock, same level, two different markets
     [data-fp-anim="sizing"]      pillar 3: fixed risk vs sizing by conviction, same 40 trades
     [data-fp-anim="discipline"]  pillar 4: the chase vs the plan written calm
     [data-fp-anim="recap"]       all four pillars on one chart

   Same player and chart frame as mt-anim.js: each chart redraws in a
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

  /* =====================================================================
     intro · too many indicators, then strip them away
     ===================================================================== */
  function clutterSpec() {
    var B = path(31, 42.6, [
      { n: 6, to: 41.12, noise: 0.12, wick: 0.14, flo: 41, v: 0.4 },
      { n: 5, to: 43.3, noise: 0.14, wick: 0.14, v: 0.45 },
      { n: 5, to: 41.12, noise: 0.12, wick: 0.14, flo: 41, v: 0.4 },
      { n: 4, to: 42.8, noise: 0.14, wick: 0.14, v: 0.45 },
      { n: 4, to: 41.12, noise: 0.12, wick: 0.14, flo: 41, v: 0.4 },
      { list: [{ c: 41.7, l: 41.0, v: 0.9 }] },
      { n: 6, to: 43.9, noise: 0.14, wick: 0.14, v: 0.55 }
    ]);
    var TOUCH = [5, 15, 23];
    TOUCH.forEach(function (i) { B[i].l = 41.0; });
    var E9 = emaOf(B, 9), E21 = emaOf(B, 21), M = sma(B, 20), SD = sdev(B, 20, M);
    var BU = M.map(function (m, i) { return m + Math.max(0.35, 2 * SD[i]); }), BL = M.map(function (m, i) { return m - Math.max(0.35, 2 * SD[i]); });
    var SIG = [["RSI · buy", C.up], ["MACD · sell", C.dn], ["Stochastic · buy", C.up], ["Bollinger · sell", C.dn], ["EMA cross · buy", C.up]];
    var S1 = 4.6, S2 = 8.6, S3 = 11.6, END = 17;
    return chart({
      bars: B, lo: 40.3, hi: 44.7, step: 1, vol: false, title: "Illustrative · one chart, five opinions",
      reveal: [[0, 0], [4, B.length]],
      stages: [
        { at: 0,  title: "Everything on the screen", text: "Two moving averages, Bollinger Bands and three oscillators. Three of them say buy, two say sell, and you still don't know what to do." },
        { at: S1, title: "More inputs, more conflict", text: "Past a certain point, more indicators don't add accuracy. They add conflicting signals, and conflict means hesitation right when you need clarity." },
        { at: S2, title: "Strip it down", text: "Take them off. The chart gets quieter, slower and more obvious." },
        { at: S3, title: "What's left is the level", text: "The price the market has actually proven it respects: buyers stepped in at $41 three times. Most of what the indicators were clumsily saying was already sitting there." }
      ],
      end: END,
      under: function (T, g) {
        var a = (1 - fade(T, S2, 1.4)), s = "", up = g.shown;
        s += poly(g, BU, up, C.grey, 1.3, a * 0.8, "3 3") + poly(g, BL, up, C.grey, 1.3, a * 0.8, "3 3") + poly(g, M, up, C.grey, 1, a * 0.5);
        s += poly(g, E21, up, PURPLE, 2, a) + poly(g, E9, up, C.orange, 2, a);
        return s;
      },
      overlay: function (T, g) {
        var s = "", a = fade(T, 0.8, 0.5) * (1 - fade(T, S2, 1.2));
        SIG.forEach(function (q, k) {
          var op = a * fade(T, 0.8 + k * 0.5, 0.4);
          if (g.n) s += pill(14 + (k % 2) * 206, 62 + Math.floor(k / 2) * 30 * FS, q[0], q[1], op);
          else s += pill(g.x0 + [0, 104, 222, 376, 518][k], g.y0 - 4, q[0], q[1], op);
        });
        if (!g.n) s += txt(g.x0 + 660, g.y0 - 4, "3 buy · 2 sell · now what?", C.dim, 13, "end", 600, a * fade(T, S1, 0.4));
        else s += txt(426, 62 + 2 * 30 * FS, "3 buy · 2 sell", C.dim, 13, "end", 600, a * fade(T, S1, 0.4));
        var aL = fade(T, S3, 0.5);
        s += hl(g, 41.0, 0, null, C.up, 2, null, aL) + lab(g, 41.0, "$41 · bought three times", C.up, aL, g.X(7));
        TOUCH.forEach(function (i, k) { s += touch(g, i, 41.0, k + 1, C.up, fade(T, S3 + 0.5 + k * 0.5, 0.3), true); });
        s += note(g, ["Everything else", "is decoration"], C.ink, fade(T, S3 + 2.4, 0.5), g.X(0), g.Y(44.5));
        return s;
      }
    });
  }

  /* =====================================================================
     pillar 1 · levels: the only map you need
     ===================================================================== */
  function levelsSpec() {
    var B = path(13, 43.1, [
      { n: 5, to: 42.08, noise: 0.1, wick: 0.12, flo: 42 },
      { n: 5, to: 43.92, noise: 0.12, wick: 0.12, cap: 44 },
      { n: 5, to: 42.08, noise: 0.1, wick: 0.12, flo: 42 },
      { n: 3, to: 43.1, noise: 0.08, wick: 0.1, cap: 44 },
      { n: 3, to: 42.55, noise: 0.08, wick: 0.1, flo: 42 },
      { n: 4, to: 43.92, noise: 0.12, wick: 0.12, cap: 44 },
      { n: 5, to: 42.08, noise: 0.1, wick: 0.12, flo: 42 },
      { n: 5, to: 43.92, noise: 0.12, wick: 0.12, cap: 44 },
      { n: 3, to: 43.25, noise: 0.08, wick: 0.1, cap: 44 }
    ]);
    var SUP = [4, 14, 29], RES = [9, 24, 34], ONE = 17;
    SUP.forEach(function (i) { B[i].l = 42.0; });
    RES.forEach(function (i) { B[i].h = 44.0; });
    B[ONE].h = Math.max(B[ONE].h, B[ONE].c + 0.06);
    var oneP = B[ONE].h;
    var S1 = 5.6, S2 = 10, S3 = 13.4, END = 18;
    return chart({
      bars: B, lo: 41.5, hi: 44.5, step: 0.5, vol: false, title: "Illustrative · a stock between two proven levels",
      reveal: [[0, 0], [5, B.length]],
      stages: [
        { at: 0,  title: "Random green and red bars", text: "Without a map, every wiggle looks like it matters, so you react to all of them." },
        { at: S1, title: "Mark where price reacted", text: "Price isn't random. Buyers keep showing up near $42, sellers near $44. Support and resistance: those are your decision points." },
        { at: S2, title: "Count reactions, not looks", text: "A line drawn once and touched once doesn't earn attention, however clean it looks. A level the market respected again and again does." },
        { at: S3, title: "Everything in between is noise", text: "You're not predicting every candle. You wait at the few prices that matter and let the middle go." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "", a = fade(T, S1, 0.5), mid = fade(T, S3, 0.5);
        if (mid > 0) s += '<rect x="' + g.x0.toFixed(1) + '" y="' + g.Y(43.75).toFixed(1) + '" width="' + (g.x1 - g.x0).toFixed(1) + '" height="' + (g.Y(42.25) - g.Y(43.75)).toFixed(1) + '" fill="' + C.grey + '" opacity="' + (mid * 0.12).toFixed(3) + '"/>' +
          tag((g.x0 + g.x1) / 2, g.Y(43.0), "noise · let it go", C.dim, mid, "middle");
        s += hl(g, 44.0, 0, null, C.dn, 2, null, a) + hl(g, 42.0, 0, null, C.up, 2, null, a);
        s += tag(g.X(g.n ? 12 : 10) + 10, g.Y(44.0) - 13 * FS, g.n ? "Resistance" : "Resistance · sellers", C.dn, a) + tag(g.X(g.n ? 17 : 10) + 10, g.Y(42.0) + 14 * FS, g.n ? "Support" : "Support · buyers", C.up, a);
        RES.forEach(function (i, k) { s += touch(g, i, 44.0, k + 1, C.dn, fade(T, S1 + 0.6 + k * 0.5, 0.3) * (1 - 0.4 * mid)); });
        SUP.forEach(function (i, k) { s += touch(g, i, 42.0, k + 1, C.up, fade(T, S1 + 0.8 + k * 0.5, 0.3) * (1 - 0.4 * mid), true); });
        var aO = fade(T, S2, 0.4) * (1 - fade(T, S3, 0.4));
        s += hl(g, oneP, ONE - 2, ONE + 8, C.faint, 1.6, "5 4", aO) + tag(g.n ? g.x1 : g.X(ONE + 8) + g.cw + 6, g.Y(oneP) - (g.n ? 14 : 0), "drew once · touched once", C.dim, aO, g.n ? "end" : "start");
        s += note(g, ["Touched 3 times each", "these earn attention"], C.gold, win(T, S2 + 0.6, S3), g.X(25), g.Y(44.42));
        s += note(g, ["Decision points at the edges", "noise in the middle"], C.ink, fade(T, S3 + 0.8, 0.4) * (g.n ? 1 : 0), 0, 0);
        return s;
      }
    });
  }

  /* =====================================================================
     pillar 2 · context: same stock, same level, two different markets
     ===================================================================== */
  function contextSpec() {
    var common = [
      { n: 4, fn: function () { return 49.8; }, noise: 0.1, wick: 0.12, cap: 50, v: 0.3 },
      { n: 5, to: 53.4, noise: 0.15, wick: 0.14, v: 0.6 },
      { n: 6, to: 50.12, noise: 0.1, wick: 0.12, flo: 50, v: 0.35 }
    ];
    var A = path(19, 49.7, common.concat([{ list: [{ c: 50.75, l: 50.0, v: 0.85 }] }, { n: 8, to: 53.9, noise: 0.14, wick: 0.13, v: 0.55 }]));
    var Bb = path(19, 49.7, common.concat([{ list: [{ c: 50.35, l: 50.0, v: 0.4 }, { c: 49.55, v: 0.95 }] }, { n: 7, to: 47.6, noise: 0.14, wick: 0.13, v: 0.6 }]));
    var TCH = 14;
    A[TCH].l = 50.0; Bb[TCH].l = 50.0;
    var R1 = rng(7), R2 = rng(7);
    var idxA = A.map(function (b, i) { return 100 + i * 0.32 + (R1() - 0.5) * 0.5; });
    var idxB = Bb.map(function (b, i) { return 100 + (i < 9 ? i * 0.32 : 2.9 - (i - 9) * 0.42) + (R2() - 0.5) * 0.5; });
    var SW = 9.6, S1 = 4.4, S3 = SW + 4.4, S4 = SW + 7.6, END = SW + 11;

    function mini(g, ix, col, op, label) {
      if (op <= 0) return "";
      var bx = g.n ? 14 : g.x0 + 8, by = g.n ? 42 : g.y0 + 6, bw = g.n ? 412 : 270, bh = g.n ? 92 : 84;
      var lo = 1e9, hi = -1e9; ix.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); }); lo -= 0.4; hi += 0.4;
      var pts = [], up = Math.min(ix.length, Math.ceil(g.shown));
      for (var j = 0; j < up; j++) pts.push((bx + 12 + j * (bw - 24) / (ix.length - 1)).toFixed(1) + "," + (by + bh - 12 - (ix[j] - lo) / (hi - lo) * (bh - 36)).toFixed(1));
      var s = '<g opacity="' + op.toFixed(3) + '"><rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="10" fill="' + C.box + '" stroke="' + col + '" stroke-width="1"/>' +
        txt(bx + 12, by + 20, label, col, 12, "start", 700);
      if (pts.length > 1) s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linejoin="round"/>';
      return s + "</g>";
    }
    function world(B, ix, rising) {
      return chart({
        bars: B, lo: 46.9, hi: 56.2, step: 1, vol: true, title: rising ? "Illustrative · the market grinding higher" : "Illustrative · the same stock, the market rolling over",
        reveal: [[0, 0], [3.6, TCH + 1], [S1 + 0.6, TCH + 1], [8, B.length]],
        stages: [], end: 1,
        overlay: function (T, g) {
          var s = "", a = fade(T, 0.4, 0.5), held = rising && T >= S1 + 0.4, broke = !rising && g.shown > TCH + 2.2;
          var col = held ? C.up : broke ? C.dn : C.blue;
          s += hl(g, 50, 0, null, col, 2, broke ? "6 4" : null, a);
          s += tag(g.x1 - 2, g.Y(50) + 16 * FS, held ? "$50 · held, wind at its back" : broke ? "$50 · steamrolled" : "$50 · held before", col, a, "end");
          var mcol = rising ? C.up : (g.shown > 10 ? C.dn : C.grey);
          s += mini(g, ix, mcol, fade(T, 0.2, 0.4), rising ? "Broader market · grinding higher" : (g.shown > 10 ? "Broader market · rolling over" : "Broader market"));
          s += ring(g.X(TCH), g.Y(50) + 3, 13, col, fade(T, 3.4, 0.3));
          return s;
        }
      });
    }
    var WA = world(A, idxA, true), WB = world(Bb, idxB, false);
    return {
      size: WA.size,
      stages: [
        { at: 0,  title: "The market grinds higher", text: "The broader market is leaning up. The stock pulls back into $50, a level that has held before." },
        { at: S1, title: "The level has the wind at its back", text: "Buyers step in at the level, and the bigger picture is pushing the same way." },
        { at: SW, title: "Same stock, same level, another day", text: "Now the broader market is rolling over. Nothing on this chart is different yet: same pullback, same $50." },
        { at: S3, title: "The level didn't change. The world did.", text: "The odds underneath the level changed completely. This is how a textbook setup turns into a textbook loss." },
        { at: S4, title: "Look up before you look down", text: "Context first, setup second. Know the market and the higher time frame, then let the level give you the spot. Even then, it's odds, never a sure thing." }
      ],
      end: END,
      frame: function (T, L) { return T < SW ? WA.frame(T, L) : WB.frame(T - SW, L); }
    };
  }

  /* =====================================================================
     pillar 3 · position sizing: the same 40 trades, sized two ways
     ===================================================================== */
  function sizingSpec() {
    var SEQ = "WLLWLWWLLLLLLWLWWLWLLWLWWLLWLWWLWLWWLWWW".split(""), N = SEQ.length;
    var CERT = { 3: 4, 6: 4, 9: 3, 20: 8, 26: 6 };
    function run(f) { var e = 100, o = [100]; SEQ.forEach(function (c, i) { e *= 1 + (c === "W" ? 2 : -1) * f(i) / 100; o.push(e); }); return o; }
    var FIX = run(function () { return 1; }), CON = run(function (i) { return CERT[i] || 0.5; });
    var S1 = 4.4, S2 = 8.4, S3 = 12.2, END = 17;
    function shownAt(T) {
      if (T < S1) return lerp(0, 7, clamp01(T / (S1 - 0.4)));
      if (T < S2) return lerp(7, 14, clamp01((T - S1) / 3));
      if (T < S3) return lerp(14, 22, clamp01((T - S2) / 3));
      return lerp(22, N, clamp01((T - S3) / 3.6));
    }
    return {
      stages: [
        { at: 0,  title: "Same trades, two traders", text: "Forty made-up trades, half winners at 2R. One trader risks 1% every time. The other sizes by conviction: huge when sure, tiny when not." },
        { at: S1, title: "The losing streak", text: "Six losses in a row. Not a maybe: every trader who's made it has had one. Fixed risk costs about 6%. Conviction doubled down in the middle of it." },
        { at: S2, title: "One certainty goes wrong", text: "An 8% bet on a sure thing loses, and a month of progress is gone in an afternoon. A 6% bet does it again." },
        { at: S3, title: "Boring outlasts brave", text: "Same entries, same win rate. The difference is what each trader risked. Staying in the game is the strategy." }
      ],
      end: END,
      size: function (n) { return n ? { W: 440, H: 640 } : { W: 1180, H: 520 }; },
      frame: function (T, L) {
        var n = L.narrow, s = "", sh = shownAt(T);
        var x0 = n ? 14 : 64, x1 = n ? 380 : 1080, y0 = n ? 150 : 56, y1 = n ? 430 : 330, lo = 96, hi = 124;
        function X(i) { return x0 + i * (x1 - x0) / N; }
        function Y(v) { return y1 - (v - lo) / (hi - lo) * (y1 - y0); }
        for (var p = 100; p <= hi; p += 5) {
          s += line(x0, Y(p), x1, Y(p), p === 100 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)", 1);
          s += txt(x1 + 8, Y(p) + 4, (p - 100 >= 0 ? "+" : "") + (p - 100) + "%", C.faint, 11);
        }
        s += txt(x0, 28, "Illustrative · made-up trades, account growth", C.faint, 12);
        function curve(V, col, w) {
          var pts = [], k = Math.floor(sh);
          for (var j = 0; j <= k && j <= N; j++) pts.push(X(j).toFixed(1) + "," + Y(V[j]).toFixed(1));
          if (k < N) { var f = sh - k; pts.push(lerp(X(k), X(k + 1), f).toFixed(1) + "," + Y(lerp(V[k], V[k + 1], f)).toFixed(1)); }
          return pts.length > 1 ? '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linejoin="round"/>' : "";
        }
        var aSt = fade(T, S1 + 0.3, 0.4) * (1 - fade(T, S2 + 0.6, 0.4));
        if (aSt > 0) s += '<rect x="' + X(7).toFixed(1) + '" y="' + y0 + '" width="' + (X(13) - X(7)).toFixed(1) + '" height="' + (y1 - y0) + '" fill="' + C.dn + '" opacity="' + (aSt * 0.1).toFixed(3) + '"/>' +
          txt((X(7) + X(13)) / 2, y0 + 16, "6 losses in a row", C.dn, 12, "middle", 700, aSt);
        s += curve(CON, C.orange, 2.6) + curve(FIX, C.up, 2.8);
        var k = Math.min(N, Math.floor(sh));
        var late = X(k) > x1 - (n ? 120 : 130), lx = late ? X(k) - 6 : X(k) + 6, la = late ? "end" : "start";
        s += txt(lx, Y(FIX[k]) - 10, "1% every trade", C.up, 12, la, 700, fade(T, 0.6, 0.4));
        s += txt(lx, Y(CON[k]) + 20, "by conviction", C.orange, 12, la, 700, fade(T, 0.6, 0.4));
        [20, 26].forEach(function (i, m) {
          var a = clamp01(sh - i - 1) * fade(T, S2, 0.3);
          s += ring(X(i + 1), Y(CON[i + 1]), 12, C.dn, a);
          s += txt(X(i + 1), Y(CON[i + 1]) + 30, m ? "−6%" : "−8%", C.dn, 12, "middle", 800, a);
        });
        /* risk per trade, one row each */
        var ry = n ? 476 : 372, rh = n ? 40 : 34, gap = n ? 62 : 54, bw = Math.max(2, (x1 - x0) / N * 0.62);
        s += txt(x0, ry - 8, "Risk per trade", C.faint, 11);
        [[function () { return 1; }, C.up, "1%"], [function (i) { return CERT[i] || 0.5; }, C.orange, n ? "to 8%" : "0.5% to 8%"]].forEach(function (row, r) {
          var base = ry + r * gap + rh;
          s += line(x0, base, x1, base, "rgba(255,255,255,0.08)", 1);
          s += txt(x1 + 8, base - 2, row[2], row[1], 11);
          for (var i = 0; i < N && i < sh; i++) {
            var h = row[0](i) / 8 * rh, op = Math.min(1, sh - i);
            s += rect(X(i + 0.5) - bw / 2, base - h, bw, Math.max(1.5, h), SEQ[i] === "W" ? C.up : C.dn, 1, 0.75 * op);
          }
        });
        var aE = fade(T, S3 + 3.4, 0.5);
        s += note({ n: n }, ["Same 40 trades", "+" + Math.round(FIX[N] - 100) + "% at 1%   +" + Math.round(CON[N] - 100) + "% by conviction"], C.gold, aE, x0 + 10, y0 + 4);
        s += txt(L.W - 14, L.H - 8, "Illustrative · made-up trades", C.faint, 11, "end");
        return s;
      }
    };
  }

  /* =====================================================================
     pillar 4 · discipline: the chase vs the plan written calm
     ===================================================================== */
  function disciplineSpec() {
    var B = path(29, 30.3, [
      { n: 7, fn: function (i) { return 30.3 + 0.18 * Math.sin(i * 1.3); }, noise: 0.06, wick: 0.1, cap: 30.6, flo: 30.0, v: 0.3 },
      { list: [{ c: 31.2, v: 1 }, { c: 31.9, v: 0.9 }, { c: 32.5, v: 0.8 }, { c: 32.9, h: 33.05, v: 0.75 }] },
      { n: 6, to: 30.75, noise: 0.1, wick: 0.12, v: 0.5 },
      { n: 3, fn: function () { return 30.72; }, noise: 0.05, wick: 0.08, flo: 30.6, v: 0.28 },
      { list: [{ c: 31.08, l: 30.62, v: 0.8 }] },
      { n: 8, to: 32.5, noise: 0.1, wick: 0.12, v: 0.55 }
    ]);
    var TOP = 10, ENT = 20, CH = 32.9, LV = 30.6, EP = B[ENT].c, SP = 30.42, TP = EP + 2 * (EP - SP);
    var S1 = 4.2, S2 = 9, S3 = 12.6, S4 = 15.6, END = 20;
    var hitStop = 13; // first bar after the chase that trades through the widened stop
    for (var i = TOP + 1; i < ENT; i++) if (B[i].l <= 31.3) { hitStop = i; break; }
    return chart({
      bars: B, lo: 29.7, hi: 33.6, step: 0.5, vol: true, title: "Illustrative · the chase and the plan",
      reveal: [[0, 0], [3.8, TOP + 1], [S1 + 1.4, TOP + 1], [S2 - 0.6, ENT], [S3 + 0.4, ENT + 1], [S4, ENT + 1], [18.6, B.length]],
      stages: [
        { at: 0,  title: "A candle runs without you", text: "You had the rules written down. Then the stock leaves without you, and fear, greed and FOMO grab the wheel." },
        { at: S1, title: "The chase", text: "You buy the top you missed. It turns, so you widen the stop because you don't want to be wrong. The small loss becomes a big one." },
        { at: S2, title: "Patience is a position", text: "The market hands out setups every day, so you never have to force this one. No level, no context, no trade. Full stop." },
        { at: S3, title: "The plan you wrote while calm", text: "Price comes back to the level. Entry, stop just under it, target. Same size as always, decided before the open." },
        { at: S4, title: "Decision and result are different things", text: "This one worked. If it had stopped out, it would still be a good trade: rules followed, risk defined. You can decide right and still lose." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "", aLv = fade(T, 0.6, 0.5);
        s += hl(g, LV, 0, null, C.blue, 1.8, T >= S3 ? null : "6 4", aLv) + tag(g.x0, g.Y(LV) - 12 * FS, "$30.60 · the level", C.blue, aLv);
        var aC = fade(T, S1, 0.3), aCl = aC * (1 - 0.65 * fade(T, S2 + 1, 0.4)) * (1 - fade(T, S3, 0.4));
        s += '<g opacity="' + aCl.toFixed(3) + '">' + line(g.X(TOP) - 7, g.Y(CH) - 7, g.X(TOP) + 7, g.Y(CH) + 7, C.dn, 2.4) + line(g.X(TOP) - 7, g.Y(CH) + 7, g.X(TOP) + 7, g.Y(CH) - 7, C.dn, 2.4) + "</g>";
        s += txt(g.X(TOP) + 14, g.Y(CH) - 10, "chased", C.dn, 12, "start", 700, aCl);
        var wid = fade(T, S1 + 2, 0.8), stp = lerp(32.45, 31.3, wid);
        s += hl(g, stp, TOP, TOP + 7, C.dn, 1.6, "4 3", aCl) + txt(g.X(TOP + 7) + g.cw + 4, g.Y(stp) + 4, wid > 0.5 ? "stop widened" : "stop", C.dn, 12, "start", 700, aCl);
        s += note(g, ["Chased the top, widened the stop", "a 1R loss became 3R"], C.dn, win(T, S1 + 3, S2), g.X(0), g.Y(33.5));
        s += note(g, ["No level, no context", "no trade. Wait."], C.ink, win(T, S2 + 0.4, S3), g.X(0), g.Y(33.5));
        var aP = fade(T, S3 + 0.3, 0.4);
        s += hl(g, EP, ENT - 1, null, C.ink, 1.6, null, aP) + txt(g.x1 - 4, g.Y(EP) - 7, "entry", C.ink, 12, "end", 700, aP);
        s += hl(g, SP, ENT - 1, null, C.dn, 1.6, "5 4", aP) + txt(g.X(ENT) - g.cw - 4, g.Y(SP) + 16, "stop", C.dn, 12, "end", 700, aP);
        s += hl(g, TP, ENT - 1, null, C.gold, 1.6, "5 4", aP) + tag(g.X(ENT - 1) - g.cw, g.Y(TP) - 12 * FS, "target · 2R", C.gold, aP);
        s += ring(g.X(ENT), g.Y(B[ENT].l) + 3, 13, C.up, aP * (1 - fade(T, S4, 0.4)));
        s += note(g, ["Rules followed, risk defined", "a good trade either way"], C.up, fade(T, S4 + 0.8, 0.4), g.X(0), g.Y(33.5));
        return s;
      }
    });
  }

  /* =====================================================================
     recap · all four pillars on one chart
     ===================================================================== */
  function recapSpec() {
    var B = path(37, 70.2, [
      { n: 3, fn: function () { return 70.2; }, noise: 0.1, wick: 0.12, v: 0.3 },
      { n: 5, to: 71.9, noise: 0.12, wick: 0.12, cap: 72 },
      { n: 3, to: 71.0, noise: 0.08, wick: 0.1 },
      { n: 3, to: 71.92, noise: 0.08, wick: 0.1, cap: 72 },
      { list: [{ c: 72.65, v: 0.9 }] },
      { n: 4, to: 74.4, noise: 0.12, wick: 0.12 },
      { n: 5, to: 72.12, noise: 0.1, wick: 0.1, flo: 72, v: 0.3 },
      { list: [{ c: 72.85, l: 72.05, v: 0.85 }] },
      { n: 7, to: 75.9, noise: 0.12, wick: 0.12 }
    ]);
    var R1 = 7, R2 = 13, SUP = 23, TRG = 24;
    B[R1].h = 72.0; B[R2].h = 72.0; B[SUP].l = 72.0;
    B[TRG].h = Math.max(B[TRG].h, B[SUP].h + 0.12);
    var EP = B[TRG].c, SP = 71.82;
    var S0 = 1.6, S1 = 5.6, S2 = 8.4, S3 = 11.2, S4 = 14, END = 19;
    return chart({
      bars: B, lo: 69.5, hi: 76.6, step: 1, ema: 9, vol: false, title: "Illustrative · four things, one chart",
      reveal: [[0, 0], [S1 - 0.4, SUP + 1], [S4 + 0.2, SUP + 1], [S4 + 0.8, TRG + 1], [S4 + 1.4, TRG + 1], [18.4, B.length]],
      stages: [
        { at: 0,  title: "A pullback into a level", text: "Price broke through $72, ran, and is pulling back into it. What do you need to know before you act?" },
        { at: S1, title: "1 · Level", text: "Sellers held $72 twice before it broke. It's a price the market has proven it reacts to. That's where." },
        { at: S2, title: "2 · Context", text: "The trend is higher highs and higher lows, and the broader market is leaning up. That's whether the level is likely to hold." },
        { at: S3, title: "3 · Size", text: "The stop goes just under the level. The risk is the same 1% as every other trade, and the share count comes from the stop, not from how good it feels." },
        { at: S4, title: "4 · Discipline", text: "Wait for the trigger, take it the same way as always, and let the result be the result. Four things. That's the whole framework." }
      ],
      end: END,
      emaOp: function (T) { return 0.35 + 0.65 * fade(T, S2, 0.4); },
      overlay: function (T, g) {
        var s = "", aL = fade(T, S1, 0.4);
        s += hl(g, 72, 0, null, C.blue, 2, null, aL);
        s += touch(g, R1, 72, 1, C.blue, fade(T, S1 + 0.4, 0.3)) + touch(g, R2, 72, 2, C.blue, fade(T, S1 + 0.8, 0.3)) + (g.n ? ring(g.X(SUP), g.Y(72), 11, C.up, fade(T, S1 + 1.2, 0.3)) : touch(g, SUP, 72, 3, C.up, fade(T, S1 + 1.2, 0.3), true));
        var aS = fade(T, S3, 0.4);
        s += hl(g, SP, SUP - 1, null, C.dn, 1.6, "5 4", aS) + txt(g.x1 - 4, g.Y(SP) + 16, "stop · 1% risk", C.dn, 12, "end", 700, aS);
        var aT = fade(T, S4 + 0.6, 0.3);
        s += hl(g, B[SUP].h, SUP - 1, TRG + 2, C.up, 1.6, "4 3", aT) + txt(g.X(TRG + 2) + 6, g.Y(B[SUP].h) + 4, "trigger", C.up, 12, "start", 700, aT);
        var x = g.n ? 14 : g.X(0), y = g.n ? 58 : g.Y(76.3);
        s += pill(x, y, "1 · Level · held twice", C.blue, aL);
        s += pill(x, y + 30 * FS, "2 · Context · trend and market up", C.orange, fade(T, S2, 0.4));
        s += pill(x, y + 60 * FS, "3 · Size · same 1%", C.dn, aS);
        s += pill(x, y + 90 * FS, "4 · Discipline · wait, then follow", C.up, fade(T, S4, 0.4));
        return s;
      }
    });
  }

  var SPECS = { clutter: clutterSpec, levels: levelsSpec, context: contextSpec, sizing: sizingSpec, discipline: disciplineSpec, recap: recapSpec };
  document.querySelectorAll("[data-fp-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-fp-anim")];
    if (f) player(root, f());
  });
  window.FPAnim = { _specs: SPECS };            // exposed for checks in testing
})();

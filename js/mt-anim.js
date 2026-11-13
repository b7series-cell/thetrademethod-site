/* =====================================================================
   mt-anim.js — the animated walkthroughs on six-momentum-trades.html.

     [data-mt-anim="breakout"]   a $49–$50 range, then price escapes 50
     [data-mt-anim="retest"]     the same break, then the retest of 50 holds
     [data-mt-anim="pullback"]   100 → 104, a pullback into the 9 EMA, resume
     [data-mt-anim="consol"]     $20 → $23, sideways for a while, then expand
     [data-mt-anim="trend"]      higher highs and higher lows inside a channel
     [data-mt-anim="reclaim"]    VWAP lost, accepted below, then taken back
     [data-mt-anim="quiz"]       five seconds: name the setup and the trade

   Built like rvol-anim.js: each chart redraws in a narrow layout on a
   phone instead of scrolling sideways, and on a phone the callouts sit
   in a band above the chart so they never cover the candles.

   Every chart is made-up bars, labelled "Illustrative". The $49–$50,
   50.70, 100 → 104 and $20 → $23 numbers follow the reference video.
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

  /* =====================================================================
     1 · breakout: escape a defined range
     ===================================================================== */
  function breakoutSpec() {
    var B = path(11, 49.5, [
      { n: 18, fn: function (i) { return i > 13 ? 49.55 + (i - 13) * 0.07 : 49.5 + 0.38 * Math.sin(i * 0.95); }, noise: 0.08, wick: 0.16, cap: 50, flo: 49, v: 0.32 },
      { list: [{ c: 50.2, v: 1 }, { c: 50.42, v: 0.86 }, { c: 50.6, v: 0.74 }] },
      { n: 16, to: 51.35, noise: 0.13, wick: 0.12, v: 0.5 }
    ]);
    var S1 = 5.2, S2 = 8.4, S3 = 13, END = 18;
    return chart({
      bars: B, lo: 48.7, hi: 51.8, step: 0.5, vol: true, title: "Illustrative · a stock between $49 and $50 for an hour",
      reveal: [[0, 0], [4.6, 18], [S1, 18], [7.4, 21], [S2, 21], [12.4, B.length]],
      stages: [
        { at: 0,  title: "A defined range", text: "For an hour the stock trades between $49 and $50. Every push up to 50 gets sold. Every dip to 49 gets bought." },
        { at: S1, title: "Sellers run out at 50", text: "Eventually there aren't enough sellers left to hold price down at 50. It trades 50.02, then 50.08, then 50.20, and the ceiling is gone." },
        { at: S2, title: "Escape, then expand", text: "The level isn't the momentum trade. The trade is price escaping the boundary and expanding away from it, with volume showing up behind it." },
        { at: S3, title: "The setup decides what it means", text: "Out of a higher time frame range, this break can start a big expansion. At the end of an overextended run, the same break can be the final push." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "", a = fade(T, 0.6, 0.6), broke = T >= S1 + 0.3;
        s += hl(g, 50, 0, broke ? null : Math.max(0, g.shown - 1), broke ? C.up : C.dn, 1.8, broke ? null : "6 4", a);
        s += hl(g, 49, 0, T >= S1 ? 17 : Math.max(0, g.shown - 1), C.up, 1.6, "6 4", a * (broke ? 0.5 : 1));
        s += lab(g, 50, broke ? "$50 · broken" : "$50 · sold every time", broke ? C.up : C.dn, a);
        s += txt(g.x0 + 6, g.Y(49) + 18, "$49 · bought every time", C.up, 12, "start", 700, a * (broke ? 0.5 : 1));
        for (var i = 0; i < 18 && i < g.shown - 1; i++) {
          if (g.bars[i].h >= 49.97) s += '<circle cx="' + g.X(i).toFixed(1) + '" cy="' + (g.Y(50) - 9).toFixed(1) + '" r="3" fill="' + C.dn + '" opacity="' + (a * (broke ? 0.4 : 1)).toFixed(3) + '"/>';
          if (g.bars[i].l <= 49.03) s += '<circle cx="' + g.X(i).toFixed(1) + '" cy="' + (g.Y(49) + 9).toFixed(1) + '" r="3" fill="' + C.up + '" opacity="' + (a * (broke ? 0.4 : 1)).toFixed(3) + '"/>';
        }
        s += note(g, ["50.02 → 50.08 → 50.20", "the ceiling disappears"], C.up, win(T, S1 + 0.6, g.n ? S2 : S2 + 0.6), g.X(21) + 16, g.Y(50.55));
        s += note(g, ["Escaping the level and", "expanding away from it"], C.up, win(T, S2 + 0.8, g.n ? S3 : S3), g.X(23), g.Y(51.75));
        s += note(g, ["Same break, two setups", "HTF range break: the start", "Overextended: the last push"], C.gold, fade(T, S3 + 0.3, 0.4), g.X(0), g.Y(51.75));
        return s;
      }
    });
  }

  /* =====================================================================
     2 · breakout and retest: the old ceiling becomes the floor
     ===================================================================== */
  function retestSpec() {
    var B = path(23, 49.45, [
      { n: 12, fn: function (i) { return i > 8 ? 49.6 + (i - 8) * 0.08 : 49.5 + 0.22 * Math.sin(i * 1.1); }, noise: 0.08, wick: 0.14, cap: 50, flo: 49.15, v: 0.32 },
      { list: [{ c: 50.22, v: 1 }, { c: 50.44, v: 0.8 }, { c: 50.62, v: 0.7 }, { c: 50.7, h: 50.76, v: 0.6 }] },
      { list: [{ c: 50.52, v: 0.35 }, { c: 50.31, v: 0.32 }, { c: 50.12, v: 0.3 }, { c: 50.07, l: 50.0, v: 0.36 }] },
      { list: [{ c: 50.36, l: 50.03, v: 0.82 }] },
      { n: 11, to: 51.55, noise: 0.1, wick: 0.1, v: 0.5 }
    ]);
    var RT = 19, S1 = 5.6, S2 = 9.4, S3 = 12.4, END = 20;
    return chart({
      bars: B, lo: 49.0, hi: 51.9, step: 0.5, vol: true, title: "Illustrative · the same $50 break, then the retest",
      reveal: [[0, 0], [4.8, 16], [S1, 16], [8.4, 20], [S2, 20], [10.2, 21], [S3 + 0.6, 21], [16.4, B.length]],
      stages: [
        { at: 0,  title: "Same level, same break", text: "Price breaks $50 and runs to 50.70. So far it looks exactly like a breakout." },
        { at: S1, title: "Now the question changes", text: "We're not asking whether 50 broke. That already happened. We're asking what happens when price comes back to it." },
        { at: S2, title: "Old ceiling, new floor", text: "It pulls back to 50.10, 50.05, even 50.00, and buyers step back in. The level has changed function: resistance just became support." },
        { at: S3, title: "Stop and target get clearer", text: "You're wrong if price can't hold above 50. If the level really flipped, the next logical objective is the target. Much more precise than buy the dip." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "", a = fade(T, 0.6, 0.6), flipped = T >= S2 + 0.4, col = flipped ? C.up : T >= 3.2 ? C.blue : C.dn;
        s += hl(g, 50, 0, null, col, 1.8, flipped ? null : "6 4", a);
        s += lab(g, 50, flipped ? "$50 · now support" : T >= 3.2 ? "$50 · broken" : "$50 · resistance", col, a);
        var yq = g.Y(B[RT].l);
        s += ring(g.X(RT), yq + 4, 13, C.up, fade(T, S2 + 0.2, 0.4) * (1 - 0.5 * fade(T, S3 + 1, 0.4)));
        s += note(g, ["Back to the level", "does 50 hold?"], C.blue, win(T, S1 + 0.6, S2), g.X(RT) + 18, g.Y(51.5));
        s += note(g, ["Buyers step in at 50", "resistance → support"], C.up, win(T, S2 + 0.6, g.n ? S3 : S3 + 0.6), g.X(RT) + 18, g.Y(51.5));
        var aS = fade(T, S3 + 0.2, 0.5);
        s += hl(g, 49.86, 12, null, C.dn, 1.6, "5 4", aS) + txt(g.x1 - 4, g.Y(49.86) + 17, "stop · under 50", C.dn, 12, "end", 700, aS);
        s += hl(g, 51.5, 12, null, C.gold, 1.6, "5 4", aS) + txt(g.X(12), g.Y(51.5) - 7, "next objective", C.gold, 12, "start", 700, aS);
        s += note(g, ["Wrong if it can't hold 50", "Target: the next objective"], C.gold, fade(T, S3 + 0.8, 0.4) * (g.n ? 1 : 0), 0, 0);
        return s;
      }
    });
  }

  /* =====================================================================
     3 · pullback continuation: momentum retraces and recovers
     ===================================================================== */
  function pullbackSpec() {
    var B = path(5, 100, [
      { n: 4, fn: function () { return 100.05; }, noise: 0.15, wick: 0.15, v: 0.3 },
      { n: 12, to: 104, noise: 0.18, wick: 0.15, v: 0.66 },
      { list: [{ c: 103.55, v: 0.42 }, { c: 103.0, v: 0.36 }, { c: 102.82, v: 0.26 }, { c: 102.85, v: 0.2 }] },
      { list: [{ c: 103.45, v: 0.72 }] },
      { n: 10, to: 105.7, noise: 0.16, wick: 0.14, v: 0.55 }
    ]);
    var E = emaOf(B, 9), LOW = 19;
    B[LOW].l = Math.min(B[LOW].l, E[LOW] - 0.06); B[LOW - 1].l = Math.min(B[LOW - 1].l, E[LOW - 1] + 0.04);
    var S1 = 5, S2 = 8.4, S3 = 11, S4 = 15.4, END = 20;
    return chart({
      bars: B, lo: 99.4, hi: 106.3, step: 1, ema: 9, vol: true, title: "Illustrative · an established move, then a pullback",
      emaOp: function (T) { return 1 - 0.92 * fade(T, S4 + 0.4, 1); },
      reveal: [[0, 0], [4.4, 16], [S1, 16], [7.6, 20], [S3, 20], [14.4, B.length]],
      stages: [
        { at: 0,  title: "An established move", text: "The stock runs from 100 to 104 on good volume. Buyers are cleanly in control." },
        { at: S1, title: "Price moves back against it", text: "103, then 102.80, then 102.75. A meaningful pullback, and it comes right into the 9 EMA." },
        { at: S2, title: "The selling slows", text: "Smaller candles and lighter volume. The counter-move isn't doing structural damage. The original buying pressure is still intact." },
        { at: S3, title: "The original direction resumes", text: "Momentum pauses, structure holds, momentum resumes. That's the mechanism. The 9 EMA is only where the idea got tested." },
        { at: S4, title: "Take the 9 EMA away", text: "Remove the line and the trade should still make complete sense. If it doesn't, you were trading the indicator, not the mechanism." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "";
        s += zone(g, 16, 19, B[LOW].l - 0.12, 104.2, C.orange, win(T, S2, S3 + 2));
        s += note(g, ["Into the 9 EMA", "selling slows, volume dries up"], C.orange, win(T, S2 + 0.3, g.n ? S3 : S3 + 2), g.X(4), g.Y(105.9));
        s += note(g, ["Pause, hold, resume"], C.up, win(T, S3 + 0.8, g.n ? S4 : S4), g.X(21) + 6, g.Y(103.2));
        s += note(g, ["Still makes sense", "without the line"], C.ink, fade(T, S4 + 1, 0.5), g.X(4), g.Y(105.9));
        return s;
      }
    });
  }

  /* =====================================================================
     4 · consolidation continuation: momentum compresses and expands
     ===================================================================== */
  function consolSpec() {
    var cl = [22.86, 22.92, 22.84, 22.9, 22.8, 22.88, 22.93, 22.85, 22.9, 22.95];
    var B = path(7, 20, [
      { n: 3, fn: function () { return 20.05; }, noise: 0.1, wick: 0.12, v: 0.3 },
      { n: 9, to: 23.02, noise: 0.12, wick: 0.12, v: 0.7 },
      { list: cl.map(function (c, k) { return { c: c, h: Math.min(23.0, Math.max(c, k ? cl[k - 1] : 23) + 0.05), l: Math.max(22.76, Math.min(c, k ? cl[k - 1] : 23) - 0.05), v: 0.24 }; }) },
      { list: [{ c: 23.3, l: 22.92, v: 0.95 }] },
      { n: 9, to: 24.45, noise: 0.12, wick: 0.12, v: 0.55 }
    ]);
    B[11].h = Math.min(B[11].h, 23.0);
    var C0 = 12, C1 = 21, S1 = 4.6, S2 = 9.6, S3 = 12.6, END = 18.5;
    return chart({
      bars: B, lo: 19.6, hi: 24.8, step: 1, vol: true, title: "Illustrative · a $20 → $23 run, then sideways",
      reveal: [[0, 0], [4.2, 12], [S1, 12], [8.8, 22], [S3, 22], [16, B.length]],
      stages: [
        { at: 0,  title: "A strong run", text: "The stock runs from $20 to $23. Then, instead of pulling back toward 22, it just goes sideways." },
        { at: S1, title: "It gives back time, not price", text: "22.85, 22.90, 22.80, 22.90. Sellers can't push it meaningfully lower. The market is digesting the move through time instead of price." },
        { at: S2, title: "A clear trigger, a clear stop", text: "The trigger is price breaking the top of the consolidation. The stop sits just under the consolidation low. Risk is tight and defined." },
        { at: S3, title: "Compression, then expansion", text: "Bull flag, pennant, flat top, high of day consolidation: different shapes of the same mechanism. Momentum compresses, then expands." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "", grow = Math.max(C0, Math.min(C1, Math.floor(g.shown - 1)));
        var aB = fade(T, S1 + 0.6, 0.5);
        if (g.shown > C0 + 1) s += zone(g, C0, grow, 22.76, 23.0, C.blue, aB);
        var aG = win(T, S1 + 1.6, S2);
        s += hl(g, 22, 8, C1, C.faint, 1.4, "4 4", aG) + (g.n ? txt(g.x1 - 2, g.Y(22) - 7, "a pullback would come to 22", C.faint, 12, "end", 600, aG) : txt(g.X(C1) + g.cw, g.Y(22) + 18, "a pullback gives back price, to here", C.faint, 12, "end", 600, aG));
        var aT = fade(T, S2 + 0.2, 0.5), aL = aT * (1 - fade(T, S3 + 0.4, 0.4));
        s += hl(g, 23.0, C0, null, C.up, 1.6, "5 4", aT) + txt(g.x1 - 4, g.Y(23.0) - 26, "trigger · top of the range", C.up, 12, "end", 700, aL);
        s += hl(g, 22.72, C0, null, C.dn, 1.6, "5 4", aT) + txt(g.x1 - 4, g.Y(22.72) + 17, "stop · under the low", C.dn, 12, "end", 700, aL);
        if (!g.n) s += txt(g.X(C0) - g.cw, g.Y(23.0) - 8, "trigger", C.up, 12, "end", 700, fade(T, S3 + 0.6, 0.4)) +
          txt(g.X(C0) - g.cw, g.Y(22.72) + 16, "stop", C.dn, 12, "end", 700, fade(T, S3 + 0.6, 0.4));
        s += note(g, ["Sideways, not down", "the move is digested in time"], C.blue, win(T, S1 + 1, g.n ? S2 : S3), g.X(1), g.Y(24.6));
        s += note(g, ["Trigger and stop", "a few cents apart"], C.up, g.n ? win(T, S2 + 0.5, S3) : 0, 0, 0);
        s += note(g, ["Compress, then expand"], C.up, fade(T, S3 + 0.8, 0.4), g.X(1), g.Y(24.6));
        return s;
      }
    });
  }

  /* =====================================================================
     5 · trend continuation: the persistence of the trend is the edge
     ===================================================================== */
  function trendSpec() {
    var segs = [{ n: 2, fn: function () { return 50.1; }, noise: 0.08, wick: 0.1, v: 0.35 }], top = 50.1, PIV = [];
    for (var k = 0; k < 5; k++) {
      segs.push({ n: 4, to: top + 1.5, noise: 0.1, wick: 0.12, v: 0.55 });
      if (k < 4) segs.push({ n: 2, to: top + 0.85, noise: 0.06, wick: 0.1, v: 0.3 });
      top += 0.85;
    }
    var B = path(3, 50.1, segs), i = 2;
    for (k = 0; k < 5; k++) {
      i += 4; PIV.push({ i: i - 1, hi: true });
      if (k < 4) { i += 2; PIV.push({ i: i - 1, hi: false }); }
    }
    PIV.forEach(function (q) { var b = B[q.i]; if (q.hi) b.h = Math.max(b.h, b.c + 0.12); else b.l = Math.min(b.l, b.c - 0.12); });
    var lows = PIV.filter(function (q) { return !q.hi; }), highs = PIV.filter(function (q) { return q.hi; });
    var a0 = lows[0], a1 = lows[lows.length - 1], slope = (B[a1.i].l - B[a0.i].l) / (a1.i - a0.i);
    function lower(j) { return B[a0.i].l + (j - a0.i) * slope; }
    var off = 0; highs.forEach(function (q) { off = Math.max(off, B[q.i].h - lower(q.i)); });
    var S1 = 7.6, S2 = 11.4, END = 16.5;
    return chart({
      bars: B, lo: 49.6, hi: 55.6, step: 1, vol: false, title: "Illustrative · higher highs and higher lows",
      reveal: [[0, 0], [7, B.length]],
      stages: [
        { at: 0,  title: "Higher high, higher low", text: "Buyers keep winning the auction at higher and higher prices. Every push makes a higher high, every dip holds a higher low." },
        { at: S1, title: "The trend itself is the edge", text: "It doesn't fit one textbook pattern. It rides a channel, stair-steps higher, and every shallow dip gets bought right away." },
        { at: S2, title: "Extension changes the odds", text: "Inside a trending setup this makes sense. After an overextended run, the same persistence can turn into extension, and continuation gets less likely." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "";
        PIV.forEach(function (q) {
          var a = clamp01(g.shown - q.i - 1) * (q.i < 3 ? 0 : 1); if (a <= 0) return;
          var b = B[q.i];
          s += txt(g.X(q.i), q.hi ? g.Y(b.h) - 9 : g.Y(b.l) + 20, q.hi ? "HH" : "HL", q.hi ? C.up : C.blue, 12, "middle", 700, a);
        });
        var aC = fade(T, S1 + 0.2, 0.6), ja = 2, jb = B.length - 1;
        s += line(g.X(ja), g.Y(lower(ja)), g.X(jb), g.Y(lower(jb)), C.blue, 1.6, "6 4", aC);
        s += line(g.X(ja), g.Y(lower(ja) + off), g.X(jb), g.Y(lower(jb) + off), C.blue, 1.6, "6 4", aC);
        lows.forEach(function (q) { s += ring(g.X(q.i), g.Y(B[q.i].l) + 2, 10, C.up, fade(T, S1 + 0.8 + q.i * 0.03, 0.4) * (1 - 0.6 * fade(T, S2, 0.4))); });
        s += note(g, ["Every shallow dip", "gets bought"], C.up, win(T, S1 + 0.8, g.n ? S2 : S2), g.X(2), g.Y(55.4));
        var aE = fade(T, S2 + 0.3, 0.5), xe = g.X(jb) + (g.n ? -2 : 12);
        s += line(xe, g.Y(B[1].c), xe, g.Y(B[jb].c), C.gold, 2, null, aE);
        s += line(xe - 5, g.Y(B[1].c), xe + 5, g.Y(B[1].c), C.gold, 2, null, aE);
        s += note(g, ["How far from the base?", "persistence can become", "extension"], C.gold, aE, g.X(2), g.Y(55.4));
        return s;
      }
    });
  }

  /* =====================================================================
     6 · reclaim: the level was lost, then taken back
     ===================================================================== */
  function reclaimSpec() {
    function vw(j) { return 30.05 + j * 0.006; }
    var B = path(17, 30.55, [
      { n: 8, fn: function (i) { return 30.55 + i * 0.045; }, noise: 0.07, wick: 0.1, flo: function (j) { return vw(j) + 0.15; }, v: 0.4 },
      { n: 5, to: 29.82, noise: 0.06, wick: 0.1, v: 0.5 },
      { n: 7, fn: function () { return 29.82; }, noise: 0.08, wick: 0.09, cap: function (j) { return vw(j) - 0.06; }, v: 0.3 },
      { list: [{ c: 30.38, v: 0.92 }] },
      { n: 3, fn: function () { return 30.36; }, noise: 0.06, wick: 0.08, flo: function (j) { return vw(j) + 0.04; }, v: 0.45 },
      { n: 9, to: 31.3, noise: 0.08, wick: 0.1, v: 0.6 }
    ]);
    var RC = 20, S1 = 4.4, S2 = 9.4, S3 = 12.6, END = 18;
    return chart({
      bars: B, lo: 29.2, hi: 31.7, step: 0.5, vol: true, title: "Illustrative · VWAP lost, then reclaimed",
      reveal: [[0, 0], [3.8, 9], [S1, 9], [8.6, 20], [S2, 20], [11.6, 24], [S3 + 0.4, 24], [16, B.length]],
      under: function (T, g) {
        var a = win(T, S1 + 1.4, S2 + 1), xa = g.X(10) - g.cw, xb = g.X(19) + g.cw;
        return a > 0 ? '<rect x="' + xa.toFixed(1) + '" y="' + g.Y(vw(14)).toFixed(1) + '" width="' + (xb - xa).toFixed(1) + '" height="' + (g.Y(29.45) - g.Y(vw(14))).toFixed(1) + '" fill="' + C.dn + '" opacity="' + (a * 0.1).toFixed(3) + '"/>' : "";
      },
      stages: [
        { at: 0,  title: "An important level", text: "The blue line is VWAP. Price is trading above it, then starts to pull back." },
        { at: S1, title: "The level is lost", text: "Price slips under VWAP and stays there. For a while the market accepts lower prices, and the sellers look like they have control." },
        { at: S2, title: "Price takes it back", text: "Buyers push back over VWAP and, just as important, don't lose it again right away. Control is back on the original side." },
        { at: S3, title: "The trap is the fuel", text: "Anyone who sold below VWAP is now offside. Their exits add to the push. The reclaim is the edge, not VWAP itself." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "", pts = [], upto = Math.min(B.length - 1, Math.max(0, g.shown - 1));
        for (var j = 0; j <= upto; j++) pts.push(g.X(j).toFixed(1) + "," + g.Y(vw(j)).toFixed(1));
        if (pts.length > 1) s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.blue + '" stroke-width="2.6"/>';
        s += txt(g.X(0), g.Y(vw(0)) + 20, "VWAP", C.blue, 12, "start", 700, fade(T, 0.4, 0.4));
        s += note(g, ["Below VWAP", "sellers seem in control"], C.dn, win(T, S1 + 1.6, S2), g.X(9), g.Y(31.6));
        s += ring(g.X(RC), g.Y(B[RC].c) - 4, 14, C.up, fade(T, S2 + 0.1, 0.3) * (1 - 0.5 * fade(T, S3 + 1, 0.4)));
        s += note(g, ["Reclaimed, and held", "not lost again"], C.up, win(T, S2 + 0.4, g.n ? S3 : S3 + 0.4), g.X(9), g.Y(31.6));
        s += note(g, ["Shorts trapped below", "their exits fuel the move"], C.gold, fade(T, S3 + 0.6, 0.4), g.X(9), g.Y(31.6));
        return s;
      }
    });
  }

  /* =====================================================================
     7 · the five-second test
     ===================================================================== */
  function quizSpec() {
    var B = path(41, 60, [
      { n: 3, fn: function () { return 60.05; }, noise: 0.1, wick: 0.12, v: 0.3 },
      { n: 6, to: 61.6, noise: 0.12, wick: 0.12 },
      { n: 2, to: 61.15, noise: 0.05, wick: 0.1 },
      { n: 5, to: 62.9, noise: 0.12, wick: 0.12 },
      { list: [{ c: 62.6 }, { c: 62.3 }, { c: 62.2 }] },
      { list: [{ c: 62.75 }] },
      { n: 8, to: 64.3, noise: 0.12, wick: 0.12 }
    ]);
    var E = emaOf(B, 9), LOW = 18, TRG = 19;
    B[LOW].l = Math.min(B[LOW].l, E[LOW] - 0.05);
    B[TRG].h = Math.max(B[TRG].h, B[LOW].h + 0.15);
    var S0 = 2.2, S1 = 8, S2 = 10.6, S3 = 13.2, S4 = 15.8, END = 20;
    return chart({
      bars: B, lo: 59.6, hi: 64.8, step: 1, ema: 9, vol: false, title: "Illustrative · name it in five seconds",
      reveal: [[0, 0], [S0, B.length]],
      stages: [
        { at: 0,  title: "Five seconds", text: "Two questions. What's the setup here? And what's the momentum trade? Answer before the clock runs out." },
        { at: S1, title: "The setup: trending", text: "Not \"a 9 EMA setup\". The 9 EMA isn't a setup. The setup is the bigger picture: this stock is trending." },
        { at: S2, title: "The trade: pullback continuation", text: "Momentum paused, pulled back without doing structural damage, and resumed. That's the mechanism." },
        { at: S3, title: "The zone: the 9 EMA", text: "The 9 EMA is just where it's happening. It's the opportunity zone, not the trade." },
        { at: S4, title: "The trigger", text: "The bar that takes out the pullback's high is the event that says it's actually happening, not that it might." }
      ],
      end: END,
      overlay: function (T, g) {
        var s = "";
        var left = Math.ceil(5 - clamp01((T - S0) / 5.6) * 5), aQ = fade(T, S0, 0.3) * (1 - fade(T, S1 - 0.3, 0.3));
        if (aQ > 0) s += txt(g.n ? g.L.W / 2 : g.X(4), g.n ? 118 : g.Y(64), String(Math.max(1, left)), C.ink, g.n ? 64 : 72, "middle", 800, aQ * 0.9);
        var x = g.n ? 14 : g.X(1), y = g.n ? 58 : g.Y(64.5);
        s += pill(x, y, "Setup · trending", C.blue, fade(T, S1, 0.4));
        s += pill(x, y + 30 * FS, "Trade · pullback continuation", C.up, fade(T, S2, 0.4));
        s += pill(g.n ? x + 0 : x, y + 60 * FS, "Zone · 9 EMA", C.orange, fade(T, S3, 0.4));
        s += ring(g.X(LOW), g.Y(B[LOW].l) + 2, 14, C.orange, fade(T, S3 + 0.2, 0.4));
        var aT = fade(T, S4, 0.4);
        s += hl(g, B[LOW].h, LOW - 1, TRG + 1, C.up, 1.6, "4 3", aT);
        s += pill(x, y + 90 * FS, "Trigger · takes out the pullback high", C.up, aT);
        s += txt(g.X(TRG + 2) + 4, g.Y(B[LOW].h) + 4, "trigger", C.up, 12, "start", 700, aT);
        return s;
      }
    });
  }

  var SPECS = { breakout: breakoutSpec, retest: retestSpec, pullback: pullbackSpec, consol: consolSpec, trend: trendSpec, reclaim: reclaimSpec, quiz: quizSpec };
  document.querySelectorAll("[data-mt-anim]").forEach(function (root) {
    var f = SPECS[root.getAttribute("data-mt-anim")];
    if (f) player(root, f());
  });
  window.MTAnim = { _specs: SPECS };            // exposed for checks in testing
})();
